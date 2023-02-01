
const path = require('path')

const { app, BrowserWindow, ipcMain } = require('electron');
 let win;
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
       // win.loadURL(`file://${__dirname}/dist/npconfig/index.html`);
       win.loadURL(`http://localhost:4200`);
       win.on('closed', () => {
          win = null;
        });
        console.log(path.join(__dirname, 'preload.js'));
      }
 app.on('ready', createWindow);
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

    
      
