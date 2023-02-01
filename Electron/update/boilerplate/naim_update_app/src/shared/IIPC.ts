/*!
 * \copyright   Naim Audio Ltd. 2022
 * \file        IIPC.ts
 * \author      Alex Jeffrey
 *
 * This file contains the definition of an interface that defines the functionality
 * that must be provided by process specific IPC implementations.
 *
 * The way messages are sent ands received is different in the Main and Renderer
 * processes so in order to allow them to use a common interface, different
 * implementations are required.
 */

// Signature of all listeners
//
// IPC is performed in generic term with unknown types. Currently,
// all listeners have to conform to this and perform their own type
// narrowing etc.
export type IPCListener = (_event: unknown, data: unknown) => void;

// Interface
//
// Basic methods to access IPC
//
export interface IIPC {
  send: (channel: string, data: unknown[]) => void;
  addListener: (channel: string, listener: IPCListener) => void;
  removeListener: (channel: string, listener: IPCListener) => void;
  removeAllListeners: (channel: string) => void;
  listenOnce: (channel: string, listener: IPCListener) => void;
  listenerCount: (channel: string) => number;
}
