/*!
 * \copyright   Naim Audio Ltd. 2022
 * \file        index.tsx
 * \author      Boilerplate / Alex Jeffrey
 *
 * This is originally part of the boilerplate used but modified to:
 * a) Remove IPC (which is now encapsulated elsewhere)
 * b) Perform initialisation of common services for the update application
 */

// Framework imports
import { createRoot } from 'react-dom/client';

// Enrtry point React compoent
import App from './application/RendererApp';

// Local imports
import * as IPC from '../shared/IPC';
import * as Logging from '../shared/Logging';
import RendererIPC from './application/RendererIPC';
import RendererLogging from './application/RendererLogging';

// Initialise services to use Renderer specific implementations
// This can't be done in the app as it should be once only and prior to any components
// being rendered
IPC.init(new RendererIPC());
Logging.init(new RendererLogging());

// Create and render main app component
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const container = document.getElementById('root')!;
const root = createRoot(container);
root.render(<App />);
