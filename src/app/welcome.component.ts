import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ShipService } from './ship.service';
import { ControlsDialogComponent } from './simulator/simulator.component';
import { MdDialog } from '@angular/material';

@Component({
    selector: 'welcome',
    templateUrl: './welcome.component.html',
    styleUrls: ['./welcome.component.css']
})
export class WelcomeComponent {

    constructor(private shipService: ShipService, private router: Router, public mdDialog: MdDialog) {

    }

    getStarted(): void {
        this.router.navigate(["inventory"], this.shipService.getNavigationExtras());
    }

    openControls(): void {
        let dialogRef = this.mdDialog.open(ControlsDialogComponent);
    }

}
