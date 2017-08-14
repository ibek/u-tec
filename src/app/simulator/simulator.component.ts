declare var require: any

import { Component, OnInit, ViewChild } from '@angular/core';
import {
    Scene, PerspectiveCamera, WebGLRenderer,
    BoxGeometry, Mesh, MeshBasicMaterial,
    MeshPhongMaterial, AmbientLight, DirectionalLight,
    Color, JSONLoader, SkinnedMesh, ObjectLoader, Vector3
} from 'three';
import { OrbitControls } from 'three-orbitcontrols-ts';
import { Ship3d } from './ship3d';
import {ShipService} from '../ship.service';

const SCREEN_WIDTH = window.innerWidth - 4;
const SCREEN_HEIGHT = window.innerHeight - 4;

@Component({
  selector: 'simulator',
  templateUrl: './simulator.component.html'
})
export class SimulatorComponent implements OnInit {
    @ViewChild('container') container;

    scene: Scene = new Scene();
    camera: PerspectiveCamera = new PerspectiveCamera(35, SCREEN_WIDTH / SCREEN_HEIGHT, 0.1, 2000);
    renderer: WebGLRenderer = new WebGLRenderer({ antialias: true });

    directionalLight: DirectionalLight;
    controls: OrbitControls;

    constructor(private shipService: ShipService) {

    }

    ngOnInit(): void {
        console.log(this.container);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);
        this.renderer.domElement.style.position = "relative";
        this.renderer.setClearColor(0xEEEEEE);
        this.container.nativeElement.appendChild(this.renderer.domElement);

        this.configureCamera();
        this.configureControls();

        this.configurePointLight();
        this.scene.add(this.directionalLight);
        this.scene.add(new AmbientLight(new Color(0.7, 0.7, 0.7).getHex()));

        this.start();
    }

    addCube() {
        var geometry = new BoxGeometry(100, 100, 100);
        var material = new MeshBasicMaterial({ color: 0x00f900, wireframe: true });
        var materialPhong: MeshPhongMaterial = new MeshPhongMaterial({ color: 0x0000ff });
        var cube = new Mesh(geometry, materialPhong);
        this.scene.add(cube);
    }

    configurePointLight() {
        this.directionalLight = new DirectionalLight(0xffeedd);
        this.directionalLight.position.set(0, 1000, 0);
        this.directionalLight.lookAt(new Vector3(0, 0, 0));
    }

    configureCamera() {
        this.camera.position.x = -500;
        this.camera.position.y = 500;
        this.camera.position.z = -500;
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
        //this.addCube();
        var ship = new Ship3d("assets/ships/hornetq.gltf");
        ship.addModelTo(this.scene, new Vector3(0, 0, 0), 30);
        this.render();
    }
}
