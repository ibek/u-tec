declare var require: any

import { Mesh, Vector3, TextureLoader, MeshLambertMaterial, Object3D } from 'three';

import * as THREE from 'three';
import { GLTF2Loader } from '../util/GLTF2Loader';
//import { CTMLoader } from './util/CTMLoader';

import { ShipData, ShipDataInstance } from '../ship-data';

const MAX_POS: number = 30;

export class ShipModel3D {
    static stepSize: number = 10;
    static currentZ: number = 30;
    static currentX: number = 0;

    model: any;
    first: boolean = true;

    objects = [];

    constructor(public data: ShipData) {

    }

    static init() {
        ShipModel3D.stepSize = 10;
        ShipModel3D.currentZ = 30;
        ShipModel3D.currentX = 0;
    }

    init() {
        if (this.model.children.length > 3) {
            this.model.children.splice(3, this.model.children.length - 3);
        }
        if (this.data.instances.length !== this.data.amount) {
            for (var i = this.data.instances.length; i < this.data.amount; i++) {
                var sdi = new ShipDataInstance();
                var position = ShipModel3D.getNextPosition();
                sdi.position = position;
                this.data.add(sdi);
            }
        }
    }

    isLoaded(): boolean {
        return this.model !== undefined;
    }

    load() {
        var loader = new GLTF2Loader();
        var scope = this;
        loader.load(this.data.origin.model, function (data) {
            console.log(data.scene);
            scope.model = data.scene;
            scope.model.children[0].name = scope.data.origin.type;
        });
        /**var loader = new CTMLoader();
        var textureLoader = new TextureLoader();
        var scope = this;

        loader.load("ships/hornet-lp1.ctm", function (geometry) {
            var material = new MeshLambertMaterial({ color: 0xcccccc, side: THREE.DoubleSide, combine: THREE.MixOperation, reflectivity: 0.1 });
            var model = scope.callbackModel(geometry, 70, material, 0, 0, 0, 0, 0);
            scope.scene.add(model);
        }, { useWorker: false });*/
    }

    addShipsToScene(scene) {

        for (var i = 0; i < this.data.amount; i++) {
            var instance = this.data.instances[i];
            this.addShipTo(scene, i, instance.position, 0.003);
        }
    }

    addShipTo(scene, id:number, position: Vector3, scale: number) {
        var scope = this;
        /**var material = new THREE.MeshPhongMaterial({
            color: 0xaa0000, side: THREE.DoubleSide
        });*/
        var material = new THREE.MeshStandardMaterial({
            color: 0x00aa00,
            metalness: 1.0,
            roughness: 0.6,
            transparent: true,
            opacity: 0.4,
            shading: THREE.SmoothShading, side: THREE.DoubleSide
        });
        let i = scene.getObjectByName(this.data.origin.type);
        if (i == undefined) {
            var object = scope.model.children[0];
            object.scale.set(scale, scale, scale);
            object.position.set(position.x, position.y, position.z);
            object.rotation.z = Math.PI;
            object.children[0].geometry.computeBoundingSphere();
            object.children[0].material = material;
            object.userData.id = id;
            object.userData.shipData = this.data;
            this.objects.push(object.children[0]);
            scene.add(scope.model);
        } else {
            var obj = scope.model.children[0].clone(false);
            var mesh = new THREE.Mesh(scope.model.children[0].children[0].geometry, material);
            obj.position.set(position.x, position.y, position.z);
            obj.scale.set(scale, scale, scale);
            obj.add(mesh);
            this.objects.push(mesh);
            obj.userData.id = id;
            obj.userData.shipData = this.data;
            scope.model.add(obj);
        }
        console.log(scene);
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