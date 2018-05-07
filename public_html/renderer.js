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
 * OpenSpace Viewer: Renderer module source
 * Author: sumandeep.banerjee@gmail.com
 */

"use strict";

// constant defines
Math.PI_2 = 0.5 * Math.PI;

// enable cross origin resource sharing (CORS)
THREE.ImageUtils.crossOrigin = '';

// Renderer Class - Data
function CRenderer() {
    this.m_nWidth = 320; // size of viewport width
    this.m_nHeight = 240; // size of viewport height
    this.m_xSceneColor = "#000000"; // background color

    this.m_cRenderer = null; // three.js WebGL renderer
    this.m_cScene = null; // three.js 3D Scene
    this.m_cCamera = null; // three.js camera reference
    this.m_cSceneGraph = null; // three.js Object3D Container
    this.m_cHUDScene = null; // three.js scene for the markers
    this.m_cHUDMarkers = null; // three.js Object3D Container for markers

    this.m_cPanowalk = null; // Panorama walkthrough
    this.m_isLoadingImageActive = false; // flag to store if loading image is on dispplay or not
}

// Renderer Class - Methods
CRenderer.prototype = {
// constructor to declare data
    constructor: CRenderer,
    // create renderer object and initialize settings
    initEngine: function (canvas) {
        // get canvas dimentions
        this.m_nWidth = canvas.width;
        this.m_nHeight = canvas.height;
        // create renderer
        this.m_cRenderer = (isWebGLAvailable(canvas)) ?
                (new THREE.WebGLRenderer({canvas: canvas, antialias: true, alpha: true})) :
                (new THREE.CanvasRenderer({canvas: canvas, antialias: true, alpha: true}));
        this.m_cRenderer.setClearColor(this.m_xSceneColor, 1);
        // set the viewport size
        this.m_cRenderer.setSize(this.m_nWidth, this.m_nHeight);
        // set rendering parameters
        this.m_cRenderer.setFaceCulling(THREE.CullFaceNone); // disable face culling
        // disable viewport auto clear to enable HUD overlay on 3D scene
        this.m_cRenderer.autoClear = false;
    },
    // create scene and add 3d resources
    setupScene: function (cSettings) {
        // create a new 3D scene
        this.m_cScene = new THREE.Scene();
        //create another scene for the markers
        this.m_cHUDScene = new THREE.Scene();
        // add ambient light to scene
        var light1 = new THREE.AmbientLight(0xFFFFFF);
        this.m_cScene.add(light1);

        // create panorama walkthrough
        this.m_cPanowalk = new CPanowalk();
        // initialize panorama walkthrough
        cSettings.aspect = this.m_nWidth / this.m_nHeight;
        this.m_cPanowalk.initialize(cSettings);
        // get camera reference
        this.m_cCamera = this.m_cPanowalk.getCamera();
        this.m_cScene.add(this.m_cCamera);
        // add the scene graph to our scene
        this.m_cSceneGraph = this.m_cPanowalk.getObjectContainer();
        this.m_cScene.add(this.m_cSceneGraph);
        //add camera to the HUD Scene as well
        this.m_cHUDScene.add(this.m_cCamera);
        // add markers to HUD scene
        this.m_cHUDMarkers = this.m_cPanowalk.getMarkerContainer();
        this.m_cHUDScene.add(this.m_cHUDMarkers);
    },
    // animate the scene
    animateScene: function (deltaT) {
        this.m_cPanowalk.animatePanorama(deltaT);
    },
    // render the scene
    displayScene: function () {
        // update the tween animations
        TWEEN.update();

        // render the scene
        this.m_cRenderer.clear();
        if (!this.m_isLoadingImageActive && !this.m_cPanowalk.m_cPanoverse.getCurrentSphere().m_fHighTexLoaded) {
            $("#spinner").fadeIn("slow");
            this.m_isLoadingImageActive = true;
        } else if (this.m_isLoadingImageActive && this.m_cPanowalk.m_cPanoverse.getCurrentSphere().m_fHighTexLoaded) {
            $("#spinner").fadeOut("slow");
            this.m_isLoadingImageActive = false;
        }
        this.m_cRenderer.render(this.m_cScene, this.m_cCamera);
        this.m_cRenderer.clearDepth();
        this.m_cRenderer.render(this.m_cHUDScene, this.m_cCamera);
    },
    // if viewport is modified then update renderer and camera parameters
    updateScene: function (canvas) {
        // set canvas dimentions
        this.m_nWidth = canvas.width;
        this.m_nHeight = canvas.height;
        // set the viewport size
        this.m_cRenderer.setSize(this.m_nWidth, this.m_nHeight);
        // set camera aspect ratio
        this.m_cCamera.aspect = this.m_nWidth / this.m_nHeight;
        this.m_cCamera.updateProjectionMatrix();
    },
    // click on marker
    mouseClick: function (clientX, clientY) {
        var success = this.m_cPanowalk.selectMarker(
                (clientX / this.m_nWidth) * 2 - 1,
                -(clientY / this.m_nHeight) * 2 + 1);
        if (false === success)
        {
            this.mouseDblClick(clientX, clientY);
        }
    },
    // click on marker
    mouseDblClick: function (clientX, clientY) {
        var direction = this.m_cPanowalk.computeWalkDirection(
                (clientX / this.m_nWidth) * 2 - 1,
                0);
        this.m_cPanowalk.walk(direction);
    },
    // mouseover for highlighting the markers
    mouseMove: function (clientX, clientY) {
        this.m_cPanowalk.highlightMarker(
                (clientX / this.m_nWidth) * 2 - 1,
                -(clientY / this.m_nHeight) * 2 + 1);
    },
    // spin model
    mouseDrag: function (dragX, dragY) {
        this.m_cPanowalk.turn(dragX / this.m_nWidth, dragY / this.m_nHeight);
    },
    // panorama walk using keyboard
    modelWalk: function (keyCode) {
        switch (keyCode) {
            case(g_LEFTKEY):
                this.m_cPanowalk.turn(1 / 90, 0);
                break;
            case(g_RIGHTKEY):
                this.m_cPanowalk.turn(-1 / 90, 0);
                break;
            case(g_UPKEY):
                this.m_cPanowalk.walk(0);
                break;
            case(g_DOWNKEY):
                this.m_cPanowalk.walk(180);
                break;
            default:
                break;
        }
    },
    jumpToGalaxy: function (iGalaxy) {
        this.m_cPanowalk.jumpToGalaxy(iGalaxy);
    },
    onUpdateGalaxy: function (onUpdateGalaxyFn) {
        this.m_cPanowalk.onUpdateGalaxy (onUpdateGalaxyFn);
    },
    updateGalaxyInfo: function () {
        this.m_cPanowalk.updateGalaxyInfo();
    }
};
