declare var require: any

import { Mesh, Vector3, TextureLoader, MeshLambertMaterial, Object3D } from 'three';

import * as THREE from 'three';
import { GLTF2Loader } from '../util/GLTF2Loader';
//import { CTMLoader } from './util/CTMLoader';

export class Ship {
    model: any;
    first: boolean = true;
    loading: boolean = true;
    url: string;

    constructor(url: string) {
        this.url = url;
    }

    loadModel(callback) {
        var loader = new GLTF2Loader();
        var scope = this;
        loader.load(this.url, function (data) {
            console.log(data.scene);
            scope.model = data.scene;
            callback();
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

    addModelTo(scene, position: Vector3, scale?: number) {
        var scope = this;
        var callback = function () {
            var material = new THREE.MeshPhongMaterial({
                color: 0x000000, side: THREE.DoubleSide
            });
            if (!scope.loading) {
                var mesh = new THREE.Mesh(scope.model.children[0].children[0].geometry, material);
                mesh.position.copy(position);
                if (scale !== undefined) {
                    mesh.scale.set(scale, scale, scale);
                }
                mesh.rotation.x = 0;
                mesh.rotation.z = 0;
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                scope.model.children[0].add(mesh);
            } else {
                if (scale !== undefined) {
                    var object = scope.model.children[0].children[0];
                    object.scale.set(scale, scale, scale);
                }
                scene.add(scope.model);
                scope.loading = false;
            }
            console.log(scene);
        };
        if (this.first && this.model == undefined) {
            this.first = false;
            this.loadModel(callback);
        } else if (this.loading) {
            console.log("WARNING: Still loading the model " + this.url);
        } else {
            callback();
        }
    }
}