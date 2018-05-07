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
 * OpenSpace Viewer: Utility functions
 * Author: sumandeep.banerjee@gmail.com
 */

"use strict";

function getSystemSpecs() {
    //window.navigator.appName;
    //window.navigator.appVersion;
    //window.navigator.platform;
    //window.navigator.userAgent;

    var DevType = '';
    var OSName = '';

    var platform = window.navigator.platform.toLowerCase();
    if (platform.match(/ipad/i) ||
            platform.match(/iphone/i) ||
            platform.match(/ipod/i) ||
            platform.match(/pike/i)) {
        DevType = 'Mobile';
        OSName = 'iOS';
    }
    else if (platform.match(/android/i) ||
            (platform.match(/linux/i) && (platform.match(/arm/i) || platform.match(/msm/i)))) {
        DevType = 'Mobile';
        OSName = 'Android';
    }
    else if (platform.match(/mac/i)) {
        DevType = 'PC';
        OSName = 'MacOS';
    }
    else if (platform.match(/linux/i) ||
            platform.match(/bsd/i)) {
        DevType = 'PC';
        OSName = 'Unix';
    }
    else if (platform.match(/win/i)) {
        DevType = 'PC';
        OSName = 'Windows';
    }
    else {
        DevType = platform;
        OSName = '';
    }

    console.log('Your are running ' + OSName + ' on ' + DevType + '.');
    return [DevType, OSName];
}

function getViewport() {
    var viewPortWidth;
    var viewPortHeight;

    // the more standards compliant browsers (mozilla/netscape/opera/IE7) use window.innerWidth and window.innerHeight
    if (typeof window.innerWidth !== undefined) {
        viewPortWidth = window.innerWidth;
        viewPortHeight = window.innerHeight;
    }
    // IE6 in standards compliant mode (i.e. with a valid doctype as the first line in the document)
    else if (typeof document.documentElement !== undefined
            && typeof document.documentElement.clientWidth !==
            undefined && document.documentElement.clientWidth !== 0) {
        viewPortWidth = document.documentElement.clientWidth;
        viewPortHeight = document.documentElement.clientHeight;
    }
    // older versions of IE
    else {
        viewPortWidth = document.getElementsByTagName('body')[0].clientWidth;
        viewPortHeight = document.getElementsByTagName('body')[0].clientHeight;
    }

    return [viewPortWidth, viewPortHeight];
}

// check for WebGL compatibility of browser
function isWebGLAvailable(canvas) {
    if (!window.WebGLRenderingContext) {
        // Browser has no idea what WebGL is. Suggest they
        // get a new browser by presenting the user with link to
        console.log("WebGL is not supported by your browser. Please install a compatible browser.");
        window.location = "http://get.webgl.org";
        return false;
    }

    if (!canvas.getContext("webgl") && !canvas.getContext('experimental-webgl')) {
        // Browser could not initialize WebGL. User probably needs to
        // update their drivers or get a new browser. Present a link to
        console.log("Browser failed to initialize WebGL. Please upgrade your graphics driver/browser.");
        window.location = "http://get.webgl.org";
        return false;
    }

    return true;
}

// wait untill condition becomes true
function waitForCondition(arg1, arg2, callBack) {
    if (arg1() === arg2) {
        callBack();
    }
    else {
        setTimeout(function () {
            waitForCondition(arg1, arg2, callBack);
        }, 250);
    }
}

function easingQadraticInOut(t, b, c, d) {
    t /= d / 2;
    if (t < 1)
        return c / 2 * t * t + b;
    t--;
    return -c / 2 * (t * (t - 2) - 1) + b;
}

// parse xml file and fill panospheres
function parseSphereProps(strStoragePath, urlSDataFile) {
    var cPanoSInit = new Object();

    $.ajax({
        type: "GET",
        url: urlSDataFile,
        dataType: "xml",
        async: false,
        success: function (xml) {
            var Url3DModel = xml.getElementsByTagName("Url3DModel")[0]; //url to the 3D Model
            var url3DModel = strStoragePath + (Url3DModel ? Url3DModel.childNodes[0].nodeValue : "");
            var NoOfSpheres = xml.getElementsByTagName("NoOfSpheres")[0];   // number of nodes/sphere
            var nNumNodes = parseInt(NoOfSpheres ? NoOfSpheres.childNodes[0].nodeValue : 0);
            var StartNode = xml.getElementsByTagName("StartNode")[0];   // starting node, default will be 0
            var nStartNode = parseInt(StartNode ? StartNode.childNodes[0].nodeValue : 0);
            var StartOrientation = xml.getElementsByTagName("StartOrientation")[0]; //starting node orientation
            var rStartOrientation = parseFloat(StartOrientation ? StartOrientation.childNodes[0].nodeValue : 0);
            var TripodHeight = xml.getElementsByTagName("TripodHeight")[0];
            var rTripodHeight = parseFloat(TripodHeight ? TripodHeight.childNodes[0].nodeValue : 150);
            var aSphereId = xml.getElementsByTagName("SphereID");       //sphereId of the sphere
            var aImagePath = xml.getElementsByTagName("ImagePath");     //Image path to the panorama
            var aMImagePath = xml.getElementsByTagName("MImagePath");
            var aLImagePath = xml.getElementsByTagName("LImagePath");
            var aCenterX = xml.getElementsByTagName("CenterX");         //array of X Coordinates of all spheres
            var aCenterY = xml.getElementsByTagName("CenterY");         //array of Y coordinates of all spheres
            var aCenterZ = xml.getElementsByTagName("CenterZ");         //array of Z coordinates of all spheres
            var aRadius = xml.getElementsByTagName("Radius");           // radius of sphere
            var aRotationX = xml.getElementsByTagName("RotationX");     //array of rotation angle about x
            var aRotationY = xml.getElementsByTagName("RotationY");     //array of rotation angle about y
            var aRotationZ = xml.getElementsByTagName("RotationZ");     //array of rotation angle about z
            var aConnections = xml.getElementsByTagName("Connections"); //array of connections of panospheres

            var aaConnectionGraph = []; //connectionGraph of the spheres
            var aPanoSpheres = []; //array of all PanoSpheres
            var cPanoSphere = null; //Single Panosphere instance
            for (var i = 0; i < nNumNodes; i++) {
                var cSphereInit = new Object();
                cSphereInit.nSphereId = (aSphereId[i] ? parseInt(aSphereId[i].childNodes[0].nodeValue) : 0);
                cSphereInit.urlSphereTex = strStoragePath + (aImagePath[i] ? aImagePath[i].childNodes[0].nodeValue : "");
                cSphereInit.urlMSphereTex = strStoragePath + (aMImagePath[i] ? aMImagePath[i].childNodes[0].nodeValue : "");
                cSphereInit.urlLSphereTex = strStoragePath + (aLImagePath[i] ? aLImagePath[i].childNodes[0].nodeValue : "");
                cSphereInit.center = new THREE.Vector3(
                        parseFloat(aCenterX[i] ? aCenterX[i].childNodes[0].nodeValue : 0),
                        parseFloat(aCenterY[i] ? aCenterY[i].childNodes[0].nodeValue : 0),
                        parseFloat(aCenterZ[i] ? aCenterZ[i].childNodes[0].nodeValue : 0));
                cSphereInit.rRadius = (aRadius[i] ? aRadius[i].childNodes[0].nodeValue : 25);
                cSphereInit.rotation = new THREE.Euler(
                        THREE.Math.degToRad(parseFloat(aRotationX[i] ? aRotationX[i].childNodes[0].nodeValue : 0)),
                        THREE.Math.degToRad(parseFloat(aRotationY[i] ? aRotationY[i].childNodes[0].nodeValue : 0)),
                        THREE.Math.degToRad(parseFloat(aRotationZ[i] ? aRotationZ[i].childNodes[0].nodeValue : 0)), "XYZ");
                // create new PanoSphere instances and initialize them with values from the xml file
                cPanoSphere = new CPanosphere();
                cPanoSphere.initialize(cSphereInit);
                //cPanoSphere.loadSphere(); // change : forced load of all spheres
                aPanoSpheres[cSphereInit.nSphereId] = cPanoSphere;
                // change: need to parse as integers
                aaConnectionGraph[cSphereInit.nSphereId] =
                        ((aConnections[i] && aConnections[i].childNodes[0] && ("" !== aConnections[i].childNodes[0].nodeValue.trim()))
                                ? aConnections[i].childNodes[0].nodeValue.trim().split(" ").map(Number) : []);
            }

            // create an object to return
            cPanoSInit.url3DModel = url3DModel;
            cPanoSInit.nNumNodes = nNumNodes;
            cPanoSInit.aaConnectionGraph = aaConnectionGraph;
            cPanoSInit.aPanoSpheres = aPanoSpheres;
            cPanoSInit.nStartNode = nStartNode;
            cPanoSInit.rStartOrientation = rStartOrientation;
            cPanoSInit.rTripodHeight = rTripodHeight;
        }
    });

    return cPanoSInit;
}

// parse xml file and fill panogalaxy
function parseGalaxyProps(strStoragePath, urlGDataFile) {
    var cPanoGInit = new Object();

    if (!g_cSystemSpecs.fUseGalaxy)
        return cPanoGInit;

    $.ajax({
        type: "GET",
        url: urlGDataFile,
        dataType: "xml",
        async: false,
        success: function (xml) {
            var NoOfGalaxies = xml.getElementsByTagName("NoOfGalaxies")[0];
            var nNumGalaxies = parseInt((NoOfGalaxies) ? NoOfGalaxies.childNodes[0].nodeValue : 0);
            var anGalaxyId = xml.getElementsByTagName("GalaxyID");
            var anParentId = xml.getElementsByTagName("ParentID");
            var aaiChildren = xml.getElementsByTagName("Children");
            var aaiSpheres = xml.getElementsByTagName("Spheres");
            var anStartGalaxy = xml.getElementsByTagName("StartGalaxy");
            var anStartSphere = xml.getElementsByTagName("StartSphere");
            var arStartOrientation = xml.getElementsByTagName("StartOrientation");
            var astrTitle = xml.getElementsByTagName("Title");
            var astrDescription = xml.getElementsByTagName("Description");
            var anTagValueCount = xml.getElementsByTagName("TagValueCount");
            var aaTags = xml.getElementsByTagName("TagValues");
            // array of panogalaxies
            var aPanoGalaxies = [];

            for (var i = 0; i < nNumGalaxies; i++) {
                var cGalaxyInit = new Object();
                cGalaxyInit.nGalaxyId = (anGalaxyId[i] ? parseInt(anGalaxyId[i].childNodes[0].nodeValue) : 0);
                cGalaxyInit.nParentId = (anParentId[i] ? parseInt(anParentId[i].childNodes[0].nodeValue) : 0);
                cGalaxyInit.aiChildren =
                        ((aaiChildren[i] && aaiChildren[i].childNodes[0] && ("" !== aaiChildren[i].childNodes[0].nodeValue.trim()))
                                ? aaiChildren[i].childNodes[0].nodeValue.trim().split(" ").map(Number) : []);
                cGalaxyInit.aiSpheres =
                        ((aaiSpheres[i] && aaiSpheres[i].childNodes[0] && ("" !== aaiSpheres[i].childNodes[0].nodeValue.trim()))
                                ? aaiSpheres[i].childNodes[0].nodeValue.trim().split(" ").map(Number) : []);
                cGalaxyInit.nStartGalaxy = (anStartGalaxy[i] ? parseInt(anStartGalaxy[i].childNodes[0].nodeValue) : 0);
                cGalaxyInit.nStartSphere = (anStartSphere[i] ? parseInt(anStartSphere[i].childNodes[0].nodeValue) : 0);
                cGalaxyInit.rStartOrientation = (arStartOrientation[i] ? parseFloat(arStartOrientation[i].childNodes[0].nodeValue) : 0);
                cGalaxyInit.strTitle = (astrTitle[i] ? astrTitle[i].childNodes[0].nodeValue.replace(/\"/g, '') : "");
                cGalaxyInit.strDescription = (astrDescription[i] ? astrDescription[i].childNodes[0].nodeValue.replace(/\"/g, '') : "");
                cGalaxyInit.nTagValueCount = (anTagValueCount[i] ? parseInt(anTagValueCount[i].childNodes[0].nodeValue) : 0);
                // reset aTagValues
                cGalaxyInit.aTags = {};
                for (var j = 1; j <= cGalaxyInit.nTagValueCount; j++) {
                    // formula to keep into account the carriage returns in xml is 1+2 * (j-1)
                    var k = 1 + 2 * (j - 1);
                    var key = ((aaTags[i] && aaTags[i].childNodes[k])
                            ? aaTags[i].childNodes[k].childNodes[0].childNodes[0].nodeValue.replace(/\"/g, '') : "");
                    var value = ((aaTags[i] && aaTags[i].childNodes[k])
                            ? aaTags[i].childNodes[k].childNodes[2].childNodes[0].nodeValue.replace(/\"/g, '') : "");
                    cGalaxyInit.aTags[key] = value;
                }
                // push into galaxy here
                var cPanoGalaxy = new CPanogalaxy();
                cPanoGalaxy.initialize(cGalaxyInit);
                aPanoGalaxies[cGalaxyInit.nGalaxyId] = cPanoGalaxy;
            }
            cPanoGInit.aPanoGalaxies = aPanoGalaxies;
            cPanoGInit.nNumGalaxies = nNumGalaxies;
        },
        error: function () {
            g_cSystemSpecs.fUseGalaxy = false;   // if cannot find or parse galaxy data, set flag accordingly
        }
    });

    return cPanoGInit;
}
