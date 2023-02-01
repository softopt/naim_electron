import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-input-box',
  templateUrl: './input-box.component.html',
  styleUrls: ['./input-box.component.css']
})
export class InputBoxComponent implements OnInit {

  @Input()
  title : string = '';

  constructor() { 

  }

  ngOnInit(): void {
  }

}
