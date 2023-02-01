/*!
 * \copyright   Naim Audio Ltd. 2022
 * \file        MainApp.ts
 * \author      Alex Jeffrey
 *
 * This class represents the Main application and is instantiated my the boilerplate
 * main.js entry point.
 */

// Local imports
import MainIPC from './MainIPC';
import MainLogging from './MainLogging';
import UpdaterStateMachine from './UpdaterStateMachine';
import * as IPC from '../../shared/IPC';
import * as Logging from '../../shared/Logging';

/*!
 * \brief Main Application class
 *
 * This class encapsualtes the business logic of the update application and requires no
 * external control once instantiated
 */
export default class Application {
  //---------------------------------------------------------------------------
  // Private Data
  //---------------------------------------------------------------------------

  //! The state machine that controls the updater's lifecycle
  private fsm;

  //---------------------------------------------------------------------------
  // Private Methods
  //---------------------------------------------------------------------------
  /*!
   * \brief  Handles state change reported by state machine
   * This function is installed as a notification handler for the state machine
   * \param state
   */
  // eslint-disable-next-line class-methods-use-this
  // private onStateChange(state: IPC.States): void {
  //   // No specific action at the moment. if state machine becomes too complex
  //   // some of the business logic may be delegated here
  //   // Logging.log(`FSM reports state change: ${state}`);
  // }

  //---------------------------------------------------------------------------
  // Public Methods
  //---------------------------------------------------------------------------
  /*!
   * \brief Constructor
   * Performs initialisaiton of the services used by the main application.
   */
  constructor() {
    // Initialise the IPC module to use the MainIPC specific implementation
    IPC.init(new MainIPC());

    // Initialise the logging module to use the MainLogging specific
    // implementation.
    // Must be called  after the IPC is set upas it needs it to establish
    // connections.
    Logging.init(new MainLogging());

    // Instantiate the updater state machine to control the workflow
    this.fsm = new UpdaterStateMachine();
  }

  /*!
   * \brief Start the main applciation
   * Performs the actions required one the main application is fully up
   * and the main window established
   */
  run(): void {
    // Install a callback to be informed of state changes
    // this.fsm.onStateChange = this.onStateChange.bind(this);
    // Start the state machine now the main window is established and
    // page changes (to reflect state) will be accepted
    this.fsm.start();
  }
}
