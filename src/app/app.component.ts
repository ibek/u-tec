import { Component, Inject } from '@angular/core';
import { Router } from '@angular/router';
import { MdDialog, MdDialogRef, MD_DIALOG_DATA } from '@angular/material';

import { ShipService } from './ship.service';

import './styles.scss';

@Component({
  selector: 'u-tec',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {

  constructor(private shipService: ShipService, private router: Router, public lockDialog: MdDialog) {

  }

  newTacticalPlan(): void {
    window.location.href = '/';
  }

  inventory(): void {
    this.router.navigate(["inventory"], this.shipService.getNavigationExtras());
  }

  simulator(): void {
    this.router.navigate(["simulator"], this.shipService.getNavigationExtras());
  }

  lock(): void {
    let dialogRef = this.lockDialog.open(LockDialogComponent, {
      data: { "type": "Lock" },
    });
    dialogRef.afterClosed().subscribe(pwd => {
      if (pwd !== "Cancel") {
        this.shipService.setPassword(pwd);
      }
    });
  }

  unlock(): void {
    let dialogRef = this.lockDialog.open(LockDialogComponent, {
      data: { "type": "Unlock" },
    });
    dialogRef.afterClosed().subscribe(pwd => {
      if (pwd !== "Cancel") {
        this.shipService.passwordHash = btoa(pwd);
      }
    });
  }

  donate(): void {
    window.open("https://donorbox.org/uee-tactical-communications-interface", "_blank");
  }

}

@Component({
  selector: 'lock-dialog',
  templateUrl: 'lock-dialog.html',
})
export class LockDialogComponent {
  constructor(public dialogRef: MdDialogRef<LockDialogComponent>, @Inject(MD_DIALOG_DATA) public data: any) { }
}
