declare var require: any

import { Mesh, Vector3, TextureLoader, MeshLambertMaterial, Object3D } from 'three';

import * as THREE from 'three';
import { GLTF2Loader } from '../util/GLTF2Loader';

import { Ship, ShipData, ShipInstance } from '../data-model';

const MAX_POS: number = 30;

export class ShipModel3D {
    static stepSize: number = 10;
    static currentZ: number = 30;
    static currentX: number = 0;

    model: any;
    first: boolean = true;

    objects = [];

    constructor(public data: ShipData, public shipModel: Ship) {

    }

    static init() {
        ShipModel3D.stepSize = 10;
        ShipModel3D.currentZ = 30;
        ShipModel3D.currentX = 0;
    }

    init() {
        this.objects = [];
        if (this.model && this.model.children.length > 3) {
            this.model.children.splice(3, this.model.children.length - 3);
        }

        this.removeShipFromScene();
    }

    isLoaded(): boolean {
        return this.model !== undefined;
    }

    load(modelPath: string, loaded) {
        var loader = new GLTF2Loader();
        var scope = this;
        loader.load(modelPath, function (data) {
            scope.model = data.scene;
            scope.model.children[0].name = scope.data.name;
            loaded();
        });
    }

    addShipsToScene(scene) {
        if (!this.model) {
            return;
        }
        for (var i = 0; i < this.data.instances.length; i++) {
            this.addShipTo(scene, i, this.data.instances[i], this.shipModel.scale);
        }
    }

    removeShipFromScene() {
        if (this.model && this.model.parent) {
            this.model.parent.remove(this.model);
        }
    }

    addShipTo(scene, id: number, shipInstance: ShipInstance, scale: number) {
        var scope = this;
        // 0x22dd22 green
        // 0x00ffff cyan
        // 0xdddd22 gold
        // 0xdd2222 red
        var material = new THREE.MeshStandardMaterial({
            color: 0x00ffff,
            metalness: 1.0,
            roughness: 0.7,
            transparent: true,
            opacity: 0.4,
            side: THREE.DoubleSide
        });
        let i = scene.getObjectByName(this.data.name);
        if (i == undefined) {
            var object = scope.model.children[0];
            object.scale.set(scale, scale, scale);
            object.position.set(shipInstance.position.x, shipInstance.position.y, shipInstance.position.z);
            shipInstance.position = object.position;
            object.rotation.z = Math.PI;
            object.children[0].geometry.computeBoundingSphere();
            if (this.shipModel.size == 'L') {
                material.opacity = 0.6;
            }
            object.children[0].material = material;
            object.userData.id = id;
            object.userData.shipData = this.data;
            object.userData.shipModel = this.shipModel;
            this.objects.push(object.children[0]);
            scene.add(scope.model);
        } else {
            var obj = scope.model.children[0].clone(false);
            var mesh = new THREE.Mesh(scope.model.children[0].children[0].geometry, material);
            obj.position.set(shipInstance.position.x, shipInstance.position.y, shipInstance.position.z);
            shipInstance.position = obj.position;
            obj.scale.set(scale, scale, scale);
            obj.add(mesh);
            this.objects.push(mesh);
            obj.userData.id = id;
            obj.userData.shipData = this.data;
            obj.userData.shipModel = this.shipModel;
            scope.model.add(obj);
        }
    }

    static getNextPosition(): Vector3 {
        var x = ShipModel3D.currentX;
        var z = ShipModel3D.currentZ;
        ShipModel3D.currentX = ShipModel3D.currentX + ShipModel3D.stepSize;
        if (ShipModel3D.currentX + ShipModel3D.currentZ > MAX_POS) {
            ShipModel3D.currentX = -ShipModel3D.currentX;
            ShipModel3D.currentZ -= ShipModel3D.stepSize;
        }
        return new Vector3(-x, 1, z);
    }
}