import { Component, Input } from '@angular/core';

@Component({
  selector: 'ship-card',
  templateUrl: './ship-card.component.html',
  styleUrls: ['./ship-card.component.css']
})
export class ShipCardComponent {
    image = "assets/ships/thumbnails/F7CHornet.png";
    @Input() amount = 1;
  
}