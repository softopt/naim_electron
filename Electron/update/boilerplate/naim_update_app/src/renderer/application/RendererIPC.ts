/*!
 * \copyright   Naim Audio Ltd. 2022
 * \file        RendererIPC.ts
 * \author      Alex Jeffrey
 *
 * Renderer process implementation of the IIPC interface.
 */

/* eslint-disable class-methods-use-this */

// Local imports
import { IPCListener, IIPC } from 'shared/IIPC';

/*!
 * \brief IIPC for Renderer Process
 *
 * Implements the IIPC interface so that it can be used in the Renderer Process.
 */
export default class RendererIPC implements IIPC {
  /*!
   * \brief Send an object to a named channel
   * Send to ipcRenderer object marshalled in from Electron by the preload script
   * \param channel
   * \param data
   */
  send(channel: string, data: unknown[]): void {
    window.electron.ipcRenderer.sendMessage(channel, data);
  }

  /*!
   * \brief Add a listener to a named channel
   * Listen for messages on the Electron ipcRenderer object marshalled in from
   * Electron by the preload script
   * \param channel
   * \param listener
   */
  addListener(channel: string, listener: IPCListener): void {
    window.electron.ipcRenderer.on(channel, listener);
  }

  /*!
   * \brief Remove listener from a named channel
   * Stop listening for messages on the ipcRenderer object marshalled in from Electron
   * by the preload script
   * \param channel
   * \param listener
   */
  removeListener(channel: string, listener: IPCListener): void {
    window.electron.ipcRenderer.removeListener(channel, listener);
  }

  /*!
   * \brief Remove all listener from a named channel
   * Stop listening for messages on the ipcRenderer object marshalled in from Electron
   * by the preload script
   * \param channel
   */
  removeAllListeners(channel: string): void {
    window.electron.ipcRenderer.removeAllListeners(channel);
  }

  /*!
   * \brief Add a once-only listener to a named channel
   * Listen for a single messages on the Electron ipcRenderer object marshalled in from
   * Electron by the preload script
   * \param channel
   * \param listener
   */
  listenOnce(channel: string, listener: IPCListener): void {
    window.electron.ipcRenderer.once(channel, listener);
  }

  /*!
   * \brief Query how many listeners are connected to a named channel
   * \param channel
   */
  listenerCount(channel: string): number {
    return window.electron.ipcRenderer.listenerCount(channel);
  }
}
