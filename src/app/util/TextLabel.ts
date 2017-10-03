import { Object3D, Vector3 } from 'three';

export class TextLabel {
    private htmlElement: any;
    label: String;

    constructor(private camera) {
        
    }

    private _checkElement() {
        if (!this.htmlElement) {
            this.htmlElement = document.getElementById('text-label');
        }
    }

    show() {
        this._checkElement();
        if (this.htmlElement) {
            this.htmlElement.style.display = 'block';
        }
    }

    hide() {
        this._checkElement();
        if (this.htmlElement) {
            this.htmlElement.style.display = 'none';
        }
    }

    setLabel(label: String) {
        if (!this.label || this.label !== label) {
            this.label = label;
            this._checkElement();
            if (this.htmlElement) {
                this.htmlElement.innerHTML = "<span class=\"mat-button-wrapper\">" + label + "</span>";
                this.htmlElement.style.width = 'auto';
            }
        }
    }

}