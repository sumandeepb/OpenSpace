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
 * OpenSpace Viewer: Panogalaxy Module Source
 * Author: sumandeep.banerjee@gmail.com
 */

"use strict";

function CPanogalaxy() {
    this.m_nGalaxyId = 0;               // Id of the galaxy
    this.m_nParentId = 0;               // Parent galaxy id of this galaxy
    this.m_aiChildren = null;           // Array of galaxies which are chldren of this galaxy
    this.m_aiSpheres = null;            // Array of spheres directly in this galaxy
    this.m_nStartGalaxy = 0;            // Start Glaxy Id
    this.m_nStartSphere = 0;            // Start SPhere Id
    this.m_rStartOrientation = 0;       // Start orientation of the start sphere of this galaxy
    this.m_strTitle = null;             // Title of the galaxy
    this.m_strDescription = null;       // Description of the galaxy
    this.m_nTagValueCount = 0;          // No of tags
    this.m_aTags = null;                // Array of tag objects
}

CPanogalaxy.prototype = {
    constructor: CPanogalaxy,
    initialize: function (cGalaxyInit) {
        this.m_nGalaxyId = cGalaxyInit.nGalaxyId;
        this.m_nParentId = cGalaxyInit.nParentId;
        this.m_aiChildren = cGalaxyInit.aiChildren;
        this.m_aiSpheres = cGalaxyInit.aiSpheres;
        this.m_nStartGalaxy = cGalaxyInit.nStartGalaxy;
        this.m_nStartSphere = cGalaxyInit.nStartSphere;
        this.m_rStartOrientation = cGalaxyInit.rStartOrientation;
        this.m_strTitle = cGalaxyInit.strTitle;
        this.m_strDescription = cGalaxyInit.strDescription;
        this.m_nTagValueCount = cGalaxyInit.nTagValueCount;
        this.m_aTags = cGalaxyInit.aTags;
    },
    getStartSphereId: function () {
        return this.m_nStartSphere;
    },
    concatTags: function () {
        var strTag = "";
        for (var prop in this.m_aTags) {
            strTag += prop + ": " + this.m_aTags[prop] + "\n";
        }
        return strTag;
    }
};
