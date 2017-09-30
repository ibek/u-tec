import {
    PerspectiveCamera, Vector2, Vector3, Vector4, Raycaster, PlaneGeometry, Mesh, MeshBasicMaterial, Matrix4
} from 'three';

import * as THREE from 'three';

export class OrbitCamera extends PerspectiveCamera {

    center: Vector3; // point where came looks at
    rotationX: number; // camera rotation
    rotationY: number; // camera rotation
    zoomout: number; // zoom
    /* THREE.PerspectiveCamera.zoom multiplies fov of camera*/
    speedX: number; // rotation speed
    speedY: number; // rotation speed

    _dir: number;
    _up: number;
    _right: number;
    _fwd: number;
    _camup: number;

    constructor(...args) {
        super(...args);
        this.reset();
    }

    reset() {
        this.center = new Vector3(0, 0, 0);
        this.rotationX = 90.0;
        this.rotationY = 45.0; // default tilt
        this.zoomout = 200; // default zoom
        this.speedX = -1;
        this.speedY = 0.5;

        this._dir = 0;
        this._up = 0;
        this._right = 0;
        this._fwd = 0;
        this._camup = 0;
    }

    update(dt: number) {
        // camera move vector
        var move = new Vector3();

        // find right and forward direction
        var dir = new Vector3();
        dir.copy(this.position);
        dir.sub(this.center);
        dir.normalize();
        var up = new Vector3(0, 1, 0);
        var right = new Vector3();
        right.crossVectors(dir, up);
        right.normalize();
        var forward = new Vector3();
        forward.crossVectors(right, up);
        forward.normalize();
        var camup = new Vector3();
        camup.crossVectors(right, dir);
        camup.normalize();

        if (this._dir !== 0) {
            move.add(dir.clone().multiplyScalar(this._dir));
            this._dir = 0;
        }

        if (this._up !== 0) {
            move.add(up.clone().multiplyScalar(this._up));
            this._up = 0;
        }

        if (this._right !== 0) {
            move.add(right.clone().multiplyScalar(this._right));
            this._right = 0;
        }

        if (this._fwd !== 0) {
            move.add(forward.clone().multiplyScalar(this._fwd));
            this._fwd = 0;
        }

        if (this._camup !== 0) {
            move.add(camup.clone().multiplyScalar(this._camup));
            this._camup = 0;
        }

        // apply move vector
        this.center.add(move);

        // compute camera position
        this.rotationY = Math.max(this.rotationY, -89);
        this.rotationY = Math.min(this.rotationY, 89);
        var eye = new Vector3(-this.zoomout, 0, 0);
        eye = eye.applyAxisAngle(new Vector3(0, 0, 1), - THREE.Math.degToRad(this.rotationY));
        eye = eye.applyAxisAngle(new Vector3(0, 1, 0), - THREE.Math.degToRad(this.rotationX));
        eye.add(this.center);
        this.position.copy(eye);
        this.lookAt(this.center);
        this.updateMatrix();
    }

    rotate(x: number, y: number) {
        this.rotationX += x;
        this.rotationY += y;
    }

    forward(fwd: number) {
        this._fwd += fwd;
    }
    
    zoomIn(dt: number) {
        var mul = Math.pow(1.1, dt);
        this.zoomout *= mul;
    }
}