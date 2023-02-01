/*!
 * \copyright   Naim Audio Ltd. 2022
 * \file        RendererApp.ts
 * \author      Alex Jeffrey
 *
 * This is the main, application level React component for the Renderer
 */

// Framework imports
import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import './RendererApp.css';

// Local imports
import * as IPC from 'shared/IPC';

// React component (page) imports
import WelcomePage from '../pages/WelcomePage';
import CheckingPage from '../pages/CheckingPage';
import CheckOfflinePage from '../pages/CheckOfflinePage';
import CheckCachedPage from '../pages/CheckCachedPage';
import ConnectingPage from '../pages/ConnectingPage';
import DetectingPage from '../pages/DetectingPage';
import DetectedFailedPage from '../pages/DetectedFailedPage';
import DetectedAvailablePage from '../pages/DetectedAvailablePage';
import DetectedCurrentPage from '../pages/DetectedCurrentPage';
import DetectedManualPage from '../pages/DetectedManualPage';
import UpdatingPage from '../pages/UpdatingPage';
import UpdateCompletePage from '../pages/UpdateCompletePage';
import UpdateFailedPage from '../pages/UpdateFailedPage';

export default function App() {
  //
  // Helper method to build the URL for a given state
  //
  function stateUrl(state: IPC.States): string {
    return `/${state}`;
  }

  //
  // Render the component
  //
  return (
    <Router>
      <Routes>
        <Route path="/" element={<WelcomePage />} />
        <Route path="/index.html" element={<WelcomePage />} />
        <Route path="/welcome" element={<WelcomePage />} />
        <Route path="/checking" element={<CheckingPage />} />
        <Route path={stateUrl(IPC.States.Welcome)} element={<WelcomePage />} />
        <Route
          path={stateUrl(IPC.States.CheckingForUpdate)}
          element={<CheckOfflinePage />}
        />
        <Route
          path={stateUrl(IPC.States.CheckFailedOffline)}
          element={<CheckOfflinePage />}
        />
        <Route
          path={stateUrl(IPC.States.CheckFailedCached)}
          element={<CheckCachedPage />}
        />
        <Route
          path={stateUrl(IPC.States.ConnectPrompt)}
          element={<ConnectingPage />}
        />
        <Route
          path={stateUrl(IPC.States.Detecting)}
          element={<DetectingPage />}
        />
        <Route
          path={stateUrl(IPC.States.DetectionFailed)}
          element={<DetectedFailedPage />}
        />
        <Route
          path={stateUrl(IPC.States.DetectedAvailable)}
          element={<DetectedAvailablePage />}
        />
        <Route
          path={stateUrl(IPC.States.DetectingManual)}
          element={<DetectedManualPage />}
        />
        <Route
          path={stateUrl(IPC.States.DetectedCurrent)}
          element={<DetectedCurrentPage />}
        />
        <Route
          path={stateUrl(IPC.States.Updating)}
          element={<UpdatingPage />}
        />
        <Route
          path={stateUrl(IPC.States.UpdateComplete)}
          element={<UpdateCompletePage />}
        />
        <Route
          path={stateUrl(IPC.States.UpdateFailed)}
          element={<UpdateFailedPage />}
        />
      </Routes>
    </Router>
  );
}
