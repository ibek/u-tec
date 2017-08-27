import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute, ParamMap, NavigationExtras } from '@angular/router';

import { Ship, ShipData } from '../data-model';
import { ShipService } from '../ship.service';

@Component({
  selector: 'add-ship',
  templateUrl: './add-ship.component.html',
  styleUrls: ['./add-ship.component.css']
})
export class AddShipComponent implements OnInit {
  models: Ship[] = [];
  size: string = "S";
  selectedModel: any;
  typeExistsError: boolean = false;

  constructor(private shipService: ShipService, private router: Router, private route: ActivatedRoute) {

  }

  ngOnInit() {
    this.shipService.getModels().then(models => this.models = models.sort((a, b) => a.name > b.name ? 1 : -1));

    this.route.params
      .subscribe(params => this.size = params['size']);
  }

  onShipTypeChange(): void {
    this.typeExistsError = false;
  }

  goBack(): void {
    this.router.navigate(["inventory"], this.shipService.getNavigationExtras());
  }

  addShip(): void {
    let added = this.shipService.addShip(this.selectedModel);
    if (added) {
      this.router.navigate(["inventory"], this.shipService.getNavigationExtras());
    } else {
      this.typeExistsError = true;
    }
  }

  filterSize(array) {
    return array.filter(x => x.size == this.size);
  }
}