
import { Vector3 } from 'three';
import {ShipModel3D} from './simulator/ship-model3d'

export class TacticalPlan {
    ships: ShipData[] = [];

    update(tacticalPlan: TacticalPlan, removeCallback) {
        let tl = (tacticalPlan && tacticalPlan.ships)?tacticalPlan.ships.length:0;
        var diff = this.ships.length - tl;
        if (diff > 0) { // removed ships
            for (var j = 0; j < this.ships.length; j++) {
                if (j >= tl) {
                    diff = this.ships.length - j;
                    for (var k = j; k < this.ships.length; k++) {
                        removeCallback(this.ships[k].name);
                    }
                    this.ships.splice(j, diff);
                    break;
                } else if (this.ships[j].name !== tacticalPlan.ships[j].name) {
                    removeCallback(this.ships[j].name);
                    this.ships.splice(j, 1);
                    j--;
                }
            }
        }
        for (var i = 0; i < tl; i++) {
            var ts = tacticalPlan.ships[i];
            if (i < this.ships.length) { // update ship
                var s = this.ships[i];
                s.name = ts.name;
                s.amount = ts.amount;
                let il = ts.amount;
                diff = s.instances.length - il;
                if (diff > 0) { // removed instances
                    s.instances.splice(il, diff); // remove last instances
                } else {
                    for (var m=0; m<il; m++) {
                        if (m < s.instances.length) {
                            var sinstance = s.instances[m];
                            if (!sinstance.position) {
                                sinstance.position = new Vector3();
                            }
                            if (ts.instances && ts.instances[m] && ts.instances[m].position) {
                                sinstance.position.x = ts.instances[m].position.x;
                                sinstance.position.y = ts.instances[m].position.y;
                                sinstance.position.z = ts.instances[m].position.z;
                            }
                        } else { // newly added instance
                            if (ts.instances && m < ts.instances.length) {
                                s.instances.push(ts.instances[m]);
                            }
                        }
                    }
                }
            } else { // newly added ships
                if (!ts.instances) {
                    ts.instances = [];
                }
                this.ships.push(ts);
            }
        }

        this.ships.forEach(s => {
            while (s.instances.length < s.amount) {
                s.instances.push(new ShipInstance());
            }
            s.instances.forEach(i => {
                if (!i.position) {
                    i.position = ShipModel3D.getNextPosition();
                }
            });
        });
    }
}

export class ShipData {
    amount: number = 1;
    instances:ShipInstance[] = [];

    constructor(public name: string) {

    }
}

export class ShipInstance {
    position: Vector3;
}

export class Ship {
    name: string;
    size: string;
    scale: number;
    maxcrew: number;
    cargo: number;
    // speed, additional information to the ship type
}