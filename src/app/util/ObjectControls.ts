
import * as THREE from 'three';

export class ObjectControls {
    fixed = new THREE.Vector3(0, 0, 0);
    displacing = true;

    _DisplaceFocused = null;
    focused = null;
    focusedpart = null;
    _DisplaceMouseOvered = null;
    mouseovered = null;
    mouseoveredpart = null;

    _mouse = new THREE.Vector2();

    enabled = true;
    item = null;

    _intersects = [];
    intersectsMap;
    previous = new THREE.Vector3(0, 0, 0);

    moveScene = false;
    x = 0.0;
    z = 0.0;
    lx = 0.0;
    lz = 0.0;
    moveMax = 100;

    constructor(private camera, private container, private objects, private projectionMap, private scene) {

    }

    activate() {
        this.container.addEventListener('mousedown', this.onContainerMouseDown, false);
        this.container.addEventListener('mousemove', this.getMousePos, false);
        this.container.addEventListener('mouseup', this.onContainerMouseUp, false);
        this.container.addEventListener('mousewheel', this.onDocumentMouseWheel, false);
    }

    deactivate() {
        this.container.removeEventListener('mousedown', this.onContainerMouseDown, false);
        this.container.removeEventListener('mousemove', this.getMousePos, false);
        this.container.removeEventListener('mouseup', this.onContainerMouseUp, false);
        this.container.removeEventListener('mousewheel', this.onDocumentMouseWheel, false);
    }

    update() {
        this.onContainerMouseMove();
    }

    move = function () { this.container.style.cursor = 'move' }
    mouseover = function () { this.container.style.cursor = 'pointer' }
    mouseout = function () { this.container.style.cursor = 'auto' }
    mouseup = function () { this.container.style.cursor = 'auto' }
    onclick = function () { }

    returnPrevious() {
        this._selGetPos(this.previous);
    }

    setFocus(object) {
        this._DisplaceFocused = object;
        this.item = this.objects.indexOf(object);
        if (object.userData.parent) {
            this.focused = object.userData.parent;
            this.focusedpart = this._DisplaceFocused;
            this.previous.copy(this.focused.parent.position);
        }
        else {
            this.focused = object; this.focusedpart = null;
            this.previous.copy(this.focused.parent.position);
        }
    }

    setFocusNull() {
        this._DisplaceFocused = null;
        this.focused = null;
        this.focusedpart = null;
        this.item = null;
    }

    select(object) {
        this._DisplaceMouseOvered = object;
        if (object.userData.parent) {
            this.mouseovered = object.userData.parent;
            this.mouseoveredpart = this._DisplaceMouseOvered;
        }
        else {
            this.mouseovered = object; this.mouseoveredpart = null;
        }
    }

    _setSelectNull() {
        this._DisplaceMouseOvered = null;
        this.mouseovered = null;
        this.mouseoveredpart = null;
    }

    _selGetPos(a) {
        this.focused.parent.position.copy(a);
    }

    _rayGet(): THREE.Raycaster {
        var vector = new THREE.Vector3(this._mouse.x, this._mouse.y, 0.5);
        vector.unproject(this.camera);
        var raycaster = new THREE.Raycaster(this.camera.position, vector.sub(this.camera.position).normalize());
        return raycaster;
    }

    private getMousePos = (event) => {
        this.x = event.offsetX == undefined ? event.layerX : event.offsetX;
        this.z = event.offsetY == undefined ? event.layerY : event.offsetY;

        var rect = this.container.getBoundingClientRect();
        this._mouse.x = ((this.x) / rect.width) * 2 - 1;
        this._mouse.y = - ((this.z) / rect.height) * 2 + 1;

        var vector = new THREE.Vector3(this._mouse.x, this._mouse.y, 0.5);
        return vector;
    }

    private onContainerMouseDown = (event) => {
        var raycaster = this._rayGet();
        this._intersects = raycaster.intersectObjects(this.objects, true);

        if (this._intersects.length > 0) {
            this.setFocus(this._intersects[0].object);
            this.onclick();

        }
        else {
            this.setFocusNull();
            this.moveScene = true;
            this.x = event.offsetX == undefined ? event.layerX : event.offsetX;
            this.z = event.offsetY == undefined ? event.layerY : event.offsetY;
            this.lx = this.x;
            this.lz = this.z;
        }
    }

    onContainerMouseMove() {

        var raycaster = this._rayGet();

        if (this.focused) {
            if (this.displacing) {
                this.intersectsMap = raycaster.intersectObject(this.projectionMap);

                try {
                    var pos = new THREE.Vector3().copy(this.intersectsMap[0].point);
                    if (this.fixed.x == 1) { pos.x = this.previous.x };
                    if (this.fixed.y == 1) { pos.y = this.previous.y };
                    if (this.fixed.z == 1) { pos.z = this.previous.z };
                    pos.x -= this.scene.position.x;
                    pos.z -= this.scene.position.z;
                    this._selGetPos(pos);
                }
                catch (err) { }

                //this.move(); this._selGetPos(this.focused.parent.position);
            }
        }
        else {
            this._intersects = raycaster.intersectObjects(this.objects, true);
            if (this._intersects.length > 0) {
                if (this.mouseovered) {
                    if (this._DisplaceMouseOvered != this._intersects[0].object) {
                        this.mouseout();
                        this.select(this._intersects[0].object);
                        this.mouseover();
                    }
                    else this.mouseover();
                }
                else {
                    this.select(this._intersects[0].object);
                    this.mouseover();
                }
            }
            else {
                if (this._DisplaceMouseOvered) { this.mouseout(); this._setSelectNull(); }
                if (this.moveScene) {
                    var dx = this.x - this.lx;
                    var dz = this.z - this.lz;
                    this.scene.position.x -= dx / 5.0;
                    if (this.scene.position.x > this.moveMax) {
                        this.scene.position.x = this.moveMax;
                    } else if (this.scene.position.x < -this.moveMax) {
                        this.scene.position.x = -this.moveMax;
                    }
                    this.scene.position.z -= dz / 5.0;
                    if (this.scene.position.z > this.moveMax) {
                        this.scene.position.z = this.moveMax;
                    } else if (this.scene.position.z < -this.moveMax) {
                        this.scene.position.z = -this.moveMax;
                    }
                    this.lx = this.x;
                    this.lz = this.z;
                }
            }
        }
    }

    private onContainerMouseUp = (event) => {
        event.preventDefault();
        this.moveScene = false;

        if (this.focused) {
            console.log(this.focused.parent.userData);
            var userData = this.focused.parent.userData;
            var x = Math.round( this.focused.parent.position.x * 10 ) / 10;
            this.focused.parent.position.x = x;
            userData.shipData.instances[userData.id].position.x = x;
            var z = Math.round( this.focused.parent.position.z * 10 ) / 10;
            this.focused.parent.position.z = z;
            userData.shipData.instances[userData.id].position.z = z;
            this.mouseup();
            this._DisplaceFocused = null;
            this.focused = null;
        }
    }

    private onDocumentMouseWheel = (event) => {
        event.preventDefault();
        event.stopPropagation();
        var delta;
        switch (event.deltaMode) {
            case 2:
                // Zoom in pages
                delta = event.deltaY * 0.025;
                break;

            case 1:
                // Zoom in lines
                delta = event.deltaY * 0.01;
                break;

            default:
                // undefined, 0, assume pixels
                delta = event.deltaY * 0.00025;
                break;

        }
        var zoomSpeed = 20.0;
        if (this.camera.zoom > 3.0) {
            zoomSpeed += 10.0;
        }
        this.camera.zoom -= delta * zoomSpeed;
        if (this.camera.zoom < 1.0) {
            this.camera.zoom = 1.0;
        } else if (this.camera.zoom > 7.0) {
            this.camera.zoom = 7.0;
        }
        this.camera.updateProjectionMatrix();
    }
}