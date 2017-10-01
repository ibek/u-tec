import { Object3D, Vector3 } from 'three';

export class TextLabel {
    htmlElement: any;
    label: String;

    constructor(private camera) {
        this.htmlElement = document.getElementById('text-label');
    }

    setLabel(label: String) {
        if (!this.label || this.label !== label) {
            this.label = label;
            this.htmlElement.innerHTML = "<span class=\"mat-button-wrapper\">" + label + "</span>";
            this.htmlElement.style.width = 'auto';
        }
    }

}