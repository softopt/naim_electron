/*!
 * \copyright   Naim Audio Ltd. 2022
 * \file        UpdaterStateMachine.ts
 * \author      Alex Jeffrey
 *
 * This file contains the Finite State Machine which controls the
 * update workflow.
 *
 * It must be called from the Main process to be inialised but
 * thereafter is self contained and abstract all th IPC between it
 * and the Renderer process.
 */

// Local imports
import * as IPC from '../../shared/IPC';
import * as Logging from '../../shared/Logging';
import { LogLevel } from '../../shared/LoggingTypes';
import * as Product from '../../shared/Product';
import * as NPConfig from './NPConfig';
import * as ARMMfg from './ARMMfg';
import * as UpdateRepository from './UpdateRepository';

//-----------------------------------------------------------------------------
// Types
//-----------------------------------------------------------------------------

// Events that are implcit to the internal workings of the state machine
enum Lifecycle {
  Enter = 'enter',
  Exit = 'exit',
  Timeout = 'timeout',
}

// Events from Main process business logic
enum Controls {
  UpdateCheckSuccess = 'check-success',
  UpdateCheckFailure = 'check-failure',
  DiscoverySuccess = 'discovery-success',
  DiscoveryFailure = 'discovery-failure',
  ReprogrammingSuccess = 'reprogramming-success',
  ReprogrammingFailure = 'reprogramming-failure',
}

// Events that are triggers for the state machine can be either the implicit
// lifecycle events or user actions/commands
type AllEvents = Lifecycle | Controls | IPC.Commands;

// Prototype for methods representing a single state in the FSM
type StateHandler = (event: AllEvents) => void;

/*!
 * \brief Updater State Machine class
 *
 * This class implements the state machine that drives the updater application
 * through the required workflow
 */
export default class UpdaterStateMachine {
  //---------------------------------------------------------------------------
  // Private Data
  //---------------------------------------------------------------------------
  // Current state of the FSM
  private currentState: IPC.States | null = null;

  // Table of handlers for all defined states
  private readonly StateTable = new Map<IPC.States, StateHandler>();

  // Wrapper around the npconfig' utility which can configure it, run it and
  // capture its output and return code.
  private npconfig = new NPConfig.NPConfig();

  // Wrapper around the ARM debug port where we can senf manufacturing commands
  private armMfg = new ARMMfg.ARMMfg();

  // Wrapper around the Update Repository
  private updateRepo = new UpdateRepository.UpdateRepository();

  // Most recently received information product details from the connected device
  private productDetails: Product.ProductDetails | null = null;

  // Most recently received firmware versions from the conencted device
  private firmwareVersions: Product.FirmwareVersions | null = null;

  // Area where downloaded files are saved
  private cacheLocation: string = '.';

  // Tag to add to all log entries
  private loggingTag: string = 'FSM';

  //---------------------------------------------------------------------------
  // Public Data / Properties
  //---------------------------------------------------------------------------

  // Set a handler to be called when the state machine moves to new state
  onStateChange: ((state: IPC.States) => void) | null = null;

  //---------------------------------------------------------------------------
  // Public Methods
  //---------------------------------------------------------------------------
  /*!
   * \brief Constructor
   */
  constructor() {
    // Build the state table to map handlers to states
    this.StateTable.set(IPC.States.Welcome, this.stateWelcome);
    this.StateTable.set(IPC.States.CheckingForUpdate, this.stateChecking);
    this.StateTable.set(
      IPC.States.CheckFailedOffline,
      this.stateCheckingOffline
    );
    this.StateTable.set(IPC.States.CheckFailedCached, this.stateCheckingCached);
    this.StateTable.set(IPC.States.ConnectPrompt, this.stateConnecting);
    this.StateTable.set(IPC.States.Detecting, this.stateDetecting);
    this.StateTable.set(IPC.States.DetectionFailed, this.stateDetectionFailed);
    this.StateTable.set(IPC.States.DetectingManual, this.stateDetectionManual);
    this.StateTable.set(
      IPC.States.DetectedAvailable,
      this.stateDetectionAvailable
    );
    this.StateTable.set(IPC.States.DetectedCurrent, this.stateDetectionCurrent);
    this.StateTable.set(IPC.States.Updating, this.stateUpdating);
    this.StateTable.set(IPC.States.UpdateComplete, this.stateUpdateComplete);
    this.StateTable.set(IPC.States.UpdateFailed, this.stateUpdateFailed);

    // Register listeners for the IPC channels of interest
    IPC.connectCommandListener(this.onCommand.bind(this));
    IPC.connectConfigListener(this.onConfig.bind(this));
  }

  /*!
   * \brief Start the state machine
   *
   * Actually, not _strictly_ necessary as the state machine is self reliant and,
   * other than being instantiated, requires no other interactions.
   * However a start method is provided because:
   * a) We need some interaction to avoid lint errors in the place that creates
   *    it as object not used after creation.
   * b) In reality, we will probably need to do soemhting here once the app is
   *    fleshed out
   */
  start() {
    // Spawn npconfig to get its version string and currently detected devices.
    // These will be queued within the npconfig object and results returned via
    // their repsective callbacks.
    this.npconfig.version(this.onVersion.bind(this));
    this.npconfig.devices(this.onDevices.bind(this));

    // Enter the initial state so that its 'enter' action is executed.
    this.enterState(IPC.States.Welcome);
  }

  //-----------------------------------------------------------------------------
  // Private Methods (State Machine Control)
  //-----------------------------------------------------------------------------
  /*!
   * \brief Inject an event into the state machine
   * Calls the handler associated with the current state and passes the supplied
   * event.
   * The handler may request a state change so current state may be different on
   * return
   *
   * \param event   The event to inject into the current state
   */
  private injectEvent(event: AllEvents): void {
    Logging.log(
      `injectEvent(${this.currentState},${event})`,
      this.loggingTag,
      LogLevel.Debug
    );
    if (this.currentState !== null && this.StateTable.has(this.currentState)) {
      const handler = this.StateTable.get(this.currentState);
      if (handler) {
        handler.bind(this)(event);
      }
    }
  }

  /*!
   * \brief Transition to a specified state
   * Performs all the work required to change to different state
   *
   * \param newState  Target state
   */
  private enterState(newState: IPC.States): void {
    // Do nothing if already in the target state
    if (this.currentState !== newState) {
      // Ask the Renderer to show the page associated with the new state
      IPC.sendStateChange(newState);

      // Allow current state to perform exit actions (if not null which is
      // is what it will be at the initial state setting)
      if (this.currentState !== null) {
        this.injectEvent(Lifecycle.Exit);
      }

      // Move to new state and allow it to perform entry actions
      this.currentState = newState;
      this.injectEvent(Lifecycle.Enter);

      // Tell any connected observer that we have changed state
      if (this.onStateChange !== null) {
        this.onStateChange(newState);
      }
    }
  }

  /*!
   * \brief Start a general purpose timeout
   *
   * Starts a timeout. A special helper is used because:
   * a) Encapsulates the logic of binding 'this' to the callback
   * b) Will encapsulate the parameter passing if implemented
   */
  private startTimer(timeoutMs: number) {
    setTimeout(this.onTimeout.bind(this), timeoutMs);
  }

  /*!
   * \brief General purpose timeout handler
   *
   * When a timeout is required in the current state, this is the
   * handler that is called when it expires and injects a suitable
   * event into the state machine
   *
   * TODO: Always injects the same event; this could be passed via the
   * setTimeout and be receivec by this callback
   */
  private onTimeout() {
    this.injectEvent(Lifecycle.Timeout);
  }

  //-----------------------------------------------------------------------------
  // Private Methods (IPC Handling)
  //-----------------------------------------------------------------------------
  /*!
   * \brief Receive a command from the UI
   * \param _event Source event (not used)
   * \param data The IPC message containing the command
   */
  private onCommand(_event: unknown, data: unknown): void {
    // Use a message cracker to interpret the incoming message in the required
    // format (a message with no data)
    IPC.parseMessageAsNone(data, (message: IPC.AllMessages): void => {
      this.injectEvent(message as AllEvents);
    });
  }

  /* \brief Receive a configuration setting from the UI
   * \param _event Source event (not used)
   * \param data IPC message containig the config item and its new value
   */
  private onConfig(_event: unknown, data: unknown) {
    // Use a message cracker to interpret the incoming message in the required
    // format (a config item with a string value)
    IPC.parseMessageAsString(
      data,
      (message: IPC.AllMessages, value: string): void => {
        if (message === IPC.Configs.SelectedDevice) {
          Logging.log(`Device selected: ${value}`, this.loggingTag);
          this.npconfig.selectDevice(value);
          this.armMfg.setDevice(value);
        }
      }
    );
  }

  //-----------------------------------------------------------------------------
  // Private Methods (npconfig callbacks)
  //-----------------------------------------------------------------------------
  /*!
   * \brief Callback supplied to NPConfig to receive version string
   * \param  version    Version data (as an array)
   * \paran  status     Exit status code of call
   */
  // eslint-disable-next-line class-methods-use-this
  private onVersion(version: NPConfig.BufferedData, status: number): void {
    // If action passed and provided a single element array, the only element
    // is the version string
    if (status === 0 && Array.isArray(version) && version.length === 1) {
      Logging.log(`npconfig version = ${version[0]}`, this.loggingTag);
    }
  }

  /*!
   * \brief Callback supplied to NPConfig to receive available devices
   * \param  version    Devcie data (as an array)
   * \paran  status     Exit status code of call
   */
  // eslint-disable-next-line class-methods-use-this
  private onDevices(devices: NPConfig.BufferedData, status: number): void {
    // If action passed and provided an array, each element is a discovered
    // device.
    if (status === 0 && Array.isArray(devices)) {
      Logging.log(`onDevices: ${devices}`, this.loggingTag);

      // Select the first one as default if not already set
      if (devices.length > 0) {
        this.npconfig.setDefaultDevice(devices[0]);
        this.armMfg.setDevice(devices[0]);
      }

      // Forward device list to Renderer
      IPC.sendConfig(IPC.Configs.AvailableDevices, devices);
    }
  }

  /*!
   * \brief Callback supplied to NPConfig to receive details of connected unit
   * \param  details    Device details (as a string array)
   * \paran  status     Exit status code of call
   */
  private onDiscovery(details: NPConfig.BufferedData, status: number): void {
    if (status === 0) {
      // If the command was successful, the supplied buffered data is its output
      // as it would be on stdout. Save this as a Product Details object and tell
      // the state machine discovery is complete.
      this.productDetails = Product.npconfigToProductDetails(details);
      Logging.log(
        `Successfully discivered device: ${this.productDetails.modelName}`,
        this.loggingTag
      );
      this.injectEvent(Controls.DiscoverySuccess);
    } else {
      // If the command failed, inform the state machine
      Logging.log(
        'Failed to discover device',
        this.loggingTag,
        LogLevel.Warning
      );
      this.injectEvent(Controls.DiscoveryFailure);
    }
  }

  /*!
   * \brief Callback supplied to NPConfig to track reprogramming cycle
   * \param  progress   Output from the command
   * \paran  status     Exit status code of call (on last call)
   */
  private onReprogramming(
    progress: NPConfig.StreamingData,
    status: number | null
  ): boolean {
    // If we have any data, log it
    if (progress !== null) {
      Logging.log(progress, this.loggingTag);

      // The reprogramming command streams text that report reprogramming
      // progress in terms of 'lines' in a well known tag and empirically,
      // reprogramming is complete when it reaches a fixed level so we can
      // work out percentage.
      const progressTag = '-> Lines:';
      const progressComplete = 30000;
      // Does the report we just received contain a progress report?
      const linesPos: number = progress.lastIndexOf(progressTag);
      if (linesPos >= 0) {
        // If the line has the tag, move beyong it to get the number and extract till
        // end of line and trim it
        const value: string = progress
          .substring(linesPos + progressTag.length)
          .trim();
        // Convert to an integer and work out the percentage
        const position: number = parseInt(value, 10);
        const percent = Math.round((position * 100) / progressComplete);
        // Send the progress to the renderer
        IPC.sendConfig(IPC.Configs.ReprogProgress, percent);
      }
    }

    // If status has been supplied, log it and inject the appropriate event
    if (status !== null) {
      Logging.log(`Reprogramming complete ${status}`, this.loggingTag);
      this.injectEvent(
        status === 0
          ? Controls.ReprogrammingSuccess
          : Controls.ReprogrammingFailure
      );
    }

    return true;
  }

  //-----------------------------------------------------------------------------
  // Private Methods (armmfg callbacks)
  //-----------------------------------------------------------------------------
  /*!
   * \brief Callback supplied to ARMMfg to get command response
   * \param  version    Version data (as an array)
   * \paran  status     Exit status code of call
   */
  private onCommandResponse(data: ARMMfg.SerialData): void {
    const versions = Product.mfgToFirmwareVersions(data);
    this.firmwareVersions = versions;
  }

  //-----------------------------------------------------------------------------
  // Private Methods (update repository callbacks)
  //-----------------------------------------------------------------------------
  /*!
   * \brief Callback when a requested repository index is provided
   * \param objectList  List of objects (files in the requested repo area)
   */
  private onRepositoryList(objectList: UpdateRepository.KeyList | null): void {
    Logging.log(`onRepositoryList: ${objectList}`, this.loggingTag);
    if (objectList === null) {
      Logging.log('Fetch of manifests failed', this.loggingTag, LogLevel.Error);
      this.injectEvent(Controls.UpdateCheckFailure);
    } else if (objectList.length === 0) {
      Logging.log('No manifests found', this.loggingTag, LogLevel.Warning);
      this.injectEvent(Controls.UpdateCheckFailure);
    } else {
      // If a list has been received, request that all files are downloaded into
      // the cache area. No event for the state machine until the download has
      // finished
      this.updateRepo.downloadFiles(
        objectList,
        this.cacheLocation,
        this.onRepositoryDownload.bind(this)
      );
    }
  }

  /*!
   * \brief Callback to monitor the download of a file or batch of files
   *
   * A batch object is supplied which indicates the size of the batch and how
   * many have now completed. When all have been received, the download cycle is
   * complete.
   *
   * \param filePath    The file that has completed downloading
   * \param result      True if the download was successful
   * \param batch       Object containing batcj progress / status
   */
  private onRepositoryDownload(
    filePath: string,
    result: boolean,
    batch: UpdateRepository.DownloadBatch
  ): void {
    Logging.log(
      `onRepostoryDownload(${filePath},${batch.completed},${batch.count},${result})`,
      this.loggingTag,
      result ? LogLevel.Debug : LogLevel.Warning
    );
    // Is this the last of the batch? If inform the state machine. A success is
    // inferred if any of the files was downloaded ok.
    if (batch.completed === batch.count) {
      if (batch.success > 0) {
        this.injectEvent(Controls.UpdateCheckSuccess);
      } else {
        this.injectEvent(Controls.UpdateCheckFailure);
      }
    }
  }

  //-----------------------------------------------------------------------------
  // State Handlers
  //-----------------------------------------------------------------------------
  /*!
   * \brief Welcome State
   * Starting point for a new update workflow
   * \param event   Event to process
   */
  private stateWelcome(event: AllEvents): void {
    switch (event) {
      case Lifecycle.Enter:
        break;

      case Lifecycle.Exit:
        break;

      case IPC.Commands.Continue:
        this.enterState(IPC.States.CheckingForUpdate);
        break;

      default:
        break;
    }
  }

  /*!
   * \brief Checking for available update
   * \param event   Event to process
   */
  private stateChecking(event: AllEvents): void {
    switch (event) {
      case Lifecycle.Enter:
        this.updateRepo.getPackageIndexFiles(
          this.onRepositoryList.bind(this),
          'NonStreamers'
        );

        // const xmlPath = '/Users/alex/Naim/SoftOptGit/naim/Electron/update/boilerplate/naim_update_app/';
        // const xmlFile = 'Development.xml';
        // const update = new UpdatePackage.UpdatePackageParser(xmlPath + xmlFile);
        // Logging.log(update.packageDescription());
        break;

      case Lifecycle.Exit:
        break;

      case Lifecycle.Timeout:
        break;

      case Controls.UpdateCheckSuccess:
        this.enterState(IPC.States.ConnectPrompt);
        break;

      case Controls.UpdateCheckFailure:
        // Download failed. Eventually, we'll change state here based on whether we
        // already have available files from a previous download. For now, always assume
        // we have
        if (true) {
          this.enterState(IPC.States.CheckFailedCached);
        } else {
          this.enterState(IPC.States.CheckFailedOffline);
        }
        break;

      default:
        break;
    }
  }

  /*!
   * \brief Check for update failed as no internet connection
   * \param event   Event to process
   */
  private stateCheckingOffline(event: AllEvents): void {
    switch (event) {
      case Lifecycle.Enter:
        break;

      case Lifecycle.Exit:
        break;

      case IPC.Commands.Retry:
        this.enterState(IPC.States.CheckingForUpdate);
        break;

      default:
        break;
    }
  }

  /*!
   * \brief Check failed as no internet but previous download available
   * \param event   Event to process
   */
  private stateCheckingCached(event: AllEvents): void {
    switch (event) {
      case Lifecycle.Enter:
        break;

      case Lifecycle.Exit:
        break;

      case IPC.Commands.Retry:
        this.enterState(IPC.States.CheckingForUpdate);
        break;

      case IPC.Commands.Continue:
        this.enterState(IPC.States.ConnectPrompt);
        break;

      default:
        break;
    }
  }

  /*!
   * \brief User is in the process of connecting the UUT
   * \param event   Event to process
   */
  private stateConnecting(event: AllEvents): void {
    switch (event) {
      case Lifecycle.Enter:
        break;

      case Lifecycle.Exit:
        break;

      case IPC.Commands.Retry:
        this.enterState(IPC.States.CheckingForUpdate);
        break;

      case IPC.Commands.Continue:
        this.enterState(IPC.States.Detecting);
        break;

      default:
        break;
    }
  }

  /*!
   * \brief Attempting to detect the UUT
   * \param event   Event to process
   */
  private stateDetecting(event: AllEvents): void {
    switch (event) {
      case Lifecycle.Enter:
        this.npconfig.discover(this.onDiscovery.bind(this));
        break;

      case Lifecycle.Exit:
        break;

      case Lifecycle.Timeout:
        // May be required to stop blocked process
        break;

      case Controls.DiscoverySuccess:
        this.enterState(IPC.States.DetectedAvailable);
        break;

      case Controls.DiscoveryFailure:
        this.enterState(IPC.States.DetectionFailed);
        break;

      default:
        break;
    }
  }

  /*!
   * \brief No UUT detected
   * \param event   Event to process
   */
  private stateDetectionFailed(event: AllEvents): void {
    switch (event) {
      case Lifecycle.Enter:
        break;

      case Lifecycle.Exit:
        break;

      case IPC.Commands.Retry:
        this.enterState(IPC.States.Detecting);
        break;

      case IPC.Commands.Continue:
        this.enterState(IPC.States.DetectingManual);
        break;

      default:
        break;
    }
  }

  /*!
   * \brief User is selecting a specific device to contact the UUT
   * \param event   Event to process
   */
  private stateDetectionManual(event: AllEvents): void {
    switch (event) {
      // On entry to this state, ask the NPConfig wrapper to fetch
      // the available devices which will be returned to the supplied
      // callback.
      // We do this everytime and don't cache the result as a new device
      // may have been connected since the last attempt
      case Lifecycle.Enter:
        this.npconfig.devices(this.onDevices.bind(this));
        break;

      case Lifecycle.Exit:
        break;

      // UI has requested we try to connect to the device. It is presumed
      // it has specified which device to try by sending a config message
      // (which does not come through the state machine)
      case IPC.Commands.Connect:
        this.enterState(IPC.States.Detecting);
        break;

      default:
        break;
    }
  }

  /*!
   * \brief UUT detected and there is an available update for it
   * \param event   Event to process
   */
  private stateDetectionAvailable(event: AllEvents): void {
    switch (event) {
      case Lifecycle.Enter:
        // Start a short timer to allow the state change to settle on the UI
        // before sending most recent prodict details.
        this.startTimer(500);
        break;

      case Lifecycle.Exit:
        break;

      case Lifecycle.Timeout:
        // If we have product details, send them now
        if (this.productDetails !== null) {
          IPC.sendConfig(IPC.Configs.ProductDetails, this.productDetails);

          // Request firmware versions via the debug port
          this.armMfg.runCommand(
            'version host',
            this.onCommandResponse.bind(this)
          );
        }
        break;

      case IPC.Commands.Install:
        this.enterState(IPC.States.Updating);
        break;

      default:
        break;
    }
  }

  /*!
   * \brief UUT detected but it is up to date
   * \param event   Event to process
   */
  private stateDetectionCurrent(event: AllEvents): void {
    switch (event) {
      case Lifecycle.Enter:
        break;

      case Lifecycle.Exit:
        break;

      case IPC.Commands.Restart:
        this.enterState(IPC.States.Welcome);
        break;

      default:
        break;
    }
  }

  /*!
   * \brief UUT is actively being updated
   * \param event   Event to process
   */
  private stateUpdating(event: AllEvents): void {
    switch (event) {
      // Send the command to perform the reprogramming
      case Lifecycle.Enter:
        this.npconfig.reprogApp(this.onReprogramming.bind(this));
        break;

      case Lifecycle.Exit:
        break;

      case Lifecycle.Timeout:
        break;

      case Controls.ReprogrammingSuccess:
        this.enterState(IPC.States.UpdateComplete);
        break;

      case Controls.ReprogrammingFailure:
        this.enterState(IPC.States.UpdateFailed);
        break;

      default:
        break;
    }
  }

  /*!
   * \brief UUT upate completed successfully
   * \param event   Event to process
   */
  private stateUpdateComplete(event: AllEvents): void {
    switch (event) {
      case Lifecycle.Enter:
        break;

      case Lifecycle.Exit:
        break;

      case IPC.Commands.Restart:
        this.enterState(IPC.States.Welcome);
        break;

      default:
        break;
    }
  }

  /*!
   * \brief UUT update failed
   * \param event   Event to process
   */
  private stateUpdateFailed(event: AllEvents): void {
    switch (event) {
      case Lifecycle.Enter:
        break;

      case Lifecycle.Exit:
        break;

      case IPC.Commands.Restart:
        this.enterState(IPC.States.Welcome);
        break;

      default:
        break;
    }
  }
}
