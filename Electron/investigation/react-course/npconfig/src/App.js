import React from "react";

import InputBox from "./InputBox";
import TraceLog from "./TraceLog";

import Button from 'react-bootstrap/Button';

import { ElectronAPI } from "./ElectronAPI.ts";

import './App.css'



function App() {

  function clickHandler() {
    ElectronAPI.send('npconfig', 'doit');
    console.log('sending message');
  }


  return (
    <div className='App'>
      <InputBox label={'Path'} />
      <InputBox label={'Port'} />
       <TraceLog id='geddy'/>
      <Button className='run-button' onClick={clickHandler}>Fred</Button>
    </div>
  );
}

export default App;