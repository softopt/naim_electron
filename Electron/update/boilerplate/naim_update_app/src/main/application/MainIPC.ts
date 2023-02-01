/*!
 * \copyright   Naim Audio Ltd. 2022
 * \file        MainIPC.ts
 * \author      Alex Jeffrey
 *
 * Main process implementation of the IIPC interface.
 */

/* eslint-disable class-methods-use-this */
/* eslint-disable no-console */

// Framework imports
import { BrowserWindow, ipcMain } from 'electron';

// Local imports
import { IPCListener, IIPC } from 'shared/IIPC';

/*!
 * \brief IIPC for Main Process
 *
 * Implements the IIPC interface so that it can be used in the Main Process.
 */

export default class MainIPC implements IIPC {
  /*!
   * \brief Send an object to a named channel
   * Electron apps may have multiple renderers so messages are sent to the
   * destination window. As we are presuming a Single Page Application (SPA)
   * we just need to find the single window.
   *
   * NOTE: Previous attempts (suggested by online examples) send the message
   * to the currently focussed window but this gives off behaivour if the app
   * is not focussed (i.e. no messages are sent!).
   * \param channel
   * \param data
   */
  send(channel: string, data: unknown[]): void {
    // Use the global BorwserWindow object to retrieve the list of active
    // windows. As we expect there to be only one, use the first one it
    // returns
    const allWindows: BrowserWindow[] = BrowserWindow.getAllWindows();
    if (allWindows.length === 1) {
      const window = allWindows[0];
      // window?.webContents.on('ipc-message', (event, channel, any) => {
      // });
      window?.webContents.send(channel, data);
    } else {
      // Log direclty to the error console as log is intercepted on Main and
      // won't get sent as it uses this 'send' method and so will spin
      console.error(`Expected a single window but got ${allWindows.length}`);
    }
  }

  /*!
   * \brief Add a listener to a named channel
   * Listen for messages on the Electron ipcMain object as there is a
   * single Main process and all renderer messages are marshalled through
   * to it
   * \param channel
   * \param listener
   */
  addListener(channel: string, listener: IPCListener): void {
    ipcMain.on(channel, listener);
  }

  /*!
   * \brief Remove listener from a named channel
   * Stop listening for messages on the Electron ipcMain object
   * \param channel
   * \param listener
   */
  removeListener(channel: string, listener: IPCListener): void {
    ipcMain.removeListener(channel, listener);
  }

  /*!
   * \brief Remove all listeners from a named channel
   * Stop listening for messages on the Electron ipcMain object
   * \param channel
   * \param listener
   */
  removeAllListeners(channel: string): void {
    ipcMain.removeAllListeners(channel);
  }

  /*!
   * \brief Add a once-only listener to a named channel
   * Listen for a single messages on the Electron ipcMain object and
   * automatically fremove the listener after the first message
   * \param channel
   * \param listener
   */
  listenOnce(channel: string, listener: IPCListener): void {
    ipcMain.once(channel, listener);
  }

  /*!
   * \brief Query how many listeners are connected to a named channel
   * \param channel
   */
  listenerCount(channel: string): number {
    return ipcMain.listenerCount(channel);
  }
}
