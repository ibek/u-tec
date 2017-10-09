import { Component, OnInit } from '@angular/core';
import { MdDialog } from '@angular/material';
import { Router } from '@angular/router';
import { ShipService } from './ship.service';
import { CrewDialogComponent } from './simulator/simulator.component';
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

    constructor(private shipService: ShipService, public mdDialog: MdDialog, private router: Router) {
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

    manageCrew() {
        let dialogRef = this.mdDialog.open(CrewDialogComponent, {
            data: { "players": this.shipService.tacticalPlan.players.join("\n") },
        });
        dialogRef.afterClosed().subscribe(players => {
            if (players && players !== "Cancel") {
                this.shipService.tacticalPlan.players = players.split("\n").filter(Boolean);
                this.shipService.updateTacticalPlan();
            }
        });
    }

}
