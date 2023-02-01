/*!
 * \copyright   Naim Audio Ltd. 2022
 * \file        preload.ts
 * \author      Boilerplate / Alex Jeffrey
 *
 * This is originally part of the boilerplate used but modified as it didn't expose the IPC
 * in the way we want to use it/
 */

/* eslint-disable @typescript-eslint/no-unused-vars */

import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    // sendMessage
    //
    // Send a message to the named channel
    sendMessage(channel: string, args: unknown[]) {
      ipcRenderer.send(channel, args);
    },
    // on
    //
    // Install a listener for a named channel that is not automatically removed. See notes
    // on 'removeListener' for current issues with this approach.
    // Changed from boilerplate such that supplied listener is registered rather than a
    // lamda adapter to facilitate removal in stateless, functional React components
    on(channel: string, listener: (event: Event, args: unknown[]) => void) {
      ipcRenderer.on(channel, listener);
    },
    // once
    //
    // Install a listener for a named channel that is automatically removed when the event
    // is fired.
    once(channel: string, listener: (event: Event, args: unknown[]) => void) {
      ipcRenderer.once(channel, listener);
    },
    // removeListener
    //
    // Removes a previosuly added listener from a named channel
    removeListener(
      channel: string,
      listener: (event: Event, args: unknown[]) => void
    ) {
      ipcRenderer.removeListener(channel, listener);
    },
    // removeAllListeners
    //
    // Remove all connected listeners from a named channel
    removeAllListeners(channel: string) {
      ipcRenderer.removeAllListeners(channel);
    },

    // listenerCount
    //
    // Returns the number of listeners on a named channel. Exposed here to allow debug
    // at a higher level (and we don't want console logging here as not sure which process
    // is it in).
    // Added to boilerplate to aid debug of listener addition/removal
    listenerCount(channel: string): number {
      return ipcRenderer.listenerCount(channel);
    },
  },
});
