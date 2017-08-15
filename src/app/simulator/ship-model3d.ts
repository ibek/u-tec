declare var require: any

import { Mesh, Vector3, TextureLoader, MeshLambertMaterial, Object3D } from 'three';

import * as THREE from 'three';
import { GLTF2Loader } from '../util/GLTF2Loader';
//import { CTMLoader } from './util/CTMLoader';

import { ShipData } from '../ship-data';

export class ShipModel3D {
    model: any;
    first: boolean = true;

    constructor(public data: ShipData) {

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
        this.addShipTo(scene, new Vector3(this.data.positionX, this.data.positionY, this.data.positionZ), 0.003);
        this.addShipTo(scene, new Vector3(this.data.positionX + 30, this.data.positionY + 10, this.data.positionZ - 10), 0.003);
        this.addShipTo(scene, new Vector3(this.data.positionX - 30, this.data.positionY + 10, this.data.positionZ + 20), 0.003);
    }

    addShipTo(scene, position: Vector3, scale: number) {
        var scope = this;
        var material = new THREE.MeshPhongMaterial({
            color: 0x000000, side: THREE.DoubleSide
        });
        let i = scene.getObjectByName(this.data.origin.type);
        if (i == undefined) {
            var object = scope.model.children[0];
            object.scale.set(scale, scale, scale);
            object.rotation.z = Math.PI;
            object.children[0].geometry.computeBoundingSphere();
            scene.add(scope.model);
        } else {
            var obj = scope.model.children[0].clone(false);
            var mesh = new THREE.Mesh(scope.model.children[0].children[0].geometry, material);
            obj.position.set(position.x, position.y, position.z);
            obj.scale.set(scale, scale, scale);
            obj.add(mesh);
            scope.model.add(obj);
        }
        console.log(scene);
    }
}