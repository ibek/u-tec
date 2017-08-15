import { Injectable } from '@angular/core';
import { NavigationExtras, ActivatedRoute } from '@angular/router';

import { Ship } from './ship';
import { ShipData } from './ship-data';
import { SceneService } from './scene.service';

@Injectable()
export class ShipService {

    ships: ShipData[] = [];
    models: Map<string, Ship> = new Map();
    modelsArray: Ship[] = [{ "type": "F7C Hornet", "image": "assets/ships/thumbnails/F7CHornet.png", "size": "S", "model": "assets/ships/hornetq.gltf" },
    { "type": "Freelancer", "image": "assets/ships/thumbnails/Freelancer.png", "size": "S", "model": "none" },
    { "type": "Caterpillar", "image": "assets/ships/thumbnails/Caterpillar.png", "size": "M", "model": "none" },
    { "type": "Starfarer", "image": "assets/ships/thumbnails/Starfarer.png", "size": "M", "model": "none" },
    { "type": "890 Jump", "image": "assets/ships/thumbnails/890 Jump.png", "size": "L", "model": "none" }];

    constructor(private sceneService: SceneService, private route: ActivatedRoute) {
        for (var model of this.modelsArray) {
            this.models[model.type] = model;
        };
    }

    addShip(data: ShipData): boolean {
        var found: boolean = false;
        for (var s of this.ships) {
            if (s.origin.type == data.origin.type) {
                found = true;
                break;
            }
        };
        if (found) {
            return false;
        } else {
            this.ships.push(data);
            this.sceneService.addShipModelFor(data);
            return true;
        }
    }

    deleteShip(data: ShipData) {
        let index: number = this.ships.indexOf(data);
        if (index !== -1) {
            this.ships.splice(index, 1);
        }
    }

    getShips(): Promise<ShipData[]> {
        if (this.ships.length == 0) {
            this.route.queryParams.subscribe(queryParams => {
                let ships: string = queryParams['ships'];
                if (ships) {
                    let shipsArray: string[] = ships.split(',');
                    for (let i = 0; i + 1 < shipsArray.length; i += 2) {
                        let type = shipsArray[i];
                        let amount = shipsArray[i + 1];
                        let model = this.models[type];
                        var data = new ShipData();
                        data.origin.type = type;
                        data.origin.image = model.image;
                        data.amount = Number(amount);
                        data.origin.size = model.size;
                        data.origin.model = model.model;
                        this.addShip(data);
                    }
                }
            });
        }
        return Promise.resolve(this.ships);
    }

    getNavigationExtras(): NavigationExtras {
        var shipsParam = "";
        for (var s of this.ships) {
            shipsParam += s.origin.type + "," + String(s.amount) + ",";
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

    getShipsSlowly(): Promise<ShipData[]> {
        return new Promise(resolve => {
            // Simulate server latency with 2 second delay
            setTimeout(() => resolve(this.getShips()), 2000);
        });
    }

    getShip(type: string): Promise<ShipData> {
        return this.getShips()
            .then(ships => ships.find(ship => ship.origin.type === type));
    }

}