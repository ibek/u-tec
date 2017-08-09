declare var require: any

import {Scene, PerspectiveCamera, WebGLRenderer,
         BoxGeometry, Mesh, MeshBasicMaterial,
          MeshPhongMaterial, AmbientLight, PointLight,
           Color, JSONLoader, SkinnedMesh,ObjectLoader } from 'three';
import * as THREE from 'three';

THREE.OrbitControls = require('three-orbit-controls')(THREE);

class Main {
    scene:Scene = new Scene();
    camera:PerspectiveCamera = new PerspectiveCamera(35, window.innerWidth/window.innerHeight, 0.1, 1000);
    renderer : WebGLRenderer = new WebGLRenderer({antialias:true});

    pointLight : PointLight;
    controls : THREE.OrbitControls;
    
    constructor() {

        var container = document.createElement( 'div' );
        document.body.appendChild( container );
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.domElement.style.position = "relative";
        this.renderer.setClearColor(0xEEEEEE);
        container.appendChild( this.renderer.domElement );

        this.configureCamera();
        this.configureControls();

        this.configurePointLight();
        this.scene.add(this.pointLight);
        this.scene.add(new AmbientLight(new Color(0.7,0.7,0.7).getHex()));

    }

    addCube() {
        var geometry = new BoxGeometry(100,100,100);
        var material = new MeshBasicMaterial({ color : 0x00f900 , wireframe: true});
        var materialPhong : MeshPhongMaterial = new MeshPhongMaterial({ color : 0x0000ff });
        var cube = new Mesh(geometry, materialPhong);
        this.scene.add(cube);
    }

    configurePointLight() {
        this.pointLight = new PointLight();
        this.pointLight.position.set(5,700,5);
        this.pointLight.intensity = 0.8;
    }

    configureCamera() {
        this.camera.position.x = -500;
        this.camera.position.y = 500;
        this.camera.position.z = -500;
        this.camera.lookAt(0,0,0);
    }

    configureControls() {
        this.controls = new THREE.OrbitControls( this.camera );
        this.controls.maxPolarAngle = Math.PI / 2.0;
        this.controls.minDistance = 10;
        this.controls.maxDistance = 1000;
    }

    render() {
        requestAnimationFrame(()=>this.render());
        this.controls.update();
        this.renderer.render(this.scene, this.camera); 

    }

    start() {
        this.addCube();
        this.render();
    }
}


const main = new Main();
main.start();



