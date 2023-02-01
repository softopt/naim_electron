/*!
 * \copyright   Naim Audio Ltd. 2022
 * \file        RendererLogging.ts
 * \author      Alex Jeffrey
 *
 * Provides logging for Renderer Process.
 *
 * Both the Main and Renderer processes can call 'console' to log messages but
 * they are handled differently. In Renderer, they are shown on the 'console'
 * tab of the embedded Chromium browser dev tools but in Main, they go to stdout.
 *
 * In order to create a combined log, the console log in Main is captured and
 * sent to the Renderer using standard IPC so that all log messages can be seen
 * in the browser dev tools.
 *
 * This implementation performs two functions:
 * a)   Provides a simple logging function is provided which should be used in
 *      the application layer of the Renderer process rather than logging directly
 *      to console because:
 *      i)  It allows process specific logging to be performed and changed later if
 *          required
 *      ii) ES Lint frowns on the usage of console so this allows any lint overrides
 *          to be performed on this file only and not throughout the application code.
 * b)   Listens to logging messages received from the Main process over IPC and
 *      adds them to the centralised log.
 */

/* eslint-disable import/prefer-default-export */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-console */

// Local imports
import { ILogging } from '../../shared/ILogging';
import { LogLevel } from '../../shared/LoggingTypes';
import * as IPC from '../../shared/IPC';

export default class RendererLogging implements ILogging {
  //-----------------------------------------------------------------------------
  // Private functions
  //-----------------------------------------------------------------------------
  /*!
   * \brief Comon logging function
   * Performs log formatting which does not depend on source process
   * \param prefix Some indication of source process
   * \param data Data to add to log
   */
  // eslint-disable-next-line class-methods-use-this
  private commonLog(
    prefix: string,
    data: unknown,
    tag: string,
    level: LogLevel
  ): void {
    // Get the current time to stamp the log entry
    const now = new Date();
    // Build the log string (ensure tag is packed to fixed width)
    const message = `[${prefix}]:${now.toISOString()},${tag.padEnd(6)},${data}`;
    // Log the string using console method appropriate for the log level
    switch (level) {
      case LogLevel.Error:
        console.error(message);
        break;

      case LogLevel.Warning:
        console.warn(message);
        break;

      default:
        console.info(message);
        break;
    }
  }

  /*!
   * \brief Handler for Main process logging nessages
   * Adds received objects to the console in the renderer process with suitable
   * annotation to mark them as [M]ain processes messages.
   * \param
   */
  private handleMainLogging(_event: unknown, arg: unknown): void {
    // Parse the message expecting an unknown argument which ißs logged
    // Ignore the message type for now as we haven't implemented logging
    // levels yet
    IPC.parseMessageAsArray(
      arg,
      (message: IPC.AllMessages, data: unknown): void => {
        const level = message as LogLevel;
        if (Array.isArray(data) && data.length === 2) {
          this.commonLog('M', data[0], data[1], level);
        }
      }
    );
  }

  //-----------------------------------------------------------------------------
  // Public functions
  //-----------------------------------------------------------------------------
  /*!
   * \brief Initialise logging module
   * MUST be called after IPC configured
   */
  init(): void {
    // Install a listener for logging messages from the Main process
    IPC.connectLoggingListener(this.handleMainLogging.bind(this));
  }

  /*!
   * \brief Logging method for Renderer process
   * Provides a function that applciation layer in the Renderer process can call to
   * log an object.
   * Should be used in preference to direct console logging
   * \param arg Object to be logged
   */
  log(data: unknown, tag: string, level: LogLevel): void {
    this.commonLog('R', data, tag, level);
  }
}
