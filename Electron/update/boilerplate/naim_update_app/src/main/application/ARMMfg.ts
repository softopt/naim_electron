/*!
 * \copyright   Naim Audio Ltd. 2022
 * \file        ARMMfg.ts
 * \author      Alex Jeffrey
 *
 * Class to wrap up a session in which a MFG comamnd is sent to the ARM via
 * its serial debug port
 */

// Framework imports
import { SerialPort } from 'serialport';

// Local imports
import * as Logging from '../../shared/Logging';
import { LogLevel } from '../../shared/LoggingTypes';

// Types
export type SerialData = string[];
export type SerialDataCallback = (data: SerialData) => void;

/*!
 * \brief ARM manufacturing command executor class
 *
 * This class encapsulates a conneciton to the debug port of the ARM processor
 * on the UUT. It allows manufacturing ('mfg') commands to be executed and their
 * results captured and returned to the caller on completion (i.e. callback is
 * called on command completion only not as response is received on a line by
 * line basis).
 *
 * The serial port usage is NOT tied to the lifetime of this class and is closed
 * between commands so that it is available for other clients
 */
export class ARMMfg {
  //---------------------------------------------------------------------------
  // Private Data
  //---------------------------------------------------------------------------

  // Device to use for all commands
  private device: string | null = null;

  // Object providing access to the serial port
  private port: SerialPort | null = null;

  // Baud rate for connection to the ARM debug port
  private debugPortBaudRate: number = 115000;

  // Callback provided by client to get commadn response on completion
  private dataCallback: SerialDataCallback | null = null;

  // Accumulate all the data received
  private responseData: string = '';

  // Tag to include with all log entries
  private loggingTag: string = 'ARMCFG';

  //---------------------------------------------------------------------------
  // Private Methods
  //---------------------------------------------------------------------------
  /*!
   * \brief Handle response data as it arrives
   *
   * This method is attacjed to the serial port as the data event handler and
   * is called when any chunk of data is received. The client is not informed
   * until the command is complete which is detected here by the last response
   * being the debug port CLI prompt.
   * \param data  Response data chunk
   */
  private onData(data: Buffer): void {
    // Convert the buffer to a string an append it to the accumulated response
    // data
    const value: string = data.toString().trim();
    this.responseData += value;

    // Split the accumulated data into lines. Note that we don't do this on
    // the received data as it is possible the chunks will be received mid-line
    // and we want to keep lines together.
    const lines: string[] = this.responseData.split('\n');

    // If we have at least one full line, check to see if the last one is the
    // debug port command prompt which indicates the command is complete
    if (lines.length > 0) {
      if (lines[lines.length - 1] === '-') {
        // Command complete to send the response lines to the client
        if (this.dataCallback !== null) {
          this.dataCallback(lines);
        }
        // Close the port so it can be used for other purposes between commands
        // if required
        this.port?.close();
        this.port = null;
        // Client must provide a callback with each command request so we're done
        // with this one now
        this.dataCallback = null;
      }
    }
  }

  //---------------------------------------------------------------------------
  // Public Methods
  //---------------------------------------------------------------------------

  /*!
   * \brief Set Device
   * Specify the serial port device that is to be used to communicate with the
   * ARM debug port.
   * \param device  name of the serial device to use
   */
  setDevice(device: string): void {
    this.device = device;
  }

  /*!
   * \brief Run a single mfg command
   * The serial port is opened and the command is executed. Once the command
   * has completed, the results are returned to the caller via the supplied
   * callback and the port is closed.
   *
   * Only one command can be pending at a time and there is no queueing system
   *
   * \param command Command as a string with all parameters
   * \return True if command accepted and successfully sent
   */
  runCommand(command: string, callback: SerialDataCallback | null): boolean {
    Logging.log(`Run mfg command: ${command}`, this.loggingTag);
    // If we have a port, there is a command in progress so reject this one
    if (this.port !== null) {
      return false;
    }

    // Can't do anything if we haven't been told what device to use
    if (this.device == null) {
      return false;
    }

    let result = true;

    // Open the port with the supplied device.
    this.port = new SerialPort(
      {
        path: this.device,
        baudRate: this.debugPortBaudRate,
      },
      (error): void => {
        if (error !== null && error !== undefined) {
          Logging.log(
            `Run mfg command: ${command} - failed to open port`,
            this.loggingTag,
            LogLevel.Warning
          );
          result = false;
        }
      }
    );

    // If we still have a port, invoke the new command by:
    // a) Clearing the accumulating repsonse data
    // b) Saving the supplied callback which will get all response data on completion
    // c) Assigning an internal callback which will get response data as it is received
    // d) Write the command in the required format to the serial port
    if (this.port !== null) {
      this.responseData = '';
      this.dataCallback = callback;
      this.port.on('data', this.onData.bind(this));
      this.port.write(`mfg ${command}\n`, (error): void => {
        if (error !== null && error !== undefined) {
          Logging.log(
            `Run mfg command: ${command} - failed to send command`,
            this.loggingTag,
            LogLevel.Warning
          );
          result = false;
        }
      });
    }

    // If the command was not sent successfully, close the port
    if (!result) {
      this.port = null;
    }
    return result;
  }
}
