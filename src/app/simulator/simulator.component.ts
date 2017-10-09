declare var require: any

import { Component, AfterViewInit, HostListener, ViewChild, ElementRef, Inject, Input } from '@angular/core';
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
import { Ship, ShipData, TacticalPlan, ShipInstance, BACKGROUNDS } from '../data-model';
import { Joystick } from '../util/Joystick';
import { OrbitCamera } from '../util/OrbitCamera';
import { Controller } from '../util/Controller';

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
    controller: Controller;
    text = "ahoj";

    grid: Mesh;
    virtualGrid: Mesh;
    bgScene: Scene = new THREE.Scene();
    bgCam: THREE.Camera = new THREE.Camera();

    directionalLight: DirectionalLight;

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

    currentTime = 0;
    @Input() timeSec = 0;
    maxTime = 15;
    play = false;
    cameraLockedTo = null;

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

        this.addGrid();

        this.start();
    }

    addBackground(tacticalPlan: TacticalPlan) {
        var background = tacticalPlan.settings.background;
        var material;
        if (!background) {
            background = "assets/images/background/starfarer-cockpit.png";
        }
        var bgUrl = BACKGROUNDS.get(background);
        if (bgUrl) {
            background = bgUrl;
        }
        if (background === "black") {
            material = new THREE.MeshBasicMaterial({ color:0x090909 });
        } else {
            var loader = new THREE.TextureLoader();
            var texture: THREE.Texture = loader.load(background);
            material = new THREE.MeshBasicMaterial({ map: texture });
        }
        var bg = new THREE.Mesh(
            new THREE.PlaneGeometry(2, 2, 0),
            material
        );
        bg.material.depthTest = false;
        bg.material.depthWrite = false;

        this.bgScene.add(this.bgCam);
        this.bgScene.add(bg);
    }

    addGrid() {
        var material, texture;

        var maxAnisotropy = this.renderer.capabilities.getMaxAnisotropy();

        texture = new THREE.TextureLoader().load("assets/images/grid256.png");

        texture.anisotropy = maxAnisotropy;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;

        texture.repeat.set(60, 60);
        var texture2 = new THREE.TextureLoader().load("assets/images/grid256.png");
        texture.mipmaps[0] = texture2.image;
        var texture3 = new THREE.TextureLoader().load("assets/images/grid128.png");
        texture.mipmaps[1] = texture3.image;
        var texture4 = new THREE.TextureLoader().load("assets/images/grid64.png");
        texture.mipmaps[2] = texture4.image;
        var texture5 = new THREE.TextureLoader().load("assets/images/grid32.png");
        texture.mipmaps[3] = texture5.image;
        var texture6 = new THREE.TextureLoader().load("assets/images/grid16.png");
        texture.mipmaps[4] = texture6.image;
        var texture7 = new THREE.TextureLoader().load("assets/images/grid8.png");
        texture.mipmaps[5] = texture7.image;
        var texture8 = new THREE.TextureLoader().load("assets/images/grid4.png");
        texture.mipmaps[6] = texture8.image;
        var texture9 = new THREE.TextureLoader().load("assets/images/grid2.png");
        texture.mipmaps[7] = texture9.image;
        var texture10 = new THREE.TextureLoader().load("assets/images/grid1.png");
        texture.mipmaps[8] = texture10.image;

        material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: 1.0, side: THREE.DoubleSide, depthWrite: false, depthTest: true });
        this.grid = new THREE.Mesh(new THREE.PlaneGeometry(250, 250), material);
        this.grid.rotation.x = Math.PI / 2;
        this.grid.position.y = -1;
        this.grid.position.z = 0;

        var transparentMaterial = new THREE.MeshLambertMaterial({ transparent: true, opacity: 0.0, side: THREE.DoubleSide, depthWrite: false, depthTest: false });
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
        material = new THREE.MeshBasicMaterial({ color: 0x285157, transparent: false, depthWrite: true, depthTest: true });
        var axisY = new THREE.Mesh(ageom, material);
        axisY.position.set(0, -1, 0);
        axisY.scale.set(0.5, ShipModel3DNS.MAX_HEIGHT * 2, 0.5);

        material = new THREE.MeshBasicMaterial({ color: 0x285157, transparent: false, depthWrite: true, depthTest: true });
        var axisX = new THREE.Mesh(ageom, material);
        axisX.position.set(0, -1, 0);
        axisX.scale.set(250, 0.5, 0.5);

        material = new THREE.MeshBasicMaterial({ color: 0x285157, transparent: false, depthWrite: true, depthTest: true });
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

        this.joystick.updateLocation(window.innerWidth, window.innerHeight);
        this.joystick.added = false;
        this.joystick.show();

        this.controller = new Controller(this.scene, this.shipService, this.virtualGrid, this.camera, this.joystick, this.marqueeBox);
        this.controller.enable(this.renderer.domElement);

    }

    render() {
        requestAnimationFrame(() => this.render());
        var delta = this.clock.getDelta();
        ShipModel3D.time.value += delta;

        if (this.play) {
            this.currentTime += delta;
            this.timeSec = Math.floor(this.currentTime);
            if (this.timeSec > this.maxTime) {
                this.timeSec = this.maxTime;
            }
            if (this.currentTime >= this.maxTime) {
                this.currentTime = this.maxTime;
                this.play = false;
            }
            this.controller.currentAnimationFrame = Math.floor(this.currentTime / (this.maxTime / 5));
            this.controller.actionableObjects.forEach(o => {
                ShipModel3D.updateAnimatedPosition(o, this.currentTime / this.maxTime, this.controller.currentAnimationFrame);
            });
        }

        if (this.cameraLockedTo) {
            this.camera.center.set(this.cameraLockedTo.parent.position.x, this.cameraLockedTo.parent.position.y, this.cameraLockedTo.parent.position.z);
        }
        this.camera.update(delta);
        this.joystick.update();
        this.controller.update(delta);
        this.renderer.autoClear = false;
        this.renderer.clear();
        this.renderer.render(this.bgScene, this.bgCam);
        this.renderer.render(this.scene, this.camera);

    }

    start() {
        let tacticalPlan: Promise<TacticalPlan> = this.shipService.getTacticalPlan(); // the list needs to be upto date
        tacticalPlan.then((res) => {
            res.verify(this.shipService);
            this.addBackground(res);
            this.maxTime = res.settings.animationLength;

            this.loadingProgress = this.sceneService.loadingProgress();
            if (this.shipService.isReady() && this.loadingProgress == 100) {
                this.loaded = true;
                this.configureControls();
                this.container.nativeElement.appendChild(this.renderer.domElement);
                var scope = this;
                ShipModel3D.init();
                scope.controller.reset();
                scope.sceneService.shipModels3d.forEach((model: ShipModel3D, type: string) => {
                    model.clear();
                    model.addShipsToScene(scope.scene);
                    model.objects.forEach(o => scope.controller.actionableObjects.push(o));
                });
                this.showAids(res.settings.showVisualAids);
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
        var selected = this.controller.getAllSelected();
        if (selected.length == 1) {
            var userData = selected[0].parent.userData;
            this.selectedShip = userData.shipModel;
            this.selectedShipInstance = userData.shipData.instances[userData.id];
            this.joystick.hide();
            this.controller.disable(this.renderer.domElement);
            this.shipInfoBar.toggle();
        }
    }

    onCloseShipInfo() {
        this.controller.enable(this.renderer.domElement);
        this.joystick.show();
    }

    onShipInfoChange() {
        this.shipService.updateTacticalPlan();
    }

    saveImage() {
        this.controller.deselectAll();
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

    @HostListener('window:resize', ['$event'])
    onResize(event) {
        this.screenWidth = window.innerWidth;
        this.screenHeight = window.innerHeight - 5;
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

    switchCameraView() {
        this.cameraLockedTo = null;
        this.camera.switch();
    }

    lookAtShip() {
        var selected = this.controller.getAllSelected();
        if (selected.length == 1) {
            this.cameraLockedTo = selected[0];
            this.controller.lookAtSelectedShip(this.cameraLockedTo);
        }
    }

    switchSide() {
        this.controller.switchSideOfSelectedShips();
    }

    showAids(visible) {
        this.aidsVisible = visible;
        this.controller.actionableObjects.forEach(o => {
            o.parent.children[1].children[0].visible = visible;
        });
    }

    showControls() {
        let dialogRef = this.mdDialog.open(ControlsDialogComponent);
    }

    playAnimation() {
        if (!this.play) {
            this.play = true;
            if (this.currentTime == this.maxTime) {
                this.resetAnimation();
            }
        } else {
            this.play = false;
        }
    }

    resetAnimation() {
        this.currentTime = 0;
        this.timeSec = 0;
        this.controller.currentAnimationFrame = 0;
        this.controller.actionableObjects.forEach(o => {
            ShipModel3D.updateAnimatedPosition(o, 0, this.controller.currentAnimationFrame);
        });
    }

    onChangeAnimation(e) {
        this.currentTime = (e.layerX / e.target.offsetWidth) * 15;
        this.timeSec = Math.floor(this.currentTime);
        this.controller.currentAnimationFrame = Math.floor(this.currentTime / (this.maxTime / 5));
        this.controller.actionableObjects.forEach(o => {
            ShipModel3D.updateAnimatedPosition(o, this.currentTime / this.maxTime, this.controller.currentAnimationFrame);
        });
    }

    recording() {
        this.controller.recording = !this.controller.recording;
        if (this.controller.recording) {
            this.controller.getAllSelected().forEach(o => {
                this.controller.updateAnimationCurveFor(o);
            });
        } else {
            ShipModel3D._removePoints(this.scene);
        }
    }

    isSquadron(): boolean {
        var selected = this.controller.getAllSelected();
        if (selected.length !== 1) {
            return false;
        }
        var obj = selected[0];
        return obj.parent.userData.shipModel.size === "S";
    }

    squadron(num:number) {
        var selected = this.controller.getAllSelected();
        if (selected.length !== 1) {
            return;
        }
        var obj = selected[0];
        var shipInstance = obj.parent.userData.shipInstance;
        if (!shipInstance.squadron || shipInstance.squadron < 1) {
            shipInstance.squadron = 1;
        }
        if (shipInstance.squadron + num <= 8 && shipInstance.squadron + num >= 1) {
            shipInstance.squadron = shipInstance.squadron + num;
            ShipModel3D.updateSquadron(shipInstance, obj);
            this.shipService.updateTacticalPlan();
        }
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
