import { NgModule } from '@angular/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { BrowserModule } from '@angular/platform-browser';
import { MaterialModule } from '@angular/material';
import { HttpModule } from '@angular/http';
import { FormsModule } from '@angular/forms';

import { AppComponent } from './app.component';
import { WizardComponent } from './wizard/wizard.component';
import { ShipCardComponent } from './wizard/ship-card.component';
import { SimulatorComponent } from './simulator/simulator.component';

import 'hammerjs';

@NgModule({
  imports: [
    BrowserModule,
    MaterialModule,
    FormsModule,
    HttpModule,
    BrowserAnimationsModule
  ],
  declarations: [
    AppComponent,
    WizardComponent,
    ShipCardComponent,
    SimulatorComponent
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
