declare var require: any

import { Mesh, Vector3, TextureLoader, MeshLambertMaterial, Object3D } from 'three';

import * as THREE from 'three';
import { GLTF2Loader } from '../util/GLTF2Loader';

import { Ship, ShipData, ShipInstance } from '../data-model';
import { Gyroscope } from '../util/Gyroscope'

const MAX_POS: number = 30;
const debug: boolean = true;
export const MAX_HEIGHT = 60;

export class ShipModel3D {
    static stepSize: number = 10;
    static currentZ: number = 30;
    static currentX: number = 0;
    static time = { type: "f", value: 1.0 };

    static defaultShipColor;
    static enemyShipColor;
    static noiseTexture;

    model: any;
    first: boolean = true;

    objects = [];

    constructor(public data: ShipData, public shipModel: Ship) {

    }

    static init() {
        var loader = new THREE.TextureLoader();
        ShipModel3D.defaultShipColor = loader.load( 'assets/ships/textures/defaultShipColor.png' );
        ShipModel3D.defaultShipColor.wrapS = this.defaultShipColor.wrapT = THREE.RepeatWrapping; 
            
        ShipModel3D.enemyShipColor = loader.load( 'assets/ships/textures/enemyShipColor.png' );
	    ShipModel3D.enemyShipColor.wrapS = ShipModel3D.enemyShipColor.wrapT = THREE.RepeatWrapping; 

        ShipModel3D.noiseTexture = loader.load( 'assets/ships/textures/noise.png' );
	    ShipModel3D.noiseTexture.wrapS = ShipModel3D.noiseTexture.wrapT = THREE.RepeatWrapping;
    }

    init() {
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

    addShipTo(scene, id: number, shipInstance: ShipInstance, scale: number) {
        var scope = this;
        
        if (!ShipModel3D.defaultShipColor || !ShipModel3D.enemyShipColor || !ShipModel3D.noiseTexture) {
            ShipModel3D.init();
        }

        var color = (shipInstance.enemy)?ShipModel3D.enemyShipColor:ShipModel3D.defaultShipColor;
        var colorCode = (shipInstance.enemy)?0xdd0000:0x00dddd;

        var uniforms = {
            baseTexture: 	{ type: "t", value: color },
            baseSpeed: 		{ type: "f", value: 0.3 },
            noiseTexture: 	{ type: "t", value: ShipModel3D.noiseTexture },
            noiseScale:		{ type: "f", value: 0.5 },
            alpha: 			{ type: "f", value: 1.0 },
            time: ShipModel3D.time,
            p: { type: "f", value: 1.3 }
        };

        var material = new THREE.ShaderMaterial({
            uniforms: uniforms,
            vertexShader: this.vertexShader,
            fragmentShader: this.fragmentShader,
            blending: THREE.AdditiveBlending,
            transparent: true,
            depthWrite: false
        });

        let i = scene.getObjectByName(this.data.name);
        if (i == undefined) {
            var object = scope.model.children[0];

            object.children[0].geometry.computeVertexNormals();

            object.scale.set(scale, scale, scale);
            object.position.set(shipInstance.position.x, shipInstance.position.y, shipInstance.position.z);
            object.rotation.set(shipInstance.rotation.x, shipInstance.rotation.y, shipInstance.rotation.z);
            object.children[0].rotation.set(-Math.PI / 2, Math.PI, 0);
            shipInstance.position = object.position;
            object.children[0].material = material;
            object.userData.id = id;
            object.userData.shipData = this.data;
            object.userData.shipModel = this.shipModel;
            this.objects.push(object.children[0]);

            var geometry = new THREE.Geometry();
            geometry.vertices.push(new Vector3(0, 0, MAX_HEIGHT / scale));
            geometry.vertices.push(new Vector3(0, 0, 0));

            var line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color:colorCode, transparent: true, opacity: 0.3, linewidth: 1 }));
            line.scale.z = shipInstance.position.y / MAX_HEIGHT;
            line.rotateX(Math.PI / 2);
            var gyro = new Gyroscope();
            gyro.add(line);

            object.add(gyro);
            object.children[0].geometry.computeBoundingBox();

            scene.add(scope.model);
        } else {
            var obj = scope.model.children[0].clone(false);
            var mesh = new THREE.Mesh(scope.model.children[0].children[0].geometry, material);

            obj.position.set(shipInstance.position.x, shipInstance.position.y, shipInstance.position.z);
            obj.rotation.set(shipInstance.rotation.x, shipInstance.rotation.y, shipInstance.rotation.z);
            mesh.rotation.set(-Math.PI / 2, Math.PI, 0);
            shipInstance.position = obj.position;
            obj.scale.set(scale, scale, scale);
            obj.add(mesh);

            var geometry = new THREE.Geometry();
            geometry.vertices.push(new Vector3(0, 0, MAX_HEIGHT / scale));
            geometry.vertices.push(new Vector3(0, 0, 0));

            var line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color:colorCode, transparent: true, opacity: 0.3, linewidth: 1 }));
            line.scale.z = shipInstance.position.y / MAX_HEIGHT;
            line.rotateX(Math.PI / 2);
            var gyro = new Gyroscope();
            gyro.add(line);
            obj.add(gyro);

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