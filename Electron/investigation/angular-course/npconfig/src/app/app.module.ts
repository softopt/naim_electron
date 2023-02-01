import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import {NgxElectronModule} from 'ngx-electron';
import { InputBoxComponent } from './input-box/input-box.component';
import { TraceLogComponent } from './trace-log/trace-log.component';

@NgModule({
  declarations: [
    AppComponent,
    InputBoxComponent,
    TraceLogComponent
  ],
  imports: [
    BrowserModule,
    NgxElectronModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
