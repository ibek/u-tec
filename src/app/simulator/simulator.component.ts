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
import * as ShipModel3DNS from './ship-model3d';
import { SceneService } from '../scene.service';
import { ShipService } from '../ship.service';
import { Ship, ShipData, TacticalPlan, ShipInstance } from '../data-model';
import { ObjectControls } from '../util/ObjectControls';
import { Joystick } from '../util/Joystick';
import { OrbitCamera } from '../util/OrbitCamera';

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
    camera: OrbitCamera = new OrbitCamera(60, this.screenWidth / this.screenHeight, 10, 700);
    renderer: WebGLRenderer = new WebGLRenderer({ antialias: true });

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
        //this.renderer.sortObjects = false;

        this.configureLight();
        this.scene.add(this.directionalLight);
        this.scene.add(new AmbientLight(new Color(0.8, 0.8, 0.8).getHex()));

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
        var material, texture;

        texture = new THREE.TextureLoader().load("assets/images/grid.png");

        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;

        texture.repeat.set(40, 40);

        material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: 1.0, side: THREE.DoubleSide, depthWrite: false, depthTest: true });
        this.grid = new THREE.Mesh(new THREE.PlaneGeometry(250, 250), material);
        this.grid.rotation.x = Math.PI / 2;
        this.grid.position.y = -1;
        this.grid.position.z = 0;

        var transparentMaterial = new THREE.MeshLambertMaterial({ transparent: true, opacity: 0.0, side: THREE.DoubleSide, depthWrite: false, depthTest: true });
        this.virtualGrid = new THREE.Mesh(new THREE.PlaneGeometry(250, 250), transparentMaterial);
        this.virtualGrid.rotation.x = Math.PI / 2;
        this.virtualGrid.position.y = -1;
        this.virtualGrid.position.z = 0;

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

        var ageom = new THREE.BoxGeometry(1, 1, 1);
        material = new THREE.MeshBasicMaterial({ color: 0x0c67a1, transparent: false, depthWrite: true, depthTest: true });
        var axisY = new THREE.Mesh(ageom, material);
        axisY.position.set(0, -1, 0);
        axisY.scale.set(0.5, ShipModel3DNS.MAX_HEIGHT * 2, 0.5);

        material = new THREE.MeshBasicMaterial({ color: 0x0c67a1, transparent: false, depthWrite: true, depthTest: true });
        var axisX = new THREE.Mesh(ageom, material);
        axisX.position.set(0, -1, 0);
        axisX.scale.set(250, 0.5, 0.5);

        material = new THREE.MeshBasicMaterial({ color: 0x0c67a1, transparent: false, depthWrite: true, depthTest: true });
        var axisZ = new THREE.Mesh(ageom, material);
        axisZ.position.set(0, -1, 0);
        axisZ.scale.set(0.5, 0.5, 250);

        this.scene.add(this.marqueeBox);
        this.scene.add(axisX);
        this.scene.add(axisY);
        this.scene.add(axisZ);
        this.scene.add(this.grid);
        this.scene.add(this.virtualGrid);
    }

    configureLight() {
        this.directionalLight = new DirectionalLight(0xffffff);
        this.directionalLight.position.set(0, 200, 0);
        this.directionalLight.lookAt(new Vector3(0, 0, 0));
    }

    configureControls() {
        var scope = this;

        this.joystick.moveCallback = function (deltaX, deltaY) {
            // @TODO move constants somewhere
            var joystickSpeedX = 0.05;
            var joystickSpeedY = 0.05;

            scope.camera.rotationX -= deltaX * joystickSpeedX;
            scope.camera.rotationY -= deltaY * joystickSpeedY;
        }
        this.joystick.updateLocation(window.innerWidth, window.innerHeight);
        this.joystick.added = false;
        this.joystick.show();

        this.controls = new ObjectControls(this.camera, this.renderer.domElement,
            this.container, this.objects, this.virtualGrid, this.scene, this.shipService, this.router, this.marqueeBox,
            this.joystick);
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
        var delta = this.clock.getDelta();
        ShipModel3D.time.value += delta;
        
        this.camera.update(delta);
        this.controls.update();
        this.joystick.update();
        this.renderer.autoClear = false;
        this.renderer.clear();
        this.renderer.render(this.bgScene, this.bgCam);
        this.renderer.render(this.scene, this.camera);
        this.controls.updateAfter(this.screenWidth, this.screenHeight);

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
        this.joystick.hide();
        this.controls.enabled = false;
        this.shipInfoBar.toggle();
    }

    onCloseShipInfo() {
        this.controls.enabled = true;
        this.joystick.show();
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
        var clickEvent = new MouseEvent("click", {
            "view": window,
            "bubbles": true,
            "cancelable": false
        });
        a.dispatchEvent(clickEvent);
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
            if (players && players !== "Cancel") {
                this.shipService.tacticalPlan.players = players.split("\n").filter(Boolean);
                this.shipService.updateTacticalPlan();
            }
        });
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
        this.controls.saveRotation();
        this.shipService.updateTacticalPlan();
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
