
import * as THREE from 'three';
import { Pointer } from './Pointer';
import { ShipService } from '../ship.service'
import { Router } from '@angular/router';
import { Joystick } from './Joystick'
import * as Ship3D from '../simulator/ship-model3d'

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

    ctrl = false;
    rightClick = false;

    updateNeeded = false;

    constructor(private camera, private gridCamera, private container, private htmlContainer, private objects: THREE.Object3D[],
        private projectionMap, private scene: THREE.Scene, private shipService: ShipService, private router: Router, private marqueeBox: THREE.Mesh,
        private joystick: Joystick, private resetCameraView) {

    }

    activate() {
        this.container.addEventListener('mousedown', this.onContainerMouseDown, false);
        this.container.addEventListener('mousemove', this.getMousePos, false);
        this.container.addEventListener('mouseup', this.onContainerMouseUp, false);
        this.container.addEventListener('contextmenu', this.onContainerRightClick, false);
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
        this.container.removeEventListener('contextmenu', this.onContainerRightClick, false);
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
            this.pointer.update(this.selected.parent.position.clone(), this.selected.parent.rotation, this.selected.parent.userData.shipData, screenWidth, screenHeight);
        }
    }

    onUpdateTacticalPlan() {
        var updatedObjects = [];
        this.selectedObjects.forEach(o => {
            var id = o.parent.name + "" + o.parent.userData.id;
            for (var i = 0; i < this.objects.length; i++) {
                var nobj = this.objects[i];
                var id2 = nobj.parent.name + "" + nobj.parent.userData.id;
                if (id == id2) {
                    updatedObjects.push(nobj);
                    break;
                }
            }
        });
        this.selectedObjects = updatedObjects;
        if (this.selected) {
            var sid = this.selected.parent.name + "" + this.selected.parent.userData.id;
            for (var i = 0; i < this.objects.length; i++) {
                var nobj = this.objects[i];
                var id2 = nobj.parent.name + "" + nobj.parent.userData.id;
                if (sid == id2) {
                    this.selected = nobj;
                    break;
                }
            }
        }
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
        this.ctrl = event.ctrlKey;

        var vector = new THREE.Vector3(this._mouse.x, this._mouse.y, 0.5);
        return vector;
    }

    private onContainerMouseDown = (event) => {
        this.rightClick = false;
        var raycaster = this._rayGet();
        var intersects = raycaster.intersectObjects(this.objects, true);

        if (this.selected && this.shipService.isUnlocked() && intersects.length > 0) {
            var obj = intersects[0].object;
            if (this.selected == obj) {
                this.setFocus(obj);
                this.projectionMap.position.y = this.selected.parent.position.y;
                this.onclick();
            }
        } else if (this.selectedObjects.length > 0 && this.shipService.isUnlocked() && intersects.length > 0 && this.selectedObjects.includes(intersects[0].object)) {
            this.multifocus = true;
            this.multiSelectedObj = intersects[0].object;
            this.projectionMap.position.y = this.multiSelectedObj.parent.position.y;
        }

        if (intersects.length == 0) {
            this.down = true;
            var intersectsMap = raycaster.intersectObject(this.projectionMap);
            if (intersectsMap.length > 0) {
                this.lefttop = new THREE.Vector3().copy(intersectsMap[0].point);
            }
        }
    }

    private onContainerRightClick = (event) => {
        event.preventDefault();
        if (this.selectedObjects.length == 0 && !this.selected) {
            return;
        }
        this.rightClick = true;
        if (this.down) {
            this.down = false;
        }
        var raycaster = this._rayGet();
        var intersects = raycaster.intersectObjects(this.objects, true);
        var dpoint = null;
        if (intersects.length > 0) {
            dpoint = intersects[0].object.parent.position;
        } else {
            var intersectsMap = raycaster.intersectObject(this.projectionMap);
            if (intersectsMap.length > 0) {
                dpoint = intersectsMap[0].point;
            } else {
                return;
            }
        }
        var dir = new THREE.Vector3().copy(dpoint);

        if (this.selectedObjects.length > 0) {
            this.selectedObjects.forEach(o => {
                o.rotation.x = -Math.PI / 2;
                o.rotation.y = Math.PI;
                if (!this.ctrl) {
                    dir.y = o.parent.position.y;
                }
                o.parent.lookAt(dir);
            });
        } else if (this.selected) {
            this.selected.rotation.x = -Math.PI / 2;
            this.selected.rotation.y = Math.PI;
            if (!this.ctrl) {
                dir.y = this.selected.parent.position.y;
            }
            this.selected.parent.lookAt(dir);
        }

        this.saveRotation();
        this.mouseup();
    }

    onContainerMouseMove() {

        var raycaster = this._rayGet();

        if (this.focused) {
            if (this.displacing) {
                var intersectsMap = raycaster.intersectObject(this.projectionMap);

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
        } else if (this.down) {
            var intersectsMap = raycaster.intersectObject(this.projectionMap);

            if (intersectsMap.length > 0) {
                var p = intersectsMap[0].point;
                if (Math.abs(this.lefttop.x - p.x) > 2 || Math.abs(this.lefttop.z - p.z) > 2) {
                    var pos = new THREE.Vector3().copy(intersectsMap[0].point);
                    this.marqueeBox.position.set(this.lefttop.x - (this.lefttop.x - pos.x) / 2, 0, this.lefttop.z - (this.lefttop.z - pos.z) / 2);
                    this.marqueeBox.scale.set(Math.abs(this.lefttop.x - pos.x), Math.abs(this.lefttop.z - pos.z), 1);
                    var mbox = new THREE.Box3().setFromCenterAndSize(this.marqueeBox.position, new THREE.Vector3(this.marqueeBox.scale.x, 80, this.marqueeBox.scale.y));
                    var sobjs = [];
                    this.objects.forEach(o => {
                        var obox = new THREE.Box3().setFromObject(o);
                        if (mbox.intersectsBox(obox)) {
                            sobjs.push(o);
                        }
                    });
                    this.selectedObjects = sobjs;
                } else {
                    this.marqueeBox.scale.set(0.0, 0.0, 0.0);
                }
            }
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
                var diff = new THREE.Vector3(pos.x - this.multiSelectedObj.parent.position.x, 0, pos.z - this.multiSelectedObj.parent.position.z);

                this.multiSelectedObj.parent.position.set(pos.x, this.multiSelectedObj.parent.position.y, pos.z);
                this.selectedObjects.forEach(o => {
                    if (o !== this.multiSelectedObj) {
                        o.parent.position.set(o.parent.position.x + diff.x, o.parent.position.y, o.parent.position.z + diff.z);
                    }
                });
            }
        }

        if (this.selected || this.down || this.multifocus || this.updateNeeded) {
            var ids = [];
            if (this.selected) {
                ids.push(this.selected.parent.name + "" + this.selected.parent.userData.id);
            }
            this.selectedObjects.forEach(o => {
                var id = o.parent.name + "" + o.parent.userData.id;
                ids.push(id);
                if (!this.selectedBoxes.has(id)) {
                    var size = new THREE.Box3().setFromObject(o).getSize();
                    var color = (o.parent.userData.shipData.instances[o.parent.userData.id].enemy) ? 0xdd0000 : 0x00dddd;
                    var boxHelper: any = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxBufferGeometry(size.x, size.y, size.z), 1), new THREE.LineBasicMaterial({ color: color, transparent: true, opacity: 0.3, linewidth: 1 }));
                    boxHelper.position.set(o.parent.position.x, o.parent.position.y, o.parent.position.z);
                    this.scene.add(boxHelper);
                    this.selectedBoxes.set(id, boxHelper);
                } else {
                    var sb = this.selectedBoxes.get(id);
                    sb.position.set(o.parent.position.x, o.parent.position.y, o.parent.position.z);
                    if (o.parent.children.length > 1) {
                        o.parent.children[1].children[0].scale.z = o.parent.position.y / Ship3D.MAX_HEIGHT;
                    }
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
                    var size = new THREE.Box3().setFromObject(this.selected).getSize();
                    var color = (this.selected.parent.userData.shipData.instances[this.selected.parent.userData.id].enemy) ? 0xdd0000 : 0x00dddd;
                    var boxHelper = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxBufferGeometry(size.x, size.y, size.z), 1), new THREE.LineBasicMaterial({ color: color, transparent: true, opacity: 0.3, linewidth: 1 }));
                    boxHelper.position.set(this.selected.parent.position.x, this.selected.parent.position.y, this.selected.parent.position.z);
                    this.scene.add(boxHelper);
                    this.selectedBoxes.set(id, boxHelper);
                } else {
                    var sb = this.selectedBoxes.get(id);
                    sb.position.set(this.selected.parent.position.x, this.selected.parent.position.y, this.selected.parent.position.z);
                    if (this.selected.parent.children.length > 1) {
                        this.selected.parent.children[1].children[0].scale.z = this.selected.parent.position.y / Ship3D.MAX_HEIGHT;
                    }
                }
            }
        }
    }

    resetRotation() {
        if (this.selectedObjects.length > 0) {
            this.selectedObjects.forEach(o => {
                var userData = o.parent.userData;
                o.parent.rotation.x = userData.shipData.instances[userData.id].rotation.x;
                o.parent.rotation.y = userData.shipData.instances[userData.id].rotation.y;
                o.parent.rotation.z = userData.shipData.instances[userData.id].rotation.z;
            });
        } else if (this.selected) {
            var userData = this.selected.parent.userData;
            this.selected.parent.rotation.x = userData.shipData.instances[userData.id].rotation.x;
            this.selected.parent.rotation.y = userData.shipData.instances[userData.id].rotation.y;
            this.selected.parent.rotation.z = userData.shipData.instances[userData.id].rotation.z;
        }
    }

    saveRotation() {
        if (this.selectedObjects.length > 0) {
            this.selectedObjects.forEach(o => {
                var userData = o.parent.userData;
                var x = Math.round(o.parent.rotation.x * 1000) / 1000;
                o.parent.rotation.x = x;
                userData.shipData.instances[userData.id].rotation.x = x;
                var y = Math.round(o.parent.rotation.y * 1000) / 1000;
                o.parent.rotation.y = y;
                userData.shipData.instances[userData.id].rotation.y = y;
                var z = Math.round(o.parent.rotation.z * 1000) / 1000;
                o.parent.rotation.z = z;
                userData.shipData.instances[userData.id].rotation.z = z;
            });
        } else if (this.selected) {
            var userData = this.selected.parent.userData;
            var x = Math.round(this.selected.parent.rotation.x * 1000) / 1000;
            this.selected.parent.rotation.x = x;
            userData.shipData.instances[userData.id].rotation.x = x;
            var y = Math.round(this.selected.parent.rotation.y * 1000) / 1000;
            this.selected.parent.rotation.y = y;
            userData.shipData.instances[userData.id].rotation.y = y;
            var z = Math.round(this.selected.parent.rotation.z * 1000) / 1000;
            this.selected.parent.rotation.z = z;
            userData.shipData.instances[userData.id].rotation.z = z;
        }
    }

    private onContainerMouseUp = (event) => {
        event.preventDefault();

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
        } else if (this.multifocus && !this.rightClick) {
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
        } else if (!this.rightClick) { // selection
            var multi = !(this.marqueeBox.scale.x == 0 && this.marqueeBox.scale.y == 0 && this.marqueeBox.scale.z == 0);
            if (multi && this.selectedObjects.length == 1) {
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
                } else if (!multi && this.selectedObjects.length > 0) {
                    this.selectedObjects = [];
                    this.selectedBoxes.forEach((value: any, key: string) => {
                        this.scene.remove(value);
                        this.selectedBoxes.delete(key);
                    });
                }
            }
        }
        this.down = false;
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
        if (this.updateNeeded) {
            this.updateNeeded = false;
            this.shipService.updateTacticalPlan();
        }
    }

    private onDocumentMouseWheel = (event) => {
        if (!this.router.url.startsWith("/simulator") || !this.enabled) {
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

        if (this.selected) { // move selected ship up/down
            this.selected.parent.position.y -= delta * 200;
            if (this.selected.parent.position.y < 1) {
                this.selected.parent.position.y = 1;
            } else if (this.selected.parent.position.y > Ship3D.MAX_HEIGHT) {
                this.selected.parent.position.y = Ship3D.MAX_HEIGHT;
            }
            this.updateNeeded = true;
            return;
        }

        if (this.selectedObjects.length > 0) { // move selected ships up/down
            this.selectedObjects.forEach(o => {
                o.parent.position.y -= delta * 200;
                if (o.parent.position.y < 1) {
                    o.parent.position.y = 1;
                } else if (o.parent.position.y > Ship3D.MAX_HEIGHT) {
                    o.parent.position.y = Ship3D.MAX_HEIGHT;
                }
            });
            this.updateNeeded = true;
            return;
        }

        var zoomSpeed = 20.0;
        if (this.camera.zoom > 3.0) {
            zoomSpeed += 10.0;
        }
        this.camera.zoom -= delta * zoomSpeed;
        var resetView = false;
        if (this.camera.zoom < 1.0) {
            this.camera.zoom = 1.0;
            resetView = true;
            //this.joystick.hide();
        } else if (this.camera.zoom > 7.0) {
            this.camera.zoom = 7.0;
            //this.joystick.show();
        } else {
            //this.joystick.show();
        }
        this.camera.updateProjectionMatrix();

        this.gridCamera.zoom -= delta * zoomSpeed;
        if (this.gridCamera.zoom < 1.0) {
            this.gridCamera.zoom = 1.0;
            resetView = true;
        } else if (this.gridCamera.zoom > 7.0) {
            this.gridCamera.zoom = 7.0;
        }
        this.gridCamera.updateProjectionMatrix();

        if (resetView) {
            this.resetCameraView();
        }
    }
}