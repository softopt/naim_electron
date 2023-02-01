/*!
 * \copyright   Naim Audio Ltd. 2022
 * \file        DetectedAvailablePage.tsx
 * \author      Alex Jeffrey
 */

/* eslint-disable react-hooks/exhaustive-deps */

// Framework imports
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';

// Local imports
import * as PageCommon from './common/PageCommon';
import * as IPC from '../../shared/IPC';
import * as Logging from '../../shared/Logging';
import * as Product from '../../shared/Product';

// Tag to include with all log entries
const loggingTag = 'DAP';

function DetectedAvailablePage() {
  // Set the default object. We don't include all properties and not all are shown
  const defaultProduct: Product.ProductDetails = {
    modelName: '---',
    serialNumber: '---',
  };

  // Get the React hook we can use to navigate to a new page
  // Must get it at function scope as it cannot be obtained within
  // the scope of useEffect() where it is used.
  const navigator = useNavigate();

  // Create state using the useState() hook to allow the device set to
  // be updated
  const [ProductDetails, setProductDetails] = useState(defaultProduct);

  // Callback function associated with receipt of device details to be be
  // shown on the page
  function onConfig(_event: unknown, data: unknown) {
    IPC.parseMessageAsUnknown(
      data,
      (message: IPC.AllMessages, value: unknown): void => {
        if (message === IPC.Configs.ProductDetails) {
          const product: Product.ProductDetails =
            value as Product.ProductDetails;
          Logging.log(`Product details for: ${product.modelName}`, loggingTag);
          setProductDetails(product);
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
      <p className="msg-status">{ProductDetails.modelName}</p>
      <p className="msg-status">{`S/N: ${ProductDetails.serialNumber}`}</p>
      <p className="msg-status">New update available</p>
      <p>Current Version: 3.1.1 New Version: 3.1.2</p>
      <div className="msg-details-div">
        <p className="msg-details__bold">Release Notes</p>
        <p className="msg-details__bug">Fixed: A bug</p>
        <p className="msg-details__bug">Fixed: Another bug</p>
        <p className="msg-details__feature">New: A new feature</p>
        <p className="msg-details__feature">New: Another new feature</p>
      </div>
      <button
        className="msg-button"
        type="button"
        onClick={PageCommon.sendInstall}
      >
        Install Now
      </button>
    </div>
  );
}

export default DetectedAvailablePage;
