import { Object3D, Vector3 } from 'three';

export class TextLabel {
    htmlElement: any;
    originalWidth: any;
    label: String;
    position: Vector3;
    coords2d: Vector3;

    constructor(private camera) {
        this.htmlElement = document.getElementById('text-label');
    }

    setLabel(label: String) {
        if (!this.label || this.label !== label) {
            this.label = label;
            this.htmlElement.innerHTML = "<span class=\"mat-button-wrapper\">" + label + "</span>";
            this.htmlElement.style.width = 'auto';
            this.originalWidth = null;
        }
    }

    update(position: Vector3, screenWidth, screenHeight): any {
        if (!this.position || !this.position.equals(position)) {
            this.position = position;
            var coords2d = this._get2DCoords(position, this.camera, screenWidth, screenHeight);
            this.htmlElement.style.left = coords2d.x + 'px';
            this.htmlElement.style.top = coords2d.y + 'px';
            this.htmlElement.style.fontSize = this.camera.zoom * 16 + 'px';
            this.htmlElement.style.height = this.camera.zoom * 36 + 'px';
            if (!this.originalWidth) {
                this.originalWidth = this.htmlElement.clientWidth / this.camera.zoom + 20;
            }
            this.htmlElement.style.width = this.camera.zoom * this.originalWidth + 'px';
            this.coords2d = coords2d;
            return coords2d;
        } else {
            return this.coords2d;
        }
    }

    _get2DCoords(position: Vector3, camera, screenWidth, screenHeight) {
        var vector = position.project(camera);

        var widthHalf = 0.5 * screenWidth;
        var heightHalf = 0.5 * screenHeight;
        var w = 0;
        if (this.originalWidth) {
            w = this.originalWidth;
        }
        vector.x = (vector.x * widthHalf) + widthHalf - camera.zoom*w/2;
        vector.y = - (vector.y * heightHalf) + heightHalf + camera.zoom * (camera.zoom + 10) + 10;
        return vector;
    }

}