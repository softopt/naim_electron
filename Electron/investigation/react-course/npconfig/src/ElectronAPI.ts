




function isElectron() {
    if (typeof window !== 'undefined' && typeof window.process === 'object' && window.process.type === 'renderer') {
        console.log('is electron TRUE');
        return true;
    }
    console.log("NOT ELECTRON");
    return false;
};


class ElectronAPIWrapper {

    ipc : any = null;

    constructor() {
        if (isElectron()) {
            const electron = window.require('electron');
            this.ipc = electron.ipcRenderer;
            console.log(this.ipc);
        }
    }
    isElectron() {
        return false;
    }

    send(channel : string, message : string) {

        if (isElectron())
        {
            this.ipc.send(channel, message);
            console.log('sending.....');
        }
        else {
            console.log("NOT SENDING");
        }
    }

};


export const ElectronAPI = new ElectronAPIWrapper();