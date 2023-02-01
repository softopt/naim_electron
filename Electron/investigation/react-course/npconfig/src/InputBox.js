import React from 'react';


import './InputBox.css';

import Card from './Card';

function InputBox(props) {
  return (
    <Card className='input-box'>
      <label>{props.label}</label>
      <input></input>
    </Card>
  );
}

export default InputBox;
