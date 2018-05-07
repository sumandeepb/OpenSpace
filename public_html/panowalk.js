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
 * OpenSpace Viewer: Panowalk module source
 * Author: sumandeep.banerjee@gmail.com
 */

"use strict";

// Panowalk Class - Data
function CPanowalk() {
    this.m_rFOV = 60.0;             // field of view angle

    this.m_cPanoverse = null;       // panorama universe datastructure

    this.m_cCamera = null;          // three.js perspecive camera for 3D rendering
    this.m_rLatitude = 0;           // camera view within sphere
    this.m_rLongitude = 0;

    this.m_cContainer = null;       // three.js Object3D container
    this.m_cModel = null;           // three.js reference to underlying 3D model
    this.m_cSphere = null;          // three.js reference to current sphere mesh

    this.m_cMarkerContainer = null; // this.js Object3D container for markers
    this.m_highlightedMarker = null;//highlighted marker
    this.m_markerImages = {inactive: null, active: null}; //container to store the active and inactive marker images
    this.m_cRaycaster = null;       // ray caster to select markers

    this.m_fIsInTransit = false;    // flag to denote transition
    this.m_fTransitAnim = false;    // flag to denote transit animation
    this.m_cCurrSphere = null;      // reference to current sphere
    this.m_cNextSphere = null;      // reference to next sphere
    this.m_vInit = new THREE.Vector3(); // initial camera position during transit animation
    this.m_vGrad = new THREE.Vector3(); // gradient direction of camera transit
    this.m_rTime = 0.0;                 // parameter to locate intermediate transition
}

// Panowalk Class - Methods
CPanowalk.prototype = {
// constructor to declare data
    constructor: CPanowalk,
    // initialize panorama walkthrough
    initialize: function (cSettings) {
        // load panoverse data
        this.loadData(cSettings);

        // add perspective camera to view the 3D scene
        this.m_cCamera = new THREE.PerspectiveCamera(
                this.m_rFOV, cSettings.aspect, 0.1, 4000.0);
        this.m_cCamera.vTarget = new THREE.Vector3();

        // create empty scene graph
        this.m_cContainer = new THREE.Object3D();

        // set model
        this.m_cModel = this.m_cPanoverse.get3DModel();

        // add 3d model to container
        //this.m_cContainer.add(this.m_cModel);

        this.m_cSphere = new THREE.Object3D();
        for (var i = 0; i < this.m_cPanoverse.m_aPanoSpheres.length; i++)
        {
            if (this.m_cPanoverse.isValidNode(i))
            {
                this.m_cSphere.add(this.m_cPanoverse.getSphereByIndex(i).getSphereModel());
            }
        }

        // add sphere to container
        this.m_cContainer.add(this.m_cSphere);

        // add all markers to the marker container with visible = false
        this.initMarkers();

        // create raycaster to select markers
        this.m_cRaycaster = new THREE.Raycaster();

        // set sphere and camera for the first time
        this.initPosition();
    },
    // load panorama universe data from xml file
    loadData: function (cSettings) {
        // create instance of panorama universe
        this.m_cPanoverse = new CPanoverse();

        // parse xml files for Spheres and Galaxies
        var cPanoSInit = parseSphereProps(cSettings.strStoragePath, cSettings.urlSDataFile);
        var cPanoGInit = parseGalaxyProps(cSettings.strStoragePath, cSettings.urlGDataFile);

        // initialize panoverse with parsed data
        this.m_cPanoverse.initialize(cPanoSInit, cPanoGInit);

        // set sphere to galaxy inverted index
        if (g_cSystemSpecs.fUseGalaxy)
        {
            // traverse all valid galaxy IDs
            for (var i = 0; i < this.m_cPanoverse.m_aPanoGalaxies.length; i++) {
                if (this.m_cPanoverse.m_aPanoGalaxies[i]) {
                    // pass this galaxy id to its children spheres
                    for (var j = 0; j < this.m_cPanoverse.m_aPanoGalaxies[i].m_aiSpheres.length; j++) {
                        if (this.m_cPanoverse.m_aPanoSpheres[this.m_cPanoverse.m_aPanoGalaxies[i].m_aiSpheres[j]]) {
                            this.m_cPanoverse.m_aPanoSpheres[this.m_cPanoverse.m_aPanoGalaxies[i].m_aiSpheres[j]].setGalaxyId(i);
                        }
                    }
                }
            }
        }

        this.m_cPanoverse.moveToNode(this.m_cPanoverse.m_nStartNode);
    },
    initMarkers: function () {
        //load map only once
        var urlActiveMarkerImage = "./assets/texture/marker1.svg";              // url to the marker image
        var urlInactiveMarkerImage = "./assets/texture/marker1_hover.svg";      // url to hover marker image
        this.m_markerImages.inactive = THREE.ImageUtils.loadTexture(urlActiveMarkerImage);
        this.m_markerImages.active = THREE.ImageUtils.loadTexture(urlInactiveMarkerImage);
        var markerMaterial = new THREE.MeshBasicMaterial({
            map: this.m_markerImages.inactive,
            side: THREE.DoubleSide,
            opacity: 1,
            transparent: true
        });
        var markerGeometry = new THREE.PlaneBufferGeometry(1, 1);

        // create empty container for markers
        this.m_cMarkerContainer = new THREE.Object3D();

        // add markers to marker containner
        for (var i = 0; i < this.m_cPanoverse.m_aPanoSpheres.length; i++) {
            if (this.m_cPanoverse.isValidNode(i))
            {
                var marker = new THREE.Mesh(markerGeometry, markerMaterial.clone());//clone the already created material
                marker.scale.set(25, 25, 1);
                marker.position.set(
                        this.m_cPanoverse.getSphereByIndex(i).m_center.x,
                        this.m_cPanoverse.getSphereByIndex(i).m_center.y,
                        this.m_cPanoverse.getSphereByIndex(i).m_center.z - this.m_cPanoverse.m_rTripodHeight);

                marker.name = "marker";
                marker.visible = false;
                marker.node = i;
                this.m_cMarkerContainer.add(marker);
            }
        }

        // create empty container for HELP markers
        this.m_cFloatMarkerContainer = new THREE.Object3D();

        /*
         // load floating marker maps
         var urlFloatMarkerImage = "./assets/texture/click_arrow.png";               // url for floating marker image
         var mapFloatMarker = THREE.ImageUtils.loadTexture(urlFloatMarkerImage);
         var floatMarkerMaterial = new THREE.SpriteMaterial({
         map: mapFloatMarker,
         opacity: 0.5,
         transparent: true
         });
         
         // get start node and its connecting nodes
         var startNode = this.m_cPanoverse.getCurrentNode();
         var helpNodes = this.m_cPanoverse.getConnectingNodes(startNode);
         // place help markers over connecting nodes of start node
         for (var i = 0; i < helpNodes.length; i++) {
         var floatMarker = new THREE.Sprite(floatMarkerMaterial.clone());
         floatMarker.scale.set(25, 50, 1);
         floatMarker.position.set(
         this.m_cPanoverse.getSphereByIndex(helpNodes[i]).m_center.x,
         this.m_cPanoverse.getSphereByIndex(helpNodes[i]).m_center.y,
         this.m_cPanoverse.getSphereByIndex(helpNodes[i]).m_center.z);
         this.m_cFloatMarkerContainer.add(floatMarker);
         }
         */
    },
    initPosition: function () {
        // set sphere
        var currentPanosphere = this.m_cPanoverse.getSphereByIndex(
                this.m_cPanoverse.getStartNode());

        // make current sphere
        currentPanosphere.getSphereModel().visible = true;

        // set camera to center of current sphere
        this.m_cCamera.position.set(currentPanosphere.m_center.x,
                currentPanosphere.m_center.y,
                currentPanosphere.m_center.z);

        // update camera orientation for start node
        this.m_rLatitude = 0;
        this.m_rLongitude = this.m_cPanoverse.getStartOrientation();
        this.updateRotation(0, 0);

        // update markers
        this.updateMarkers(this.m_cPanoverse.getStartNode());
    },
    getCamera: function () {
        return this.m_cCamera;
    },
    getObjectContainer: function () {
        return this.m_cContainer;
    },
    getMarkerContainer: function () {
        return this.m_cMarkerContainer;
    },
    getFloatMarkerContainer: function () {
        return this.m_cFloatMarkerContainer;
    },
    updateRotation: function (spinX, spinY) {
        // update latitude & longitude
        this.m_rLongitude += 90 * spinX;
        this.m_rLatitude += 90 * spinY;

        if (this.m_rLongitude > 180.0)
            this.m_rLongitude -= 360.0;
        if (this.m_rLongitude < -180.0)
            this.m_rLongitude += 360.0;
        this.m_rLatitude = Math.max(-60.0, Math.min(60.0, this.m_rLatitude));

        var phi = THREE.Math.degToRad(90.0 - this.m_rLatitude);
        var theta = THREE.Math.degToRad(-this.m_rLongitude);

        this.m_cCamera.vTarget.x = Math.sin(phi) * Math.sin(theta);
        this.m_cCamera.vTarget.y = Math.sin(phi) * Math.cos(theta);
        this.m_cCamera.vTarget.z = Math.cos(phi);
        this.m_cCamera.vTarget.add(this.m_cCamera.position);

        this.m_cCamera.up = new THREE.Vector3(0, 0, 1);

        this.m_cCamera.lookAt(this.m_cCamera.vTarget);
    },
    updateMarkers: function (iNode) {
        // get connecting nodes for the current sphere
        var connNodes = this.m_cPanoverse.getConnectingNodes(iNode);

        // make current markers visible and the rest invisible
        for (var i = 0; i < this.m_cMarkerContainer.children.length; i++) {
            if (connNodes.indexOf(this.m_cMarkerContainer.children[i].node) > -1) {
                this.m_cMarkerContainer.children[i].visible = true;
            } else {
                this.m_cMarkerContainer.children[i].visible = false;
            }
        }
    },
    jumpToPosition: function (iNextNode) {
        // hold-off all interaction untill trasit animation is done
        if (this.m_fIsInTransit)
            return;

        // get references to current and next sphere
        this.m_cCurrSphere = this.m_cPanoverse.getCurrentSphere();
        this.m_cNextSphere = this.m_cPanoverse.getSphereByIndex(iNextNode);
        this.m_cNextSphere.loadSphere();
        
        // move to next node sphere
        if (!this.m_cPanoverse.isValidNode(iNextNode))
            return;

        // wait for atleast the low res texture of the next sphere
        var ownObject = this;
        function jumpAction() {
            // update markers
            ownObject.updateMarkers(iNextNode);
            
            ownObject.m_cNextSphere.getSphereModel().visible = true;

            var nextCenter = ownObject.m_cNextSphere.m_center;
            ownObject.m_cCamera.position.set(nextCenter.x, nextCenter.y, nextCenter.z);

            //update camera orientation
            ownObject.updateRotation(0, 0);

            ownObject.m_cCurrSphere.getSphereModel().visible = false;

            // move to next node sphere
            ownObject.m_cPanoverse.moveToNode(iNextNode);
        }

        var callBack = jumpAction;

        var arg1 = this.m_cNextSphere.getTexLoadStatus();
        waitForCondition(arg1, true, callBack);
    },
    animatePanorama: function (deltaT) {
        // animate camera if in transit
        if (this.m_fTransitAnim)
        {
            this.m_rTime += Math.min(deltaT, 25) / 1500;
            if (this.m_rTime >= 1.0)
            {
                // end of transit animation
                this.m_fTransitAnim = false;
                this.endTransit();
                return;
            }

            var rLambda = easingQadraticInOut(this.m_rTime, 0.0, 1.0, 1.0);
            //console.log(rLambda);

            this.m_cNextSphere.getSphereModel().children[0].material.opacity = rLambda;

            var cCameraPos = new THREE.Vector3();
            cCameraPos.copy(this.m_vGrad);
            cCameraPos.multiplyScalar(rLambda);
            cCameraPos.add(this.m_vInit);
            this.m_cCamera.position.set(cCameraPos.x, cCameraPos.y, cCameraPos.z);
        }
    },
    startTransit: function (iCurrNode, iNextNode) {
        // get details of each sphere
        this.m_cCurrSphere = this.m_cPanoverse.getSphereByIndex(iCurrNode);
        var currCenter = this.m_cCurrSphere.m_center;
        this.m_cNextSphere = this.m_cPanoverse.getSphereByIndex(iNextNode);
        var nextCenter = this.m_cNextSphere.m_center;

        // compute baloon scale of each sphere
        var rCurrScaleFactor = 2.01 * currCenter.distanceTo(nextCenter) /
                this.m_cCurrSphere.m_nSphereRadius;
        var rNextScaleFactor = 1.0 * nextCenter.distanceTo(currCenter) /
                this.m_cNextSphere.m_nSphereRadius;

        // move to next node sphere
        //this.m_cPanoverse.moveToNode(this.m_cNextSphere.m_nSphereId);

        // wait for atleast the low res texture of the next sphere
        var ownObject = this;
        function jumpAction() {
            // ballon-up the spheres
            ownObject.m_cCurrSphere.getSphereModel().children[0].scale.set(
                    rCurrScaleFactor, rCurrScaleFactor, rCurrScaleFactor);
            ownObject.m_cNextSphere.getSphereModel().children[0].scale.set(
                    rNextScaleFactor, rNextScaleFactor, rNextScaleFactor);

            // initialize both sphere states
            //ownObject.m_cCurrSphere.getSphereModel().children[0].material.opacity = 1.0;
            //ownObject.m_cCurrSphere.getSphereModel().children[0].material.transparent = true;
            ownObject.m_cNextSphere.getSphereModel().children[0].material.transparent = true;
            ownObject.m_cNextSphere.getSphereModel().children[0].material.opacity = 0.0;
            ownObject.m_cNextSphere.getSphereModel().visible = true;

            // compute animation vectors
            ownObject.m_vInit.copy(currCenter);
            ownObject.m_vGrad.subVectors(nextCenter, currCenter);
            ownObject.m_rTime = 0.0;

            // set transit flag
            ownObject.m_fTransitAnim = true;
        }

        var callBack = jumpAction;

        var arg1 = this.m_cNextSphere.getTexLoadStatus();
        waitForCondition(arg1, true, callBack);
    },
    endTransit: function () {
        // set camera to center of current sphere
        this.m_cCamera.position.set(this.m_cNextSphere.m_center.x,
                this.m_cNextSphere.m_center.y,
                this.m_cNextSphere.m_center.z);

        //update camera orientation
        this.updateRotation(0, 0);

        // finalize both sphere states
        this.m_cNextSphere.getSphereModel().children[0].scale.set(1.0, 1.0, 1.0);
        this.m_cNextSphere.getSphereModel().children[0].material.opacity = 1.0;
        this.m_cNextSphere.getSphereModel().children[0].material.transparent = false;
        this.m_cCurrSphere.getSphereModel().visible = false;
        this.m_cCurrSphere.getSphereModel().children[0].scale.set(1.0, 1.0, 1.0);
        //this.m_cCurrSphere.getSphereModel().children[0].material.opacity = 1.0;
        //this.m_cCurrSphere.getSphereModel().children[0].material.transparent = false;
        
        // move to next node sphere: moved to beginning of start transit for jitter free transition
        this.m_cPanoverse.moveToNode(this.m_cNextSphere.m_nSphereId);
        
        // reset transit flag
        this.m_fIsInTransit = false;
    },
    moveToPosition: function (iNextNode) {
        // hold-off all interaction untill trasit animation is done
        if (this.m_fIsInTransit ||
                !this.m_cPanoverse.isValidMove(iNextNode) || // check for valid jump
                iNextNode === this.m_cPanoverse.getCurrentNode())       // not allow self jump
            return;

        // set transit flag
        this.m_fIsInTransit = true;

        // update new marker positions before transit animation
        this.updateMarkers(iNextNode);

        // begin transit phase
        this.startTransit(this.m_cPanoverse.getCurrentNode(), iNextNode);
    },
    selectMarker: function (clientX, clientY) {
        // hold-off all interaction untill trasit animation is done
        if (this.m_fIsInTransit)
            return;

        var vector = new THREE.Vector3(clientX, clientY, 0.5);
        vector.unproject(this.m_cCamera);

        this.m_cRaycaster.set(this.m_cCamera.position, vector.sub(this.m_cCamera.position).normalize());

        // the first 2 children are the ambient light and perspective camera
        var intersects = this.m_cRaycaster.intersectObjects(this.m_cMarkerContainer.children);
        if (intersects.length > 0 && intersects[0].object.visible === true) {
            if (this.m_cFloatMarkerContainer.children.length > 0)
                this.removeFloatMarkers();
            this.moveToPosition(intersects[0].object.node);
            return true;
        }
        return false;
    },
    removeFloatMarkers: function () {
        this.m_cFloatMarkerContainer.visible = false;
        this.m_cFloatMarkerContainer.children.length = 0;
    },
    highlightMarker: function (clientX, clientY) {
        // hold-off all interaction untill trasit animation is done
        if (this.m_fIsInTransit)
            return;

        var vector = new THREE.Vector3(clientX, clientY, 0.5);
        vector.unproject(this.m_cCamera);

        this.m_cRaycaster.set(this.m_cCamera.position, vector.sub(this.m_cCamera.position).normalize());

        var intersects = this.m_cRaycaster.intersectObjects(this.m_cMarkerContainer.children);
        if (intersects.length > 0 && intersects[0].object.visible === true) {
            if (this.m_highlightedMarker !== intersects[0].object) {
                if (this.m_highlightedMarker)
                    this.m_highlightedMarker.material.map = this.m_markerImages.inactive;
                this.m_highlightedMarker = intersects[0].object;
                this.m_highlightedMarker.material.map = this.m_markerImages.active;
            }
        } else {
            if (this.m_highlightedMarker)
                this.m_highlightedMarker.material.map = this.m_markerImages.inactive;
            this.m_highlightedMarker = null;
        }
    },
    turn: function (spinX, spinY)
    {
        // hold-off all interaction untill trasit animation is done
        if (this.m_fIsInTransit)
            return;

        this.updateRotation(spinX, spinY);
    },
    computeWalkDirection: function (clientX, clientY)
    {
        var direction = Math.atan(Math.tan(THREE.Math.degToRad(0.5 * this.m_cCamera.fov * this.m_cCamera.aspect)) * clientX);
        return THREE.Math.radToDeg(-direction); // anticlockwise is +ve
    },
    walk: function (walkDirection)
    {
        // hold-off all interaction untill trasit animation is done
        if (this.m_fIsInTransit)
            return;

        // current node
        var currCenter = this.m_cPanoverse.getCurrentSphere().m_center;
        var vCamDir = new THREE.Vector3(
                this.m_cCamera.vTarget.x - currCenter.x,
                this.m_cCamera.vTarget.y - currCenter.y, 0);

        // get connecting nodes for the current sphere
        var aConnNodes = this.m_cPanoverse.getConnectingNodes();

        // create array to store direction of connecting nodes
        var aNodeDistance = new Array();
        var aNodeDirection = new Array();

        // calculate relative direation of each connecting marker with camera direction
        for (var i = 0; i < aConnNodes.length; i++) {
            var nextCenter = this.m_cPanoverse.getSphereByIndex(parseInt(aConnNodes[i])).m_center;

            aNodeDistance[i] = currCenter.distanceTo(nextCenter);

            var vNodeDir = new THREE.Vector3(
                    nextCenter.x - currCenter.x,
                    nextCenter.y - currCenter.y, 0);
            aNodeDirection[i] = THREE.Math.radToDeg(vCamDir.angleTo(vNodeDir));
            var vNorm = new THREE.Vector3();
            vNorm.crossVectors(vCamDir, vNodeDir);
            aNodeDirection[i] *= Math.sign(vNorm.z);
        }

        // find closest matching node direction
        var iClosest = -1;
        var rClosest = 1000;
        for (var i = 0; i < aConnNodes.length; i++) {
            if (this.angleDistance(walkDirection, aNodeDirection[i]) < 30.0)
            {
                if (aNodeDistance[i] < rClosest) {
                    rClosest = aNodeDistance[i];
                    iClosest = i;
                }
            }
        }
        // hide float markers
        if (this.m_cFloatMarkerContainer.children.length > 0)
            this.removeFloatMarkers();

        // move to closest valid node
        if (iClosest > -1) {
            this.moveToPosition(aConnNodes[iClosest]);
        }
    },
    angleDistance: function (angle1, angle2) {
        var dist = Math.abs(angle2 - angle1);
        if (dist > 180.0)
            dist = 360.0 - dist;

        return dist;
    },
    jumpToGalaxy: function (iGalaxy) {
        if (this.m_fIsInTransit)
            return;
        
        iGalaxy = this.m_cPanoverse.getToStartGalaxyId(iGalaxy);
        var iStartSphere = this.m_cPanoverse.m_aPanoGalaxies[iGalaxy].m_nStartSphere;
        this.m_rLatitude = 0;
        this.m_rLongitude = this.m_cPanoverse.m_aPanoGalaxies[iGalaxy].m_rStartOrientation;
        this.jumpToPosition(iStartSphere);
    },
    onUpdateGalaxy: function (onUpdateGalaxyFn) {
        this.m_cPanoverse.onUpdateGalaxy(onUpdateGalaxyFn);
    },
    updateGalaxyInfo: function () {
        this.m_cPanoverse.updateGalaxyInfo();
    }
};
