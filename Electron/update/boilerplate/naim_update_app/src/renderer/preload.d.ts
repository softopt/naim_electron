//
// ** MODIFIED BOILERPLATE **
//

declare global {
  interface Window {
    electron: {
      ipcRenderer: {
        sendMessage(channel: string, args: unknown[]): void;
        on(
          channel: string,
          listener: (event: Event, args: unknown[]) => void
        ): void;
        once(
          channel: string,
          listener: (event: Event, args: unknown[]) => void
        ): void;
        removeListener(
          channel: string,
          listener: (event: Event, args: unknown[]) => void
        ): void;
        removeAllListeners(channel: string): void;
        listenerCount(channel: string): number;
      };
    };
  }
}

export {};
