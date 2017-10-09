import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { InventoryComponent } from './inventory/inventory.component';
import { AddShipComponent } from './inventory/add-ship.component';
import { SimulatorComponent } from './simulator/simulator.component';
import { WelcomeComponent } from './welcome.component';
import { SettingsComponent } from './settings.component';

const routes: Routes = [
    { path: '', redirectTo: '/welcome', pathMatch: 'full' },
    { path: 'welcome', component: WelcomeComponent },
    {
        path: 'inventory',
        children: [
            {
                path: '',
                component: InventoryComponent
            },
            {
                path: 'add-ship/:size',
                component: AddShipComponent
            }
        ]
    },
    { path: 'welcome', component: WelcomeComponent },
    { path: 'settings', component: SettingsComponent },
    { path: 'simulator', component: SimulatorComponent },
    { path: '**', component: InventoryComponent }
];

@NgModule({
    imports: [RouterModule.forRoot(routes)],
    exports: [RouterModule]
})
export class AppRoutingModule { }