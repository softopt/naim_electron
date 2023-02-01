/*!
 * \copyright   Naim Audio Ltd. 2022
 * \file         IPC.ts
 * \author      Alex Jeffrey
 *
 * This file contains the common definitions associated with IPC between
 * the Main and Renderer processes.
 *
 * It provides the channel and message related types and a colleciton of
 * methods to simplify sending & receiving messages in a process (main/renderer)
 * agnostic fashion.
 *
 * The underlying, process specific implementaion is provided by an object that
 * implements the 'IIPC' interface which is provided by dependecy injection.
 *
 * This module performs two main functions:
 * a) Provides a set of types and functions to facilitate the use of IPC in
 *    the update application which is the same in Main and Renderer processes
 * b) This is factored as a module (not a class) which encapsulates the underlying
 *    implementation to faciltate the use throughout the process withough having
 *    to pass the implementation via dependency injection.
 */
/* eslint-disable import/no-cycle */

// Local includes
import { IIPC, IPCListener } from './IIPC';
import * as Logging from './Logging';
import { LogLevel } from './LoggingTypes';

//-----------------------------------------------------------------------------
// Types
//-----------------------------------------------------------------------------

//
// Channels
//
export enum Channels {
  Commands = 'renderer-commands',
  State = 'main-state',
  Config = 'config',
  Logger = 'main-logging',
}
//
// Command types (parameter on Commands channel)
//
// Represent simple commands sent from the Renderer in response to user actions
// may effect the state machine
//
export enum Commands {
  Continue = 'continue',
  Retry = 'retry',
  Restart = 'restart',
  Select = 'select',
  Install = 'install',
  Connect = 'connect',
}

//
// State Machine States (parameter on State channel)
//
// These are the states witin the Main process state machine that are represented
// by a specific page
//
// They are assigned string values to aid debug but also to represent the URL fragment
// of the page that represents them (to simplify the routing)
//
export enum States {
  Welcome = 'welcome',
  CheckingForUpdate = 'checking',
  CheckFailedOffline = 'offline',
  CheckFailedCached = 'cached',
  ConnectPrompt = 'connect',
  Detecting = 'detecting',
  DetectionFailed = 'noproduct',
  DetectingManual = 'manualselect',
  DetectedCurrent = 'current',
  DetectedAvailable = 'available',
  Updating = 'updating',
  UpdateComplete = 'updatecomplete',
  UpdateFailed = 'updatefailed',
}

//
// Configuration items (parameter on Config channel)
//
export enum Configs {
  AvailableDevices,
  SelectedDevice,
  ProductDetails,
  FirmwareVersions,
  ReprogProgress,
}

//
// Combined type that can contain any of the channel specific message types
//
export type AllMessages = Commands | States | Configs | LogLevel;

//-----------------------------------------------------------------------------
// Private Data
//-----------------------------------------------------------------------------

// Interface onto the process specific implementation of the IPC mechanism.
let ipcImplementation: IIPC | null = null;

// Tag included with each log entry
const loggingTag = 'IPC';

//-----------------------------------------------------------------------------
// Configuration methods
//-----------------------------------------------------------------------------
/*!
 * \brief Provide the underlying ICP implementation
 *
 * Pass in the object which provides the process specific implementation of the
 * IIPC interface
 *
 * \param ipc
 */
export function init(ipc: IIPC): void {
  ipcImplementation = ipc;
}

//-----------------------------------------------------------------------------
// Message cracking methods
//
// The underlying IPC mechanisms are defined in terms of 'unknown' data types
// and it becomes the responsibility of the receiver to perform the necessary
// type checking.
// These methods can be called on receipt of data over IPC to decode the message
// with an expected format.
// All messages in this context are of the form:
// [ <message>, <arguments> ]
// where:
// <message> is one of the message types across all channels
// <arguments> is of a channel specific format
//-----------------------------------------------------------------------------
/*!
 * \brief Decode a message expected to contain no arguments
 * Checks the supplied data is in the required format and, if so, call the
 * supplied handler with the correcly typed data.
 * \param data The message as received
 * \param handler A function to call to return correctly types data
 * \return True if data is in expected format
 */
export function parseMessageAsNone(
  data: unknown,
  handler: (message: AllMessages) => void
): boolean {
  // Data is correct if:
  // a) <data> is an array
  // b) Element 0 (<message>) is NOT an array
  // c) Element 1 (<arguments>) does not exist
  if (Array.isArray(data) && data.length === 1 && !Array.isArray(data[0])) {
    handler(data[0]);
    return true;
  }
  return false;
}

/*!
 * \brief Decode a message expected to contain a single string value
 * Checks the supplied data is in the required format and, if so, call the
 * supplied handler with the correcly typed data.
 * \param data The message as received
 * \param handler A function to call to return correctly types data
 * \return True if data is in expected format
 */
export function parseMessageAsString(
  data: unknown,
  handler: (message: AllMessages, value: string) => void
): boolean {
  // Data is correct if:
  // a) <data> is an array
  // b) Element 0 (<message>) is NOT an array
  // c) Element 1 (<arguments>) is NOT an array
  if (Array.isArray(data) && data.length === 2 && !Array.isArray(data[0])) {
    if (!Array.isArray(data[1]) && typeof data[1] === 'string') {
      handler(data[0], data[1]);
      return true;
    }
  }
  return false;
}

/*!
 * \brief Decode a message expected to contain a single unknown object
 * Checks the supplied data is in the required format and, if so, call the
 * supplied handler with the correcly typed data.
 * \param data The message as received
 * \param handler A function to call to return correctly types data
 * \return True if data is in expected format
 */
export function parseMessageAsUnknown(
  data: unknown,
  handler: (message: AllMessages, value: unknown) => void
): boolean {
  // Data is correct if:
  // a) <data> is an array
  // b) Element 0 (<message>) is NOT an array
  // c) Element 1 (<arguments>) is NOT an array
  if (Array.isArray(data) && data.length === 2 && !Array.isArray(data[0])) {
    if (!Array.isArray(data[1])) {
      handler(data[0], data[1]);
      return true;
    }
  }
  return false;
}

/*!
 * \brief Decode a message expected to contain an array of strings
 * Checks the supplied data is in the required format and, if so, call the
 * supplied handler with the correcly typed data.
 * \param data The message as received
 * \param handler A function to call to return correctly types data
 * \return True if data is in expected format
 */
export function parseMessageAsArray(
  data: unknown,
  handler: (message: AllMessages, values: string[]) => void
): boolean {
  // Data is correct if:
  // a) <data> is an array
  // b) Element 0 (<message>) is NOT an array
  // c) Element 1 (<arguments>) is an array
  if (Array.isArray(data) && data.length === 2 && !Array.isArray(data[0])) {
    if (Array.isArray(data[1])) {
      handler(data[0], data[1]);
      return true;
    }
  }
  return false;
}

//-----------------------------------------------------------------------------
// Command channel helpers
//-----------------------------------------------------------------------------
/*!
 * \brief Send a Command message
 * \param command
 */
export function sendCommand(command: Commands): void {
  if (ipcImplementation !== null) {
    ipcImplementation.send(Channels.Commands, [command]);
  }
}

//-----------------------------------------------------------------------------
// State channel helpers
//-----------------------------------------------------------------------------
/*!
 * \brief Send a state change
 * \param state
 */
export function sendStateChange(state: States): void {
  if (ipcImplementation !== null) {
    ipcImplementation.send(Channels.State, [state]);
  }
}

//-----------------------------------------------------------------------------
// Config channel helpers
//-----------------------------------------------------------------------------
/*!
 * \brief Send a config change
 * \param config Which config are we reporting/setting?
 * \param value The value being set (no specific type)
 */
export function sendConfig(config: Configs, value: unknown): void {
  if (ipcImplementation !== null) {
    ipcImplementation.send(Channels.Config, [config, value]);
  }
}

//-----------------------------------------------------------------------------
// Logging channel helpers
//-----------------------------------------------------------------------------
/*!
 * \brief Send a config change
 * \param level Level of logging
 * \param tag   Hint at source of logging message
 * \param value The object being logged (no specific type)
 */
export function sendLogging(data: unknown, tag: string, level: LogLevel): void {
  if (ipcImplementation !== null) {
    ipcImplementation.send(Channels.Logger, [level, [data, tag]]);
  }
}

//-----------------------------------------------------------------------------
// Channel listening adding and removal helpers
//
// These methods simplify the adding and removal of listening handlers to their
// respective channels.
//
// In their current implementation, they don't add much value because they are
// simple pass throughs to the process specific implementation. However, they
// are still required as:
// a) There is no other route to the underlying implementation for the relevant
//    application layer.
// b) Theey are specific to a channel type. ALl ths does at the moment is remove
//    the requirement to pass the channel name which is not that
//    useful but it does mean we can do different things when connecting to each
//    channel type in future.
// c) In future, we may think of a way to do this such that the listeners have
//    the correct signature (i.e. in terms of actual message types rather than
//    'unknown').
//
// Currenltly, preferred pattern is:
// a) Write listeners in basic form (see IPCListener)
// b) Use message devode methods provided here to proxy them through to correcly
//    typed callbacks
//
// NOTES:
// Previous attempts have been made to use this to adapt the generic (unknown)
// nature of the underlying mechanism to the data types required by the
// application. There is a pattern for this in the boiler plate verison of
// main/preload.ts which wraps the supplied listener in a new lamda funciton
// and returns a function which can be is used to unlisten (as the supplied listener
// is not the one actually connected). This is a nice pattern but didn't work
// for me because:
// a) I think there may be an issue with this such that removing listeners via
//    the preload pattern in the Renderer doesn't work for me and this pattern
//    complicates that
// b) Using funcitonal React components (as opposed to class based components)
//    and relying on React hooks to do the register/register doesn't work due
//    to scoping rules and the requirement for hooks to be stateless.
// c) Only way to work currently is to for application layer to pass raw listener
//    to add and remove methods
// Perhaps this can be revisited later when understanding of relevant issues is
// better.
//-----------------------------------------------------------------------------
/*!
 * \brief Private listener logging helper
 * Makes appropriate log entry for change of channel listener registrations
 * \param channel The channel whose listeners have changed
 * \param add Listener removed (rather than added)
 */
function logListenerChange(
  channel: Channels,
  removed: boolean,
  once: boolean
): void {
  if (ipcImplementation !== null) {
    Logging.log(
      `Listener ${
        removed ? 'removed' : 'added'
      }: [${channel},${ipcImplementation.listenerCount(Channels.State)}${
        once ? ',once' : ''
      }]`,
      loggingTag,
      LogLevel.Debug
    );
  }
}

/*!
 * \brief Connect a listener to the command channel
 * \param listener
 */
export function connectCommandListener(listener: IPCListener): void {
  if (ipcImplementation !== null) {
    ipcImplementation.addListener(Channels.Commands, listener);
    logListenerChange(Channels.Commands, false, false);
  }
}

/*!
 * \brief Disconnect a listener from the command channel
 * \param listener
 */
export function disconnectCommandListener(listener: IPCListener): void {
  if (ipcImplementation !== null) {
    ipcImplementation.removeListener(Channels.Commands, listener);
    logListenerChange(Channels.Commands, true, false);
  }
}

/*!
 * \brief Connect a listener to the states channel
 * \param listener
 */
export function connectStateListener(listener: IPCListener): void {
  if (ipcImplementation !== null) {
    ipcImplementation.removeAllListeners(Channels.State);
    ipcImplementation.addListener(Channels.State, listener);
    logListenerChange(Channels.State, false, true);
  }
}

/*!
 * \brief Disconnect a listener from the states channel
 * \param listener
 */
export function disconnectStateListener(listener: IPCListener): void {
  if (ipcImplementation !== null) {
    ipcImplementation.removeListener(Channels.State, listener);
    logListenerChange(Channels.State, true, true);
  }
}

/*!
 * \brief Connect a listener to the logging channel
 * \param listener
 */
export function connectLoggingListener(listener: IPCListener): void {
  if (ipcImplementation !== null) {
    ipcImplementation.addListener(Channels.Logger, listener);
    logListenerChange(Channels.Logger, false, false);
  }
}

/*!
 * \brief Disconnect a listener from the logging channel
 * \param listener
 */
export function disconnectLoggingListener(listener: IPCListener): void {
  if (ipcImplementation !== null) {
    ipcImplementation.removeListener(Channels.Logger, listener);
    logListenerChange(Channels.Logger, true, false);
  }
}

/*!
 * \brief Connect a listener to the config channel
 * \param listener
 */
export function connectConfigListener(listener: IPCListener): void {
  if (ipcImplementation !== null) {
    ipcImplementation.addListener(Channels.Config, listener);
    logListenerChange(Channels.Config, false, false);
  }
}

/*!
 * \brief Disconnect a listener from the config channel
 * \param listener
 */
export function disconnectConfigListener(listener: IPCListener): void {
  if (ipcImplementation !== null) {
    ipcImplementation.removeListener(Channels.Config, listener);
    logListenerChange(Channels.Config, true, false);
  }
}
