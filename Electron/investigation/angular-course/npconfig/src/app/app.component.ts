import { APP_ID, Component } from '@angular/core';
import {ElectronService} from 'ngx-electron';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {

  title = "Freddie";
  electron : ElectronService;

  constructor(private _electronService: ElectronService) {

    this.electron = _electronService;
  }

  onClick(event : Event) {
    console.log('Bollox');
    if (this.electron.isElectronApp) {
        console.log(event);
        if (this._electronService.ipcRenderer) {
          this._electronService.ipcRenderer.send('api', 'run');
          console.log('Hooray');
        }
    }
  }
}
