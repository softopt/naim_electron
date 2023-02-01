const { app, 
        BrowserWindow, 
        dialog,
        globalShortcut,
        ipcMain, 
        Menu, 
        shell } = require('electron');

const fs = require('fs');

const template = [
    {
        label: 'Format',
        submenu: [
            {
                label: 'Toggle Bold',
                click() {
                    const window = BrowserWindow.getFocusedWindow();
                    window.webContents.send('editor-event', 'toggle-bold');
                }
            }
        ]
    },
    {
      role: 'help',
      submenu: [
        {
          label: 'About Editor Component',
          click() {
              shell.openExternal('https://simplemde.com/');
          }
        }
      ]
    }
  ];


if (process.platform === 'darwin') {
template.unshift({
    label: app.getName(),
    submenu: [
    { role: 'about' },
    { type: 'separator' },
    { role: 'quit' }
    ]
})
}

if (process.env.DEBUG) {
template.push(
    {
        label : 'Debugging',
        submenu: [
            {
                label: 'Dev Tools',
                role: 'toggleDevTools'
            },    {
                type: 'separator'
            },
            {
                role: 'reload',
                accelerator: 'Alt+R'
            }        
        ]
    },)
}

const appMenu = Menu.buildFromTemplate(template);
module.exports = appMenu;


app.on('ready', () => {
    globalShortcut.register('CommandOrControl+S', () => {
        const window = BrowserWindow.getFocusedWindow();
        window.webContents.send('editor-event', 'save');
    });
    globalShortcut.register('CommandOrControl+O', () => {
        const window = BrowserWindow.getFocusedWindow();
        const options = {
            title: 'Pick a file',
            filters: [
                {
                    name: 'Markdown files',
                    extensions: ['md']
                },
                {
                    name: 'Text files',
                    extensions: ['txt']
                }
            ]
        }
        dialog.showOpenDialog(window, options).then((result) => {
            if (result.filePaths && result.filePaths.length > 0)
            {
                const filename = result.filePaths[0];
                const content = fs.readFileSync(filename).toString();
                console.log(content);
                window.webContents.send('load', content);
            }
        }
        );
    });
});


ipcMain.on('editor-reply', (event, arg) => {
    console.log(`Received reply from web page: ${arg}`);
  });

ipcMain.on('save', (event, arg) => {
    console.log('Saving file...');
    const window = BrowserWindow.getFocusedWindow();
    const options = {
        title: 'Save markdown',
        filters: [
            {
                name: 'MyFile',
                extensions: ['md']
            }
        ]
    }
    dialog.showSaveDialog(window, options).then((result) => {
        const filename = result.filePath;
        if (filename) {
            console.log(`Saving to: ${filename}`);
            fs.writeFileSync(filename, arg);
        }
    });
});
