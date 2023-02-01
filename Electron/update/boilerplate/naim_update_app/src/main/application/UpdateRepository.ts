/*!
 * \copyright   Naim Audio Ltd. 2022
 * \file        UpdateRepository.ts
 * \author      Alex Jeffrey
 *
 * This file contails a class that encapsulates the access to the online
 * repository where available updates are advertised.
 */

// Framework imports
import AWS from 'aws-sdk';
import * as fs from 'fs';

// Local imports
import * as Logging from '../../shared/Logging';
import { LogLevel } from '../../shared/LoggingTypes';

//-----------------------------------------------------------------------------
// Types
//-----------------------------------------------------------------------------

// Represents a list of objects ids
export type KeyList = string[];

// The signature of the callback required to receive object keys
// An empty key list is a valid response. Will be called with null on error
export type ListCallback = (keys: KeyList | null) => void;

// Downloading of files is an asynchronous operation so we need to be able to
// keep track of its progress especially when calling back to clients so they
// can easily determine when a batch of downloads is completed
export type DownloadBatch = {
  // Number of downloads completed so far
  completed: number;
  // Number of downloads in the batch
  count: number;
  // How many of the completed downloads were successul
  success: number;
};

// The signature of the callback to which download completion is reported
export type DownloadCallback = (
  filePath: string,
  result: boolean,
  batch: DownloadBatch
) => void;

//-----------------------------------------------------------------------------
// Classes
//-----------------------------------------------------------------------------

export class UpdateRepository {
  //---------------------------------------------------------------------------
  // Private Constants
  //---------------------------------------------------------------------------

  // AWS bucket name of the repository
  private bucketName: string = 'com.naimaudio.firmware';

  // Extension on upgrade index files
  private packageIndexExtension: string = 'xml';

  // Tag to add to all log entries
  private loggingTag: string = 'AWS';

  //---------------------------------------------------------------------------
  // Private Data
  //---------------------------------------------------------------------------

  // AWS SDK access object
  private s3: AWS.S3 = new AWS.S3();

  //---------------------------------------------------------------------------
  // Private Methods
  //---------------------------------------------------------------------------
  /*!
   * \brief Get list of file names from the repository
   *
   * This method is called to return a list of files which are present in the
   * bucket (repository) associated with this class. The mathing file names
   * are returned to the caller via the supplied callback.
   *
   * In AWS, the objects buckets are not structured as file systems and the
   * objects are not necessarily files but the appearance of a folder hierarchy
   * can be achieved with suitable used of objects ids. In the Naim repository,
   * upgrade packages and binaries are collated into virtual folders that
   * represent product families and/or programmable devices which can be identifed
   * with a suitable folder-like object id prefix.
   *
   * \param callback  Function to which list of matching 'filenames' will be delivered
   * \param extension Optional file extension to match
   * \param prefix    Optional prefix (empty if not required)
   * \return True if request valid and accepted.
   */
  private doGetFileList(
    callback: ListCallback,
    extension = '',
    prefix = ''
  ): void {
    //
    // Parameters for the listing are the bucket (fixed for this object to
    // be the update repositiry) and the optional prefix which will restict
    // the returned list to those in the associated product family.
    //
    const params = {
      Bucket: this.bucketName,
      Prefix: prefix,
    };
    //
    // Send the request to the AWS S3 SDK for the objects
    //
    this.s3.listObjectsV2(params, (listError, listData) => {
      //
      // The object request will return an object for every match containing
      // lots of properties but we're only interested in the 'name' which
      // is the 'Key' property of the object.
      //
      if (listError) {
        Logging.log(listError, this.loggingTag, LogLevel.Warning);
        callback(null);
      } else if (listData !== undefined) {
        //
        // Got valid data so iterate over them all and filter out those whose
        // names do not have the requested extension.
        //
        const listKeys: KeyList = [];
        const contents = listData.Contents?.filter((value) => {
          return value.Key?.endsWith(extension);
        });
        //
        // Iterate over the matching objects and extract their 'keys' as the
        // 'filenames'
        //
        contents?.forEach((element) => {
          if (element !== undefined) {
            listKeys.push(element.Key as string);
          }
        });
        //
        // If the data is marked as truncated, it means that this block is a
        // partial set and we _should_ recurse to get more. The default settings
        // should return upto 1000 objects so we don't expect to get this.
        //
        if (listData.IsTruncated) {
          Logging.log(
            `AWS list was truncated (${prefix}, ${extension})`,
            this.loggingTag,
            LogLevel.Warning
          );
        }
        //
        // Call the supplied callback - if it is truncated, this will the
        // partial, first block
        //
        callback(listKeys);
      }
    });
  }

  /*!
   * \brief Download a file from the respository
   * Downloads an object with a supplied object 'key' from the repository to
   * a named file on the local file system.
   *
   * The supplied object name is the full one relative to the bucket root
   * (i.e. no 'virtual folder' prefix)
   *
   * The download is an asynchronous operation so there is no return code but
   * the supplied callback will be called when the download completes. The
   * supplied 'batch' object collects the statistics for the set of downloads
   * (which nay be only for a single file) which this download is part of.
   *
   * \param objectKey   Full object (file) name
   * \param filePath    Full filename where the downloaded file is to be saved
   * \param callback    Function to call to report download completion
   * \param batch       Object that tracks the progress of this batch of downloads
   */
  private doDownloadFile(
    objectKey: string,
    filePath: string,
    callback: DownloadCallback,
    batch: DownloadBatch
  ): void {
    //
    // The parameters for the download are the bucket (which is fixed) and
    // the object key (filename).
    //
    const params = {
      Bucket: this.bucketName,
      Key: objectKey,
    };
    //
    // To download the file we send a request to the S3 SDK and provide a
    // callback which will provide a binary stream which we save to file
    // using the file sync object.
    let res = false;
    this.s3.getObject(params, (objectError, objectData) => {
      if (objectError || objectData === undefined) {
        Logging.log(
          `Download error: ${objectKey} (${objectError})`,
          this.loggingTag,
          LogLevel.Warning
        );
      } else if (objectData.Body !== undefined) {
        fs.writeFileSync(filePath, objectData.Body.toString());
        Logging.log(
          `Download complete: ${objectKey} (${filePath})`,
          this.loggingTag
        );
        res = true;
      }
      // Update the batch totals and inform observer of result / progress
      batch.completed += 1;
      batch.success += res ? 1 : 0;
      callback(filePath, res, batch);
    });
  }

  //---------------------------------------------------------------------------
  // Public Methods
  //---------------------------------------------------------------------------
  /*!
   * \brief List all package index files
   *
   * This method is called to return a list of package index files which are
   * present in the bucket (repository) associated with this class optionally
   * under a specified prefix. The list is returned to the caller asynchronously
   * via a supplied callback.
   *
   * Package Index files are presumed to have a well known extension.
   *
   * \param callback  Function to which list of matching object keys will be delivered
   * \param prefix    Optional prefix (empty if not required)
   */
  getPackageIndexFiles(callback: ListCallback, prefix = ''): void {
    this.doGetFileList(callback, this.packageIndexExtension, prefix);
  }

  /*!
   * \brief Request a named file from the respository
   * Downloads an object with a supplied object 'key' from the repository to
   * a named file on the local file system.
   *
   * The supplied object name is the full one relative to the bucket root
   * (i.e. no 'virtual folder' prefix)
   *
   * Downloads proceed asynchronously so a callback is required to be informed
   * of completion.
   *
   * \param objectKey   Full object (file) name
   * \param filePath    Full filename where the downloaded file is to be saved
   * \param callback    Function to call in completion
   * \return True if the file was downloaded ok
   */
  downloadFile(
    objectKey: string,
    filePath: string,
    callback: DownloadCallback
  ): void {
    // This is a batch containing a single file
    const batch: DownloadBatch = {
      completed: 0,
      count: 1,
      success: 0,
    };
    this.doDownloadFile(objectKey, filePath, callback, batch);
  }

  /*!
   * \brief Download a list of files
   *
   * Takes an object list (possibly returned by this object) and downloads
   * them to a specified location. The object names are inteprested as virtual
   * file paths (with stnadard separators) and the last part is the filename and
   * this is the name of the file created to store the object.
   *
   * \param objectKeys  List of repository objects to download
   * \parma filePath    Path to folder where files are to be saved
   */
  downloadFiles(
    objectKeys: string[],
    filePath: string,
    callback: DownloadCallback
  ): void {
    Logging.log(`Download files ${objectKeys}`, this.loggingTag);
    // Create a batch object for the number of files in the list. This will be
    // passed to each individual download request which will update it. As the
    // files may not be requested in order and/or complete in order, each
    // completion will be reported to the caller so they can infer when the
    // batch is complete.
    const batch: DownloadBatch = {
      completed: 0,
      count: objectKeys.length,
      success: 0,
    };
    //
    // Iterate over the supplied list and downloads them by:
    // a) Intepreting the object key as a standard file path and splitting
    //    it by the normal folder separator.
    // b) The last fragment in the split is treated as the filename and
    //    appended to the supplied path to form the full filename
    // c) Calls the private helper method to do the download from AWS
    //
    objectKeys.forEach((element) => {
      const fragments = element.split('/');
      if (fragments.length > 0) {
        const fileName = `${filePath}/${fragments.pop()}`;
        this.doDownloadFile(element, fileName, callback, batch);
      }
    });
  }
}
