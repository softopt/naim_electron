/*!
 * \copyright   Naim Audio Ltd. 2022
 * \file        LoggingTypes.ts
 * \author      Alex Jeffrey
 *
 * This file contains the common definitions for logging seperate from any
 * implementation so gthay can be sgared without creating circular dependencies
 * (specifically between IPC and Logging which use each other)
 */

/* eslint-disable import/prefer-default-export */

//-----------------------------------------------------------------------------
// Public Types
//-----------------------------------------------------------------------------

//
// Logging level
//
export enum LogLevel {
  Debug = 'DEBUG',
  Warning = 'WARNING',
  Error = 'ERROR',
}
