const { app, BrowserWindow } = require("electron");
const path = require("path");

const loadMainWindow = () => {
    const mainWindow = new BrowserWindow({
        width : 800,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
			contextIsolation: false
        }
    });

    mainWindow.loadFile(path.join(__dirname, "index.html"));
}

const loadLogWindow = () => {
    const logWindow = new BrowserWindow({
        width : 200,
        height: 400,
        webPreferences: {
            nodeIntegration: true,
			contextIsolation: false
        }
    });
    logWindow.loadFile(path.join(__dirname, "console.html"));
}

app.on("ready", () => {
    loadMainWindow();
    loadLogWindow();
});


app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        loadMainWindow();
    }
});

