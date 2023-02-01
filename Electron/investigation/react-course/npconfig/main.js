const { app, BrowserWindow , ipcMain, globalShortcut } = require('electron');
const path = require('path');

 let win;
 let responder;

 function createWindow() {
   win = new BrowserWindow({ 
    width: 800, 
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      //preload: path.join(__dirname, 'preload.js')
    }
    });
   win.setBackgroundColor('#000000');
   win.loadURL("http://localhost:3000");
   win.on("closed", () => {
     win = null;
   });
 }
 app.on('ready', () => {
  createWindow();
  globalShortcut.register('CommandOrControl+X', () => {
    console.log('Shortcut');
    const window = BrowserWindow.getFocusedWindow();
    responder.send('npconfig', 'ping')
  });
});
 app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
 app.on('activate', () => {
  if (win === null) {
    createWindow();
  }

});

ipcMain.on('npconfig', (event, arg) => {
  console.log(arg);
  event.sender.send('npconfig', 'hooray');
  responder = event.sender;
});