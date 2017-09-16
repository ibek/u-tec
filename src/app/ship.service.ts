import { Injectable } from '@angular/core';
import { NavigationExtras, ActivatedRoute, Router } from '@angular/router';
import { Vector3 } from 'three';

import { TacticalPlan, ShipData, Ship } from './data-model';
import { SceneService } from './scene.service';

import { AngularFireDatabase, FirebaseObjectObservable, FirebaseListObservable } from 'angularfire2/database';
import * as sha256 from 'crypto-js/sha256';
import * as hmacSHA512 from 'crypto-js/hmac-sha512';
import * as Base64 from 'crypto-js/enc-base64';

var list = require('../assets/ships/list.json');

@Injectable()
export class ShipService {

    id: string;
    plans: FirebaseListObservable<TacticalPlan[]>;
    tacticalPlanFO: FirebaseObjectObservable<TacticalPlan>;
    tacticalPlan: TacticalPlan = new TacticalPlan();

    ready: boolean = false;
    passwordHash: string;

    models: Map<string, Ship> = new Map();
    modelsArray: Ship[] = list.ships;

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
        var scope = this;
        this.plans.subscribe(item => {
            this.tacticalPlan.update(item[0], scope, (shipName) => {
                this.sceneService.removeShipModelFor(shipName);
            });
            if (this.tacticalPlan.viewed !== this._getToday()) {
                this.tacticalPlan.viewed = this._getToday();
                this.updateTacticalPlan();
                return;
            }
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
                this.tacticalPlan.updated = this._getToday();
                this.tacticalPlan.viewed = this._getToday();
                this.plans.push(this.tacticalPlan).then(item => {
                    this.id = item.key;
                    this.ready = true;
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
            this.tacticalPlan.updated = this._getToday();
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
            this.tacticalPlan.passwordHash = Base64.stringify(hmacSHA512(sha256(password), password));
            this.passwordHash = this.tacticalPlan.passwordHash;
            this.updateTacticalPlan();
        }
    }

    _getToday(): string {
        var today = new Date();
        var dd: any = today.getDate();
        var mm: any = today.getMonth() + 1; //January is 0!
        var yyyy = today.getFullYear();

        if (dd < 10) {
            dd = '0' + dd;
        }

        if (mm < 10) {
            mm = '0' + mm;
        }

        var t = yyyy + '/' + mm + '/' + dd;
        return t;
    }

}