import {
    PerspectiveCamera, Vector2, Vector3,Vector4, Raycaster, PlaneGeometry, Mesh, MeshBasicMaterial, Matrix4
} from 'three';

import * as THREE from 'three';

export class OrbitCamera extends PerspectiveCamera{
    constructor(...args) {
        super(...args);
        this.reset();

        window.addEventListener("keydown",this.onkeydown.bind(this));
        window.addEventListener("keyup",this.onkeyup.bind(this));
        window.addEventListener("mousemove",this.onmousemove.bind(this));
        
    }
    center :Vector3; // point where came looks at
    rotationX: number; // camera rotation
    rotationY: number; // camera rotation
    zoomout: number; // zoom
    /* THREE.PerspectiveCamera.zoom multiplies fov of camera*/
    speedX: number; // rotation speed
    speedY: number; // rotation speed   
    keymap: Map<string,boolean>;
    
    reset(){
        this.center = new Vector3(0,0,0);
        this.rotationX = 0.0;
        this.rotationY = 45.0; // default tilt
        this.zoomout = 150; // default zoom
        this.speedX = -1;
        this.speedY = 0.5;
        this.keymap = new Map<string,boolean>();
    }

    update(dt: number){
        // camera move vector
        var move = new Vector3();

        // find right and forward direction
        var dir = new Vector3();
        dir.copy(this.position);
        dir.sub(this.center);
        dir.normalize();
        var up = new Vector3(0,1,0);
        var right = new Vector3();
        right.crossVectors(dir,up);
        right.normalize();
        var forward = new Vector3();
        forward.crossVectors(right,up);
        forward.normalize();

        // move while holding key
        if(this.keymap.get("w")){
            move.add(forward.clone().multiplyScalar(100*dt));
        }
        if(this.keymap.get("s")){
            move.add(forward.clone().multiplyScalar(-100*dt));
        }
        if(this.keymap.get("a")){
            move.add(right.clone().multiplyScalar(100*dt));
        }
        if(this.keymap.get("d")){
            move.add(right.clone().multiplyScalar(-100*dt));
        }

        // apply move vector
        this.center.add(move);

        // compute camera position
        this.rotationY = Math.max(this.rotationY,-89);
        this.rotationY = Math.min(this.rotationY,89);
        var eye = new Vector3(-this.zoomout, 0, 0);
        eye = eye.applyAxisAngle(new Vector3(0, 0, 1), - THREE.Math.degToRad(this.rotationY));
        eye = eye.applyAxisAngle(new Vector3(0, 1, 0), - THREE.Math.degToRad(this.rotationX));
        eye.add(this.center);
        this.position.copy(eye);
        this.lookAt(this.center);
        this.updateMatrix();
    }

    onkeydown(e: KeyboardEvent){
        this.keymap.set(e.key,true);
    }

    onkeyup(e: KeyboardEvent){
        this.keymap.set(e.key,false);
    }

    onmousemove(e:MouseEvent){
        if(e.buttons&2){
            var mouseSpeedX = 1;
            var mouseSpeedY = 1;
            // rotate
            this.rotationX+=e.movementX*mouseSpeedX;
            this.rotationY+=e.movementY*mouseSpeedY;
        }

        if(e.buttons&4){
            // drag
        }
    }

    onmousewheel(){
        // in ObjectConstrols.ts
    }
}