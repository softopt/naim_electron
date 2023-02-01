/*!
 * \copyright   Naim Audio Ltd. 2022
 * \file        Logging.ts
 * \author      Alex Jeffrey
 *
 * This file contains a process agnostic wrapper around process specific logging
 * utilities.
 *
 * The underlying, process specific implementaion is provided by an object that
 * implements the 'ILogging' interface which is provided by dependecy injection.
 *
 * This is factored as a module (not a class) which encapsulates the underlying
 * implementation to faciltate the use throughout the process withough having
 * to pass the implementation via dependency injection.
 */

/* eslint-disable import/no-cycle */

// Local imports
import { ILogging } from './ILogging';
import { LogLevel } from './LoggingTypes';

//-----------------------------------------------------------------------------
// Private Data
//-----------------------------------------------------------------------------

// Object that provides the process specific implementation of logging
let loggingImplementation: ILogging | null = null;

//-----------------------------------------------------------------------------
// Public functions
//-----------------------------------------------------------------------------
/*!
 * \brief Initialise the logging by providing process specific implementation
 * \param logging
 */
export function init(logging: ILogging) {
  // Save the implementation object and ask it to perform its own initialisation
  loggingImplementation = logging;
  loggingImplementation.init();
}

/*!
 * \brief Log an object
 * \param data
 */
export function log(
  data: unknown,
  tag: string,
  level: LogLevel = LogLevel.Debug
): void {
  if (loggingImplementation !== null) {
    loggingImplementation.log(data, tag, level);
  }
}
