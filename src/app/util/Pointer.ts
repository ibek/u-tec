import { TextLabel } from './TextLabel';
import { Vector3, Geometry, Line, LineBasicMaterial, Scene, Object3D } from 'three';
import { ShipData } from '../ship-data';

export class Pointer {
    title: TextLabel = new TextLabel(this.camera);
    line: Object3D;
    visible: boolean = true;

    constructor(private camera) {
        var geometry = new Geometry();
        geometry.vertices.push(new Vector3(0, 0, 0));
        geometry.vertices.push(new Vector3(-3, 10, 0));
        geometry.vertices.push(new Vector3(-12, 10, 0));

        var l = new Line(geometry, new LineBasicMaterial({ transparent: true, opacity: 0.8, linewidth: 2 }));
        this.line = new Object3D();
        this.line.add(l);
    }

    show(container, scene: Scene, shipData: ShipData) {
        this.title.setLabel(shipData.origin.type);
        this.title.htmlElement.style.display = 'block';
        scene.add(this.line);
        this.visible = true;
    }

    hide(container, scene: Scene) {
        this.visible = false;
        this.title.htmlElement.style.display = 'none';
        scene.remove(this.line);
    }

    update(position: Vector3, screenWidth, screenHeight) {
        if (this.visible) {
            this.line.position.x = position.x;
            this.line.position.y = position.y;
            this.line.position.z = position.z;
            this.title.update(position, screenWidth, screenHeight);
        }
    }
}