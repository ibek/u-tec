import { Injectable } from '@angular/core';
import { NavigationExtras, ActivatedRoute } from '@angular/router';

import { Ship, ShipData } from './data-model';
import { ShipModel3D } from './simulator/ship-model3d';

@Injectable()
export class SceneService {

    shipModels3d: Map<string, ShipModel3D> = new Map();
    updateCallback;

    constructor(private route: ActivatedRoute) {

    }

    addShipModelFor(modelPath: string, shipData: ShipData, shipModel: Ship) {
        if (!this.shipModels3d.has(shipData.name)) {
            var model = new ShipModel3D(shipData, shipModel);
            this.shipModels3d.set(shipData.name, model);
            var scope = this;
            model.load(modelPath, () => {
                if (scope.updateCallback) {
                    scope.updateCallback();
                }
            });
        }
    }

    removeShipModelFor(name: string) {
        this.shipModels3d.get(name).removeShipFromScene();
        this.shipModels3d.delete(name);
    }

    setUpdateCallback(update) {
        this.updateCallback = update;
    }

    loadingProgress(): number {
        var progress = 100;
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