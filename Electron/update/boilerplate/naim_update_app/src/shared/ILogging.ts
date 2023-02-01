/*!
 * \copyright   Naim Audio Ltd. 2022
 * \file        ILogging.ts
 * \author      Alex Jeffrey
 *
 * This file contains the definition of an interface that defines the functionality
 * that must be provided by process specific logging implementations.
 *
 * Logging must be done differently in Main and Responder processes so that
 * a single, coherent log can be created.
 */

// Local imports
import { LogLevel } from './LoggingTypes';

//
// Interface
//
export interface ILogging {
  // Initialise logging module
  init: () => void;
  // Log a message.
  log: (data: unknown, tag: string, level: LogLevel) => void;
}
