import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ShipService } from './ship.service';
import * as DATA from './data-model';

@Component({
    selector: 'settings',
    templateUrl: './settings.component.html',
    styleUrls: ['./settings.component.css']
})
export class SettingsComponent implements OnInit {

    backgrounds = [];
    bg;
    showVisualAids;
    animationLength;

    constructor(private shipService: ShipService, private router: Router) {
        this.backgrounds = [];
        DATA.BACKGROUNDS.forEach((value, key) => {
            this.backgrounds.push(key);
        });
    }

    ngOnInit() {
        setTimeout(() => {
            this.bg = this.shipService.tacticalPlan.settings.background;
            this.showVisualAids = this.shipService.tacticalPlan.settings.showVisualAids;
            this.animationLength = this.shipService.tacticalPlan.settings.animationLength;
        }, 1000);
    }

    saveSettings() {
        this.shipService.tacticalPlan.settings.background = this.bg;
        this.shipService.tacticalPlan.settings.showVisualAids = this.showVisualAids;
        this.shipService.tacticalPlan.settings.animationLength = this.animationLength;
        this.shipService.updateTacticalPlan();
        this.router.navigate(["inventory"], this.shipService.getNavigationExtras());
    }

}
