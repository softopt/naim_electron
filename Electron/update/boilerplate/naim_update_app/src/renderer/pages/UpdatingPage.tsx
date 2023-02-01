/*!
 * \copyright   Naim Audio Ltd. 2022
 * \file        UpdatingPage.tsx
 * \author      Alex Jeffrey
 */

/* eslint-disable react-hooks/exhaustive-deps */

// Framework imports
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Spinner from 'react-bootstrap/Spinner';
import { ProgressBar } from 'react-bootstrap';

// Local imports
import * as PageCommon from './common/PageCommon';
import * as IPC from '../../shared/IPC';
import * as Logging from '../../shared/Logging';

// Tag to include with all log entries
const loggingTag = 'UP';

function UpdatingPage() {
  // Get the React hook we can use to navigate to a new page
  // Must get it at function scope as it cannot be obtained within
  // the scope of useEffect() where it is used.
  const navigator = useNavigate();

  // Add state data for the reprogramming progress
  const [progress, setProgress] = useState(0);

  // Callback function associated with receipt of reprogramming progress
  function onConfig(_event: unknown, data: unknown) {
    IPC.parseMessageAsUnknown(
      data,
      (message: IPC.AllMessages, value: unknown): void => {
        // If this is the expected message, extract progress as a number
        // form the unknown data
        if (message === IPC.Configs.ReprogProgress) {
          const percent: number = value as number;
          // Use state setter to update value and provoke re-draw
          setProgress(percent);
        }
      }
    );
  }

  // The React useEffect() hook is used to perform per-render actions
  // It is used here to register a page navigation handler (which performs
  // a page change when requested to by the Main process). Note that we
  // supply an empty dependecy array so this is only called on the first
  // render.
  useEffect(() => {
    PageCommon.installNavigateHandler(navigator);
    IPC.connectConfigListener(onConfig);
    // Specify how to clean up after this effect on the last render
    //  Required to disconnect listeners
    return function cleanup() {
      Logging.log('Cleanup', loggingTag);
      IPC.disconnectConfigListener(onConfig);
    };
  }, []);

  // Render the controls on the page
  return (
    <div className="msg-div">
      <p className="msg-action">Updating firmware</p>
      <br />
      <p className="msg-prompt">
        Do not switch off power to the product during the update
      </p>
      <Spinner animation="border" variant="primary" />
      <hr />
      <ProgressBar now={progress} label={`${progress}%`} />
    </div>
  );
}

export default UpdatingPage;
