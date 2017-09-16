import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ShipService } from './ship.service';

@Component({
    selector: 'welcome',
    templateUrl: './welcome.component.html',
    styleUrls: ['./welcome.component.css']
})
export class WelcomeComponent {

    constructor(private shipService: ShipService, private router: Router) {

    }

    getStarted(): void {
        this.router.navigate(["inventory"], this.shipService.getNavigationExtras());
    }

}
