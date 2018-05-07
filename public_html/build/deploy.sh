# Copyright (C) 2015-2018 Sumandeep Banerjee
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU Affero General Public License as published
# by the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU Affero General Public License for more details.
#
# You should have received a copy of the GNU Affero General Public License
# along with this program.  If not, see <http://www.gnu.org/licenses/>.

# OpenSpace Viewer: Deploy Script
# Author: sumandeep.banerjee@gmail.com

set +v
sh build.sh
STRPATH="../../deploy"
rm -r $STRPATH
mkdir $STRPATH
cp ../index.html $STRPATH
cp ../openspace.css $STRPATH
cp ../openspace.js $STRPATH
cp ../favicon.ico $STRPATH
mkdir $STRPATH/assets
mkdir $STRPATH/assets/models
mkdir $STRPATH/assets/texture
cp ../assets/texture/*.* $STRPATH/assets/texture/
