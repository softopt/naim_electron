const { ipcRenderer, app } = require('electron');
const { INSPECT_MAX_BYTES } = require('node:buffer');
const { spawn } = require('node:child_process');


let inpPath = document.getElementById("inpPath");
let inpPort = document.getElementById("inpPort");
let outLog = document.getElementById("textLog");
let outStatus = document.getElementById("outStatus");
let btnShowLog = document.getElementById("btnShowLog");

inpPath.value = "swupdate.dat";
inpPort.value = "ttyUSB0";
outLog.hidden = true;

document.getElementById("btnUpdate").addEventListener('click', () => {
	textLog.value = ''
	outStatus.value = ''
	let child = spawn('./foo.sh', [inpPath.value, inpPort.value], {shell: true});

	child.stdout.on('data', (data) => {
		console.log(`stdout: ${data}`);
		outLog.value += data;
	  });
	  
	child.stderr.on('data', (data) => {
		console.error(`stderr: ${data}`);
	  });

	child.on('close', (code) => {
		console.log(`child process exited with code ${code}`);
		outStatus.value = code;
	  });
	
});

document.getElementById("btnShowLog").addEventListener('click', () => {
	outLog.hidden = !outLog.hidden;
});