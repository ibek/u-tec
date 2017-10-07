declare var require: any

import { Mesh, Vector3, TextureLoader, MeshLambertMaterial, Object3D } from 'three';

import * as THREE from 'three';
import { GLTF2Loader } from '../util/GLTF2Loader';

import { Ship, ShipData, ShipInstance } from '../data-model';
import { Gyroscope } from '../util/Gyroscope'

const MAX_POS: number = 30;
export const MAX_HEIGHT = 80;

export class ShipModel3D {
    static stepSize: number = 10;
    static currentZ: number = 30;
    static currentX: number = 0;
    static time = { type: "f", value: 1.0 };

    static defaultShipColor;
    static enemyShipColor;
    static noiseTexture;

    static needsUpdate = false;
    static selectedAids: Map<string, any> = new Map();

    model: any;

    objects = [];

    constructor(public data: ShipData, public shipModel: Ship) {

    }

    static init() {
        var loader = new THREE.TextureLoader();
        ShipModel3D.defaultShipColor = loader.load('assets/ships/textures/defaultShipColor.png');
        ShipModel3D.defaultShipColor.wrapS = this.defaultShipColor.wrapT = THREE.RepeatWrapping;

        ShipModel3D.enemyShipColor = loader.load('assets/ships/textures/enemyShipColor.png');
        ShipModel3D.enemyShipColor.wrapS = ShipModel3D.enemyShipColor.wrapT = THREE.RepeatWrapping;

        ShipModel3D.noiseTexture = loader.load('assets/ships/textures/noise.png');
        ShipModel3D.noiseTexture.wrapS = ShipModel3D.noiseTexture.wrapT = THREE.RepeatWrapping;
    }

    clear() {
        this.objects = [];
        if (this.model && this.model.children.length > 3) {
            this.model.children.splice(3, this.model.children.length - 3);
        }
        if (this.model) {
            var len = this.model.children[0].children.length;
            if (len > 1) {
                this.model.children[0].children.splice(1, len - 1);
            }
        }

        this.removeShipFromScene();
    }

    isLoaded(): boolean {
        return this.model !== undefined;
    }

    load(modelPath: string) {
        var loader = new GLTF2Loader();
        var scope = this;
        loader.load(modelPath, function (data) {
            scope.model = data.scene;
            scope.model.children[0].name = scope.data.name;
        });
    }

    addShipsToScene(scene) {
        if (!this.model) {
            return;
        }
        for (var i = 0; i < this.data.instances.length; i++) {
            this._addShipTo(scene, i, this.data.instances[i], this.shipModel.scale);
        }
    }

    removeShipFromScene() {
        if (this.model && this.model.parent) {
            this.model.parent.remove(this.model);
        }
    }

    static select(obj, scene) {
        var id = obj.parent.name + "" + obj.parent.userData.id;
        if (!obj.parent.userData.selected) {
            var size = new THREE.Box3().setFromObject(obj).getSize();
            var shipInstance = obj.parent.userData.shipInstance;
            var color = (shipInstance.enemy) ? 0xdd0000 : 0x00dddd;
            var boxHelper = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxBufferGeometry(size.x, size.y, size.z), 1), new THREE.LineBasicMaterial({ color: color, transparent: true, opacity: 0.3, linewidth: 1, depthWrite: false, depthTest: true }));
            boxHelper.position.set(obj.parent.position.x, obj.parent.position.y, obj.parent.position.z);
            scene.add(boxHelper);
            var aids = [];
            aids.push(boxHelper);

            var points = [];
            points.push(new Vector3(shipInstance.position.x, shipInstance.position.y, shipInstance.position.z));
            shipInstance.animation.forEach(animFrame => {
                points.push(new Vector3(animFrame.position.x, animFrame.position.y, animFrame.position.z));
            });
            if (points.length > 1) {
                var spline = new THREE.CatmullRomCurve3(points);
                var geometry = new THREE.Geometry();
                geometry.vertices = spline.getPoints(50);
                var material = new THREE.LineBasicMaterial({ color: color, transparent: true, opacity: 0.6 });
                var path = new THREE.Line(geometry, material);
                scene.add(path);
                aids.push(path);
            }
            ShipModel3D.selectedAids.set(id, aids);

            obj.parent.userData.selected = true;
        }
    }

    static deselect(obj, scene) {
        var id = obj.parent.name + "" + obj.parent.userData.id;
        var aids = this.selectedAids.get(id);
        if (aids) {
            aids.forEach(a => {
                scene.remove(a);
            });
            this.selectedAids.delete(id);
        }
        obj.parent.userData.selected = false;
    }

    static deselectAll(objects, scene) {
        this.selectedAids.forEach((value: any, key: string) => {
            var aids = this.selectedAids.get(key);
            if (aids) {
                aids.forEach(a => {
                    scene.remove(a);
                });
                this.selectedAids.delete(key);
            }
        });

        objects.forEach(o => {
            o.parent.userData.selected = false;
        });
    }

    static updateObjectPosition(obj, x, y, z) {
        obj.parent.position.set(x, y, z);
        ShipModel3D.updateBoxPosition(obj);
    }

    static updateBoxPosition(obj) {
        var id = obj.parent.name + "" + obj.parent.userData.id;
        var sb = ShipModel3D.selectedAids.get(id)[0];
        sb.position.set(obj.parent.position.x, obj.parent.position.y, obj.parent.position.z);
        if (obj.parent.children.length > 1) {
            obj.parent.children[1].children[0].scale.z = obj.parent.position.y / MAX_HEIGHT;
        }
    }

    static moveUp(obj, delta) {
        obj.parent.position.y -= delta;
        if (obj.parent.position.y < -MAX_HEIGHT) {
            obj.parent.position.y = -MAX_HEIGHT;
        } else if (obj.parent.position.y > MAX_HEIGHT) {
            obj.parent.position.y = MAX_HEIGHT;
        }
        ShipModel3D.updateBoxPosition(obj);
    }

    static switchSide(obj, enemy) {
        var color = (enemy) ? ShipModel3D.enemyShipColor : ShipModel3D.defaultShipColor;
        obj.material.uniforms.baseTexture.value = color;
    }

    static getAnimatedPosition(obj, time, frame): Vector3 { // time 0-1
        var res;
        var points = [];
        var shipInstance = obj.parent.userData.shipInstance;
        points.push(new Vector3(shipInstance.position.x, shipInstance.position.y, shipInstance.position.z));
        shipInstance.animation.forEach(animFrame => {
            points.push(new Vector3(animFrame.position.x, animFrame.position.y, animFrame.position.z));
        });
        if (points.length > 1) {
            var spline:any = new THREE.CatmullRomCurve3(points);
            spline.arcLengthDivisions = 100;
            var frameLen = 15 / 5.0;
            var dt = (time * 15.0) % frameLen;
            var p = 0.0;
            var totalDistance = spline.getLength();
            if (totalDistance == 0) {
                res = points[0];
                return res;
            }
            /**var lengths = spline.getLengths(points.length-1);
            totalDistance = lengths[lengths.length - 1];
            for (var i = 1; i < lengths.length; i++) {
                var diff = lengths[i] - lengths[i-1];
                if (i == frame) {
                    p += diff * dt / frameLen;
                } else if (i < frame) {
                    p += diff;
                }
            }*/
            totalDistance = 0;
            for (var i=0; i+1<points.length; i++) {
                var distance = points[i].distanceTo(points[i+1]);
                totalDistance += distance;
                if (i == frame) {
                    p += distance * dt / frameLen;
                } else if (i < frame) {
                    p += distance;
                }
            }
            p = p / totalDistance;
            if (p > 1) {
                p = 1;
            }
            res = spline.getPointAt(p);

        } else {
            res = points[0];
        }
        return res;
    }

    private _addShipTo(scene, id: number, shipInstance: ShipInstance, scale: number) {

        if (!ShipModel3D.defaultShipColor || !ShipModel3D.enemyShipColor || !ShipModel3D.noiseTexture) {
            ShipModel3D.init();
        }

        var color = (shipInstance.enemy) ? ShipModel3D.enemyShipColor : ShipModel3D.defaultShipColor;
        var colorCode = (shipInstance.enemy) ? 0xdd0000 : 0x00dddd;
        scale = scale / 2.0;

        var uniforms = {
            baseTexture: { type: "t", value: color },
            baseSpeed: { type: "f", value: 0.3 },
            noiseTexture: { type: "t", value: ShipModel3D.noiseTexture },
            noiseScale: { type: "f", value: 0.5 },
            alpha: { type: "f", value: 1.0 },
            time: ShipModel3D.time,
            p: { type: "f", value: 1.3 }
        };

        var material = new THREE.ShaderMaterial({
            uniforms: uniforms,
            vertexShader: this.vertexShader,
            fragmentShader: this.fragmentShader,
            blending: THREE.AdditiveBlending,
            transparent: true,
            depthWrite: false,
            depthTest: true
        });

        let i = scene.getObjectByName(this.data.name);
        if (i == undefined) {
            var object = this.model.children[0];

            object.children[0].geometry.computeVertexNormals();
            object.children[0].geometry.computeBoundingBox();

            this._setObject3d(id, object, colorCode, scale, shipInstance, material);

            scene.add(this.model);
        } else {
            var object = this.model.children[0].clone(false);
            var mesh = new THREE.Mesh(this.model.children[0].children[0].geometry, material);
            mesh.rotation.set(-Math.PI / 2, Math.PI, 0);
            object.add(mesh);

            this._setObject3d(id, object, colorCode, scale, shipInstance, material);

            this.model.add(object);
        }
    }

    private _setObject3d(id, object: any, colorCode, scale: number, shipInstance: ShipInstance, material) {
        object.position.set(shipInstance.position.x, shipInstance.position.y, shipInstance.position.z);
        object.scale.set(scale, scale, scale);
        object.rotation.set(shipInstance.rotation.x, shipInstance.rotation.y, shipInstance.rotation.z);
        object.children[0].rotation.set(-Math.PI / 2, Math.PI, 0);
        object.children[0].material = material;

        object.userData.id = id;
        object.userData.shipData = this.data;
        object.userData.shipModel = this.shipModel;
        object.userData.shipInstance = shipInstance;
        object.userData.selected = false;

        this.objects.push(object.children[0]);

        var geometry = new THREE.Geometry();
        geometry.vertices.push(new Vector3(0, 0, MAX_HEIGHT / scale));
        geometry.vertices.push(new Vector3(0, 0, 0));

        var line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: colorCode, transparent: true, opacity: 0.3, linewidth: 1, depthWrite: false, depthTest: true }));
        line.scale.z = shipInstance.position.y / MAX_HEIGHT;
        line.rotateX(Math.PI / 2);
        var gyro = new Gyroscope();
        gyro.add(line);

        object.add(gyro);
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

    vertexShader = `
        varying vec2 vUv;
        uniform float p;
        varying float intensity;

        void main()
        {
            vUv = uv;
            vec3 vNormal = normalize( normalMatrix * normal );
            intensity = pow( 1.0 - abs(dot( vNormal, vec3( 0, 0, 1.0 ) ) ), p );
            gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
        }
    `;

    fragmentShader = `
        uniform float baseSpeed;
        uniform sampler2D baseTexture;
        uniform sampler2D noiseTexture;
        uniform float noiseScale;
        uniform float alpha;
        uniform float time;

        varying vec2 vUv;
        varying float intensity;
        
        void main()
        {
            vec2 uvTimeShift = vUv + vec2( -0.7, 1.5 ) * time * baseSpeed;	
            vec4 noiseGeneratorTimeShift = texture2D( noiseTexture, uvTimeShift );
            vec2 uvNoiseTimeShift = vUv + noiseScale * vec2( noiseGeneratorTimeShift.r, noiseGeneratorTimeShift.b );
            vec4 baseColor = texture2D( baseTexture, uvNoiseTimeShift );
            baseColor.x = baseColor.x * intensity;
            baseColor.y = baseColor.y * intensity;
            baseColor.z = baseColor.z * intensity;
            baseColor.a = 1.0;
            gl_FragColor = baseColor;
        }
    `;
}