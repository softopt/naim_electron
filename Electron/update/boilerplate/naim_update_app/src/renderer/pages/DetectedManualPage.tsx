/*!
 * \copyright   Naim Audio Ltd. 2022
 * \file        DetectedManualPage.tsx
 * \author      Alex Jeffrey
 */

/* eslint-disable react-hooks/exhaustive-deps */

// Framework imports
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

// Local imports
import * as IPC from 'shared/IPC';
import * as Logging from 'shared/Logging';
import * as PageCommon from './common/PageCommon';

// Tag to include with all log entries
const loggingTag = 'DMP';

function DetectedManualPage() {
  // Define a const to represent the default device set so we can
  // initialise the state with the correct type
  const defaultDevices: string[] = [];

  // Create state using the useState() hook to allow the device set to
  // be updated
  const [devices, setDevices] = useState(defaultDevices);

  // Get the React hook we can use to navigate to a new page
  // Must get it at function scope as it cannot be obtained within
  // the scope of useEffect() where it is used.
  const nav = useNavigate();

  // Handler when a device list is received from the Main process
  // which updates the state using the created setter
  function onConfig(_event: unknown, args: unknown) {
    // Parse the message to extract data in the expected format which is
    // a string array of device names
    IPC.parseMessageAsArray(
      args,
      (message: IPC.AllMessages, data: string[]): void => {
        if (message === IPC.Configs.AvailableDevices) {
          Logging.log(`onDeviceList: ${data}`, loggingTag);
          setDevices(data);
        }
      }
    );
  }

  // Handler when the user selects a new item in the device list which
  // is used to send the selection to the Main process
  //
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function handleChange(event: any) {
    if (event !== null) {
      const { value } = event.target;
      IPC.sendConfig(IPC.Configs.SelectedDevice, value);
      Logging.log(`Selecting device: ${value}`, loggingTag);
    }
  }

  // The React useEffect() hook is used to perform per-render actions
  // It is used here to register a page navigation handler (which performs
  // a page change when requested to by the Main process). Note that we
  // supply an empty dependecy array so this is only called on the first
  // render.
  useEffect(() => {
    // Enable common hadling of state base page selection request
    PageCommon.installNavigateHandler(nav);
    // Listen for config changes (device list)
    IPC.connectConfigListener(onConfig);
    // Specify how to clean up after this effect on the last render
    //  Required to disconnect listeners
    return function cleanup() {
      Logging.log('Cleanup', loggingTag);
      IPC.disconnectConfigListener(onConfig);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Render the page
  return (
    <div className="msg-div">
      <p className="msg-prompt">Choose a USB device</p>
      <br />
      {devices.length > 0 && (
        <select name="ports" id="ports" onChange={handleChange}>
          {devices.map((device) => (
            <option value={device} key={device}>
              {device}
            </option>
          ))}
        </select>
      )}
      {devices.length === 0 && <p>No devices available</p>}
      <br />
      <br />
      <div className="msg-div">
        <button
          className="msg-button"
          type="button"
          onClick={PageCommon.sendConnect}
        >
          Connect
        </button>
      </div>
    </div>
  );
}

export default DetectedManualPage;
