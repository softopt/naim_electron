const { app, BrowserWindow, Menu } = require('electron');
const menu = require('./menu.js');
const path = require('path')

let window;

app.on('ready', () => {
    window = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
    nodeIntegration: true,
    contextIsolation: true,
    preload: path.join(__dirname, 'preload.js')
    }
    });
    window.loadFile('index.html');
});



Menu.setApplicationMenu(menu);
