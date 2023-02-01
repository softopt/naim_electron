/*!
 * \copyright   Naim Audio Ltd. 2022
 * \file        PageCommon.ts
 * \author      Alex Jeffrey
 *
 * This file contains helper functions that are common to all the Page components.
 *
 * If we were using class comoponents rather than functional compomnents these would
 * be methods in the base class so we need an alternative pattern.
 *
 * The design goal is to create an abstraction around the interaction with business.
 * logic in the Main process via IPC
 */

// Framework imports
import { NavigateFunction } from 'react-router-dom';

// Local imports
import * as IPC from '../../../shared/IPC';
import * as Logging from '../../../shared/Logging';
import { LogLevel } from '../../../shared/LoggingTypes';

//-----------------------------------------------------------------------------
// Private Data
//-----------------------------------------------------------------------------

// Tag included with each log entry
const loggingTag = 'Pages';

//-----------------------------------------------------------------------------
// Message send helpers
//
// These functions send specific command events to the main process over IPC.
// They are parameterless which allows them to be added to click handlers on the
// user interface.
//-----------------------------------------------------------------------------

export function sendContinue() {
  IPC.sendCommand(IPC.Commands.Continue);
}

export function sendRetry() {
  IPC.sendCommand(IPC.Commands.Retry);
}

export function sendRestart() {
  IPC.sendCommand(IPC.Commands.Restart);
}

export function sendInstall() {
  IPC.sendCommand(IPC.Commands.Install);
}

export function sendConnect() {
  IPC.sendCommand(IPC.Commands.Connect);
}

export function sendSelectedDevice(device: string): void {
  IPC.sendConfig(IPC.Configs.SelectedDevice, device);
}

//-----------------------------------------------------------------------------
// Message receive helpers
//-----------------------------------------------------------------------------
/*!
 * \brief Handle a page change request from the Main process
 *
 * The pages presented to the user represent the current state of the business
 * logic in the Main process. The UI components to not change page directly but
 * rather send events to the main state machine which may respond by moving to a
 * new page.
 *
 * The pages are managed bt the React Router which provides a hook to navigate
 * to a specific URL but this hook is only available in the context of a React
 * functional component. The component therefore registers an interest in handling
 * page changes by calling this funciton with the navigate function returned by
 * the hook.
 *
 * NOTE:
 * The IPC function called by this method registers a once only callback on the
 * relevant IPC channel which will provide the required URL (the state names are
 * designed to match the URL fragment for the page that represents it).
 * A once only callback is used because:
 * a) If we do a normal registraiton, this will be added every time the page is
 *    rendered so the message will be actioned an extra time for every render
 * b) We only need one as each message is expected to navigate away from this
 *    page so won't be needed a second time.
 *
 * \param navigate  Function to call to achieve the required page change
 */
export function installNavigateHandler(navigate: NavigateFunction): void {
  IPC.connectStateListener((_event: unknown, data: unknown): void => {
    IPC.parseMessageAsNone(data, (message: IPC.AllMessages): void => {
      Logging.log(
        `State change received: ${message}`,
        loggingTag,
        LogLevel.Debug
      );
      const url = `/${message}`;
      navigate(url);
    });
  });
}
