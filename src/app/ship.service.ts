import { Injectable } from '@angular/core';
import { NavigationExtras, ActivatedRoute } from '@angular/router';

import { Ship } from './ship';

@Injectable()
export class ShipService {

    ships: Ship[] = [];
    models: Map<string, Ship> = new Map();
    modelsArray: Ship[] = [{ "type": "F7C Hornet", "image": "assets/ships/thumbnails/F7CHornet.png", "amount": 1, "size": "S" },
    { "type": "Freelancer", "image": "assets/ships/thumbnails/Freelancer.png", "amount": 1, "size": "S" },
    { "type": "Caterpillar", "image": "assets/ships/thumbnails/Caterpillar.png", "amount": 1, "size": "M" },
    { "type": "Starfarer", "image": "assets/ships/thumbnails/Starfarer.png", "amount": 1, "size": "M" },
    { "type": "890 Jump", "image": "assets/ships/thumbnails/890 Jump.png", "amount": 1, "size": "L" }];

    constructor(private route: ActivatedRoute) {
        for (var model of this.modelsArray) {
            this.models[model.type] = model;
        };
    }

    addShip(ship: Ship): boolean {
        var found: boolean = false;
        for (var s of this.ships) {
            if (s.type == ship.type) {
                found = true;
                break;
            }
        };
        if (found) {
            return false;
        } else {
            this.ships.push(ship);
            return true;
        }
    }

    deleteShip(ship: Ship) {
        let index: number = this.ships.indexOf(ship);
        if (index !== -1) {
            this.ships.splice(index, 1);
        }
    }

    getShips(): Promise<Ship[]> {
        if (this.ships.length == 0) {
            this.route.queryParams.subscribe(queryParams => {
                let ships: string = queryParams['ships'];
                if (ships) {
                    let shipsArray: string[] = ships.split(',');
                    for (let i = 0; i+1 < shipsArray.length; i += 2) {
                        let type = shipsArray[i];
                        let amount = shipsArray[i + 1];
                        let model = this.models[type];
                        var ship = new Ship();
                        ship.type = type;
                        ship.image = model.image;
                        ship.amount = Number(amount);
                        ship.size = model.size;
                        this.addShip(ship);
                    }
                }
            });
        }
        return Promise.resolve(this.ships);
    }

    getNavigationExtras(): NavigationExtras {
        var shipsParam = "";
        for (var s of this.ships) {
            shipsParam += s.type + "," + String(s.amount) + ",";
        };
        let navigationExtras: NavigationExtras = {
            queryParams: { 'ships': shipsParam },
            queryParamsHandling: 'merge'
        };
        return navigationExtras;
    }

    getModels(): Promise<Ship[]> {
        return Promise.resolve(this.modelsArray);
    }

    getShipsSlowly(): Promise<Ship[]> {
        return new Promise(resolve => {
            // Simulate server latency with 2 second delay
            setTimeout(() => resolve(this.getShips()), 2000);
        });
    }

    getShip(type: string): Promise<Ship> {
        return this.getShips()
            .then(ships => ships.find(ship => ship.type === type));
    }

}