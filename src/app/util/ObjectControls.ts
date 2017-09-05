
import * as THREE from 'three';
import { Pointer } from './Pointer';
import { ShipService } from '../ship.service'
import { Router } from '@angular/router';
import { Joystick } from './Joystick'

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
    mousewheelevt; // fix for firefox

    enabled = true;
    item = null;

    previous = new THREE.Vector3(0, 0, 0);

    selected = null;
    down: boolean;
    lefttop: THREE.Vector3 = new THREE.Vector3();
    selectedObjects = [];
    selectedBoxes: Map<string, any> = new Map();
    pointer: Pointer = new Pointer(this.camera);
    multifocus: boolean = false;
    multiSelectedObj = null;

    constructor(private camera, private gridCamera, private container, private htmlContainer, private objects: THREE.Object3D[],
        private projectionMap, private scene: THREE.Scene, private shipService: ShipService, private router: Router, private marqueeBox: THREE.Mesh,
        private joystick: Joystick) {

    }

    activate() {
        this.container.addEventListener('mousedown', this.onContainerMouseDown, false);
        this.container.addEventListener('mousemove', this.getMousePos, false);
        this.container.addEventListener('mouseup', this.onContainerMouseUp, false);
        this.mousewheelevt = (/Firefox/i.test(navigator.userAgent)) ? "DOMMouseScroll" : "mousewheel"; //FF doesn't recognize mousewheel as of FF3.x

        var document: any = window.document;
        if (document.attachEvent) //if IE (and Opera depending on user setting)
            document.attachEvent("on" + this.mousewheelevt, this.onDocumentMouseWheel)
        else if (document.addEventListener) //WC3 browsers
            document.addEventListener(this.mousewheelevt, this.onDocumentMouseWheel, false)
    }

    deactivate() {
        this.container.removeEventListener('mousedown', this.onContainerMouseDown, false);
        this.container.removeEventListener('mousemove', this.getMousePos, false);
        this.container.removeEventListener('mouseup', this.onContainerMouseUp, false);
        var document: any = document;
        if (document.detachEvent) //if IE (and Opera depending on user setting)
            document.detachEvent("on" + this.mousewheelevt, this.onDocumentMouseWheel)
        else if (document.addEventListener) //WC3 browsers
            document.removeEventListener(this.mousewheelevt, this.onDocumentMouseWheel, false)
    }

    update() {
        this.marqueeBox.visible = this.down;
        this.onContainerMouseMove();
    }

    updateAfter(screenWidth, screenHeight) {
        if (this.selected) {
            this.pointer.update(this.selected.parent.position.clone(), this.selected.parent.userData.shipData, screenWidth, screenHeight);
        }
    }

    onUpdateTacticalPlan() {
        var updatedObjects = [];
        this.selectedObjects.forEach(o => {
            var id = o.parent.name + "" + o.parent.userData.id;
            for (var i=0; i<this.objects.length; i++) {
                var nobj = this.objects[i];
                var id2 = nobj.parent.name + "" + nobj.parent.userData.id;
                if (id == id2) {
                    updatedObjects.push(nobj);
                    break;
                }
            }
        });
        this.selectedObjects = updatedObjects;
    }

    move = function () {
        this.container.style.cursor = 'move'
    }
    mouseover = function () {
        if ((this.selected || this.selectedObjects.length > 0) && this.shipService.isUnlocked()) {
            this.container.style.cursor = 'move';
        } else {
            this.container.style.cursor = 'pointer';
        }
    }
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
        // selection
        if (this.focused !== this.selected) {
            this.selected = this.focused;
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
        var x = event.offsetX == undefined ? event.layerX : event.offsetX;
        var z = event.offsetY == undefined ? event.layerY : event.offsetY;

        var rect = this.container.getBoundingClientRect();
        this._mouse.x = ((x) / rect.width) * 2 - 1;
        this._mouse.y = - ((z) / rect.height) * 2 + 1;

        var vector = new THREE.Vector3(this._mouse.x, this._mouse.y, 0.5);
        return vector;
    }

    private onContainerMouseDown = (event) => {
        var raycaster = this._rayGet();
        var intersects = raycaster.intersectObjects(this.objects, true);

        if (this.selected && this.shipService.isUnlocked() && intersects.length > 0) {
            this.setFocus(intersects[0].object);
            this.onclick();
        } else if (this.selectedObjects.length > 0 && this.shipService.isUnlocked() && intersects.length > 0 && this.selectedObjects.includes(intersects[0].object)) {
            this.multifocus = true;
            this.multiSelectedObj = intersects[0].object;
        }

        if (intersects.length == 0) {
            this.selectedObjects = [];
            this.selectedBoxes.forEach((value: any, key: string) => {
                this.scene.remove(value);
                this.selectedBoxes.delete(key);
            });
            this.down = true;
            var intersectsMap = raycaster.intersectObject(this.projectionMap);
            if (intersectsMap.length > 0) {
                this.lefttop = new THREE.Vector3().copy(intersectsMap[0].point);
            }
        }
    }

    onContainerMouseMove() {

        var raycaster = this._rayGet();

        if (this.focused) {
            if (this.displacing) {
                var intersectsMap = raycaster.intersectObject(this.projectionMap);

                try {
                    if (intersectsMap.length > 0) {
                        var pos = new THREE.Vector3().copy(intersectsMap[0].point);
                        if (this.fixed.x == 1) { pos.x = this.previous.x };
                        if (this.fixed.y == 1) { pos.y = this.previous.y };
                        if (this.fixed.z == 1) { pos.z = this.previous.z };
                        pos.x -= this.scene.position.x;
                        pos.z -= this.scene.position.z;
                        this._selGetPos(pos);
                    }
                }
                catch (err) { }

                //this.move(); this._selGetPos(this.focused.parent.position);
            }
        } else if (this.down) {
            var intersectsMap = raycaster.intersectObject(this.projectionMap);

            try {
                if (intersectsMap.length > 0) {
                    var pos = new THREE.Vector3().copy(intersectsMap[0].point);
                    this.marqueeBox.position.set(this.lefttop.x - (this.lefttop.x - pos.x) / 2, 0, this.lefttop.z - (this.lefttop.z - pos.z) / 2);
                    this.marqueeBox.scale.set(Math.abs(this.lefttop.x - pos.x), Math.abs(this.lefttop.z - pos.z), 1);
                    var mbox = new THREE.Box3().setFromCenterAndSize(this.marqueeBox.position, new THREE.Vector3(this.marqueeBox.scale.x, 30, this.marqueeBox.scale.y));
                    var sobjs = [];
                    this.objects.forEach(o => {
                        var obox = new THREE.Box3().setFromObject(o);
                        if (mbox.intersectsBox(obox)) {
                            sobjs.push(o);
                        }
                    });
                    this.selectedObjects = sobjs;
                }
            }
            catch (err) { }
        }
        else {
            var intersects = raycaster.intersectObjects(this.objects, true);
            if (intersects.length > 0) {
                if (this.mouseovered) {
                    if (this._DisplaceMouseOvered != intersects[0].object) {
                        this.mouseout();
                        this.select(intersects[0].object);
                    }
                }
                else {
                    this.select(intersects[0].object);
                }
                this.mouseover();
            }
            else {
                if (this._DisplaceMouseOvered) { this.mouseout(); this._setSelectNull(); }
            }
        }

        if (this.multifocus && this.multiSelectedObj) { // move multiselect
            var intersectsMap = raycaster.intersectObject(this.projectionMap);
            if (intersectsMap.length > 0) {
                var pos = new THREE.Vector3().copy(intersectsMap[0].point);
                if (this.fixed.x == 1) { pos.x = this.previous.x };
                if (this.fixed.y == 1) { pos.y = this.previous.y };
                if (this.fixed.z == 1) { pos.z = this.previous.z };
                pos.x -= this.scene.position.x;
                pos.z -= this.scene.position.z;
                var diff = new THREE.Vector3(pos.x - this.multiSelectedObj.parent.position.x, pos.y, pos.z - this.multiSelectedObj.parent.position.z);

                this.multiSelectedObj.parent.position.copy(pos);
                this.selectedObjects.forEach(o => {
                    if (o !== this.multiSelectedObj) {
                        o.parent.position.set(o.parent.position.x + diff.x, pos.y, o.parent.position.z + diff.z);
                    }
                });
            }
        }

        if (this.selected || this.down || this.multifocus) {
            var ids = [];
            this.selectedObjects.forEach(o => {
                var id = o.parent.name + "" + o.parent.userData.id;
                ids.push(id);
                if (!this.selectedBoxes.has(id)) {
                    var boxHelper: any = new THREE.BoxHelper(o);
                    boxHelper.material.color.set(o.material.color);
                    boxHelper.material.transparent = true;
                    boxHelper.material.opacity = 0.3;
                    this.scene.add(boxHelper);
                    this.selectedBoxes.set(id, boxHelper);
                }
            });
            this.selectedBoxes.forEach((value: any, key: string) => {
                if (!ids.includes(key)) {
                    this.scene.remove(value);
                    this.selectedBoxes.delete(key);
                }
            });

            if (this.selected) {
                var id = this.selected.parent.name + "" + this.selected.parent.userData.id;
                if (!this.selectedBoxes.has(id)) {
                    var boxHelper: any = new THREE.BoxHelper(this.selected);
                    boxHelper.material.color.set(this.selected.material.color);
                    boxHelper.material.transparent = true;
                    boxHelper.material.opacity = 0.3;
                    this.scene.add(boxHelper);
                    this.selectedBoxes.set(id, boxHelper);
                }
            }
        }
    }

    private onContainerMouseUp = (event) => {
        event.preventDefault();
        this.down = false;

        if (this.focused) {
            var userData = this.focused.parent.userData;
            var x = Math.round(this.focused.parent.position.x * 10) / 10;
            this.focused.parent.position.x = x;
            userData.shipData.instances[userData.id].position.x = x;
            var z = Math.round(this.focused.parent.position.z * 10) / 10;
            this.focused.parent.position.z = z;
            userData.shipData.instances[userData.id].position.z = z;
            this._DisplaceFocused = null;
            this.focused = null;
            this.mouseup();
        } else if (this.multifocus) {
            this.multifocus = false;
            this.selectedObjects.forEach(o => {
                var userData = o.parent.userData;
                var x = Math.round(o.parent.position.x * 10) / 10;
                o.parent.position.x = x;
                userData.shipData.instances[userData.id].position.x = x;
                var z = Math.round(o.parent.position.z * 10) / 10;
                o.parent.position.z = z;
                userData.shipData.instances[userData.id].position.z = z;
            });
            this.mouseup();
        } else if (!this.focused) { // selection
            if (this.selectedObjects.length == 1) {
                this.selected = this.selectedObjects[0];
                this.pointer.show(this.htmlContainer, this.scene, this.selected.parent.userData.shipData);
            } else {
                var raycaster = this._rayGet();
                var intersects = raycaster.intersectObjects(this.objects, true);
                if (intersects.length > 0) {
                    this.selected = intersects[0].object;
                    this.pointer.show(this.htmlContainer, this.scene, this.selected.parent.userData.shipData);
                } else if (this.selected) {
                    this.hideSelected();
                }
            }
        }
    }

    hideSelected() {
        this.pointer.hide(this.htmlContainer, this.scene);
        this.selected = null;
        this.multiSelectedObj = null;
        this.multifocus = false;
        this.selectedObjects = [];
        this.selectedBoxes.forEach((value: any, key: string) => {
            this.scene.remove(value);
            this.selectedBoxes.delete(key);
        });
    }

    private onDocumentMouseWheel = (event) => {
        if (!this.router.url.startsWith("/simulator")) {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        var delta;
        if (event.deltaY) {
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
        }
        delta = delta ? delta : event.detail / 500.0;
        var zoomSpeed = 20.0;
        if (this.camera.zoom > 3.0) {
            zoomSpeed += 10.0;
        }
        this.camera.zoom -= delta * zoomSpeed;
        if (this.camera.zoom < 1.0) {
            this.camera.zoom = 1.0;
            this.camera.position.x = 0;
            this.camera.position.y = 110;
            this.camera.position.z = -80;
            this.joystick.hide();
        } else if (this.camera.zoom > 7.0) {
            this.camera.zoom = 7.0;
            this.joystick.show();
        } else {
            this.joystick.show();
        }
        this.camera.updateProjectionMatrix();

        this.gridCamera.zoom -= delta * zoomSpeed;
        if (this.gridCamera.zoom < 1.0) {
            this.gridCamera.zoom = 1.0;
            this.gridCamera.position.x = 0;
            this.gridCamera.position.y = 110;
            this.gridCamera.position.z = -80;
        } else if (this.gridCamera.zoom > 7.0) {
            this.gridCamera.zoom = 7.0;
        }
        this.gridCamera.updateProjectionMatrix();
    }
}