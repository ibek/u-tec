declare var require: any

import { Component, OnInit, ViewChild } from '@angular/core';
import {
    Scene, PerspectiveCamera, WebGLRenderer,
    BoxGeometry, Mesh, MeshBasicMaterial,
    MeshPhongMaterial, AmbientLight, DirectionalLight,
    Color, JSONLoader, SkinnedMesh, ObjectLoader, Vector3
} from 'three';
import * as THREE from 'three';
import { OrbitControls } from 'three-orbitcontrols-ts';
import { ShipModel3D } from './ship-model3d';
import { SceneService } from '../scene.service';
import { ShipService } from '../ship.service';
import { ShipData } from '../ship-data';

const SCREEN_WIDTH = window.innerWidth - 4;
const SCREEN_HEIGHT = window.innerHeight - 4;

@Component({
    selector: 'simulator',
    templateUrl: './simulator.component.html',
    styleUrls: ['./simulator.component.css']
})
export class SimulatorComponent implements OnInit {
    @ViewChild('container') container;

    loadingProgress: number = 0;
    loaded: boolean = false;

    scene: Scene = new Scene();
    camera: PerspectiveCamera = new PerspectiveCamera(35, SCREEN_WIDTH / SCREEN_HEIGHT, 0.1, 2000);
    renderer: WebGLRenderer = new WebGLRenderer({ antialias: true });

    directionalLight: DirectionalLight;
    controls: OrbitControls;

    constructor(private sceneService: SceneService, private shipService: ShipService) {

    }

    ngOnInit(): void {
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);
        this.renderer.domElement.style.position = "relative";
        this.renderer.setClearColor(0xEEEEEE);

        this.configureCamera();
        this.configureControls();

        this.configurePointLight();
        this.scene.add(this.directionalLight);
        this.scene.add(new AmbientLight(new Color(0.7, 0.7, 0.7).getHex()));

        this.start();
    }

    addPlane() {
        var texture, material, plane;

        texture = THREE.ImageUtils.loadTexture("assets/images/graph.png");

        // assuming you want the texture to repeat in both directions:
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;

        // how many times to repeat in each direction; the default is (1,1),
        //   which is probably why your example wasn't working
        texture.repeat.set(5, 5);

        material = new THREE.MeshLambertMaterial({ map: texture });
        plane = new THREE.Mesh(new THREE.PlaneGeometry(100, 120), material);
        plane.material.side = THREE.DoubleSide;
        //plane.position.x = 100;

        // rotation.z is rotation around the z-axis, measured in radians (rather than degrees)
        // Math.PI = 180 degrees, Math.PI / 2 = 90 degrees, etc.
        plane.rotation.x = Math.PI / 2;
        plane.position.y = -1;
        plane.position.z = 0;

        this.scene.add(plane);
    }

    configurePointLight() {
        this.directionalLight = new DirectionalLight(0xffeedd);
        this.directionalLight.position.set(0, 1000, 0);
        this.directionalLight.lookAt(new Vector3(0, 0, 0));
    }

    configureCamera() {
        this.camera.position.x = -50;
        this.camera.position.y = 50;
        this.camera.position.z = -50;
        this.camera.lookAt(new Vector3(0, 0, 0));
    }

    configureControls() {
        this.controls = new OrbitControls(this.camera);
        this.controls.enableZoom = true;
        this.controls.maxPolarAngle = Math.PI / 2.0;
        this.controls.minDistance = 10;
        this.controls.maxDistance = 1000;
    }

    render() {
        requestAnimationFrame(() => this.render());
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    start() {
        let data: Promise<ShipData[]> = this.shipService.getShips(); // the list needs to be upto date
        data.then((res) => {
            this.loadingProgress = this.sceneService.loadingProgress();
            console.log(this.loadingProgress);
            var scope = this;
            if (this.loadingProgress == 100) {
                this.loaded = true;
                this.container.nativeElement.appendChild(this.renderer.domElement);
                this.sceneService.shipModels3d.forEach((model: ShipModel3D, type: string) => {
                    model.addShipsToScene(scope.scene);
                });
                this.addPlane();
                this.render();
            } else {
                setTimeout(() => {
                    scope.start();
                }, 500);
            }
        });

    }
}
