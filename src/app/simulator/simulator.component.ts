declare var require: any

import { Component, AfterViewInit, HostListener, ViewChild, ElementRef } from '@angular/core';
import { MdSidenav } from '@angular/material';
import {
    Scene, PerspectiveCamera, WebGLRenderer,
    BoxGeometry, Mesh, MeshBasicMaterial,
    MeshPhongMaterial, AmbientLight, DirectionalLight,
    Color, JSONLoader, SkinnedMesh, ObjectLoader, Vector3
} from 'three';
import * as THREE from 'three';

import { Router } from '@angular/router';

import { OrbitControls } from 'three-orbitcontrols-ts';
import { ShipModel3D } from './ship-model3d';
import { SceneService } from '../scene.service';
import { ShipService } from '../ship.service';
import { ShipData } from '../ship-data';
import { ObjectControls } from '../util/ObjectControls';

@Component({
    selector: 'simulator',
    templateUrl: './simulator.component.html',
    styleUrls: ['./simulator.component.css']
})
export class SimulatorComponent implements AfterViewInit {
    @ViewChild('container') container;
    @ViewChild('shipInfo') shipInfoBar: MdSidenav;

    loadingProgress: number = 0;
    loaded: boolean = false;

    screenWidth = window.innerWidth - 20;
    screenHeight = window.innerHeight - 85;

    scene: Scene = new Scene();
    camera: PerspectiveCamera = new PerspectiveCamera(60, this.screenWidth / this.screenHeight, 10, 500);
    renderer: WebGLRenderer = new WebGLRenderer({ antialias: true });

    gridScene: Scene = new Scene();
    gridCamera: PerspectiveCamera = new PerspectiveCamera(60, this.screenWidth / this.screenHeight, 0.1, 300);
    grid: Mesh;
    bgScene: Scene = new THREE.Scene();
    bgCam: THREE.Camera = new THREE.Camera();

    controls: ObjectControls;

    directionalLight: DirectionalLight;

    objects: any = [];

    // remember these initial values
    tanFOV = Math.tan(((Math.PI / 180) * this.camera.fov / 2));
    windowHeight = window.innerHeight;

    shipData: ShipData; // info for selected ship

    constructor(private sceneService: SceneService, private shipService: ShipService, private router: Router) {

    }

    ngAfterViewInit(): void {
        window.onerror = function () { debugger; } // DEBUG

        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(this.screenWidth, this.screenHeight);
        this.renderer.domElement.style.position = "relative";
        this.renderer.setClearColor(0xEEEEEE);

        this.configureCamera();

        this.configureLight();
        this.scene.add(this.directionalLight);
        this.scene.add(new AmbientLight(new Color(0.7, 0.7, 0.7).getHex()));
        this.gridScene.add(new AmbientLight(new Color(1.0, 1.0, 1.0).getHex()));

        this.addBackground();
        this.addGrid();
        this.configureControls();

        this.start();
    }

    addBackground() {
        var texture: THREE.Texture = THREE.ImageUtils.loadTexture("assets/images/background.png");
        var bg = new THREE.Mesh(
            new THREE.PlaneGeometry(2, 2, 0),
            new THREE.MeshBasicMaterial({ map: texture })
        );
        bg.material.depthTest = false;
        bg.material.depthWrite = false;

        this.bgScene.add(this.bgCam);
        this.bgScene.add(bg);
    }

    addGrid() {
        var texture, material;

        texture = THREE.ImageUtils.loadTexture("assets/images/grid.png");

        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;

        texture.repeat.set(30, 30);

        material = new THREE.MeshLambertMaterial({ map: texture, transparent: true, opacity: 1.0 });
        this.grid = new THREE.Mesh(new THREE.PlaneGeometry(180, 120), material);
        this.grid.material.side = THREE.DoubleSide;
        this.grid.rotation.x = Math.PI / 2;
        this.grid.position.y = -1;
        this.grid.position.z = 0;

        this.gridScene.add(this.grid);
    }

    configureLight() {
        this.directionalLight = new DirectionalLight(0xffffff);
        this.directionalLight.position.set(0, 1000, 0);
        this.directionalLight.lookAt(new Vector3(0, 0, 0));
    }

    configureCamera() {
        this.camera.position.x = 0;
        this.camera.position.y = 110;
        this.camera.position.z = -80;
        this.camera.lookAt(new Vector3(0, 0, 0));
        this.gridCamera.position.x = 0;
        this.gridCamera.position.y = 110;
        this.gridCamera.position.z = -80;
        this.gridCamera.lookAt(new Vector3(0, 0, 0));
    }

    configureControls() {
        this.controls = new ObjectControls(this.camera, this.renderer.domElement, this.container, this.objects, this.grid, this.scene);
        this.controls.fixed.y = 1;
        var scope = this;
        this.controls.move = function () {
            this.container.style.cursor = 'move';
        }
        this.controls.mouseup = function () {
            this.container.style.cursor = 'auto';
            scope.router.navigate(["simulator"], scope.shipService.getNavigationExtras());
        }
        this.controls.onclick = function () {

        }
        this.controls.activate();
    }

    getImageData: any;
    render() {
        requestAnimationFrame(() => this.render());
        this.controls.update();
        this.renderer.autoClear = false;
        this.renderer.clear();
        this.renderer.render(this.bgScene, this.bgCam);
        this.renderer.render(this.gridScene, this.gridCamera);
        this.renderer.render(this.scene, this.camera);
        this.controls.updateAfter(this.screenWidth, this.screenHeight);
    }

    start() {
        let data: Promise<ShipData[]> = this.shipService.getShips(); // the list needs to be upto date
        data.then((res) => {
            this.loadingProgress = this.sceneService.loadingProgress();
            var scope = this;
            if (this.loadingProgress == 100) {
                this.loaded = true;
                this.container.nativeElement.appendChild(this.renderer.domElement);
                ShipModel3D.init();
                this.sceneService.shipModels3d.forEach((model: ShipModel3D, type: string) => {
                    model.init();
                    model.addShipsToScene(scope.scene);
                    model.objects.forEach(o => scope.objects.push(o));
                });
                this.render();
            } else {
                setTimeout(() => {
                    scope.start();
                }, 500);
            }
        });

    }

    showInfo() {
        this.shipData = this.controls.selected.parent.userData.shipData.origin;
        this.shipInfoBar.toggle();
    }

    onCloseShipInfo() {
        this.controls.hideSelected();
    }

    saveImage() {
        this.controls.hideSelected();
        this.render();
        var imgData = this.renderer.domElement.toDataURL();
        var a: any = document.createElement("a");
        a.href = imgData.replace('image/png', 'image/octet-stream');
        a.download = "tactical-plan.png";
        a.click();
    }

    toggleFullscreen() {
        var document: any = window.document;
        var elem = document.documentElement;
        if (!document.fullscreenElement && !document.mozFullScreenElement &&
            !document.webkitFullscreenElement && !document.msFullscreenElement) {
            if (elem.requestFullscreen) {
                elem.requestFullscreen();
            } else if (elem.msRequestFullscreen) {
                elem.msRequestFullscreen();
            } else if (elem.mozRequestFullScreen) {
                elem.mozRequestFullScreen();
            } else if (elem.webkitRequestFullscreen) {
                elem.webkitRequestFullscreen((<any>Element).ALLOW_KEYBOARD_INPUT);
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            } else if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            }
        }
    }

    @HostListener('window:resize', ['$event'])
    onResize(event) {
        this.screenWidth = window.innerWidth - 5;
        this.screenHeight = window.innerHeight - 40;
        this.camera.aspect = this.screenWidth / this.screenHeight;

        // adjust the FOV
        this.camera.fov = (360 / Math.PI) * Math.atan(this.tanFOV * (this.screenHeight / this.windowHeight));

        this.camera.updateProjectionMatrix();
        this.camera.lookAt(this.scene.position);

        this.renderer.setSize(this.screenWidth, this.screenHeight);
    }
}
