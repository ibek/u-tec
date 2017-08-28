import { Injectable } from '@angular/core';
import { NavigationExtras, ActivatedRoute, Router } from '@angular/router';
import { Vector3 } from 'three';

import { TacticalPlan, ShipData, Ship } from './data-model';
import { SceneService } from './scene.service';

import { AngularFireDatabase, FirebaseObjectObservable, FirebaseListObservable } from 'angularfire2/database';

@Injectable()
export class ShipService {

    id: string;
    plans: FirebaseListObservable<TacticalPlan[]>;
    tacticalPlanFO: FirebaseObjectObservable<TacticalPlan>;
    tacticalPlan: TacticalPlan = new TacticalPlan();

    ready: boolean = false;
    passwordHash: string;

    models: Map<string, Ship> = new Map();
    modelsArray: Ship[] = [
        {
            "name": "F7C Hornet",
            "size": "S",
            "scale": 0.003,
            "maxcrew": 1,
            "cargo": 13
        },
        {
            "name": "Caterpillar",
            "size": "M",
            "scale": 0.0025,
            "maxcrew": 5,
            "cargo": 512
        },
        {
            "name": "Reclaimer",
            "size": "L",
            "scale": 0.003,
            "maxcrew": 5,
            "cargo": 6555
        },
        {
            "name": "Aurora LN",
            "size": "S",
            "scale": 0.003,
            "maxcrew": 1,
            "cargo": 13
        },
        {
            "name": "Sabre",
            "size": "S",
            "scale": 0.003,
            "maxcrew": 1,
            "cargo": 0
        },
        {
            "name": "Avenger Stalker",
            "size": "S",
            "scale": 0.03,
            "maxcrew": 1,
            "cargo": 4
        },
        {
            "name": "Herald",
            "size": "S",
            "scale": 0.003,
            "maxcrew": 2,
            "cargo": 0
        },
        {
            "name": "Constellation Andromeda",
            "size": "M",
            "scale": 0.003,
            "maxcrew": 5,
            "cargo": 134
        },
        {
            "name": "Prospector",
            "size": "S",
            "scale": 0.003,
            "maxcrew": 1,
            "cargo": 128
        },
        {
            "name": "Gladius",
            "size": "S",
            "scale": 0.003,
            "maxcrew": 1,
            "cargo": 0
        },
        {
            "name": "Cutlass Black",
            "size": "M",
            "scale": 0.003,
            "maxcrew": 3,
            "cargo": 150
        },
        {
            "name": "Constellation Aquila",
            "size": "M",
            "scale": 0.003,
            "maxcrew": 4,
            "cargo": 134
        },
        {
            "name": "Starfarer",
            "size": "L",
            "scale": 0.003,
            "maxcrew": 7,
            "cargo": 3321
        },
        {
            "name": "Crucible",
            "size": "L",
            "scale": 0.25,
            "maxcrew": 4,
            "cargo": 300
        },
        {
            "name": "P-52 Merlin",
            "size": "S",
            "scale": 0.003,
            "maxcrew": 1,
            "cargo": 0
        },
        {
            "name": "Carrack",
            "size": "L",
            "scale": 0.003,
            "maxcrew": 6,
            "cargo": 1057
        }
    ];

    constructor(private sceneService: SceneService, private route: ActivatedRoute, private db: AngularFireDatabase, private router: Router) {
        for (var model of this.modelsArray) {
            this.models[model.name] = model;
        };

        route.queryParams.subscribe(
            params => {
                if (!this.id) {
                    this.id = params['id'];
                    if (this.id) {
                        this.initPlans();
                    }
                }
            });

    }

    initPlans() {
        this.plans = this.db.list('/tactical-plans',
            {
                query: {
                    orderByKey: true,
                    equalTo: this.id
                }
            });
        this.plans.subscribe(item => {
            this.tacticalPlan.update(item[0], (shipName) => {
                this.sceneService.removeShipModelFor(shipName);
            });
            this.tacticalPlan.ships.forEach(ship => {
                var shipModel = this.getModel(ship.name);
                this.sceneService.addShipModelFor(this.getModel3d(shipModel), ship, shipModel);
            });
            if (this.sceneService.updateCallback) {
                this.sceneService.updateCallback();
            }
            this.ready = true;
        });
    }

    isReady(): boolean {
        return this.id !== undefined && this.ready;
    }

    getImage(ship: Ship): string {
        return "assets/ships/thumbnails/" + ship.name + ".png";
    }

    getModel3d(ship: Ship): string {
        return "assets/ships/" + ship.name + ".gltf";
    }

    getTacticalPlan(): Promise<TacticalPlan> {
        return Promise.resolve(this.tacticalPlan);
    }

    addShip(shipModel: Ship): boolean {
        var found: boolean = false;
        for (var s of this.tacticalPlan.ships) {
            if (s.name == shipModel.name) {
                found = true;
                break;
            }
        };
        if (found) {
            return false;
        } else {
            var data = new ShipData(shipModel.name);
            this.tacticalPlan.ships.push(data);
            if (!this.plans) {
                this.plans = this.db.list('/tactical-plans');
                this.plans.push(this.tacticalPlan).then(item => {
                    this.id = item.key;
                    this.router.navigate([this.router.url], this.getNavigationExtras());
                });
            } else {
                this.updateTacticalPlan();
            }
            this.sceneService.addShipModelFor(this.getModel3d(shipModel), data, shipModel);
            return true;
        }
    }

    updateTacticalPlan() {
        if (this.id) {
            this.plans.set(this.id, this.tacticalPlan);
        }
    }

    deleteShip(shipModel: Ship) {
        for (var i = 0; i < this.tacticalPlan.ships.length; i++) {
            var data = this.tacticalPlan.ships[i];
            if (data.name == shipModel.name) {
                this.tacticalPlan.ships.splice(i, 1);
                this.updateTacticalPlan();
                this.sceneService.removeShipModelFor(shipModel.name);
                break;
            }
        }
    }

    getNavigationExtras(): NavigationExtras {
        var scope = this;
        let navigationExtras: NavigationExtras = {
            queryParams: { 'id': scope.id },
            queryParamsHandling: 'merge'
        };
        return navigationExtras;
    }

    getModels(): Promise<Ship[]> {
        return Promise.resolve(this.modelsArray);
    }

    getModel(name: string): Ship {
        return this.models[name];
    }

    getShip(name: string): ShipData {
        return this.tacticalPlan.ships.find(ship => ship.name === name);
    }

    isConnected(): boolean {
        return this.id !== undefined;
    }

    isUnlocked(): boolean {
        return !this.tacticalPlan.passwordHash || (this.tacticalPlan.passwordHash == this.passwordHash)
    }

    setPassword(password: string) {
        if (this.tacticalPlan.passwordHash == null) {
            this.tacticalPlan.passwordHash = btoa(password);
            this.passwordHash = this.tacticalPlan.passwordHash;
            this.updateTacticalPlan();
        }
    }

}