import { NgModule } from '@angular/core';
import { BrowserModule }  from '@angular/platform-browser';

import { AppComponent } from './app.component';
import { SimulatorComponent } from './simulator/simulator.component';

@NgModule({
  imports: [
    BrowserModule
  ],
  declarations: [
    AppComponent,
    SimulatorComponent
  ],
  bootstrap: [ AppComponent ]
})
export class AppModule { }
