/*!
 * \copyright   Naim Audio Ltd. 2022
 * \file        DetectedFailedPage.tsx
 * \author      Alex Jeffrey
 */

/* eslint-disable react-hooks/exhaustive-deps */

// Framework imports
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

// Local imports
import * as PageCommon from './common/PageCommon';

function DetectedFailedPage() {
  // Get the React hook we can use to navigate to a new page
  // Must get it at function scope as it cannot be obtained within
  // the scope of useEffect() where it is used.
  const navigator = useNavigate();

  // The React useEffect() hook is used to perform per-render actions
  // It is used here to register a page navigation handler (which performs
  // a page change when requested to by the Main process). Note that we
  // supply an empty dependecy array so this is only called on the first
  // render.
  useEffect(() => {
    PageCommon.installNavigateHandler(navigator);
  }, []);

  // Render the controls on the page
  return (
    <div>
      <p className="msg-status">No product detected</p>
      <br />
      <p>
        Check your USB cable - sometimes cables are for charging only and do not
        support data connection
      </p>
      <br />
      <div className="msg-div">
        <button
          className="msg-button"
          type="button"
          onClick={PageCommon.sendRetry}
        >
          Try Again
        </button>
      </div>
      <div className="msg-div">
        <button
          className="msg-button"
          type="button"
          onClick={PageCommon.sendContinue}
        >
          Manually select USB device
        </button>
      </div>
    </div>
  );
}

export default DetectedFailedPage;
