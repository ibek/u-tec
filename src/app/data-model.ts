
import { Vector3 } from 'three';

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
            if (i < this.ships.length) {
                var s = this.ships[i];
                s.name = ts.name;
                if (ts.position) {
                    if (!s.position) {
                        s.position = new Vector3();
                    }
                    s.position.x = ts.position.x;
                    s.position.y = ts.position.y;
                    s.position.z = ts.position.z;
                }
            } else { // newly added ships
                this.ships.push(ts);
            }
        }
        console.log(this.ships);
    }
}

export class ShipData {
    position: Vector3;

    constructor(public name: string) {

    }
}

export class Ship {
    name: string;
    size: string;
    scale: number;
    maxcrew: number;
    cargo: number;
    // speed, additional information to the ship type
}