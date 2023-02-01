const { app, BrowserWindow } = require("electron");
const path = require("path");

const loadMainWindow = () => {
    const mainWindow = new BrowserWindow({
        width : 400,
        height: 400,
        webPreferences: {
            nodeIntegration: true,
			contextIsolation: false
        }
    });

    mainWindow.loadFile(path.join(__dirname, "index.html"));
}

app.on("ready", loadMainWindow);


app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        loadMainWindow();
    }
});

////////////////////////////////////////

const AWS = require('aws-sdk');
const fs = require('fs');
const bucket = 'com.naimaudio.firmware';

const s3 = new AWS.S3();

var params = {
    Bucket: bucket,
    Prefix: 'NonStreamers'
};

var allKeys = [];
listAllKeys((keys) => {
    console.log('CALLBACK');
    console.log(keys);

    downloadFile(keys[0], './alex.xml');
});




function listAllKeys(callback) {
    s3.listObjectsV2(params, function (err, data) {
        if (err) {
            console.log(err, err.stack); // an error occurred
        } else {
            var contents = data.Contents.filter((value) => {
                return value.Key.endsWith('xml');
            });
            contents.forEach(element => {
                allKeys.push(element.Key);
            });

            if (data.IsTruncated) {
                params.ContinuationToken = data.NextContinuationToken;
                console.log("get further list...");
                listAllKeys(callback);
            } else {
                callback(allKeys);
            }
        }
    });
}

function downloadFile(objectName, filePath) {
  const params = {
    Bucket: bucket,
    Key: objectName,
  };
  console.log(`Download: ${objectName}`);

  s3.getObject(params, (err, data) => {
    if (err) console.error(err);
    fs.writeFileSync(filePath, data.Body.toString());
    console.log(`${filePath} has been created!`);
  });
};
