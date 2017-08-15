import { Component } from '@angular/core';
import { Router } from '@angular/router';

import { ShipService } from './ship.service';

import './styles.scss';

@Component({
  selector: 'holocom',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {

  constructor(private shipService: ShipService, private router: Router) {

  }

  inventory(): void {
    this.router.navigate(["inventory"], this.shipService.getNavigationExtras());
  }

  simulator(): void {
    this.router.navigate(["simulator"], this.shipService.getNavigationExtras());
  }

}
