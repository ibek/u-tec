declare var require: any

import { Component, AfterViewInit, HostListener, ViewChild, ElementRef, Inject } from '@angular/core';
import { MdSidenav, MdDialog, MdDialogRef, MD_DIALOG_DATA } from '@angular/material';
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
import { Ship, ShipData, TacticalPlan, ShipInstance } from '../data-model';
import { ObjectControls } from '../util/ObjectControls';
import { Joystick } from '../util/Joystick';

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

    screenWidth = window.innerWidth;
    screenHeight = window.innerHeight - 5;

    scene: Scene = new Scene();
    camera: PerspectiveCamera = new PerspectiveCamera(60, this.screenWidth / this.screenHeight, 10, 500);
    renderer: WebGLRenderer = new WebGLRenderer({ antialias: true });

    gridScene: Scene = new Scene();
    gridCamera: PerspectiveCamera = new PerspectiveCamera(60, this.screenWidth / this.screenHeight, 0.1, 300);
    grid: Mesh;
    virtualGrid: Mesh;
    bgScene: Scene = new THREE.Scene();
    bgCam: THREE.Camera = new THREE.Camera();

    controls: ObjectControls;

    directionalLight: DirectionalLight;

    objects: any = [];
    getImageData: any;

    // remember these initial values
    tanFOV = Math.tan(((Math.PI / 180) * this.camera.fov / 2));
    windowHeight = window.innerHeight;

    selectedShip: Ship; // info for selected ship
    selectedShipInstance: ShipInstance;
    marqueeBox: Mesh;

    Arr = Array; // helper property for multiple crewmen

    rotation = false;
    cameraMode = 1;
    aidsVisible = true;

    clock = new THREE.Clock();

    constructor(private sceneService: SceneService, private shipService: ShipService,
        private router: Router, public mdDialog: MdDialog, private joystick: Joystick) {

    }

    ngAfterViewInit(): void {
        window.onerror = function () { debugger; } // DEBUG

        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(this.screenWidth, this.screenHeight);
        this.renderer.domElement.style.position = "relative";
        this.renderer.setClearColor(0xEEEEEE);

        this.resetCameraView();

        this.configureLight();
        this.scene.add(this.directionalLight);
        this.scene.add(new AmbientLight(new Color(0.8, 0.8, 0.8).getHex()));
        this.gridScene.add(new AmbientLight(new Color(1.0, 1.0, 1.0).getHex()));

        this.addBackground();
        this.addGrid();

        this.start();
    }

    addBackground() {
        var texture: THREE.Texture = new THREE.TextureLoader().load("assets/images/background.png");
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

        texture = new THREE.TextureLoader().load("assets/images/grid.png");

        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;

        texture.repeat.set(40, 40);

        material = new THREE.MeshLambertMaterial({ map: texture, transparent: true, opacity: 1.0, side: THREE.BackSide });
        this.grid = new THREE.Mesh(new THREE.CircleGeometry(100, 100, 0, Math.PI * 2), material);
        this.grid.rotation.x = Math.PI / 2;
        this.grid.position.y = -1;
        this.grid.position.z = -50;

        var path = new THREE.CatmullRomCurve3([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 60, 0),
        ]);
        var panel3dgeom = new THREE.TubeGeometry(path, 30, 100, 60, false);
        var ptex = new THREE.TextureLoader().load("assets/images/grid.png");
        ptex.wrapS = THREE.RepeatWrapping;
        ptex.wrapT = THREE.RepeatWrapping;
        ptex.repeat.set(20, 120);
        var panel3d = new THREE.Mesh(panel3dgeom, new THREE.MeshLambertMaterial({ map: ptex, side: THREE.BackSide, transparent: true, opacity: 1.0 }));
        panel3d.rotation.x = Math.PI;
        panel3d.position.y = 60;
        panel3d.position.z = -50;
        this.gridScene.add(panel3d);

        var transparentMaterial = new THREE.MeshLambertMaterial({ transparent: true, opacity: 0.0, side: THREE.DoubleSide, depthTest: false });
        this.virtualGrid = new THREE.Mesh(new THREE.CircleGeometry(100, 50, 0, Math.PI * 2), transparentMaterial);
        this.virtualGrid.rotation.x = Math.PI / 2;
        this.virtualGrid.position.y = -1;
        this.virtualGrid.position.z = -50;

        material = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.15,
            side: THREE.DoubleSide,
            depthTest: false
        });
        this.marqueeBox = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
        this.marqueeBox.position.set(0, 0, 0);
        this.marqueeBox.rotation.x = Math.PI / 2;
        this.marqueeBox.visible = false;

        var mat = new THREE.LineBasicMaterial({ color: 0x99e3f5, transparent: true, opacity: 0.2, linewidth: 2 });
        var indicator = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.CircleBufferGeometry(100, 100, 0, Math.PI * 2), 1), mat);
        indicator.rotation.x = Math.PI / 2;
        indicator.position.y = 0;
        indicator.position.z = -50;
        this.gridScene.add(indicator);

        this.gridScene.add(this.marqueeBox);
        this.gridScene.add(this.grid);
        this.gridScene.add(this.virtualGrid);
    }

    configureLight() {
        this.directionalLight = new DirectionalLight(0xffffff);
        this.directionalLight.position.set(0, 200, -50);
        this.directionalLight.lookAt(new Vector3(0, 0, -50));
    }

    configureControls() {
        var scope = this;
        this.joystick.moveCallback = function (deltaX, deltaY) {
            var speed = 10 * scope.camera.zoom;
            deltaX = deltaX / speed;
            deltaY = -deltaY / speed;
            scope.camera.translateX(deltaX);
            scope.camera.translateY(deltaY);
            scope.camera.lookAt(new Vector3(0, 0, -50));
            scope.gridCamera.translateX(deltaX);
            scope.gridCamera.translateY(deltaY);
            scope.gridCamera.lookAt(new Vector3(0, 0, -50));
        }
        this.joystick.updateLocation(window.innerWidth, window.innerHeight);
        this.joystick.show();

        this.controls = new ObjectControls(this.camera, this.gridCamera, this.renderer.domElement,
            this.container, this.objects, this.virtualGrid, this.scene, this.shipService, this.router, this.marqueeBox,
            this.joystick, this.resetCameraView, this);
        this.controls.fixed.y = 1;
        var scope = this;
        this.controls.mouseup = function () {
            this.container.style.cursor = 'auto';
            scope.shipService.updateTacticalPlan();
        }
        this.controls.onclick = function () {

        }
        this.controls.activate();
    }

    render() {
        requestAnimationFrame(() => this.render());
        this.controls.update();
        this.joystick.update();
        this.renderer.autoClear = false;
        this.renderer.clear();
        this.renderer.render(this.bgScene, this.bgCam);
        this.renderer.render(this.gridScene, this.gridCamera);
        this.renderer.render(this.scene, this.camera);
        this.controls.updateAfter(this.screenWidth, this.screenHeight);

        var delta = this.clock.getDelta();
        ShipModel3D.time.value += delta;
    }

    start() {
        let tacticalPlan: Promise<TacticalPlan> = this.shipService.getTacticalPlan(); // the list needs to be upto date
        tacticalPlan.then((res) => {
            res.verify(this.shipService);
            this.loadingProgress = this.sceneService.loadingProgress();
            if (this.shipService.isReady() && this.loadingProgress == 100) {
                this.loaded = true;
                this.configureControls();
                this.container.nativeElement.appendChild(this.renderer.domElement);
                var scope = this;
                ShipModel3D.init();
                let updateCallback = function () {
                    scope.objects.splice(0, scope.objects.length)
                    scope.sceneService.shipModels3d.forEach((model: ShipModel3D, type: string) => {
                        model.init();
                        model.addShipsToScene(scope.scene);
                        model.objects.forEach(o => scope.objects.push(o));
                    })
                    scope.controls.onUpdateTacticalPlan();
                };
                updateCallback();
                this.sceneService.setUpdateCallback(updateCallback);
                this.shipService.updateTacticalPlan(); // to update generated positions
                this.render();
            } else {
                setTimeout(() => {
                    this.start();
                }, 500);
            }
        });

    }

    showInfo() {
        var userData = this.controls.selected.parent.userData;
        this.selectedShip = userData.shipModel;
        this.selectedShipInstance = userData.shipData.instances[userData.id];
        this.shipInfoBar.toggle();
    }

    onCloseShipInfo() {
        this.controls.hideSelected();
    }

    onShipInfoChange() {
        this.shipService.updateTacticalPlan();
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

        this.joystick.updateLocation(window.innerWidth, window.innerHeight);
        this.renderer.setSize(this.screenWidth, this.screenHeight);
    }

    manageCrew() {
        let dialogRef = this.mdDialog.open(CrewDialogComponent, {
            data: { "players": this.shipService.tacticalPlan.players.join("\n") },
        });
        dialogRef.afterClosed().subscribe(players => {
            if (players !== "Cancel") {
                this.shipService.tacticalPlan.players = players.split("\n").filter(Boolean);
                this.shipService.updateTacticalPlan();
            }
        });
    }

    rotateTowards() {
        if (this.rotation) { // cancel rotation
            this.controls.resetRotation();
        }
        this.rotation = !this.rotation;
    }

    rotateReset() {
        if (this.controls.selectedObjects.length > 0) {
            this.controls.selectedObjects.forEach(o => {
                o.rotation.set(-Math.PI / 2, Math.PI, 0);
                o.parent.rotation.set(0, 0, 0);
            });
        } else if (this.controls.selected) {
            this.controls.selected.rotation.set(-Math.PI / 2, Math.PI, 0);
            this.controls.selected.parent.rotation.set(0, 0, 0);
        }
        this.shipService.updateTacticalPlan();
    }

    switchCameraView() {
        this.cameraMode++;
        this.resetCameraView();
    }

    resetCameraView = () => {
        if (this.cameraMode > 4) {
            this.cameraMode = 1;
        }

        if (this.cameraMode == 1) {
            this.camera.position.x = 0;
            this.camera.position.y = 130;
            this.camera.position.z = -160;
            this.camera.lookAt(new Vector3(0, 0, -50));
            this.gridCamera.position.x = 0;
            this.gridCamera.position.y = 130;
            this.gridCamera.position.z = -160;
            this.gridCamera.lookAt(new Vector3(0, 0, -50));
        } else if (this.cameraMode == 2) {
            this.camera.position.x = 110;
            this.camera.position.y = 130;
            this.camera.position.z = -50;
            this.camera.lookAt(new Vector3(0, 0, -50));
            this.gridCamera.position.x = 110;
            this.gridCamera.position.y = 130;
            this.gridCamera.position.z = -50;
            this.gridCamera.lookAt(new Vector3(0, 0, -50));
        } else if (this.cameraMode == 3) {
            this.camera.position.x = 0;
            this.camera.position.y = 130;
            this.camera.position.z = 60;
            this.camera.lookAt(new Vector3(0, 0, -50));
            this.gridCamera.position.x = 0;
            this.gridCamera.position.y = 130;
            this.gridCamera.position.z = 60;
            this.gridCamera.lookAt(new Vector3(0, 0, -50));
        } else if (this.cameraMode == 4) {
            this.camera.position.x = -110;
            this.camera.position.y = 130;
            this.camera.position.z = -50;
            this.camera.lookAt(new Vector3(0, 0, -50));
            this.gridCamera.position.x = -110;
            this.gridCamera.position.y = 130;
            this.gridCamera.position.z = -50;
            this.gridCamera.lookAt(new Vector3(0, 0, -50));
        }
    }

    switchSide() {
        if (this.controls.selectedObjects.length > 0) {
            this.controls.selectedObjects.forEach(o => {
                var userData = o.parent.userData;
                var selectedShipInstance = userData.shipData.instances[userData.id];
                selectedShipInstance.enemy = !selectedShipInstance.enemy;
            });
        } else if (this.controls.selected) {
            var userData = this.controls.selected.parent.userData;
            var selectedShipInstance = userData.shipData.instances[userData.id];
            selectedShipInstance.enemy = !selectedShipInstance.enemy;
        }
        this.onShipInfoChange();
    }

    toggleLines() {
        this.aidsVisible = !this.aidsVisible;
        this.objects.forEach(o => {
            o.parent.children[1].children[0].visible = !o.parent.children[1].children[0].visible;
        });
    }

    showControls() {
        let dialogRef = this.mdDialog.open(ControlsDialogComponent);
    }
}

@Component({
    selector: 'crew-dialog',
    templateUrl: 'crew-dialog.html',
})
export class CrewDialogComponent {
    constructor(public dialogRef: MdDialogRef<CrewDialogComponent>, @Inject(MD_DIALOG_DATA) public data: any) { }
}

@Component({
    selector: 'controls-dialog',
    templateUrl: 'controls-dialog.html',
})
export class ControlsDialogComponent {
    constructor(public dialogRef: MdDialogRef<CrewDialogComponent>) { }
}
