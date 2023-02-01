import React, {useState} from "react";
import Card from "./Card";

import './TraceLog.css';

//const { ipcRenderer} = window.require('electron');

function TraceLog(props) {

    const [hidden, setHidden] = useState(false);
    const [contents, setContents] = useState('');
 
    function clearHandler() {
        setContents('');
        setHidden((current) => { console.log(current); return !current;});
    }

    function hideHandler() {
        setHidden(true);
    }

    function showHandler() {
        setHidden(false);
    }

    // ipcRenderer.on('npconfig', (event, arg) => {
    //     setContents(contents + '\n' + arg);
    //     console.log(arg);
    //   });

    return (
        <Card className='trace-log'>
        {!hidden && <textarea className='trace-log__text' hidden={false} value={contents} readOnly={true}></textarea>}
        <button onClick={clearHandler}>Clear</button>
        <button onClick={showHandler}>Show</button>
        <button onClick={hideHandler}>Hide</button>
        </Card>
    )
};

export default TraceLog;

