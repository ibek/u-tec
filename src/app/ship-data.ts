import { Ship } from './ship';

export class ShipData {
    origin: Ship = new Ship();
    amount: number;
    positionX: number = 0;
    positionY: number = 0;
    positionZ: number = 0;
}