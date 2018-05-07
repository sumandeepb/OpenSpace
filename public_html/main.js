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
 * OpenSpace Viewer: Main module source
 * Author: sumandeep.banerjee@gmail.com
 */

"use strict";

var g_htmlCanvas;
var g_cRenderer = null;
var g_cSystemSpecs = new Object();

// start WebGL script when browser is ready
$(document).ready(
        function webGLMain()
        {
            // parse query string
            var strUserName = "local-test";
            var strItemCode = "";
            var strMetaDataFlag = "f";

            var strPageURL = window.location.search.substring(1);
            var strURLVariables = strPageURL.split('&');

            // parse each variable
            for (var i = 0; i < strURLVariables.length; i++) {
                var strParamRecord = strURLVariables[i].split('=');
                // test each variable name and assign data
                switch (strParamRecord[0])
                {
                    case ("un"):
                        strUserName = strParamRecord[1];
                        break;
                    case ("ic"):
                        strItemCode = strParamRecord[1];
                        break;
                    case ("md"):
                        strMetaDataFlag = strParamRecord[1];
                        break;
                }
            }

            // select resource path
            var strStoragePath = "";
            var strUserString = "";
            switch (strUserName)
            {
                case("web-test"):
                    strStoragePath = "https://web.resource.path/";
                    strUserString = "WebTest";
                    break;
                case("local-test"):
                default:
                    strStoragePath = "./assets/models/";
                    strUserString = "LocalTest";
                    break;
            }

            // create file paths & other parameters
            var cSettings = new Object();
            cSettings.strStoragePath = strStoragePath + strItemCode + "/";
            cSettings.urlSDataFile = cSettings.strStoragePath + "SphereProps.xml";
            cSettings.urlGDataFile = cSettings.strStoragePath + "GalaxyProps.xml";

            // detect system specifications
            var systemSpecs = getSystemSpecs();
            g_cSystemSpecs.fIsFullScreen = false;
            g_cSystemSpecs.fUseGalaxy = false;
            g_cSystemSpecs.strDevType = systemSpecs[0];
            g_cSystemSpecs.strOSName = systemSpecs[1];

            switch (strMetaDataFlag)
            {
                case ("t"):
                    g_cSystemSpecs.fUseGalaxy = true;
                    break;
                case ("f"):
                default:
                    g_cSystemSpecs.fUseGalaxy = false;
                    break;
            }

            // get html5 3D canvas context
            g_htmlCanvas = document.getElementById("main-canvas");

            // set the canvas size
            var viewport = getViewport();
            g_htmlCanvas.width = viewport[0];
            g_htmlCanvas.height = viewport[1];

            // create, initialize and set-up Renderer
            g_cRenderer = new CRenderer();
            g_cRenderer.initEngine(g_htmlCanvas);
            g_cRenderer.setupScene(cSettings);

            // add UI buttons
            //dirty solution to get the correct context, change it!!
            var container1 = document.getElementsByTagName("body")[0];
            var container2 = document;
            initLogo();
            initPromptMessage();
            initFullScreen(container1, container2);
            initInfoButton();
            initSplashMessage();

            // Start listening to user events
            window.addEventListener('resize', onWindowResize, false);
            g_htmlCanvas.addEventListener('contextmenu', onContextMenu, false);
            window.addEventListener("keydown", onKeyDown, true);
            g_htmlCanvas.addEventListener('mousewheel', onMouseWheel, false);
            g_htmlCanvas.addEventListener('mousemove', onMouseMove, false);
            //g_htmlCanvas.addEventListener('mousedown', onMouseDown, false);
            //g_htmlCanvas.addEventListener('mouseup', onMouseUp, false);
            //g_htmlCanvas.addEventListener('click', onMouseClick, false);
            //g_htmlCanvas.addEventListener('dblclick', onMouseDblClick, false);
            document.addEventListener("fullscreenerror", function () {
                console.log("OOps!!");
            });

            // create an instance of Hammer
            var touch = new Hammer.Manager(g_htmlCanvas);
            var pan = new Hammer.Pan({direction: Hammer.DIRECTION_ALL});        // Pan recognizer
            var singletap = new Hammer.Tap({event: 'singletap'});               // Single tap recognizer
            touch.add([pan, singletap]);

            // listen to touch events...
            touch.on("pan singletap", onTouch);

            if (g_cSystemSpecs.fUseGalaxy) {
                // render metadata UI
                initMetadataUILayer(g_htmlCanvas);
            }
            else {
                // disable metadata UI
                $("#left-pane, #bottom-pane").css('visibility', 'hidden');
                // create title string instead of metadata UI
                $("#title").text(strUserString + " : " + strItemCode);
            }

            // run the rendering loop
            runProcessLoop();
        }
);

// animation timing parameters
var g_prevTime = 0.0;

// infinite loop to poll the rendering routine
function runProcessLoop(currTime)
{
    requestAnimationFrame(runProcessLoop);

    // track time
    var deltaT = currTime - g_prevTime;  // mili-second
    g_prevTime = currTime;

    // animate the scene
    g_cRenderer.animateScene(deltaT);

    // render the scene
    g_cRenderer.displayScene();
}

function initLogo() {
    var img = document.createElement("IMG");
    img.src = "./assets/texture/logo.svg";
    img.width = '40';
    img.height = '40';
    document.getElementById("logo").appendChild(img);

    $("#logo").click(function () {
        $("#prompt-box").css('opacity', '1');
        $("#prompt-box").css('display', 'block');
    });
}

var g_strPromptMessage = "<div id='prompt-close'><img src='./assets/texture/close_round.svg' /></div>"
        + "<div id='prompt-title'>About</div>"
        + "<table style='margin-left: 20px; margin-top: 20px; margin-right: 20px;'>"
        + "<td style='width: 64px;'><figure><img src= './assets/texture/logo.svg' /></figure></td>"
        + "<td style='padding-left: 10px; text-align: left;'>OpenSpace Viewer<br>";

function initPromptMessage() {
    $("#prompt-box").css('display', 'none');
    $("#prompt-box").html(g_strPromptMessage);

    $("#prompt-close").click(function () {
        $("#prompt-box").animate({
            opacity: '0'
        }, 500, function () {
            //$("#prompt-box").css('display', 'none');
        });

        $("#prompt-box").effect("transfer", {
            to: "#logo", className: "ui-effects-transfer"
        }, 500, function () {
            $("#prompt-box").css('display', 'none');
        });
    });
}

var g_strHelpMessage = "";
var g_fSplashMsg = false;

function initInfoButton() {
    var img = document.createElement("IMG");
    img.src = "./assets/texture/info.svg";
    img.width = '32';
    img.height = '32';
    document.getElementById("info-button").appendChild(img);

    $("#info-button").click(function () {
        g_fSplashMsg = true;
        $("#splashMessage-box").css('opacity', '1');
        $("#splashMessage-box").css('display', 'block');
    });
}

function initSplashMessage() {
    g_strHelpMessage = ('Mobile' === g_cSystemSpecs.strDevType)
            ? "<div id='splash-close'><img src='./assets/texture/close_round.svg' /></div>"
            + "<div id='splashMessage-title'>Navigation Hints</div>"
            + "<table><tr><td><figure><img src= './assets/texture/swipe.svg' /><figcaption>Pan/Swipe to Look Around</figcaption></figure></td>"
            + "<td><figure><img src= './assets/texture/singletap.svg' /><figcaption>Tap to Move to Location</figcaption></figure></td></tr>"
            + "<tr><td><figure><img src= './assets/texture/arrowkeys.svg' /><figcaption>Use Arrow Keys to Navigate</figcaption></figure></td>"
            + "<td><figure><img src= './assets/texture/marker1.svg' /><figcaption>Click on Marker to Jump to Location</figcaption></figure></td></tr></table>"
            : "<div id='splash-close'><img src='./assets/texture/close_round.svg' /></div>"
            + "<div id='splashMessage-title'>Navigation Hints</div>"
            + "<table><tr><td><figure><img src= './assets/texture/clickdrag.svg' /><figcaption>Left Click and Drag to Look Around</figcaption></figure></td>"
            + "<td><figure><img src= './assets/texture/leftclick.svg' /><figcaption>Left Click to Move to Location</figcaption></figure></td></tr>"
            + "<tr><td><figure><img src= './assets/texture/arrowkeys.svg' /><figcaption>Use Arrow Keys to Navigate</figcaption></figure></td>"
            + "<td><figure><img src= './assets/texture/marker1.svg' /><figcaption>Click on Marker to Jump to Location</figcaption></figure></td></tr></table>";
    g_fSplashMsg = true;
    $("#splashMessage-box").html(g_strHelpMessage);
    $("#splash-close").click(onCloseSplashMsg);
    setTimeout(onCloseSplashMsg, 5000);
}

function onCloseSplashMsg() {
    if (g_fSplashMsg) {
        g_fSplashMsg = false;
    }
    else {
        return;
    }

    $("#splashMessage-box").animate({
        opacity: '0'
    }, 500, function () {
        //$("#splashMessage-box").css('display', 'none');
    });

    $("#splashMessage-box").effect("transfer", {
        to: "#info-button", className: "ui-effects-transfer"
    }, 500, function () {
        $("#splashMessage-box").css('display', 'none');
    });
}

$(document).on("fullscreenchange webkitfullscreenchange mozfullscreenchange MSFullscreenChange", function () {
    if (!g_cSystemSpecs.fIsFullScreen) {
        document.getElementById("fullScreen-icon").src = "./assets/texture/fullscreen_exit.svg";
        document.getElementById("fullScreen-button").title = "Exit Fullscreen";
        g_cSystemSpecs.fIsFullScreen = true;
    } else {
        //exitFullScreen();
        document.getElementById("fullScreen-icon").src = "./assets/texture/fullscreen.svg";
        document.getElementById("fullScreen-button").title = "View Fullscreen";
        g_cSystemSpecs.fIsFullScreen = false;
    }
});

function initFullScreen(container1, container2) {
    var img = document.createElement("IMG");
    img.id = "fullScreen-icon";
    img.src = "./assets/texture/fullscreen.svg";
    img.width = '32';
    img.height = '32';
    document.getElementById("fullScreen-button").appendChild(img);

    $("#fullScreen-button").click(function () {
        if (!g_cSystemSpecs.fIsFullScreen)
        {
            if (container1.requestFullscreen) {
                container1.requestFullscreen();
            } else if (container1.msRequestFullscreen) {
                container1.msRequestFullscreen();
            } else if (container1.mozRequestFullScreen) {
                container1.mozRequestFullScreen();
            } else if (container1.webkitRequestFullscreen) {
                container1.webkitRequestFullscreen();
            }
        }
        else
        {
            if (container2.exitFullscreen) {
                container2.exitFullscreen();
            } else if (container2.webkitExitFullscreen) {
                container2.webkitExitFullscreen();
            } else if (container2.mozCancelFullScreen) {
                container2.mozCancelFullScreen();
            } else if (container2.msExitFullscreen) {
                container2.msExitFullscreen();
            }
        }
    });
}

// browser window is resized
function onWindowResize()
{
    // set the canvas size
    var viewport = getViewport();
    g_htmlCanvas.width = viewport[0];
    g_htmlCanvas.height = viewport[1];

    // update renderer size
    g_cRenderer.updateScene(g_htmlCanvas);

    if (g_cSystemSpecs.fUseGalaxy) {
        resizeBotomTab(g_htmlCanvas);
    }
}

// disable context menu
function onContextMenu(event)
{
    if (event.button === 2) {
        event.preventDefault();
        return false;
    }
}

// 3D content is loaded
function onLoadComplete()
{
    // refresh viewport
    $(window).trigger('resize');

    // remove the loading spinner animation
    $("#spinner").fadeOut("slow");
}

var g_LEFTKEY = 37;
var g_UPKEY = 38;
var g_RIGHTKEY = 39;
var g_DOWNKEY = 40;

// keypress event handler
function onKeyDown(event)
{
    if (event.keyCode >= 48 && event.keyCode <= 57) {
        event.preventDefault();
        g_cRenderer.m_cPanowalk.jumpToPosition(event.keyCode - 48);
        event.stopPropagation();
        return;
    }

    // interpret key commands
    switch (event.keyCode) {
        case(g_LEFTKEY):
        case(g_RIGHTKEY):
        case(g_UPKEY):
        case(g_DOWNKEY):
            event.preventDefault();
            g_cRenderer.modelWalk(event.keyCode);
            event.stopPropagation();
            break;
        default:
            break;
    }
}

// mouse move event handler
function onMouseMove(event) {
    g_cRenderer.mouseMove(event.clientX, event.clientY);
}

// mouse wheel scroll
function onMouseWheel(event)
{
    event.preventDefault();

    // measure wheel rotation
    var delta = 0;
    if (event.wheelDelta) { // WebKit / Opera / Explorer 9
        delta = event.wheelDelta;
    } else if (event.detail) { // Firefox
        delta = -event.detail;
    }

    // walk up and down using the wheel
    if (delta > 0)
    {
        g_cRenderer.modelWalk(g_UPKEY);
    }
    else if (delta < 0)
    {
        g_cRenderer.modelWalk(g_DOWNKEY);
    }
}

/*
 // mouse state parameters
 var g_fLeftMouseDown = false;
 var g_fMiddleMouseDown = false;
 var g_fRightMouseDown = false;
 
 // any mouse button is depressed
 function onMouseDown(event)
 {
 event.preventDefault();
 
 if (event.button === 0) // left button
 {
 g_fLeftMouseDown = true;
 }
 else if (event.button === 1) // middle button
 {
 g_fMiddleMouseDown = true;
 }
 else if (event.button === 2) // right button
 {
 g_fRightMouseDown = true;
 }
 }
 
 // any mouse button is released
 function onMouseUp(event)
 {
 event.preventDefault();
 
 if (event.button === 0) // left button
 {
 g_fLeftMouseDown = false;
 }
 else if (event.button === 1) // middle button
 {
 g_fMiddleMouseDown = false;
 }
 else if (event.button === 2) // right button
 {
 g_fRightMouseDown = false;
 }
 }
 
 // mouse click event handler
 function onMouseClick(event)
 {
 if (event.button === 0) {   // left click
 event.preventDefault();
 g_cRenderer.mouseClick(event.clientX, event.clientY);
 }
 }
 
 // mouse click event handler
 function onMouseDblClick(event)
 {
 if (event.button === 0) {   // left double click
 event.preventDefault();
 g_cRenderer.mouseDblClick(event.clientX, event.clientY);
 }
 }
 */

// touch parameters
var g_ptPrevPanShift = new Object();
var g_ptCurrPanShift = new Object();
var g_ptPrevSwipeShift = new Object();
var g_ptCurrSwipeShift = new Object();
var g_cSwipeTween = null;                 // look arround tween
var g_fSwipeIsOver = false;

// process hammer.js touch events
function onTouch(event)
{
    if ("pan" === event.type)
    {
        event.preventDefault();

        var speed = Math.abs(event.velocity);

        if (event.eventType === Hammer.INPUT_END && speed > 1.0)
        {
            // stop current tween
            if (g_cSwipeTween)
                g_cSwipeTween.stop();

            var speedFactorX = Math.max(1.0, 0.15 * Math.abs(event.velocityX));
            var speedFactorY = Math.max(1.0, 0.15 * Math.abs(event.velocityY));

            var source = {x: 0, y: 0};
            var target = {x: speedFactorX * event.deltaX, y: speedFactorY * event.deltaY / 2}; // y is divided by 2 because of latt(90) vs long(180) range
            g_ptPrevSwipeShift.x = source.x;
            g_ptPrevSwipeShift.y = source.y;

            g_cSwipeTween = new TWEEN.Tween(source).to(target, 3000)
                    .interpolation(TWEEN.Interpolation.Linear)
                    .delay(0)
                    .easing(TWEEN.Easing.Exponential.Out)
                    .repeat(0)
                    .start();

            g_cSwipeTween.onUpdate(function () {
                // 
                g_ptCurrSwipeShift.x = source.x;
                g_ptCurrSwipeShift.y = source.y;

                // spin object
                g_cRenderer.mouseDrag(g_ptCurrSwipeShift.x - g_ptPrevSwipeShift.x,
                        g_ptCurrSwipeShift.y - g_ptPrevSwipeShift.y);

                //
                g_ptPrevSwipeShift.x = g_ptCurrSwipeShift.x;
                g_ptPrevSwipeShift.y = g_ptCurrSwipeShift.y;
            });

            g_fSwipeIsOver = true;
        }
        else
        {
            // determine position relative to window origin
            if (undefined === g_ptPrevPanShift.x || undefined === g_ptPrevPanShift.y)
            {
                g_ptPrevPanShift.x = 0;
                g_ptPrevPanShift.y = 0;
            }

            if (g_fSwipeIsOver)
            {
                // stop current tween
                if (g_cSwipeTween)
                    g_cSwipeTween.stop();

                g_ptPrevPanShift.x = event.deltaX;
                g_ptPrevPanShift.y = event.deltaY;
                g_fSwipeIsOver = false;
            }

            g_ptCurrPanShift.x = event.deltaX;
            g_ptCurrPanShift.y = event.deltaY;

            // spin object
            g_cRenderer.mouseDrag(g_ptCurrPanShift.x - g_ptPrevPanShift.x,
                    g_ptCurrPanShift.y - g_ptPrevPanShift.y);

            // save current data for next call
            g_ptPrevPanShift.x = g_ptCurrPanShift.x;
            g_ptPrevPanShift.y = g_ptCurrPanShift.y;

            if (event.eventType === Hammer.INPUT_END)
            {
                g_ptPrevPanShift.x = 0;
                g_ptPrevPanShift.y = 0;
            }
        }
    }
    else if ("singletap" === event.type)
    {
        event.preventDefault();
        g_cRenderer.mouseClick(event.center.x, event.center.y);
    }
}
