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
 * OpenSpace Viewer: Metadata module source
 * Author: sumandeep.banerjee@gmail.com
 */

"use strict";

var g_cUIContent = null;

function initMetadataUILayer(canvas) {
    // initial no of tabs
    g_nNUMDISPLAYTAGS = getNumDisplayTags(canvas);

    // add update callback function
    g_cRenderer.onUpdateGalaxy(updateMetadataInfo);
    // force call the first time
    g_cRenderer.updateGalaxyInfo();

    // enable user interaction
    onLeftPane();
    onBottomTabs();
}

function updateMetadataInfo(content) {
    // backup reference to the content
    g_cUIContent = content;
    initLeftPane(content);
    initBottomTabs(content);
}

// variables for left pane
var g_fIsLeftPaneIn = false;
var g_iPrimaryTag = 0;
var g_iSecondaryTag = 0;

function initLeftPane(content) {
    var htmlContent = null;

    // main content has current node info
    $("#primary-title").html(content.strPrimaryTitle);
    htmlContent = document.createElement("div");
    htmlContent.innerHTML = "<div class='leftDesc'>" + content.strPrimaryDescr + "</div>";
    var tags = content.strPrimarySpecs;
    for (var prop in tags) {
        htmlContent.innerHTML += "<div class='leftDesc'>" + prop + " : " + tags[prop] + "</div>";
    }
    $("#primary-content").html(htmlContent);

    $("#secondary-title").html(content.strSecondTitle);
    htmlContent = document.createElement("div");
    htmlContent.innerHTML = "<div class='leftDesc'>" + content.strSecondDescr + "</div>";
    var tags = content.strSecondSpecs;
    for (var prop in tags) {
        htmlContent.innerHTML += "<div class='leftDesc'>" + prop + " : " + tags[prop] + "</div>";
    }
    $("#secondary-content").html(htmlContent);
}

function animatePrimary() {
    var primaryChildren = $("#primary-content").children();

    $(primaryChildren[g_iPrimaryTag]).animate({
        opacity: 0
    }, 3000, function () {
        $(this).css('display', 'none');
        $(primaryChildren[g_iPrimaryTag]).css('opacity', '1');
        if (g_iPrimaryTag === (g_nNUMDISPLAYTAGS - 1)) {
            g_iPrimaryTag = 0;
        } else {
            g_iPrimaryTag += 1;
        }

        $(primaryChildren[g_iPrimaryTag]).css('display', 'block');
        animatePrimary();
    });
}

function animateSecondary() {
    var secondaryChildren = $("#secondary-content").children();

    $(secondaryChildren[g_iSecondaryTag]).animate({
        opacity: 0
    }, 3000, function () {
        $(this).css('display', 'none');
        $(secondaryChildren[g_iSecondaryTag]).css('opacity', '1');
        if (g_iSecondaryTag === (g_nNUMDISPLAYTAGS - 1)) {
            g_iSecondaryTag = 0;
        } else {
            g_iSecondaryTag += 1;
        }

        $(secondaryChildren[g_iSecondaryTag]).css('display', 'block');
        animateSecondary();
    });
}

function onLeftPane() {
    // set initial image for the arow
    $("#left-img").attr("src", "./assets/texture/arrow_left.svg");

    // add on click action to the arrow image
    $("#left-img").click(function () {
        if (!g_fIsLeftPaneIn) {
            // first shift the arrow image inwards by the width amount (CURRENTLY 8%)
            $("#left-img").css("right", "-16px");
            // animate the left pane to the left by its width
            $("#left-pane").animate({left: String(-$("#left-pane").width())}, 500);
            // change the arrow image to point right
            $("#left-img").attr("src", "./assets/texture/arrow_right.svg");
            g_fIsLeftPaneIn = true;
        } else {
            // first shift the arrow image outwards
            $("#left-img").css("right", "0px");
            // animate the left pane to the right by its width
            $("#left-pane").animate({left: "0px"}, 500);
            // change the arrow image to point right
            $("#left-img").attr("src", "./assets/texture/arrow_left.svg");
            g_fIsLeftPaneIn = false;
        }
    });
}

// variable for bottom pane
var g_nNUMDISPLAYTAGS = 1;
var g_nGAPRATIO = 4;
var g_nTABWIDTH = 0;
var g_nTABGAP = 0;

var g_currentTabGroup = [];      // array of tabs
var g_tabGroupInTransit = false; // flag for animation of tabs

var g_nLongTimer = 500;
var g_nShortTimer = 200;

function getNumDisplayTags(canvas) {
    var W = canvas.width - 200;
    var D = 120;
    var N = Math.floor((W - D) / ((g_nGAPRATIO + 1) * D / g_nGAPRATIO));
    return (N > 0) ? Math.min(N, 8) : 1;
}

function resizeBotomTab(canvas) {
    var N = getNumDisplayTags(canvas);

    if (N !== g_nNUMDISPLAYTAGS) {
        g_nNUMDISPLAYTAGS = Math.min(N, g_cUIContent.aGalaxyRefs.length);
        initBottomTabs(g_cUIContent);
    }
}

function initBottomTabs(content) {
    // create tab group
    g_currentTabGroup = [];
    var tabBar = $("#tab-holder");
    tabBar.empty();
    // create N tabs in tabBar
    var tab = null;
    var textHolder = null;
    // set the tab width
    g_nTABWIDTH = (100 * g_nGAPRATIO) / ((g_nGAPRATIO * g_nNUMDISPLAYTAGS) + g_nNUMDISPLAYTAGS - 1);
    //set right padding for the tabs based on 7 tabs + 6 gaps  = 100 %
    g_nTABGAP = (g_nNUMDISPLAYTAGS > 1) ? (100.0 - g_nNUMDISPLAYTAGS * g_nTABWIDTH) / (g_nNUMDISPLAYTAGS - 1) : 0;
    //console.log(g_nTABWIDTH + "," + g_nTABGAP);

    // center the tabs if 6 or less tabs need to be created
    var offset = (content.aGalaxyRefs.length < g_nNUMDISPLAYTAGS ?
            (45 - (15 / 2) * (content.aGalaxyRefs.length - 1)) : 0);

    // center offset position of selected galaxy tab
    var nCyclicShift = 0;
    for (var i = 0; i < content.aGalaxyRefs.length; i++) {
        // create a tab . To it add a text node. Add the tab to tabBar
        tab = document.createElement("div");
        textHolder = document.createElement("div");
        textHolder.innerHTML = content.aGalaxyRefs[i].strTitle;
        textHolder.setAttribute('class', 'tabtext');
        tab.appendChild(textHolder);
        tab.setAttribute('class', 'tab');
        tab.setAttribute('id', content.aGalaxyRefs[i].nGalaxyId);

        // make the tab distinct which represents the current galaxy
        if (content.aGalaxyRefs[i].nGalaxyId === content.iCurrentGalaxy) {
            nCyclicShift = i - (Math.floor((g_nNUMDISPLAYTAGS - 1) / 2));
            tab.style.opacity = "1";
        }
        //position the tabs
        tab.style.width = g_nTABWIDTH + "%";
        tab.style.left = (offset + i * (g_nTABWIDTH + g_nTABGAP)) + "%";

        // fill datastructure
        g_currentTabGroup.push(tab);

        // edit DOM
        tabBar.append(tab);

        // add onclick action to tabs to navigate
        tab.addEventListener("click", function () {
            if (Number(this.id) !== content.iCurrentGalaxy) {
                g_cRenderer.jumpToGalaxy(this.id);
            }
        });
    }

    // cycle the tabs to center current galaxy tab
    if (nCyclicShift < 0)
    {
        animateTabs("forward", Math.abs(nCyclicShift));
    }
    else
    {
        animateTabs("backward", Math.abs(nCyclicShift));
    }
}

function animateTabs(direction, count) {
    if (undefined === count)
        count = 1;

    if (0 === count)
        return;

    // 7 tabs + 6 gaps  = 100 %
    var animateOffset = g_nTABWIDTH + g_nTABGAP;

    switch (direction) {
        case "forward":
            if (g_currentTabGroup.length <= g_nNUMDISPLAYTAGS || g_tabGroupInTransit)
                return;
            // indicate that tabs are animating
            g_tabGroupInTransit = true;
            
            resetTabs("forward");
            var elem = null;
            for (var i = g_currentTabGroup.length - 1; i >= 0; i--) {
                elem = $(g_currentTabGroup[i]);
                if (i === 0) {
                    elem.animate({
                        left: "0%"
                    }, ((count > 1) ? g_nShortTimer : g_nLongTimer), function () {
                        // animation over
                        g_tabGroupInTransit = false;
                        // recursive animation
                        if (1 < count)
                            animateTabs(direction, --count);
                    });
                } else {
                    elem.animate({
                        left: (i) * animateOffset + "%"
                    }, ((count > 1) ? g_nShortTimer : g_nLongTimer));
                }
            }
            break;
        case "backward":
            // no animation if 7 or less than 7 nodes or already animating
            if (g_currentTabGroup.length <= g_nNUMDISPLAYTAGS || g_tabGroupInTransit)
                return;
            // indicate that tabs are animating
            g_tabGroupInTransit = true;

            var elem = null;
            for (var i = 0; i < g_currentTabGroup.length; i++) {
                elem = $(g_currentTabGroup[i]);
                if (i === (g_currentTabGroup.length - 1)) {
                    elem.animate({
                        left: (i - 1) * animateOffset + "%"
                    }, ((count > 1) ? g_nShortTimer : g_nLongTimer), function () {
                        resetTabs("backward");
                        // animation over
                        g_tabGroupInTransit = false;
                        // recursive animation
                        if (1 < count)
                            animateTabs(direction, --count);
                    });
                } else {
                    elem.animate({
                        left: (i - 1) * animateOffset + "%"
                    }, ((count > 1) ? g_nShortTimer : g_nLongTimer));
                }
            }
            break;
    }
}

// function for reseting the tab data structure
function resetTabs(direction) {
    switch (direction) {
        // remove last element and add it to the end
        case("forward"):
            g_currentTabGroup[g_currentTabGroup.length - 1].style.left =
                    parseInt(g_currentTabGroup[0].style.left.split("%")[0]) - 100 + "%";
            var remove = g_currentTabGroup.splice(g_currentTabGroup.length - 1, 1);
            g_currentTabGroup.unshift(remove[0]);
            break;
        case("backward"):
            // remove first element and add it to the end
            g_currentTabGroup[0].style.left =
                    parseInt(g_currentTabGroup[g_currentTabGroup.length - 1].style.left.split("%")[0]) + 100 + "%";
            var remove = g_currentTabGroup.splice(0, 1);
            g_currentTabGroup[g_currentTabGroup.length] = remove[0];
            break;
    }
}

function onBottomTabs() {
    // assign images to the left and right scroll of tabs
    $("#left-scroll").attr("src", "./assets/texture/scroll_left.svg");
    $("#right-scroll").attr("src", "./assets/texture/scroll_right.svg");

    // event handlers for tabs
    $("#left-scroll").click(function () {
        animateTabs("forward");
    });
    $("#right-scroll").click(function () {
        animateTabs("backward");
    });

    // event handler for animation through scrolling
    $("#tab-holder").bind('mousewheel', function (event) {
        event.preventDefault();
        // measure wheel rotation
        var delta = 0;
        if (event.wheelDelta) { // WebKit / Opera / Explorer 9
            delta = event.wheelDelta;
        } else if (event.detail) { // Firefox
            delta = -event.detail;
        }

        if (delta / 120 > 0) {
            animateTabs("forward");
        }
        else {
            animateTabs("backward");
        }
    });

    // pan event for tabs
    var touch = new Hammer.Manager($("#tab-holder")[0]);
    var pan = new Hammer.Pan({direction: Hammer.DIRECTION_HORIZONTAL});
    touch.add(pan);
    // listen to touch events...
    touch.on("panleft panright", function (event) {
        event.preventDefault();
        if ("panleft" === event.type)
            animateTabs("backward");
        if ("panright" === event.type)
            animateTabs("forward");
    });
}
