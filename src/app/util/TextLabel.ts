import { Object3D, Vector3 } from 'three';

export class TextLabel {
    htmlElement: any;

    constructor(private camera) {
        this.htmlElement = document.createElement('div');
        this.htmlElement.style.position = 'absolute';
        this.htmlElement.style.color = 'white';
        this.htmlElement.style.zIndex = '1';
    }

    setLabel(label: String) {
        this.htmlElement.innerHTML = label;
    }

    update(position: Vector3, screenWidth, screenHeight) {
        var coords2d = this._get2DCoords(position, this.camera, screenWidth, screenHeight);
        this.htmlElement.style.left = coords2d.x + 'px';
        this.htmlElement.style.top = coords2d.y + 'px';
    }

    _get2DCoords(position: Vector3, camera, screenWidth, screenHeight) {
        var vector = position.project(camera);

        var widthHalf = 0.5 * screenWidth;
        var heightHalf = 0.5 * screenHeight;
        vector.x = (vector.x * widthHalf) + widthHalf + 15;
        vector.y = - (vector.y * heightHalf) + heightHalf + 15;
        return vector;
    }

}