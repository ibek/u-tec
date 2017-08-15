import { NgModule } from '@angular/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { BrowserModule } from '@angular/platform-browser';
import { MaterialModule } from '@angular/material';
import { HttpModule } from '@angular/http';
import { FormsModule } from '@angular/forms';
import { FlexLayoutModule } from "@angular/flex-layout";
import { HashLocationStrategy, LocationStrategy } from '@angular/common';

import { AppComponent } from './app.component';
import { InventoryComponent } from './inventory/inventory.component';
import { ShipCardComponent } from './inventory/ship-card.component';
import { AddShipComponent } from './inventory/add-ship.component';
import { SimulatorComponent } from './simulator/simulator.component';

import { SceneService } from './scene.service';
import { ShipService } from './ship.service';

import { AppRoutingModule } from './app-routing.module';

import 'hammerjs';

@NgModule({
  imports: [
    BrowserModule,
    MaterialModule,
    FormsModule,
    HttpModule,
    BrowserAnimationsModule,
    FlexLayoutModule,
    AppRoutingModule
  ],
  declarations: [
    AppComponent,
    InventoryComponent,
    ShipCardComponent,
    AddShipComponent,
    SimulatorComponent
  ],
  providers: [{
    provide: LocationStrategy,
    useClass: HashLocationStrategy
  }, SceneService, ShipService],
  bootstrap: [AppComponent]
})
export class AppModule { }
