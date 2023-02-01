/*!
 * \copyright   Naim Audio Ltd. 2022
 * \file        UpdateCompletePage.tsx
 * \author      Alex Jeffrey
 */

/* eslint-disable react-hooks/exhaustive-deps */

// Framework imports
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

// Local imports
import * as PageCommon from './common/PageCommon';

function UpdateCompletePage() {
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
    <div className="msg-div">
      <p className="msg-status">Update Complete</p>
      <p>
        It is now safe to switch off power to the product and remove the USB
        cable
      </p>
      <br />
      <button
        className="msg-button"
        type="button"
        onClick={PageCommon.sendRestart}
      >
        Start over
      </button>
    </div>
  );
}

export default UpdateCompletePage;
