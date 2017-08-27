import { Component, Input, OnInit } from '@angular/core';
import { Router, NavigationExtras } from '@angular/router';

import { Ship, ShipData } from '../data-model';
import { ShipService } from '../ship.service';

@Component({
  selector: 'ship-card',
  templateUrl: './ship-card.component.html',
  styleUrls: ['./ship-card.component.css']
})
export class ShipCardComponent implements OnInit {
  @Input() ship: ShipData;
  model: Ship;

  constructor(private shipService: ShipService, private router: Router) {

  }

  ngOnInit() {
    this.model = this.shipService.getModel(this.ship.name);
  }

  public delete(event) {
    this.shipService.deleteShip(this.model);
    this.router.navigate(["inventory"], this.shipService.getNavigationExtras());
  }

  onShipAmountChange() {
    this.router.navigate(["inventory"], this.shipService.getNavigationExtras());
  }

}