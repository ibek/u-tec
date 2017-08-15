import { Component, Input } from '@angular/core';
import { Router, NavigationExtras } from '@angular/router';

import { Ship } from '../ship';
import { ShipData } from '../ship-data';
import { ShipService } from '../ship.service';

@Component({
  selector: 'ship-card',
  templateUrl: './ship-card.component.html',
  styleUrls: ['./ship-card.component.css']
})
export class ShipCardComponent {
  @Input() ship: ShipData;

  constructor(private shipService: ShipService, private router: Router) {

  }

  public delete(event) {
    this.shipService.deleteShip(this.ship);
    this.router.navigate(["inventory"], this.shipService.getNavigationExtras());
  }

  onShipAmountChange() {
    this.router.navigate(["inventory"], this.shipService.getNavigationExtras());
  }

}