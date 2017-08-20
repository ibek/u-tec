import { Ship } from './ship';
import { Vector3 } from 'three';

export class ShipData {
    origin: Ship = new Ship();
    amount: number = 0;
    instances: ShipDataInstance[] = [];

    add(instance: ShipDataInstance) {
        this.instances.push(instance);
    }
}

export class ShipDataInstance {
    position: Vector3;
    // crew ...
}