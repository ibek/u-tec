import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute, ParamMap, NavigationExtras } from '@angular/router';

import { Ship } from '../ship';
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
    this.shipService.getModels().then(models => this.models = models);

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
    var newShip = new Ship();
    newShip.type = this.selectedModel.type;
    newShip.image = this.selectedModel.image;
    newShip.amount = 1;
    newShip.size = this.selectedModel.size;
    let added = this.shipService.addShip(newShip);
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