import { Component, OnInit } from '@angular/core';
import { ObservableMedia } from '@angular/flex-layout';
import { Observable } from "rxjs/Observable";
import {Router, ActivatedRoute} from '@angular/router';

import {Ship} from '../ship';
import {ShipData} from '../ship-data';
import {ShipService} from '../ship.service';

@Component({
    selector: 'inventory',
    templateUrl: './inventory.component.html',
    styleUrls: ['./inventory.component.css']
})
export class InventoryComponent implements OnInit {
    ships:ShipData[] = [];
    public cols: Observable<number>;

    constructor(private shipService: ShipService, private observableMedia: ObservableMedia, private route: ActivatedRoute, private router: Router) {

    }

    ngOnInit() {
        this.shipService.getShips().then(ships => this.ships = ships);

        // set cols
        if (this.observableMedia.isActive("xs")) {
            this.cols = Observable.of(2);
        } else if (this.observableMedia.isActive("sm")) {
            this.cols = Observable.of(3);
        } else if (this.observableMedia.isActive("md")) {
            this.cols = Observable.of(5);
        } else if (this.observableMedia.isActive("lg")) {
            this.cols = Observable.of(6);
        } else if (this.observableMedia.isActive("x1")) {
            this.cols = Observable.of(7);
        }

        // observe changes
        this.observableMedia.asObservable()
            .subscribe(change => {
                switch (change.mqAlias) {
                    case "xs":
                        return this.cols = Observable.of(2);
                    case "sm":
                        return this.cols = Observable.of(3);
                    case "md":
                        return this.cols = Observable.of(5);
                    case "lg":
                        return this.cols = Observable.of(6);
                    case "xl":
                        return this.cols = Observable.of(7);
                }
            });
    }

    filterSize(array, size: string) {
        return array.filter(x => x.origin.size == size);
    }

    addS() {
        this.router.navigate(["inventory/add-ship/S"], this.shipService.getNavigationExtras());
    }

    addM() {
        this.router.navigate(["inventory/add-ship/M"], this.shipService.getNavigationExtras());
    }

    addL() {
        this.router.navigate(["inventory/add-ship/L"], this.shipService.getNavigationExtras());
    }
}
