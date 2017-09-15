import { TextLabel } from './TextLabel';
import { Vector3, Geometry, Line, LineBasicMaterial, Scene, Object3D } from 'three';
import { ShipData } from '../data-model';

export class Pointer {
    title: TextLabel = new TextLabel(this.camera);
    visible: boolean = true;

    constructor(private camera) {

    }

    show(container, scene: Scene, shipData: ShipData) {
        this.title.setLabel(shipData.name);
        this.title.htmlElement.style.display = 'block';
        this.visible = true;
    }

    hide(container, scene: Scene) {
        this.visible = false;
        this.title.htmlElement.style.display = 'none';
    }

    update(position: Vector3, rotation: Vector3, shipData: ShipData, screenWidth, screenHeight) {
        if (this.visible) {
            this.title.setLabel(shipData.name);
            this.title.update(position, screenWidth, screenHeight);
        }
    }
}