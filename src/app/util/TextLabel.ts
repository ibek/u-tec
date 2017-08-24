import { Object3D, Vector3 } from 'three';

export class TextLabel {
    htmlElement: any;
    originalWidth: any;

    constructor(private camera) {
        this.htmlElement = document.getElementById('text-label');
    }

    setLabel(label: String) {
        this.htmlElement.innerHTML = "<span class=\"mat-button-wrapper\">" + label + "</span>";
        this.htmlElement.style.width = 'auto';
        this.originalWidth = null;
    }

    update(position: Vector3, screenWidth, screenHeight):any {
        var coords2d = this._get2DCoords(position, this.camera, screenWidth, screenHeight);
        this.htmlElement.style.left = coords2d.x + 'px';
        this.htmlElement.style.top = coords2d.y + 'px';
        this.htmlElement.style.fontSize = this.camera.zoom*16 + 'px';
        this.htmlElement.style.height = this.camera.zoom*36 + 'px';
        if (!this.originalWidth) {
            this.originalWidth = this.htmlElement.clientWidth;
            console.log(this.originalWidth);
        }
        this.htmlElement.style.width = this.camera.zoom*this.originalWidth + 'px';
        return coords2d;
    }

    _get2DCoords(position: Vector3, camera, screenWidth, screenHeight) {
        var vector = position.project(camera);

        var widthHalf = 0.5 * screenWidth;
        var heightHalf = 0.5 * screenHeight;
        vector.x = (vector.x * widthHalf) + widthHalf + 30*camera.zoom;
        vector.y = - (vector.y * heightHalf) + heightHalf + 60 - camera.zoom*(camera.zoom+45);
        return vector;
    }

}