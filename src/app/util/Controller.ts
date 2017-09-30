import * as THREE from 'three'
import { Pointer } from './Pointer'
import { ShipService } from '../ship.service'
import { Router } from '@angular/router'
import { OrbitCamera } from './OrbitCamera'
import { Joystick } from './Joystick'
import { ShipModel3D } from '../simulator/ship-model3d'

export class Controller {

    private static _mouseSpeedX = 0.4;
    private static _mouseSpeedY = 0.3;
    private static _joystickSpeedX = 0.05;
    private static _joystickSpeedY = 0.05;
    private static _zoomSpeed = 0.2 / 0.006;

    actionableObjects: any = [];
    container;

    private _needRefresh = false;
    private _needTacticalPlanUpdate = false;
    private _pos; // current mouse or touch position
    private _keymap: Map<string, boolean>;
    private _focusedObject = null;

    constructor(private scene: THREE.Scene, private shipService: ShipService, private projectionMap: THREE.Mesh, private camera: OrbitCamera, private joystick: Joystick) {
    }

    enable(container) {
        this.container = container;

        var mousewheelevt = (/Firefox/i.test(navigator.userAgent)) ? "DOMMouseScroll" : "mousewheel"; //FF doesn't recognize mousewheel as of FF3.x

        if (container.addEventListener) { //WC3 browsers
            container.addEventListener('mousedown', this._onDown, false);
            container.addEventListener('mousemove', this._onMove, false);
            container.addEventListener('mouseup', this._onUp, false);
            container.addEventListener('contextmenu', this._noop, false);
            container.addEventListener(mousewheelevt, this._onMouseWheel, false);
        } else if (container.attachEvent) { //if IE (and Opera depending on user setting)
            container.attachEvent('onmousedown', this._onDown, false);
            container.attachEvent('onmousemove', this._onMove, false);
            container.attachEvent('onmouseup', this._onUp, false);
            container.attachEvent('oncontextmenu', this._noop, false);
            container.attachEvent("on" + mousewheelevt, this._onMouseWheel);
        }

        var scope = this;
        this.joystick.moveCallback = function (deltaX, deltaY) {
            scope.camera.rotate(-deltaX * Controller._joystickSpeedX, -deltaY * Controller._joystickSpeedY);
        }
    }

    disable(container) {
        var mousewheelevt = (/Firefox/i.test(navigator.userAgent)) ? "DOMMouseScroll" : "mousewheel"; //FF doesn't recognize mousewheel as of FF3.x

        if (container.removeEventListener) { //WC3 browsers
            container.removeEventListener('mousedown', this._onDown, false);
            container.removeEventListener('mousemove', this._onMove, false);
            container.removeEventListener('mouseup', this._onUp, false);
            container.removeEventListener('contextmenu', this._noop, false);
            container.removeEventListener(mousewheelevt, this._onMouseWheel, false);
        } else if (container.detachEvent) { //if IE (and Opera depending on user setting)
            container.detachEvent('onmousedown', this._onDown, false);
            container.detachEvent('onmousemove', this._onMove, false);
            container.detachEvent('onmouseup', this._onUp, false);
            container.detachEvent('oncontextmenu', this._noop, false);
            container.detachEvent("on" + mousewheelevt, this._onMouseWheel);
        }
    }

    reset() {
        this.actionableObjects.splice(0, this.actionableObjects.length);
        this._keymap = new Map<string, boolean>();
    }

    update(dt: number) {
        if (this._needRefresh) {
            if (this._keymap.get("leftclick") && this._focusedObject) {
                var raycaster = this._rayGet(this._pos.x, this._pos.y);
                var intersectsMap = raycaster.intersectObject(this.projectionMap);
                if (intersectsMap.length > 0) {
                    var pos = new THREE.Vector3().copy(intersectsMap[0].point);
                    ShipModel3D.updateObjectPosition(this._focusedObject, pos);
                    this._needTacticalPlanUpdate = true;
                } else {

                }
            }
            this._needRefresh = false;
        }
    }

    private _onDown = (e) => {
        if (e.buttons & 1) { // left click
            var pos = this._getPosition(e);
            var raycaster = this._rayGet(pos.x, pos.y);
            var intersects = raycaster.intersectObjects(this.actionableObjects, true);
            if (intersects.length > 0) {
                var obj = intersects[0].object;
                this.projectionMap.position.y = obj.parent.position.y;
                this.projectionMap.updateMatrixWorld(false);
                if (obj.parent.userData.selected) {
                    this._focusedObject = obj;
                } else {
                    ShipModel3D.deselectAll(this.actionableObjects, this.scene);
                    ShipModel3D.select(obj, this.scene);
                }
            } else {
                ShipModel3D.deselectAll(this.actionableObjects, this.scene);
            }
        }
    }

    private _onMove = (e) => {
        if (e.buttons & 1) { // left click move
            this._pos = this._getPosition(e);
            this._needRefresh = true;
            this._keymap.set("leftclick", true);
        }
        if (e.buttons & 2) { // right click move
            this.camera.rotate(e.movementX * Controller._mouseSpeedX, e.movementY * Controller._mouseSpeedY);
        }
    }

    private _onUp = (e) => {
        this._keymap.clear();
        if (this._needTacticalPlanUpdate) {
            this._updateTacticalPlan();
            this._needTacticalPlanUpdate = false;
        }
        this._focusedObject = null;
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

        // move selected ships up/down
        this.actionableObjects.forEach(o => {
            if (o.parent.userData.selected) {
                this._needTacticalPlanUpdate = true;
                ShipModel3D.moveUp(o, delta * 200);
            }
        });
        if (this._needTacticalPlanUpdate) {
            return;
        }

        if (e.ctrlKey) {
            this.camera.center.y += -delta * 100;
        } else {
            this.camera.zoomIn(delta * Controller._zoomSpeed);
        }
        this.camera.updateProjectionMatrix();
    }

    private _noop = (e) => {
        e.preventDefault();
    }

    private _getPosition(e): THREE.Vector3 {
        var x = 0;
        var z = 0;
        var rect;
        if (e.offsetX !== undefined || e.layerX !== undefined) {
            rect = this.container.getBoundingClientRect();
            x = e.offsetX == undefined ? e.layerX : e.offsetX;
            z = e.offsetY == undefined ? e.layerY : e.offsetY;
        } else {
            rect = e.target.getBoundingClientRect();
            x = e.targetTouches[0].pageX - rect.left;
            z = e.targetTouches[0].pageY - rect.top;
        }

        var pos = new THREE.Vector3();
        pos.x = ((x) / rect.width) * 2 - 1;
        pos.y = - ((z) / rect.height) * 2 + 1;
        pos.z = 0.5;

        return pos;
    }

    private _updateTacticalPlan() {
        this.actionableObjects.forEach(o => {
            var userData = o.parent.userData;
            var x = Math.round(o.parent.position.x * 10) / 10;
            o.parent.position.x = x;
            userData.shipData.instances[userData.id].position.x = x;
            var z = Math.round(o.parent.position.z * 10) / 10;
            o.parent.position.z = z;
            userData.shipData.instances[userData.id].position.z = z;

        });
        this.shipService.updateTacticalPlan();
    }

    private _rayGet(x, y): THREE.Raycaster {
        var vector = new THREE.Vector3(x, y, 0.5);
        vector.unproject(this.camera);
        var raycaster = new THREE.Raycaster(this.camera.position, vector.sub(this.camera.position).normalize());
        return raycaster;
    }

}