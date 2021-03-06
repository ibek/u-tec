import * as THREE from 'three'
import { ShipService } from '../ship.service'
import { Router } from '@angular/router'
import { Input, ViewChild } from '@angular/core'
import { OrbitCamera } from './OrbitCamera'
import { Joystick } from './Joystick'
import { AnimationFrame } from '../data-model';
import { ShipModel3D } from '../simulator/ship-model3d'
import * as ShipModel3DNS from '../simulator/ship-model3d';
import * as Hammer from 'hammerjs'

export class Controller {

    private static _mouseSpeedX = 0.4;
    private static _mouseSpeedY = 0.3;
    private static _joystickSpeedX = 0.05;
    private static _joystickSpeedY = 0.05;
    private static _zoomSpeed = 0.2 / 0.006;

    actionableObjects: any = [];
    container;
    shipLabel = "none";
    @Input() currentAnimationFrame = 0;
    recording = false;

    private _needRefresh = false;
    private _keydown = false;
    private _keyup = false;
    private _needTacticalPlanUpdate = false;
    private _lefttop = null;
    private _keymap: Map<string, any>;
    private _focusedObject = null;
    private _mbox = new THREE.Box3();
    private _hammer;
    private _mouseCursorObj;

    constructor(private scene: THREE.Scene, private shipService: ShipService, private projectionMap: THREE.Mesh,
        private camera: OrbitCamera, private joystick: Joystick, private marqueeBox, private addToCurrentTime) {
    }

    enable(container) {
        this.container = container;
        this.recording = false;

        var mousewheelevt = (/Firefox/i.test(navigator.userAgent)) ? "DOMMouseScroll" : "mousewheel"; //FF doesn't recognize mousewheel as of FF3.x

        window.addEventListener('keydown', this._onKeyDown, false);
        window.addEventListener('keyup', this._onKeyUp, false);
        if (container.addEventListener) { //WC3 browsers
            container.addEventListener('mousedown', this._onDown, false);
            container.addEventListener('mousemove', this._onMove, false);
            container.addEventListener('mouseup', this._onUp, false);
            container.addEventListener('touchstart', this._onDown);
            container.addEventListener('touchend', this._onUp);
            container.addEventListener('touchmove', this._onMove);
            container.addEventListener('contextmenu', this._noop, false);
            container.addEventListener(mousewheelevt, this._onMouseWheel, false);
        } else if (container.attachEvent) { //if IE (and Opera depending on user setting)
            container.attachEvent('onmousedown', this._onDown, false);
            container.attachEvent('onmousemove', this._onMove, false);
            container.attachEvent('onmouseup', this._onUp, false);
            container.attachEvent('ontouchstart', this._onDown, false);
            container.attachEvent('ontouchend', this._onUp, false);
            container.attachEvent('ontouchmove', this._onMove, false);
            container.attachEvent('oncontextmenu', this._noop, false);
            container.attachEvent("on" + mousewheelevt, this._onMouseWheel);
        }

        if (!this._hammer) {
            this._hammer = new Hammer(container);
        }
        this._hammer.get('pinch').set({ enable: true });
        this._hammer.get('rotate').set({ enable: true });

        var scope = this;
        this._hammer.on("pinch", function (e) {
            var selected = scope.getAllSelected();
            if (selected.length == 0) {
                var delta;
                if (e.scale > 1) {
                    delta = -e.scale / 700.0;
                } else {
                    delta = e.scale / 200.0;
                }
                scope._needRefresh = true;
                scope._keymap.set("zoom", delta);
            }
        });
        this._hammer.on("rotate", function (e) {
            var selected = scope.getAllSelected();
            if (selected.length > 0) {
                var radRotation = THREE.Math.degToRad(e.rotation);
                //scope.rotateSelectedShipsToAngle(selected, radRotation);
                // TODO
            }
        });
        //mc.on("tap press", this._onDown);

        var scope = this;
        this.joystick.moveCallback = function (deltaX, deltaY) {
            scope.camera.rotate(-deltaX * Controller._joystickSpeedX, -deltaY * Controller._joystickSpeedY);
        }

    }

    disable(container) {
        var mousewheelevt = (/Firefox/i.test(navigator.userAgent)) ? "DOMMouseScroll" : "mousewheel"; //FF doesn't recognize mousewheel as of FF3.x

        window.removeEventListener('keydown', this._onKeyDown, false);
        window.removeEventListener('keyup', this._onKeyUp, false);
        if (container.removeEventListener) { //WC3 browsers
            container.removeEventListener('mousedown', this._onDown, false);
            container.removeEventListener('mousemove', this._onMove, false);
            container.removeEventListener('mouseup', this._onUp, false);
            container.removeEventListener('touchstart', this._onDown, false);
            container.removeEventListener('touchend', this._onUp, false);
            container.removeEventListener('touchmove', this._onMove, false);
            container.removeEventListener('contextmenu', this._noop, false);
            container.removeEventListener(mousewheelevt, this._onMouseWheel, false);
        } else if (container.detachEvent) { //if IE (and Opera depending on user setting)
            container.detachEvent('onmousedown', this._onDown, false);
            container.detachEvent('onmousemove', this._onMove, false);
            container.detachEvent('onmouseup', this._onUp, false);
            container.detachEvent('ontouchstart', this._onDown, false);
            container.detachEvent('ontouchend', this._onUp, false);
            container.detachEvent('ontouchmove', this._onMove, false);
            container.detachEvent('oncontextmenu', this._noop, false);
            container.detachEvent("on" + mousewheelevt, this._onMouseWheel);
        }

        this._hammer.off("pinch");
        this._hammer.off("rotate");
    }

    reset() {
        this.actionableObjects.splice(0, this.actionableObjects.length);
        this._keymap = new Map<string, boolean>();
    }

    update(dt: number) {
        if (this._needRefresh) {
            if (this._keymap.get("leftclick")) {
                if (this._focusedObject) { // move the focused and selected objects
                    var e = this._keymap.get("leftclick");
                    var pos = this._getPosition(e);
                    var raycaster = this._rayGet(pos.x, pos.y);
                    var intersectsMap = raycaster.intersectObject(this.projectionMap);
                    if (intersectsMap.length > 0) {
                        var newpos = new THREE.Vector3().copy(intersectsMap[0].point);
                        if (!this.recording) {
                            var diff = new THREE.Vector3(newpos.x - this._focusedObject.parent.position.x, 0, newpos.z - this._focusedObject.parent.position.z);

                            ShipModel3D.updateObjectPosition(this._focusedObject, newpos.x, newpos.y, newpos.z);
                            this.updateAnimationCurveFor(this._focusedObject);
                            this.actionableObjects.forEach(o => {
                                if (o.parent.userData.selected == true && o !== this._focusedObject) {
                                    ShipModel3D.updateObjectPosition(o, o.parent.position.x + diff.x, o.parent.position.y, o.parent.position.z + diff.z);
                                    this.updateAnimationCurveFor(o);
                                }
                            });
                            this._needTacticalPlanUpdate = true;
                        } else {
                            var selected = this.getAllSelected();
                            var i = ShipModel3D.points.indexOf(this._focusedObject);
                            if (i > 0) {
                                var animFrame = selected[0].parent.userData.shipInstance.animation[i - 1];
                                animFrame.position.x = newpos.x;
                                animFrame.position.y = newpos.y;
                                animFrame.position.z = newpos.z;
                            } else {
                                ShipModel3D.updateObjectPosition(selected[0], newpos.x, newpos.y, newpos.z);
                                this._updateShipInstance();
                            }
                            this.updateAnimationCurveFor(selected[0]);
                            this._focusedObject = ShipModel3D.points[i]; // refresh point
                            this._needTacticalPlanUpdate = true;
                        }
                    }
                } else if (this._lefttop) {// marquee box
                    var e = this._keymap.get("leftclick");
                    var pos = this._getPosition(e);
                    var raycaster = this._rayGet(pos.x, pos.y);
                    var intersectsMap = raycaster.intersectObject(this.projectionMap);

                    if (intersectsMap.length > 0) {
                        var newpos = intersectsMap[0].point;
                        if ((Math.abs(this._lefttop.x - newpos.x) > 2 || Math.abs(this._lefttop.z - newpos.z) > 2)) {
                            this.marqueeBox.visible = true;
                            this.marqueeBox.position.set(this._lefttop.x - (this._lefttop.x - newpos.x) / 2, 0, this._lefttop.z - (this._lefttop.z - newpos.z) / 2);
                            this.marqueeBox.scale.set(Math.abs(this._lefttop.x - newpos.x), Math.abs(this._lefttop.z - newpos.z), 1);
                            this._mbox.setFromCenterAndSize(this.marqueeBox.position, new THREE.Vector3(this.marqueeBox.scale.x, ShipModel3DNS.MAX_HEIGHT * 2, this.marqueeBox.scale.y));
                            var i = 0;
                            var selected;
                            var b = new THREE.Box3();
                            var size = new THREE.Vector3();
                            this.actionableObjects.forEach(o => {
                                o.geometry.boundingBox.getSize(size);
                                var scale = o.parent.scale.x;
                                size.set(size.x * scale, size.y * scale, size.z * scale);
                                b = b.setFromCenterAndSize(o.parent.position, size);
                                if (this._mbox.intersectsBox(b)) {
                                    ShipModel3D.select(o, this.scene);
                                    selected = o;
                                    i++;
                                } else {
                                    ShipModel3D.deselect(o, this.scene);
                                }
                            });
                            if (i == 1 && selected) {
                                this.shipLabel = selected.parent.userData.shipData.name;
                            } else if (i > 1) {
                                this.shipLabel = i + " ships";
                            }
                        } else {
                            this.marqueeBox.scale.set(0.0, 0.0, 0.0);
                        }
                    }
                }
            }

            if (this._keymap.get("rightclick")) {
                var e = this._keymap.get("rightclick");
                var selected = this.getAllSelected();
                if (!e.ctrlKey && !e.shiftKey) {
                    var e = this._keymap.get("rightclick");
                    this.camera.rotate(e.movementX * Controller._mouseSpeedX, e.movementY * Controller._mouseSpeedY);
                }
            }

            if (this._keymap.get("zoom")) {
                var zoom = this._keymap.get("zoom")
                this.camera.zoomIn(zoom * Controller._zoomSpeed);
            }

            this._clearKeyMap();
            this._needRefresh = false;
        }

        if (this._keydown) {
            if (this._keymap.get("down-w")) {
                this.camera.forward(100 * dt);
            }
            if (this._keymap.get("down-s")) {
                this.camera.forward(-100 * dt);
            }
            if (this._keymap.get("down-a")) {
                this.camera.right(100 * dt);
            }
            if (this._keymap.get("down-d")) {
                this.camera.right(-100 * dt);
            }
            if (this._keymap.get("down-e")) {
                this.camera.rotate(-100 * dt, 0);
            }
            if (this._keymap.get("down-q")) {
                this.camera.rotate(100 * dt, 0);
            }
            if (this._keymap.get("down-c")) {
                this.rotateSelectedShipsBy(this.getAllSelected(), 5 * dt);
            }
            if (this._keymap.get("down-v")) {
                this.rotateSelectedShipsBy(this.getAllSelected(), -5 * dt);
            }
            if (this._keymap.get("down-1")) {
                this.addToCurrentTime(-2*dt);
            }
            if (this._keymap.get("down-2")) {
                this.addToCurrentTime(2*dt);
            }
        }

        if (this._keyup) {
            if (this._keymap.get("up-f")) {
                this.switchSideOfSelectedShips();
            }
            if (this._keymap.get("up-r")) {
                this.camera.reset();
            }
            if (this._keymap.get("up- ")) {
                var selected = this.getAllSelected();
                if (selected.length == 1) {
                    this.lookAtSelectedShip(selected[0]);
                }
            }
            if (this._keymap.get("up-x")) {
                this.rotateResetOfSelectedShips();
            }
            if (this._keymap.get("up-c") || this._keymap.get("up-v")) {
                this._updateTacticalPlan();
            }
            this._keyup = false;
            this._keymap.clear();
        }
    }

    getAllSelected(): any {
        var selected = [];
        this.actionableObjects.forEach(o => {
            if (o.parent.userData.selected) {
                selected.push(o);
            }
        });
        return selected;
    }

    selectObject(obj) {
        ShipModel3D.select(obj, this.scene);
        this.shipLabel = obj.parent.userData.shipData.name;
    }

    deselectObject(obj) {
        ShipModel3D.deselect(obj, this.scene);
    }

    deselectAll() {
        ShipModel3D.deselectAll(this.actionableObjects, this.scene);
    }

    switchSideOfSelectedShips() {
        var changed = false
        this.actionableObjects.forEach(o => {
            var userData = o.parent.userData;
            if (userData.selected) {
                var selectedShipInstance = userData.shipInstance;
                selectedShipInstance.enemy = !selectedShipInstance.enemy;
                ShipModel3D.switchSide(o, selectedShipInstance.enemy);
                changed = true;
            }
        });
        if (changed) {
            this._updateTacticalPlan();
        }
    }

    rotateSelectedShipsTo(selectedShips, direction, rotate2d) {
        var changed = false
        selectedShips.forEach(o => {
            o.rotation.x = -Math.PI / 2;
            o.rotation.y = Math.PI;
            if (rotate2d) {
                direction.y = o.parent.position.y;
            }
            o.parent.lookAt(direction);
            changed = true;
        });
        if (changed) {
            this._updateTacticalPlan();
        }
    }

    rotateSelectedShipsBy(selectedShips, delta) {
        var changed = false
        selectedShips.forEach(o => {
            o.rotation.x = -Math.PI / 2;
            o.rotation.y = Math.PI;
            var axis = new THREE.Vector3(0, 1.0, 0);
            var origin = o.parent.rotation.clone();
            //o.parent.rotateOnAxis(axis, angle);
            var rotMatrix = new THREE.Matrix4();
            var obj: THREE.Object3D;
            //rotMatrix.makeRotationAxis(axis.normalize(), angle);
            o.parent.rotateOnAxis(axis.normalize(), delta)
            //o.parent.rotation.applyMatrix(rotMatrix);
            //o.parent.rotation.set((origin.x - o.parent.rotation.x) + origin.x, (origin.y - o.parent.rotation.y) + origin.y, (origin.z - o.parent.rotation.z) + origin.z);
            changed = true;
        });
        /**if (changed) {
            this._updateTacticalPlan();
        }*/
    }

    rotateResetOfSelectedShips() {
        var changed = false
        this.actionableObjects.forEach(o => {
            var userData = o.parent.userData;
            if (userData.selected) {
                o.rotation.set(-Math.PI / 2, Math.PI, 0);
                o.parent.rotation.set(0, 0, 0);
                changed = true;
            }
        });
        if (changed) {
            this._updateTacticalPlan();
        }
    }

    lookAtSelectedShip(obj) {
        this.camera.moveTo(obj.parent.position, 40);
    }

    getAnimationFramesMinNumberOfSelectedShips() {
        var num = 1000;
        this.getAllSelected().forEach(o => {
            var oanimlen = o.parent.userData.shipInstance.animation.length;
            if (num > oanimlen) {
                num = oanimlen;
            }
        });
        return num;
    }

    private _onDown = (e) => {
        if (!this.recording && (e.buttons & 1 || (e.touches && e.touches.length == 1) || (e.changedPointers && e.changedPointers.length == 1))) { // left click
            var pos = this._getPosition(e);
            var raycaster = this._rayGet(pos.x, pos.y);
            var intersects = raycaster.intersectObjects(this.actionableObjects, true);
            if (intersects.length > 0) {
                var obj = intersects[0].object;
                this.projectionMap.position.y = obj.parent.position.y;
                this.projectionMap.updateMatrixWorld(false);
                if (obj.parent.userData.selected && !e.ctrlKey) {
                    this._focusedObject = obj;
                } else if (obj.parent.userData.selected && e.ctrlKey) {
                    this.deselectObject(obj);
                } else if (!obj.parent.userData.selected && e.ctrlKey) {
                    this.selectObject(obj);
                } else {
                    if (this._needTacticalPlanUpdate) {
                        this._updateTacticalPlan();
                        this._needTacticalPlanUpdate = false;
                    }
                    this.deselectAll();
                    this.selectObject(obj);
                }
            } else {
                if (this._needTacticalPlanUpdate) {
                    this._updateTacticalPlan();
                    this._needTacticalPlanUpdate = false;
                }
                this.deselectAll();
                var intersectsMap = raycaster.intersectObject(this.projectionMap);
                if (intersectsMap.length > 0) {
                    this._lefttop = new THREE.Vector3().copy(intersectsMap[0].point);
                }
            }
        }

        if (!this.recording && e.buttons & 2 && (e.shiftKey || e.ctrlKey)) { // right click rotate
            var selectedShips = this.getAllSelected();
            if (selectedShips.length > 0) {
                var pos = this._getPosition(e);
                var raycaster = this._rayGet(pos.x, pos.y);
                var intersects = raycaster.intersectObjects(this.actionableObjects, true);
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
                //var rotate2d = !e.ctrlKey;

                var dir = new THREE.Vector3().copy(dpoint);
                this.rotateSelectedShipsTo(selectedShips, dir, true);
            }
        }

        if (this.recording && (e.buttons & 1 || (e.touches && e.touches.length == 1) || (e.changedPointers && e.changedPointers.length == 1))) {
            var pos = this._getPosition(e);
            var raycaster = this._rayGet(pos.x, pos.y);
            var intersects = raycaster.intersectObjects(ShipModel3D.points, true);
            if (intersects.length > 0) {
                var p = intersects[0].object;
                this.projectionMap.position.y = p.position.y;
                this.projectionMap.updateMatrixWorld(false);
                this._focusedObject = p;
            }
        }

        if (this.recording && e.buttons & 2) { // right click adding movement point
            var selectedShips = this.getAllSelected();
            if (selectedShips.length == 1) {
                var aobj = selectedShips[0];
                var shipInstance = aobj.parent.userData.shipInstance;
                var animation = shipInstance.animation;
                var pos = this._getPosition(e);
                var raycaster = this._rayGet(pos.x, pos.y);
                var intersects = raycaster.intersectObjects(ShipModel3D.points, true);
                if (intersects.length > 0) {
                    var p = intersects[0].object;
                    var i = ShipModel3D.points.indexOf(p);
                    if (i > 0) {
                        animation.splice(i - 1, 1);
                        this.updateAnimationCurveFor(aobj);
                        this._updateTacticalPlan();
                    }
                } else if (animation.length < 5) {
                    var pos = this._getPosition(e);
                    var raycaster = this._rayGet(pos.x, pos.y);
                    this.projectionMap.position.y = aobj.parent.position.y;
                    this.projectionMap.updateMatrixWorld(false);
                    var intersectsMap = raycaster.intersectObject(this.projectionMap);
                    if (intersectsMap.length > 0) {
                        dpoint = intersectsMap[0].point;
                        var animFrame = new AnimationFrame();
                        animFrame.visible = true;
                        animFrame.position = dpoint;
                        animation.push(animFrame);
                        this.updateAnimationCurveFor(aobj);
                        this._updateTacticalPlan();
                    }
                }
            }
        }
    }

    updateAnimationCurveFor(obj) {
        this._updateShipInstance();
        var shipInstance = obj.parent.userData.shipInstance;
        var id = obj.parent.name + "" + obj.parent.userData.id;
        var aids = ShipModel3D.selectedAids.get(id);
        ShipModel3D.updateAnimationCurve(this.scene, shipInstance, aids, this.recording);
    }

    private _onMove = (e) => {
        if (e.buttons & 1 || (e.touches && e.touches.length == 1)) { // left click move
            this._needRefresh = true;
            this._keymap.set("leftclick", e);
        }
        if (e.buttons & 2) { // right click move
            this._needRefresh = true;
            this._keymap.set("rightclick", e);
        }
    }

    private _onUp = (e) => {
        if (this._needTacticalPlanUpdate) {
            this._updateTacticalPlan();
            this._needTacticalPlanUpdate = false;
        }

        this.projectionMap.position.y = -1;
        this._focusedObject = null;
        this._lefttop = null;
        this.marqueeBox.visible = false;
    }

    private _onKeyDown = (e) => {
        this._keymap.set("down-" + e.key, true);
        this._keydown = true;
    }

    private _onKeyUp = (e) => {
        this._keymap.set("down-" + e.key, false);
        this._keymap.set("up-" + e.key, true);
        this._keydown = false;
        this._keyup = true;
    }

    private _onMouseWheel = (e) => {
        e.preventDefault();
        e.stopPropagation();
        var delta;
        if (e.scale) {
            if (e.scale > 1) {
                delta = -e.scale / 1500.0;
            } else {
                delta = e.scale / 300.0;
            }
        }
        else if (e.deltaY) {
            switch (e.deltaMode) {
                case 2:
                    // Zoom in pages
                    delta = e.deltaY * 0.025;
                    break;

                case 1:
                    // Zoom in lines
                    delta = e.deltaY * 0.01;
                    break;

                default:
                    // undefined, 0, assume pixels
                    delta = e.deltaY * 0.00025;
                    break;

            }
        } else if (e.detail) {
            delta = e.detail / 500.0;
        }

        if (!this.recording && e.shiftKey) {
            // move selected ships up/down
            this.actionableObjects.forEach(o => {
                if (o.parent.userData.selected) {
                    this._needTacticalPlanUpdate = true;
                    ShipModel3D.moveUp(o, delta * 200);
                    this.updateAnimationCurveFor(o);
                }
            });
        } else if (this.recording && e.ctrlKey) {
            var pos = this._getPosition(e);
            var raycaster = this._rayGet(pos.x, pos.y);
            var intersects = raycaster.intersectObjects(ShipModel3D.points, true);
            if (intersects.length > 0) {
                var p = intersects[0].object;
                var selected = this.getAllSelected();
                var shipInstance = selected[0].parent.userData.shipInstance;
                var i = ShipModel3D.points.indexOf(p);
                if (i > 0) {
                    var animFrame = shipInstance.animation[i - 1];
                    animFrame.visible = !animFrame.visible;
                    var isVisible = this._isShipOnceVisible(shipInstance);
                    if (!isVisible) {
                        animFrame.visible = !animFrame.visible; // rollback the change
                        return;
                    }
                } else {
                    shipInstance.visible = !shipInstance.visible;
                    var isVisible = this._isShipOnceVisible(shipInstance);
                    if (!isVisible) {
                        shipInstance.visible = !shipInstance.visible; // rollback the change
                        return;
                    }
                }
                this.updateAnimationCurveFor(selected[0]);
                this._needTacticalPlanUpdate = true;
            }
        } else if (this.recording && e.shiftKey) {
            var pos = this._getPosition(e);
            var raycaster = this._rayGet(pos.x, pos.y);
            var intersects = raycaster.intersectObjects(ShipModel3D.points, true);
            if (intersects.length > 0) {
                var p = intersects[0].object;
                var selected = this.getAllSelected();
                var i = ShipModel3D.points.indexOf(p);
                if (i > 0) {
                    var animFrame = selected[0].parent.userData.shipInstance.animation[i - 1];
                    animFrame.position.y -= delta * 200;
                } else {
                    ShipModel3D.moveUp(selected[0], delta * 200);
                }
                this.updateAnimationCurveFor(selected[0]);
                this._needTacticalPlanUpdate = true;
            }
        }
        if (this._needTacticalPlanUpdate || this.recording) {
            return;
        }

        if (e.ctrlKey) {
            this.camera.center.y += -delta * 100;
        } else {
            this._needRefresh = true;
            this._keymap.set("zoom", delta);
        }
        this.camera.updateProjectionMatrix();
    }

    private _noop = (e) => {
        e.preventDefault();
    }

    private _getPosition(e): THREE.Vector3 {
        var x = 0;
        var z = 0;
        var rect = this.container.getBoundingClientRect();
        if (e.layerX !== undefined) {
            x = e.layerX;
            z = e.layerY;
        } else if (e.targetTouches) {
            x = e.targetTouches[0].pageX - rect.left;
            z = e.targetTouches[0].pageY - rect.top;
        } else if (e.changedPointers) {
            x = e.changedPointers[0].offsetX == undefined ? e.changedPointers[0].layerX : e.changedPointers[0].offsetX;
            z = e.changedPointers[0].offsetY == undefined ? e.changedPointers[0].layerY : e.changedPointers[0].offsetY;
        }

        var pos = new THREE.Vector3();
        pos.x = ((x) / rect.width) * 2 - 1;
        pos.y = - ((z) / rect.height) * 2 + 1;
        pos.z = 0.5;

        return pos;
    }

    private _updateTacticalPlan() {
        this._updateShipInstance();
        this.shipService.updateTacticalPlan();
    }

    private _updateShipInstance() {
        this.actionableObjects.forEach(o => {
            var userData = o.parent.userData;
            if (userData.selected) {
                // position
                var x = Math.round(o.parent.position.x * 10) / 10;
                o.parent.position.x = x;
                userData.shipInstance.position.x = x;
                var y = Math.round(o.parent.position.y * 10) / 10;
                o.parent.position.y = y;
                userData.shipInstance.position.y = y;
                var z = Math.round(o.parent.position.z * 10) / 10;
                o.parent.position.z = z;
                userData.shipInstance.position.z = z;
                // rotation
                x = Math.round(o.parent.rotation.x * 1000) / 1000;
                o.parent.rotation.x = x;
                userData.shipInstance.rotation.x = x;
                y = Math.round(o.parent.rotation.y * 1000) / 1000;
                o.parent.rotation.y = y;
                userData.shipInstance.rotation.y = y;
                z = Math.round(o.parent.rotation.z * 1000) / 1000;
                o.parent.rotation.z = z;
                userData.shipInstance.rotation.z = z;
            }
        });
    }

    private _rayGet(x, y): THREE.Raycaster {
        var vector = new THREE.Vector3(x, y, 0.5);
        vector.unproject(this.camera);
        var raycaster = new THREE.Raycaster(this.camera.position, vector.sub(this.camera.position).normalize());
        return raycaster;
    }

    private _clearKeyMap() {
        this._keymap.delete("leftclick");
        this._keymap.delete("rightclick");
        this._keymap.delete("zoom");
    }

    private _isShipOnceVisible(shipInstance): boolean {
        var visible = shipInstance.visible;
        if (visible) {
            return true;
        } else {
            for (var i = 0; i < shipInstance.animation.length; i++) {
                if (shipInstance.animation[i].visible) {
                    return true;
                }
            }
        }
    }

}