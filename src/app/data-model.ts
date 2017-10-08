
import { Vector3 } from 'three';
import { ShipModel3D } from './simulator/ship-model3d'
import { ShipService } from './ship.service'

export class TacticalPlan {
    ships: ShipData[] = [];
    passwordHash: string = null;
    players: string[] = ["?"];
    updated: string = null; // date yyyy/mm/dd
    viewed: string = null; // date yyyy/mm/dd

    verify(shipService: ShipService) {
        if (this.passwordHash == undefined) {
            this.passwordHash = null;
        }
        if (this.players == undefined) {
            this.players = ["?"];
        }
        if (this.updated == undefined) {
            this.updated = null;
        }
        if (this.viewed == undefined) {
            this.viewed = null;
        }

        this.ships.forEach(s => {
            while (s.instances.length < s.amount) {
                s.instances.push(new ShipInstance());
            }
            s.instances.forEach(i => {
                if (!i.position) {
                    i.position = ShipModel3D.getNextPosition();
                }
                if (!i.rotation) {
                    i.rotation = new Vector3(0,0,0);
                }
                if (!i.pilot) {
                    i.pilot = "?";
                }
                if (!i.enemy) {
                    i.enemy = false;
                }
                if (!i.crewmen) {
                    var max = shipService.getModel(s.name).maxcrew - 1;
                    i.crewmen = new Array<string>(max);
                    for (var cm = 0; cm < max; ++cm) {
                        i.crewmen[cm] = "?";
                    }
                }
                if (!i.animation) {
                    i.animation = [];
                }
            });
        });
    }

    update(tacticalPlan: TacticalPlan, shipService: ShipService, removeCallback) {
        this.passwordHash = tacticalPlan.passwordHash;
        this.players = tacticalPlan.players;
        this.updated = tacticalPlan.updated;
        this.viewed = tacticalPlan.viewed;

        let tl = (tacticalPlan && tacticalPlan.ships) ? tacticalPlan.ships.length : 0;
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
                    for (var m = 0; m < il; m++) {
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
                            if (!sinstance.rotation) {
                                sinstance.rotation = new Vector3();
                            }
                            if (ts.instances && ts.instances[m] && ts.instances[m].rotation) {
                                sinstance.rotation.x = ts.instances[m].rotation.x;
                                sinstance.rotation.y = ts.instances[m].rotation.y;
                                sinstance.rotation.z = ts.instances[m].rotation.z;
                            }
                            if (ts.instances && ts.instances[m]) {
                                sinstance.pilot = ts.instances[m].pilot;
                                sinstance.enemy = ts.instances[m].enemy;
                            }
                            if (ts.instances && ts.instances[m] && ts.instances[m].crewmen) {
                                sinstance.crewmen = ts.instances[m].crewmen;
                            }
                            if (ts.instances && ts.instances[m] && ts.instances[m].animation) {
                                sinstance.animation = ts.instances[m].animation;
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

        this.verify(shipService);
    }
}

export class ShipData {
    amount: number = 1;
    instances: ShipInstance[] = [];

    constructor(public name: string) {

    }
}

export class ShipInstance {
    position: Vector3;
    rotation: Vector3;
    pilot: string;
    crewmen: string[] = [];
    enemy:boolean = false;
    animation: AnimationFrame[];
}

export class Ship {
    name: string;
    size: string;
    scale: number;
    maxcrew: number;
    cargo: number;
    role: string;
    // speed, additional information to the ship type
}

export class AnimationFrame {
    position: Vector3;
}