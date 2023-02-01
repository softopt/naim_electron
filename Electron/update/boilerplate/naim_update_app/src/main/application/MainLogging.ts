/*!
 * \copyright   Naim Audio Ltd. 2022
 * \file        MainLogging.ts
 * \author      Alex Jeffrey
 *
 * Provides logging for Main Process.
 *
 * Both the Main and Renderer processes can call 'console' to log messages but
 * they are handled differently. In Renderer, they are shown on the 'console'
 * tab of the embedded Chromium browser dev tools but in Main, they go to stdout.
 *
 * A simple logging function is provided which should be used in the application
 * layer of the Main process rather than logging directly to console because:
 * a) It allows additional parameters (level, tag) to be provided
 * b) ES Lint frowns on the usage of console so this allows any lint overrides
 *    to be performed on this file only and not throughout the application code.
 *
 * In case any code in the Main process is still using 'console.log', it is
 * intercepted and sent to the Renderer using standard IPC with suitable tag and
 * level settings to highlight it
 */

/* eslint-disable no-console */
/* eslint-disable class-methods-use-this */

// Local imports
import { ILogging } from '../../shared/ILogging';
import { LogLevel } from '../../shared/LoggingTypes';
import * as IPC from '../../shared/IPC';

//-----------------------------------------------------------------------------
// Public functions
//-----------------------------------------------------------------------------
export default class MainLogging implements ILogging {
  /*!
   * \brief Initialise logging module
   * MUST be called after IPC configured
   */
  init(): void {
    // Set redirect to console logging which sends them to Renderer over IPC
    // Set a tag and level to ensure thay can be spotted in the combined log
    console.log = (message: unknown): void =>
      IPC.sendLogging(message, 'Console', LogLevel.Error);
  }

  /*!
   * \brief Logging method for Main process
   * Provides a function that application layer in the Main process can call to
   * log an object.
   * Should be used in preference to direct console logging
   * \param arg Object to be logged
   * \para
   */
  log(data: unknown, tag: string, level: LogLevel): void {
    // Send to the Renderer via IPC
    IPC.sendLogging(data, tag, level);
    // Also send the log to the error console as the console log is redirected to the
    // Renderer process over IPC which might fail. Useful to replicate this in the main process
    // console when investigating IPC issues. Consider making this conditional.
    console.error(data);
  }
}
