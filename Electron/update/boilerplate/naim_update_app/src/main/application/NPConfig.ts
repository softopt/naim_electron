/*!
 * \copyright   Naim Audio Ltd. 2022
 * \file        NPConfig.ts
 * \author      Alex Jeffrey
 *
 * Contains a class the wraps the Naim npconfig utility
 * It provides methods to perform specific actions which operate on one of two modes:
 * a) Buffered - the output from the operation is buffered and returned to the caller
 *    once the operation completes.
 * b) Streaming - the output from the operation is returned to the caller as it is
 *    received.
 */

// Local imports
import { LogLevel } from '../../shared/LoggingTypes';
import * as Logging from '../../shared/Logging';

// Framework requirements
const { spawn } = require('node:child_process');

// Buffered mode types
// The data is returned to the caller via a supplied callback which provides the
// lines in the accumulated output as a string array along with the exit status
export type BufferedData = string[];
export type BufferedCallback = (data: BufferedData, status: number) => void;

// Streaming mode types
// The data is returned to the caller via a supplied callback which provides the
// output as it is received along with the exit status on the last call.
export type StreamingData = string | null;
export type StreamingCallback = (
  data: StreamingData,
  status: number | null
) => boolean;

// Command
// Information that defines a command that can be execured and queued. Note the
// buffered callback because streaming commands can't be queued.
type QueuedCommand = {
  parameters: string[];
  handler: BufferedCallback;
};

export class NPConfig {
  //---------------------------------------------------------------------------
  // Private Data
  //---------------------------------------------------------------------------

  // Name of the executable (fixed for now)
  private npconfigPath: string = '~/bin/npconfig';

  // Name of the app image (fixed for now)
  private appImagePath: string =
    '~/Naim/Builds/Update/ARM-NP800_master_0.0.0.29391/Application.srec';

  // Default command timeout
  private defaultCommandTimeoutMs = 20000;

  // Callback provided for buffered requests
  private bufferedCallback: BufferedCallback | null = null;

  // Callback provided for streaming requests
  private streamingCallback: StreamingCallback | null = null;

  // Buffer for accumulated output data split into lines
  private bufferedData: BufferedData = [];

  // Device to use
  private activeDevice: string | null = null;

  // Command queue. Requests are processed asynchronously so we allow a small
  // number to be queued to avoid clients having to manage sequencing
  private maxCommandQueueLength: number = 2;

  private commandQueue: QueuedCommand[] = [];

  // Tag to add to all logging entries
  private loggingTag: string = 'NPCFG';

  //---------------------------------------------------------------------------
  // Public settings
  //---------------------------------------------------------------------------
  /*!
   * \brief Set the device to use if none explicitly selected
   * \param device
   */
  setDefaultDevice(device: string) {
    if (this.activeDevice === null) {
      Logging.log(`Default device set to: ${device}`, this.loggingTag);
      this.activeDevice = device;
    }
  }

  /*!
   * \brief Specify the device to use to communicate with the DUT
   * \param device
   */
  selectDevice(device: string) {
    this.activeDevice = device;
  }

  //---------------------------------------------------------------------------
  // Public Operations
  //
  // Note: The data rerturned from these operations is as output by the utility
  // with no additional processing.
  //---------------------------------------------------------------------------

  /*!
   * \brief Get utility version
   * \param callback Function to call when operation completes
   * \return True if request accepted
   */
  version(callback: BufferedCallback): boolean {
    return this.runBuffered(['-v'], callback);
  }

  /*!
   * \brief Get available keys for all supported devices
   *
   * NOTE:
   * Implemented as streaming mode as an example - should be buffered
   *
   * \param callback Function to call when operation completes
   * \return True if request accepted
   */
  keys(callback: StreamingCallback): boolean {
    return this.runStreaming(['-l'], callback);
  }

  /*!
   * \brief Get available devices
   * \param callback Function to call when operation completes
   * \return True if request accepted
   */
  devices(callback: BufferedCallback): boolean {
    return this.runBuffered(['-x'], callback);
  }

  /*!
   * \brief Discover details on unit via active device
   * \param callback Function to call when operation completes
   * \return True if request accepted
   */
  discover(callback: BufferedCallback): boolean {
    if (this.activeDevice !== null) {
      return this.runBuffered(['-r ', this.activeDevice], callback);
    }
    Logging.log('No active device', this.loggingTag);
    callback([], 1);
    return false;
  }

  /*!
   * \brief Reprogram the app in the active device
   * \param callback Function to call as the operation progresses
   * \return True if request accepted
   */
  reprogApp(callback: StreamingCallback): boolean {
    if (this.activeDevice !== null) {
      return this.runStreaming(
        ['-p ', this.appImagePath, this.activeDevice],
        callback,
        5 * 60 * 3600
      );
    }
    Logging.log('No active device', this.loggingTag, LogLevel.Error);
    callback(null, 1);
    return false;
  }

  //---------------------------------------------------------------------------
  // Private Helpers
  //---------------------------------------------------------------------------

  /*!
   * \brief Run the command (buffered mode)
   *
   * Runs the command and will pass the output to the supplied callback on
   * completion.
   *
   * If there is already an active command, this one will be queued unless the
   * limit of allowable queued commands has been reached. This is required so
   * that clients can issue a number of commands to be issues sequentially without
   * having to perform the sequencing themseleved in their supplied callbacks.
   *
   * \param args            Arguments to pass to the utility
   * \param callback        Function to call when operation completes
   * \param commandTimeout  max time this command can run for (millisecs)
   * \return True if command accepted (executed or queued)
   */
  private runBuffered(
    args: string[],
    callback: BufferedCallback,
    commandTimeout: number = this.defaultCommandTimeoutMs
  ): boolean {
    // Can only run the command immediately if there isn't one already in progress
    if (this.bufferedCallback === null && this.streamingCallback === null) {
      this.bufferedCallback = callback;
      this.bufferedData.splice(0);
      return this.run(args, commandTimeout);
    }

    // Add the to command queue if the limit has not been reached
    if (this.commandQueue.length < this.maxCommandQueueLength) {
      this.commandQueue.push({ parameters: args, handler: callback });
      return true;
    }

    // Command cannot be executed immediately or queued.
    return false;
  }

  /*!
   * \brief Run the command (streaming mode)
   * \param args            Arguments to pass to the utility
   * \param callback        Function to call as utility progresses
   * \param commandTimeout  max time this command can run for (millisecs)
   * \return True if command accepted
   */
  private runStreaming(
    args: string[],
    callback: StreamingCallback,
    commandTimeout: number = this.defaultCommandTimeoutMs
  ): boolean {
    // Can only accept the command request if there isn't one already in progress.
    // Streamed commands cannot be queued.
    if (this.bufferedCallback === null && this.streamingCallback === null) {
      this.streamingCallback = callback;
      return this.run(args, commandTimeout);
    }
    return false;
  }

  /*!
   * \brief Start the utility (mode agnostic)
   * \param args            Arguments to pass to the utility
   * \param commandTimeout  Max time this command can run for (millisecs)
   * \return True if command accepted
   */
  private run(
    args: string[],
    commandTimeout: number = this.defaultCommandTimeoutMs
  ): boolean {
    Logging.log(
      `Running: ${this.npconfigPath} ${args.join(
        ' '
      )} (timeout=${commandTimeout})`,
      this.loggingTag
    );
    // Spawn the utility with the supplied args and in a shell
    const child = spawn(this.npconfigPath, args, {
      shell: true,
      timeout: commandTimeout,
    });
    // Connect callbacks for stdout and command completion
    child.stdout.on('data', this.onStdout.bind(this));
    child.on('close', this.onClose.bind(this));
    child.on('error', this.onError.bind(this));
    return true;
  }

  /*!
   * \brief Callback for stdout writes from the utility
   * \param data  Data written to stdout by the spawned process
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private onStdout(data: any) {
    // Infer operating mode from which callback is assigned
    if (this.streamingCallback !== null) {
      // Streaming: Forward data as received to callback. This is not the
      // end of the command so no exit code
      this.streamingCallback(data.toString().trim(), null);
    } else if (this.bufferedCallback !== null) {
      // Buffered: Add each line from the data to the accumulated buffer without
      // any trailing newline (to ensure single line responses only have one entry
      // in the buffered data)
      this.bufferedData.splice(-1, 0, ...data.toString().trim().split('\n'));
    }
  }

  /*!
   * \brief Callback when spawed process encointers and error
   */
  // eslint-disable-next-line class-methods-use-this
  private onError(err: unknown) {
    // Not sure what we need to do here yet
    // eslint-disable-next-line no-console
    console.error(`COMMAND ERROR: ${err}`);
  }

  /*!
   * \brief Callback when spawned process ends
   * \param code    Exit code of spawned process
   */
  private onClose(code: number) {
    // If the command closes due to error or timeout, the exit code may not be
    // available so will be null. Make sure it has a value here that reflects the
    // failure in this case.
    const result: number = code === null ? 1 : code;
    Logging.log(
      `Command completed with status ${result}`,
      this.loggingTag,
      result ? LogLevel.Warning : LogLevel.Debug
    );

    // Infer operating mode from which callback is assigned
    if (this.streamingCallback !== null) {
      // Streaming: Forward return code to callback and nullify callback
      // to indicate end of transaction
      this.streamingCallback('', result);
      this.streamingCallback = null;
    } else if (this.bufferedCallback !== null) {
      // Buffered: Pass accumulated data and exit code to callback
      // and nullify the callback to indicate end of transaction
      this.bufferedCallback(this.bufferedData, result);
      this.bufferedCallback = null;
    }

    // If there are any queued commands, exectute the first one now
    if (this.commandQueue.length > 0) {
      // Could just assign the result of shift but this could be undefined and
      // causes a lint error.
      const command: QueuedCommand = this.commandQueue[0];
      this.commandQueue.shift();
      this.runBuffered(command.parameters, command.handler);
    }
  }
}
