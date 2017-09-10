import * as THREE from 'three';

export class Gyroscope extends THREE.Object3D {

	translationObject = new THREE.Vector3();
	quaternionObject = new THREE.Quaternion();
	scaleObject = new THREE.Vector3();

	translationWorld = new THREE.Vector3();
	quaternionWorld = new THREE.Quaternion();
	scaleWorld = new THREE.Vector3();

    constructor() {
        super();
    }

	updateMatrixWorld( force ) {

		this.matrixAutoUpdate && this.updateMatrix();

		// update matrixWorld

		if ( this.matrixWorldNeedsUpdate || force ) {

			if ( this.parent !== null ) {

				this.matrixWorld.multiplyMatrices( this.parent.matrixWorld, this.matrix );

				this.matrixWorld.decompose( this.translationWorld, this.quaternionWorld, this.scaleWorld );
				this.matrix.decompose( this.translationObject, this.quaternionObject, this.scaleObject );

				this.matrixWorld.compose( this.translationWorld, this.quaternionObject, this.scaleWorld );


			} else {

				this.matrixWorld.copy( this.matrix );

			}


			this.matrixWorldNeedsUpdate = false;

			force = true;

		}

		// update children

		for ( var i = 0, l = this.children.length; i < l; i ++ ) {

			this.children[ i ].updateMatrixWorld( force );

		}

}

}