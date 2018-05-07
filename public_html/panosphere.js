/*
    Copyright (C) 2015-2018 Sumandeep Banerjee

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published
    by the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

/* 
 * OpenSpace Viewer: Panosphere module source
 * Author: sumandeep.banerjee@gmail.com
 */

"use strict";

// Panosphere Class - Data
function CPanosphere() {
    this.m_nGalaxyId = 0;                       // Galaxy id to which the sphere belongs
    this.m_strLocationTag = "";                 // name of location
    this.m_nSphereId = 0;                       // index of sphere
    this.m_urlSphereTex = null;                 // url to Panoramic image file
    this.m_urlMSphereTex = null;                // url to Mid Resolution image file
    this.m_urlLSphereTex = null;                // url to Low Resolution image file
    this.m_mapSphereTex = null;                 // Three.js texture
    this.m_fSphereCreated = false;              // flag to keep track of sphere mesh
    this.m_fHighTexLoaded = false;              // load status of HIGH RES texture
    this.m_fLowTexLoaded = false;               // load status of LOW RES texture
    this.m_mapHSphereTex = null;                // High Resolution texture
    this.m_mapLSphereTex = null;                // Low resolution texture
    this.m_center = null;                       // Three.js vector3
    this.m_rotation = null;                     // Three.js euler angle
    this.m_cSphereContainer = null;             // Three.js Object3D containter for sphere mesh
    this.m_nSphereRadius = 25;                  // Radius of sphere
    this.m_nWidthSegments = 60;                 // Number of Width Segemnts of Sphere
    this.m_nHeightSegments = 60;                // Number of Height Segments of sphere
}

// Panosphere Class - Methods
CPanosphere.prototype = {
    // constructor to declare data
    constructor: CPanosphere,
    // initialize custom variables
    initialize: function (cSphereInit) {
        this.m_strLocationTag = cSphereInit.strLocationTag;
        this.m_nSphereId = cSphereInit.nSphereId;
        this.m_urlSphereTex = cSphereInit.urlSphereTex;
        this.m_urlMSphereTex = cSphereInit.urlMSphereTex;
        this.m_urlLSphereTex = cSphereInit.urlLSphereTex;
        this.m_center = cSphereInit.center;
        this.m_rotation = cSphereInit.rotation;
        this.m_nSphereRadius = cSphereInit.rRadius;
        this.m_cSphereContainer = new THREE.Object3D();
    },
    setGalaxyId: function (id) {
        this.m_nGalaxyId = id;
    },
    getGalaxyId: function () {
        return this.m_nGalaxyId;
    },
    getSphereId: function () {
        return this.m_nSphereId;
    },
    getTexLoadStatus: function () {
        var ownObject = this;
        return function () {
            return (ownObject.m_fLowTexLoaded && ownObject.m_fSphereCreated);
        };
    },
    getCenter: function () {
        return this.m_center;
    },
    getRotation: function () {
        return this.m_rotation;
    },
    getSphereModel: function () {
        return this.m_cSphereContainer;
    },
    // load texture resource
    loadSphere: function () {
        // cerate pointer to own object
        var ownObject = this;

        // create mesh only if it has already not been created
        if (!this.m_fSphereCreated) {
            // start loading low res texture
            this.m_mapLSphereTex = THREE.ImageUtils.loadTexture(ownObject.m_urlLSphereTex, undefined, function () {
                // on completion of loading of low texture
                ownObject.m_fLowTexLoaded = true;
                ownObject.m_mapLSphereTex.wrapS = THREE.MirroredRepeatWrapping;
                ownObject.m_mapLSphereTex.wrapT = THREE.MirroredRepeatWrapping;

                // start loading high res texture
                ownObject.m_mapHSphereTex = THREE.ImageUtils.loadTexture(
                        (ownObject.m_urlMSphereTex && 'Mobile' === g_cSystemSpecs.strDevType) ?
                        ownObject.m_urlMSphereTex : ownObject.m_urlSphereTex, undefined, function () {
                            // on completetion of loading of high texture
                            if (ownObject.m_fLowTexLoaded) {
                                ownObject.m_fHighTexLoaded = true;
                                ownObject.m_mapHSphereTex.wrapS = THREE.MirroredRepeatWrapping;
                                ownObject.m_mapHSphereTex.wrapT = THREE.MirroredRepeatWrapping;

                                // change texture map reference of sphere
                                if (ownObject.m_cSphereContainer.children[0]) {
                                    ownObject.m_cSphereContainer.children[0].material.map = ownObject.m_mapHSphereTex;
                                }
                            }

                            // destroy the low res texture when high res is loaded
                            // ownObject.m_mapLSphereTex.dispose();
                        });
            });

            // create material and geometry
            this.m_mapSphereTex = this.m_fHighTexLoaded ? this.m_mapHSphereTex : this.m_mapLSphereTex;
            var sphereMaterial = new THREE.MeshBasicMaterial({
                map: this.m_mapSphereTex,
                side: THREE.DoubleSide});
            var sphereGeometry = new THREE.SphereGeometry(this.m_nSphereRadius,
                    this.m_nWidthSegments, this.m_nHeightSegments);
            sphereGeometry.applyMatrix(new THREE.Matrix4().makeScale(-1, 1, 1));

            // create mesh object
            var sphereMesh = new THREE.Mesh(sphereGeometry, sphereMaterial);
            sphereMesh.rotation.set(Math.PI_2 + this.m_rotation.x,
                    this.m_rotation.z, this.m_rotation.y, "XYZ");
            sphereMesh.position.set(this.m_center.x, this.m_center.y, this.m_center.z);
            this.m_cSphereContainer.add(sphereMesh);
            this.m_cSphereContainer.visible = false;

            this.m_fSphereCreated = true;
        }
    },
    unloadSphere: function () {
        if (this.m_fSphereCreated) {
            var sphere = this.m_cSphereContainer.children[0];

            // remove the mesh and dispose the material
            this.m_cSphereContainer.remove(sphere);
            sphere.material.dispose();
            sphere.geometry.dispose();

            // remove textures from memory
            this.m_mapHSphereTex = null;
            this.m_fHighTexLoaded = false;
            this.m_mapLSphereTex = null;
            this.m_fLowTexLoaded = false;

            // tell panoverse that the sphere and textures have been unloaded
            this.m_mapSphereTex = null;
            this.m_fSphereCreated = false;
        }
    }
};
