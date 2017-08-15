import { Injectable } from '@angular/core';
import { NavigationExtras, ActivatedRoute } from '@angular/router';

import { ShipData } from './ship-data';
import { ShipModel3D } from './simulator/ship-model3d';

@Injectable()
export class SceneService {

    shipModels3d: Map<string, ShipModel3D> = new Map();

    constructor(private route: ActivatedRoute) {

    }

    addShipModelFor(shipData: ShipData) {
        if (!this.shipModels3d.has(shipData.origin.type)) {
            var model = new ShipModel3D(shipData);
            this.shipModels3d.set(shipData.origin.type, model);
            model.load();
        }
    }

    loadingProgress(): number {
        var progress = 100;
        console.log(this.shipModels3d.size);
        if (this.shipModels3d.size == 0) {
            return progress;
        }
        let step = progress / this.shipModels3d.size;
        var processed = 0;
        this.shipModels3d.forEach((model: ShipModel3D, type: string) => {
            if (!model.isLoaded()) {
                progress -= step;
            } else {
                processed++;
            }
        });
        if (processed == this.shipModels3d.size) {
            return 100;
        }
        return progress;
    }

}