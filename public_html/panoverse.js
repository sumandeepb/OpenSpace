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
 * OpenSpace Viewer: Panoverse module source
 * Author: sumandeep.banerjee@gmail.com
 */

"use strict";

// Panoverse Class - Data
function CPanoverse() {
    this.m_strTitle = "";                       // Title of listing
    this.m_url3DModel = null;                   // Url to 3D Model File
    this.m_c3DModel = null;                     // THREE.Mesh for 3D Model

    this.m_nNumNodes = 0;                       // Number of Sphere
    this.m_aPanoSpheres = [];                   // Array of PanoSpheres
    this.m_aaConnectionGraph = [];              // Connection Graph
    this.m_iCurrentNode = 0;                    // Current Node Number

    this.m_nNumGalaxies = 0;                    // number of galaxies
    this.m_aPanoGalaxies = [];                  // array of galaxies
    this.m_iCurrentGalaxy = 0;                  // current galaxy id

    this.m_nRootGalaxy = 0;                     // index of root galaxy
    this.m_startGalaxy = 0;                     // index of starting galaxy
    this.m_nStartNode = 0;                      // index of starting node
    this.m_rStartOrientation = 0.0;             // orientation of start node in DEG

    this.m_rTripodHeight = 150;                 // height of sphere from ground plane
}

// Panoverse Class - Methods
CPanoverse.prototype = {
    // constructor to declare data
    constructor: CPanoverse,
    //initialise the Panoverse
    initialize: function (cPanoSInit, cPanoGInit) {
        this.m_url3DModel = cPanoSInit.url3DModel;
        //var meshLoader = new THREE.OBJLoader();
        //this.m_c3DModel = createOBJMesh(meshLoader, this.m_url3DModel);

        this.m_nNumNodes = cPanoSInit.nNumNodes;
        this.m_aPanoSpheres = cPanoSInit.aPanoSpheres;
        this.m_aaConnectionGraph = cPanoSInit.aaConnectionGraph;

        if (g_cSystemSpecs.fUseGalaxy) {
            this.m_nNumGalaxies = cPanoGInit.nNumGalaxies;
            this.m_aPanoGalaxies = cPanoGInit.aPanoGalaxies;

            // for the time being, galaxy 0 is considered as root node
            this.m_nRootGalaxy = 0;
            // recursively get to the first non-virtual galaxy
            this.m_nStartGalaxy = this.getToStartGalaxyId(this.m_nRootGalaxy);
            // get start sphere of start galaxy
            this.m_nStartNode = this.m_aPanoGalaxies[this.m_nStartGalaxy].m_nStartSphere;
            // get start orientation of start galaxy
            this.m_rStartOrientation = this.m_aPanoGalaxies[this.m_nStartGalaxy].m_rStartOrientation;
            // set current galaxy and node
            this.m_iCurrentGalaxy = this.m_nStartGalaxy;
            this.m_iCurrentNode = this.m_nStartNode;
        }
        else {
            this.m_nStartNode = cPanoSInit.nStartNode;
            this.m_rStartOrientation = cPanoSInit.rStartOrientation;
            this.m_iCurrentNode = this.m_nStartNode;
        }

        // load the first spere
        this.m_aPanoSpheres[this.m_nStartNode].loadSphere();

        this.m_rTripodHeight = cPanoSInit.rTripodHeight;
    },
    // function to return an instance of the 3D Model itself
    get3DModel: function () {
        return this.m_c3DModel;
    },
    // function to return start node
    getStartNode: function () {
        return this.m_nStartNode;
    },
    // function to return start orientation
    getStartOrientation: function () {
        return this.m_rStartOrientation;
    },
    // function to return an ARRAY OF NODES connected to the current node
    getConnectingNodes: function (iNode) {
        if (undefined === iNode)
        {
            iNode = this.m_iCurrentNode;
        }
        if (this.isValidNode(iNode))
        {
            return this.m_aaConnectionGraph[iNode];
        }
    },
    // function to return the current node number
    getCurrentNode: function () {
        return this.m_iCurrentNode;
    },
    // function to get instance of the CURRENT SPHERE
    getCurrentSphere: function () {
        return this.m_aPanoSpheres[this.m_iCurrentNode];
    },
    // function to get instance of any sphere by index
    getSphereByIndex: function (iNode) {
        if (this.isValidNode(iNode)) {
            return this.m_aPanoSpheres[iNode];
        }
    },
    // check for a valid node in graph
    isValidNode: function (iNode) {
        return (0 <= iNode && this.m_aPanoSpheres.length > iNode && undefined !== this.m_aPanoSpheres[iNode]);
    },
    // check for valid transit move based on connection graph
    isValidMove: function (iNextNode) {
        return (this.isValidNode(iNextNode)
                && this.m_aaConnectionGraph[this.m_iCurrentNode].slice().indexOf(iNextNode) > -1);
    },
    // move to next node
    moveToNode: function (iNextNode) {
        if (this.isValidNode(iNextNode)) { // change: check valid move
            // unload the spheres
            var dNodeSet = this.getDisjointNodes(iNextNode, this.m_iCurrentNode);
            this.unloadSpheres(dNodeSet);

            // update node and galaxy if it changed
            this.m_iCurrentNode = iNextNode;
            var iNextGalaxy = this.m_aPanoSpheres[iNextNode].m_nGalaxyId;
            if (iNextGalaxy !== this.m_iCurrentGalaxy) {
                this.m_iCurrentGalaxy = iNextGalaxy;
                this.updateGalaxyInfo();
            }

            // load the further connected nodes from iNextNode
            //this.m_aPanoSpheres[iNextNode].loadSphere();
            this.loadConnectingSpheres(iNextNode);

            return true;
        } else {
            return false;
        }
    },
    //function to load spheres which are connected to the current sphere
    loadConnectingSpheres: function (iNode) {
        for (var sphere = 0; sphere < this.m_aaConnectionGraph[iNode].length; sphere++) {
            this.m_aPanoSpheres[this.m_aaConnectionGraph[iNode][sphere]].loadSphere();
        }
    },
    getDisjointNodes: function (iNextNode, iCurrentNode) {
        /*if (iNextNode === iCurrentNode) {
         return [];
         }
         var pConnections = this.m_aaConnectionGraph[iCurrentNode].slice();
         var nConnections = this.m_aaConnectionGraph[iNextNode].slice();
         
         // remove the next sphere connection from the graph
         var index = pConnections.indexOf(iNextNode);
         if (index > -1) {
         pConnections.splice(index, 1);
         }
         
         var dNodeSet = pConnections.filter(function (n) {
         return !(nConnections.indexOf(n) > -1);
         });*/

        var dNodeSet = this.m_aaConnectionGraph[iNextNode].slice();
        dNodeSet.push(iCurrentNode, iNextNode);

        return dNodeSet;
    },
    unloadSpheres: function (dNodeSet) {
        for (var iNode = 0; iNode < this.m_aPanoSpheres.length; iNode++) {
            if (undefined !== this.m_aPanoSpheres[iNode]) {
                if (dNodeSet.indexOf(iNode) < 0) {
                    this.m_aPanoSpheres[iNode].unloadSphere();
                }
            }
        }
    },
    getToStartGalaxyId: function (rootNode) {
        // function to return the start galaxy of current galaxy
        var startGalaxyId = rootNode;
        var startSphereId;
        do {
            startSphereId = this.m_aPanoGalaxies[startGalaxyId].m_nStartSphere;
            startGalaxyId = this.m_aPanoGalaxies[startGalaxyId].m_nStartGalaxy;
        } while (startSphereId === -1)

        return startGalaxyId;
    },
    getRootGalaxy: function () {
        return this.m_aPanoGalaxies[this.m_nRootGalaxy];
    },
    onUpdateGalaxy: function (onUpdateGalaxyFn) {
        this.onUpdateGalaxyFn = onUpdateGalaxyFn;
    },
    updateGalaxyInfo: function () {
        if (this.onUpdateGalaxyFn) {
            var content = new Object();
            content.strPrimaryTitle = this.m_aPanoGalaxies[this.m_nRootGalaxy].m_strTitle;
            content.strPrimaryDescr = this.m_aPanoGalaxies[this.m_nRootGalaxy].m_strDescription;
            content.strPrimarySpecs = this.m_aPanoGalaxies[this.m_nRootGalaxy].m_aTags;
            content.strSecondTitle = this.m_aPanoGalaxies[this.m_iCurrentGalaxy].m_strTitle;
            content.strSecondDescr = this.m_aPanoGalaxies[this.m_iCurrentGalaxy].m_strDescription;
            content.strSecondSpecs = this.m_aPanoGalaxies[this.m_iCurrentGalaxy].m_aTags;
            content.iCurrentGalaxy = this.m_iCurrentGalaxy;
            content.aGalaxyRefs = this.getNextGalaxyRefs(this.m_iCurrentGalaxy);
            this.onUpdateGalaxyFn(content);
        }
    },
    getNextGalaxyRefs: function (iGalaxy) {
        // function to return the next set of galaxies to be displayed in tabs
        var aGalaxyRefs = this.getGalaxyChildren(iGalaxy);
        if (0 === aGalaxyRefs.length) {
            aGalaxyRefs = this.getGalaxySiblings(iGalaxy);
        }
        return aGalaxyRefs;
    },
    getGalaxyChildren: function (iGalaxy) {
        // function to return an object containing the current galaxies children.
        var aGalaxyRefs = [];
        var children = this.m_aPanoGalaxies[iGalaxy].m_aiChildren;
        for (var i = 0; i < children.length; i++) {
            aGalaxyRefs.push({
                nGalaxyId: this.m_aPanoGalaxies[children[i]].m_nGalaxyId,
                strTitle: this.m_aPanoGalaxies[children[i]].m_strTitle
            });
        }
        return aGalaxyRefs;
    },
    getGalaxySiblings: function (iGalaxy) {
        // function to return an object containing the current galaxies siblings
        var aGalaxyRefs = [];
        var parentId = this.m_aPanoGalaxies[iGalaxy].m_nParentId;
        var siblings = this.m_aPanoGalaxies[parentId].m_aiChildren;
        for (var i = 0; i < siblings.length; i++) {
            aGalaxyRefs.push({
                nGalaxyId: this.m_aPanoGalaxies[siblings[i]].m_nGalaxyId,
                strTitle: this.m_aPanoGalaxies[siblings[i]].m_strTitle
            });
        }
        return aGalaxyRefs;
    }
};
