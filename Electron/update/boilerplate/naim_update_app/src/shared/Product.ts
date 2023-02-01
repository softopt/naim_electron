/* eslint-disable import/prefer-default-export */
/*!
 * \copyright   Naim Audio Ltd. 2022
 * \file        ProductDetails.ts
 * \author      Alex Jeffrey
 *
 * This file contains types and uitilities releated to the information
 * which can be extracted from the unit via npconfig.
 */

//-----------------------------------------------------------------------------
// Public Types
//-----------------------------------------------------------------------------
//
// Product Details (obtained from npconfig)
//
export type ProductDetails = {
  modelName?: string;
  modelVariant?: string;
  serialNumber?: string;
  analogBoardVersion?: string;
  digitalBoardVersion?: string;
  frontBoardVersion?: string;
  uiBoardVersion?: string;
  mainsVoltage?: string;
  displayType?: string;
  wifiRegion?: string;
  googleToken?: string;
  dateOfBirth?: string;
  dateOfLastService?: string;
  numberOfServices?: string;
};
//
// Firmware versions
// This object contains information about firmware versions which may
// be from an availabel update package or read from the device via an
// mfg command.
//
export type FirmwareVersions = {
  application?: string;
  bsl1?: string;
  bsl2?: string;
  zigbee?: string;
  releaseNotes?: string[];
};

//-----------------------------------------------------------------------------
// Private Data
//-----------------------------------------------------------------------------

// The data output by the npconfig utility contains lines of the form:
//
// Product Type: NSC222
// Product Variant: 255
// Serial Number: 881412
//
// This object maps the tags in this data to the names of the equivalent property
// in the ProdictDetails object
//
const productPropertyLookup = {
  'Product Type': 'modelName',
  'Product Variant': 'modelVariant',
  'Serial Number': 'serialNumber',
  'Analogue board version': 'analogBoardVersion',
  'Digital board version': 'digitalBoardVersion',
  'Front board version': 'frontBoardVersion',
  'UI board version': 'uiBoardVersion',
  'Mains Voltage': 'mainsVoltage',
  'Display Type': 'displayType',
  'Wifi Region': 'wifiRegion',
  'Google Token': 'googleToken',
  'Date of Birth': 'dateOfBirth',
  'Date of Last Service': 'dateOfLastService',
  'Number Of Services': 'numberOfServices',
};

// The data output by the mfg commands tags the available firmware versions
// with specific labels.
//
// bl1 v0.0.0  26441
// bl2 v0.0.0  26979
// app v0.0.0  29380
//
// This object maps the tags in this data to the names of the equivalent property
// in the FirmwareVersions object
const firwmareVersionLookup = {
  app: 'application',
  bl1: 'bsl1',
  bl2: 'bsl2',
};

//-----------------------------------------------------------------------------
// Public Functions
//-----------------------------------------------------------------------------
/*!
 * \brief Convert string array from npconfig to Product Details
 *
 * Information is retuned by npconfig as the captured stdout which this function
 * will decode and return as a Product Details object
 *
 * Not all lines in the command output represent properties. This method looks
 * for lines that are of the form of key?:value pairs and maps them to product
 * properties
 *
 * \param data
 * \return Product Details
 */
export function npconfigToProductDetails(data: string[]): ProductDetails {
  // Create an empty object - it will be populated with those properties that
  // are found in the supplied details array
  const product: ProductDetails = {};

  // Lines that relate to product properties will contain two fields separated by
  // a ':'. We try to split each line and if the key obtained matches one from the
  // lookup table, we assign its value to the associated property in the object.
  data.forEach((line: string): void => {
    const [key, value] = line.split(':');
    const property = productPropertyLookup[key.trim()];
    if (property !== undefined) {
      product[property] = value.trim();
    }
  });
  return product;
}

/*!
 * \brief Convert string array from mfg command to firwmare versions
 *
 * Information is returned from an ARM mfg command which contains the f/w
 * versions for the application and both bsl layers.
 * \param data Response data from mfg versions command
 * \return FirmwareVersions
 */
export function mfgToFirmwareVersions(data: string[]) {
  // Create an empty object - it will be populated with those properties that
  // are found in the supplied string array
  const versions: FirmwareVersions = {};

  // Lines that relate to firmware versions will contain three fields separated by
  // varying lengths of whitepsace. We try to split each line and if the key obtained
  // matches one from the lookup table, we assign the value infered from the other two
  // fields to the associated property in the returned object.
  data.forEach((line: string): void => {
    const [key, version, build] = line.split(/\s+/);
    const property = firwmareVersionLookup[key.trim()];
    if (property !== undefined) {
      versions[property] = `${version}.${build}`;
    }
  });
  return versions;
}
