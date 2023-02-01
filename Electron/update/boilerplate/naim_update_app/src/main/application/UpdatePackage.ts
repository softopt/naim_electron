/*!
 * \copyright   Naim Audio Ltd. 2022
 * \file        UpdatePackage.ts
 * \author      Alex Jeffrey
 *
 * This file contails a class that encapsulates the information provided
 * in an update package file
 */

// Framework imports
import xml2js from 'xml2js';
import * as fs from 'fs';

// Local imports
import * as Logging from '../../shared/Logging';

//-----------------------------------------------------------------------------
// Types
//-----------------------------------------------------------------------------

export type UpdateComponent = {
  name: string;
  version: string;
  location: string;
};

export type UpdatePackage = {
  name?: string;
  releaseDate?: string;
  releaseNotes?: string[];
  location?: string;
  components?: UpdateComponent[];
};

//-----------------------------------------------------------------------------
// Classes
//-----------------------------------------------------------------------------

export class UpdatePackageParser {
  //---------------------------------------------------------------------------
  // Private Data
  //---------------------------------------------------------------------------

  // The object loaded from the file
  private packageContents: UpdatePackage | null = null;

  //---------------------------------------------------------------------------
  // Private Methods (XML Parsing)
  //
  // The object passed to these methods is assumed to be the result of parsing
  // using the XML2JS module. We need to know this as the mapping from XML to a
  // JS object may differ between XML parsing libraries.
  //
  // NOTE ON LINT:
  // These methods may be flagged with lint errors because they speculatively
  // read properties presumed to be present. These watnings cannot be inhibited
  // without raising new ones (e.g. by changing type to 'any')
  // These speculative accesses will fail ill fail and return 'undefined' if
  // the property is not present.
  //---------------------------------------------------------------------------
  /*!
   * \brief Parse object as a Non-Streamer upgrade package file
   *
   * This method parses the supplied object assuming it represents an upgrade
   * package in the style that represents a non-streamer upgrade.
   *
   * Expecting the format to be as follows:
   *
   * Supplied object
   * ---------------
   * { Package: [ [Object] ] }
   *
   * Package:
   * --------
   * [
   *  {
   *    '$': {
   *      name: 'Development',
   *      reldate: '2022-09-18',
   *      location: 'NonStreamers/Development.zip'
   *      },
   *      Component: [ [Object], [Object], [Object], [Object] ],
   *      ReleaseNotes: [
   *        'These things changed'
   *      ]
   *    }
   *  }
   * ]
   *
   * Package[0].Component
   * --------------------
   * [
   *  {
   *    '$': {
   *      name: 'App',
   *      release: '0.0.0.29436',
   *      location: 'ARMHost/Host/App-0.0.0.29436.hex'
   *    }
   *  },
   *  ...
   *  {
   *    '$': {
   *      name: 'Zigbee',
   *      release: '2.0.2.0',
   *      location: 'ARMHost/Zigbee/NP800BridgeJN5168-2.0.2.0.image'
   *    }
   *  }
   * ]
   *
   * This method will create the class member 'packageContents' if the supplied
   * object is valid.
   *
   * \param data  Object expected to contain parsed XML
   * \return True if object conforms to expected structure.
   */
  private parseNonStreamerUpgrade(data: object): boolean {
    // Check the top level of the supplied object is 'Package' is present
    // and is an array as epxected
    // It's an array because that's how XML2JS works but we're only interested
    // in the first one as that is the only one ever populated.
    this.packageContents = null;
    const packageArray = data.Package;
    if (Array.isArray(packageArray) && packageArray.length === 1) {
      const packageInfo = packageArray[0];
      if (packageInfo !== undefined) {
        //
        // We have a valid package info object so create the JS Package Contents
        // object.
        //
        this.packageContents = {};
        //
        // The package ID is given a tag of '$' by XML2JS so extract that to
        // get the key package properties and put them into the Package Contents
        // object.
        //
        const packageId = packageInfo['$'];
        if (packageId !== undefined) {
          this.packageContents.name = packageId.name;
          this.packageContents.releaseDate = packageId.reldate;
          this.packageContents.location = packageId.location;
        }
        //
        // The release notes are also copied from the top level object into the
        // Package Contents object.
        const releaseNotes = packageInfo.ReleaseNotes;
        if (Array.isArray(releaseNotes) && releaseNotes.length > 0) {
          [this.packageContents.releaseNotes] = releaseNotes;
        }
        //
        // The individual, formware components are in a child array of the
        // top level object.
        //
        const components = packageInfo.Component;
        if (Array.isArray(components)) {
          //
          // We have the array so cretae the simlar array which holds them in
          // the Package Contents object.
          //
          this.packageContents.components = [];
          components.forEach((value: any) => {
            //
            // Each entry on the array is an object which has a sub-object,
            // tagged as '$' which contains the details of the component.
            //
            const componentId = value['$'];
            if (componentId !== undefined) {
              //
              // If the details were extracted ok, used them to create a JS
              // object to hold a single component which is added to the main
              // Pacakge Contents object.
              //
              const componentInfo: UpdateComponent = {
                name: componentId.name,
                version: componentId.release,
                location: componentId.location,
              };
              this.packageContents?.components?.push(componentInfo);
            }
          });
        }
      }
    }
    return this.packageContents !== null;
  }

  /*!
   * \brief Parse XML object as an NP800 upgrade package file
   *
   * Originally intended so that other upgrade pacakages could be loaded during
   * development but never fully developed. Left in place to show how it might
   * be supported if the upgrade app ever extended to support multiple device types
   * \param data  Object epxected to contain parsed XML
   *
   * \return False (not currently supported)
   */
  // eslint-disable-next-line class-methods-use-this, @typescript-eslint/no-unused-vars
  private parseNP800Upgrade(_data: object): boolean {
    return false;
  }

  /*!
   * \brief Parse object as upgrade package file
   *
   * This method parses the supplied object assuming it represents an upgrade
   * package file in one of the supported formats.
   *
   * \param data  Object expected to contain parsed XML
   * \return True if object conforms to a supported structure.
   */
  private parseXMLObject(data: object): boolean {
    // All supported formats have the same outer object. Extract the child and
    // pass to format specific parser(s)
    // See notes in section banner on potential lint errors here.
    const upgrade = data.Upgrade;
    if (upgrade !== undefined) {
      return (
        this.parseNonStreamerUpgrade(upgrade) || this.parseNP800Upgrade(upgrade)
      );
    }
    return false;
  }

  //---------------------------------------------------------------------------
  // Public Methods
  //---------------------------------------------------------------------------

  /*!
   * \brief Load from an XML file donwloaded from Naim release server
   * \param filepath  File containing XML definition of the package
   * \return True if the object represents a valid update package.
   */
  constructor(filepath: string) {
    const parser = new xml2js.Parser();
    const fileData = fs.readFileSync(filepath, 'utf-8');
    if (fileData !== undefined) {
      parser.parseString(fileData, (xmlError, xmlData) => {
        if (xmlError) {
          Logging.log(
            `Error parsing package XML file: ${filepath} (${xmlError})`
          );
        } else {
          const res = this.parseXMLObject(xmlData);
          Logging.log(
            `Package file loading (${filepath}) - ${res ? 'success' : 'failed'}`
          );
        }
      });
    }
  }

  /*!
   * \brief Does the object represent a valid update package
   * \return True if file is present and valid
   */
  isValid(): boolean {
    return this.packageContents !== null;
  }

  /*!
   * \brief Retrieve the object describing the package contents
   * \return Package object (null if parse of file failed)
   */
  packageDescription(): UpdatePackage | null {
    return this.packageContents;
  }
}
