const { contextBridge, ipcRenderer} = require('electron');


contextBridge.exposeInMainWorld('api', {
    sendIPC: (channel, arg) => { ipcRenderer.send(channel, arg); },
    onIPC: (channel, handler) => { ipcRenderer.on(channel, handler); }
});