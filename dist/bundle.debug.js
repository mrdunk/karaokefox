(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
///<reference path="3rdParty/babylon.gui.module.d.ts" />
///<reference path="plantGenerator.ts" />
///<reference path="priorityQueue.ts" />
let SCENEPATH = "scenes/";
let FOX = "fox.babylon";
let SCALE = 100;
let ANIM_MERGE_RATE = 0.05;
let SCENERY_RECURSION = 8;
let randomNumbers = [];
function seededRandom(max, min, seed) {
    max = max || 1;
    min = min || 0;
    if (randomNumbers[seed] === undefined) {
        randomNumbers[seed] = Math.random();
    }
    return min + randomNumbers[seed] * (max - min);
}
function coordToKey(coord) {
    let returnVal = "" + coord.x + "_" + coord.y;
    if (coord.recursion !== undefined) {
        returnVal += "_" + coord.recursion;
    }
    return returnVal;
}
function keyToCoord(key) {
    let params = key.split("_");
    let returnVal;
    returnVal.x = Number(params[0]);
    returnVal.y = Number(params[1]);
    if (params.length > 2) {
        returnVal.recursion = Number(params[2]);
    }
    return returnVal;
}
function getX(node) {
    return node.x;
}
function getY(node) {
    return node.y;
}
function getRecursion(node) {
    return node.recursion;
}
/* Don't bother doing the square root of Pythagoras. Useful for comparing distances. */
function distBetween(a, b) {
    //return Math.abs(a.x - b.x) * Math.abs(a.x - b.x) + Math.abs(a.y - b.y) * Math.abs(a.y - b.y);
    return Math.round(1.5 * Math.sqrt((a.x - b.x) * (a.x - b.x) +
        (a.y - b.y) * (a.y - b.y)));
}
class Star {
    constructor(scene, scenery) {
        this._scene = scene;
        this._scenery = scenery;
        this._heading = 0;
        this._headingDiff = 0.001;
        this._speed = 10;
        this._speedMax = 10;
        this._heightDiff = 0;
        var gl = new BABYLON.GlowLayer("glow", this._scene);
        let pyramidA = BABYLON.MeshBuilder.CreatePolyhedron("pyramidA", { type: 0, size: 1 }, this._scene);
        let pyramidB = BABYLON.MeshBuilder.CreatePolyhedron("pyramidB", { type: 0, size: 1 }, this._scene);
        pyramidB.rotate(BABYLON.Axis.Y, Math.PI);
        let starMaterialW = new BABYLON.StandardMaterial("starMaterialW", this._scene);
        starMaterialW.emissiveColor = new BABYLON.Color3(1, 1, 1);
        let starMaterialY = new BABYLON.StandardMaterial("starMaterialY", this._scene);
        starMaterialY.emissiveColor = new BABYLON.Color3(0.5, 1, 1);
        pyramidA.material = starMaterialW;
        pyramidB.material = starMaterialY;
        this.mesh = BABYLON.Mesh.CreateBox("star", 1, this._scene);
        this.mesh.isVisible = false;
        pyramidA.parent = this.mesh;
        pyramidB.parent = this.mesh;
        this._scene.registerBeforeRender(() => {
            this.randomWalk();
        });
    }
    randomWalk() {
        let time = Math.round(new Date().getTime() / 1000);
        let fps = this._scene.getEngine().getFps();
        // Let fps stabilise after missing screen updates due to inactive browser tab.
        if (time - this._tick > 1) {
            this._nextUpdate = time + 2;
        }
        if (this._tick !== time) {
            this._tick = time;
        }
        if (fps <= 0 || this._nextUpdate > time) {
            console.log("Limiting star movement.", this._nextUpdate, time);
            fps = 60;
        }
        else if (fps > 60) {
            fps = 60;
        }
        else {
            this._nextUpdate = time;
        }
        let cellHeight = this._scenery.getHeightWorld({ x: this.mesh.position.x, y: this.mesh.position.z }) || 0;
        this._heightDiff = (cellHeight - this.mesh.position.y) / 3 + 1;
        let distanceToMapCenter = Math.abs(this.mesh.position.x) + Math.abs(this.mesh.position.z);
        let angleToMapCenter = (Math.atan2(this.mesh.position.x, this.mesh.position.z) + Math.PI) % (2 * Math.PI);
        let angleDiff = angleToMapCenter - this._heading;
        let biasToCenter = 0;
        if (angleDiff <= Math.PI) {
            biasToCenter = (angleDiff < 0) ? -0.0001 : 0.0001;
        }
        else {
            biasToCenter = (angleDiff > 0) ? -0.0001 : 0.0001;
        }
        biasToCenter *= (60 / fps);
        biasToCenter *= distanceToMapCenter / 10;
        this._headingDiff /= (1.01 * 60 / fps);
        this._headingDiff += biasToCenter;
        this._headingDiff += (Math.random() - 0.5) / fps;
        this.turn(this._headingDiff);
        this.moveForwards(fps);
        if (time % 60 === 0 && time !== this._debugTimer) {
            console.log(this.mesh.position.x, this.mesh.position.y, this.mesh.position.z);
            this._debugTimer = time;
        }
    }
    moveForwards(fps) {
        this.mesh.position.x += this._speed * Math.sin(this._heading) / fps;
        this.mesh.position.z += this._speed * Math.cos(this._heading) / fps;
        this.mesh.position.y += this._speed * this._heightDiff / (2 * fps);
    }
    turn(angle) {
        this._heading += angle;
        if (this._heading < 0) {
            this._heading += 2 * Math.PI;
        }
        if (this._heading > 2 * Math.PI) {
            this._heading -= 2 * Math.PI;
        }
    }
    modifySpeed(diff) {
        this._speed += diff;
        if (this._speed < 0) {
            this._speed = 0;
        }
        if (this._speed > this._speedMax) {
            this._speed = this._speedMax;
        }
    }
}
class Character {
    constructor(scene, shaddows, filename, onLoaded) {
        console.log("Creating Character from " + filename);
        this._scene = scene;
        this._shaddows = shaddows;
        this._onLoaded = onLoaded;
        this._bones = {};
        this._lookAtNeck = new BABYLON.Vector3(0, 0, 0);
        this._animations = {};
        this._animationQueue = [];
        BABYLON.SceneLoader.ImportMesh("", SCENEPATH, filename, this._scene, this.onSceneLoad.bind(this));
    }
    onSceneLoad(meshes, particleSystems, skeletons) {
        try {
            console.assert(meshes.length === 1);
            console.assert(particleSystems.length === 0);
            console.assert(skeletons.length === 1);
            this._mesh = meshes[0];
            this._skeleton = skeletons[0];
            // this._mesh.isVisible = false;
            this.position = this._mesh.position;
            this.rotation = this._mesh.rotation;
            //this._mesh.scaling = new BABYLON.Vector3(SCALE, SCALE, SCALE);
            //this._mesh.receiveShadows = true;
            //this._mesh.convertToFlatShadedMesh();
            this._mesh.material.zOffset = -100;
            if (this._shaddows) {
                this._shaddows.getShadowMap().renderList.push(this._mesh);
            }
            /*let skeletonViewer = new BABYLON.Debug.SkeletonViewer(this._skeleton, this._mesh, this._scene);
          skeletonViewer.isEnabled = true; // Enable it
          skeletonViewer.color = BABYLON.Color3.Red(); // Change default color from white to red*/
            // Parse all bones and store any we need later for future access.
            for (let index = 0; index < this._skeleton.bones.length; index++) {
                let bone = skeletons[0].bones[index];
                // console.log(bone.uniqueId, bone.id);
                switch (bone.id) {
                    case "spine.head":
                        this._bones.head = bone;
                        break;
                    case "spine.neck":
                        this._bones.neck = bone;
                        break;
                    case "spine.upper":
                        this._bones.spineupper = bone;
                        break;
                    case "spine.point":
                        this._bones.headPoint = bone;
                        break;
                }
            }
            // Animations
            for (let a = 0; a < this._skeleton.getAnimationRanges().length; a++) {
                let animation = this._skeleton.getAnimationRanges()[a];
                //console.log(a, animation.name);
                this._animations[animation.name] = this._skeleton.getAnimationRanges()[a];
            }
            this._animationQueue.push({ name: "walk", loop: true, reversed: false });
            this._lookCtrlHead = new BABYLON.BoneLookController(this._mesh, this._bones.head, this._lookAt, { adjustPitch: Math.PI / 2 });
            this._lookCtrlNeck = new BABYLON.BoneLookController(this._mesh, this._bones.neck, this._lookAtNeck, { adjustPitch: Math.PI / 2 });
            // Periodic updates.
            this._scene.registerBeforeRender(() => {
                if (!this.position.equals(this._mesh.position)) {
                    this._mesh.position.x = this.position.x;
                    this._mesh.position.y = this.position.y;
                    this._mesh.position.z = this.position.z;
                }
                if (!this.rotation.equals(this._mesh.rotation)) {
                    this._mesh.rotation.x = this.rotation.x;
                    this._mesh.rotation.y = this.rotation.y;
                    this._mesh.rotation.z = this.rotation.z;
                }
                this._playAnimation();
            });
            if (this._onLoaded) {
                this._onLoaded();
            }
        }
        catch (error) {
            // Prevent error messages in this section getting swallowed by Babylon.
            console.error(error);
        }
    }
    lookAt(target) {
        this._lookAt = target;
        this._scene.registerBeforeRender(function () {
            // The neck should pint half way between straight forward and the
            // direction the head is pointing.
            let spineUpper = this._bones.spineupper;
            let targetLocal = spineUpper.getLocalPositionFromAbsolute(target, this._mesh);
            let targetLocalXY = new BABYLON.Vector3(targetLocal.x, targetLocal.y, 0);
            let targetLocalYZ = new BABYLON.Vector3(0, targetLocal.y, targetLocal.z);
            let aheadLocal = new BABYLON.Vector3(0, targetLocal.length(), 0); // (l/r, f/b, u/d)
            let angleXY = BABYLON.Vector3.GetAngleBetweenVectors(targetLocalXY, aheadLocal, new BABYLON.Vector3(0, 0, 1));
            let angleYZ = BABYLON.Vector3.GetAngleBetweenVectors(targetLocalYZ, aheadLocal, new BABYLON.Vector3(-1, 0, 0));
            let lookAtNeckLocal = new BABYLON.Vector3(Math.sin(angleXY / 2) * targetLocalXY.length(), (Math.cos(angleXY / 2) * targetLocalXY.length() +
                Math.cos(angleYZ / 2) * targetLocalYZ.length()) / 2, Math.sin(angleYZ / 2) * targetLocalYZ.length());
            spineUpper.getAbsolutePositionFromLocalToRef(lookAtNeckLocal, this._mesh, this._lookAtNeck);
            if (angleXY > -Math.PI / 2 && angleXY < Math.PI / 2 &&
                angleYZ > -Math.PI / 2 && angleYZ < Math.PI / 2) {
                // Only look at thing if it's not behind us.
                //this._lookCtrlNeck.update();
                //this._lookCtrlHead.update();
                this._bones.neck.rotate(BABYLON.Axis.Z, -angleXY / 2, BABYLON.Space.LOCAL);
                this._bones.neck.rotate(BABYLON.Axis.X, angleYZ / 3, BABYLON.Space.LOCAL);
                this._bones.neck.rotate(BABYLON.Axis.Y, -angleYZ * angleXY / (2 * Math.PI), BABYLON.Space.LOCAL);
                this._bones.head.rotate(BABYLON.Axis.Z, -angleXY / 2, BABYLON.Space.LOCAL);
                this._bones.head.rotate(BABYLON.Axis.X, angleYZ / 3, BABYLON.Space.LOCAL);
                this._bones.head.rotate(BABYLON.Axis.Y, -angleYZ * angleXY / (2 * Math.PI), BABYLON.Space.LOCAL);
            }
        }.bind(this));
    }
    /* Add animation to the list to be played. */
    queueAnimation(animateRequest) {
        this._animationQueue.push(animateRequest);
    }
    /* Pull new animations from queue and clean up finished animations.
     *
     * When _animationCurrent has ended, check _animationQueue for next animation.
     * If _animationLast.cleanup is set, stop the animation and delete.
     */
    _playAnimation() {
        if (this._animationLast === undefined && this._animationQueue.length > 0) {
            this._animationLast = this._animationCurrent;
            this._animationCurrent = this._animationQueue.shift();
            console.log("New: " + this._animationCurrent.name);
            this._animationCurrent.runCount = 0;
        }
        this._serviceAnimation(this._animationCurrent, true);
        this._serviceAnimation(this._animationLast, false);
        if (this._animationLast && this._animationLast.cleanup) {
            this._animationLast.animation.stop();
            this._animationLast.animation = undefined;
            this._animationLast = undefined;
        }
    }
    /* Update an AnimateRequest.
     *
     * This will be called periodically for any active AnimateRequest.
     * If it is the first time this is run for an AnimateRequest the animation
     * will be started and given greater weight each time this method is called
     * thereafter.
     * Args:
     *   animateRequest: The AnimateRequest object to act upon.
     *   current: If true, the animation weight will be increased with each call
     *     (to a mavimum value of 1).
     *     If false, the animation weight will be decreased with each call until
     *     it reaches 0 at which time the animation will be stopped and
     *     AnimateRequest.cleanup will be set.
     */
    _serviceAnimation(animateRequest, current) {
        if (animateRequest === undefined) {
            return;
        }
        let weight = animateRequest.runCount ? animateRequest.animation.weight : 0;
        if (current && weight < 1) {
            weight += ANIM_MERGE_RATE;
            weight = Math.min(1, weight);
        }
        else if (!current && weight > 0) {
            weight -= ANIM_MERGE_RATE;
            weight = Math.max(0, weight);
        }
        if (animateRequest.animation) {
            animateRequest.animation.weight = weight;
        }
        if (weight <= 0) {
            // This old AnimateRequest has been faded out and needs stopped and removed.
            animateRequest.cleanup = true;
            return;
        }
        if (animateRequest.dirty === false) {
            // Nothing more to do.
            // Animations which end set animateRequest.dirty to true when they need
            // this method to continue past this point.
            return;
        }
        // console.log(animateRequest.name, weight, current);
        if (animateRequest.runCount && !animateRequest.loop && animateRequest.reversed) {
            // Freeze frame at first frame in sequence.
            animateRequest.animation.stop();
            animateRequest.animation = this._scene.beginWeightedAnimation(this._skeleton, this._animations[animateRequest.name].from + 2, this._animations[animateRequest.name].from + 2, weight, false, 0.01, function () {
                animateRequest.dirty = true;
            }.bind(this));
        }
        else if (animateRequest.runCount && !animateRequest.loop) {
            // Freeze frame at last frame in sequence.
            animateRequest.animation.stop();
            animateRequest.animation = this._scene.beginWeightedAnimation(this._skeleton, this._animations[animateRequest.name].to, this._animations[animateRequest.name].to, weight, false, 0.01, function () {
                animateRequest.dirty = true;
            }.bind(this));
        }
        else if (animateRequest.reversed) {
            // Play an animation in reverse.
            animateRequest.animation = this._scene.beginWeightedAnimation(this._skeleton, this._animations[animateRequest.name].to, this._animations[animateRequest.name].from + 2, weight, false, 1, function () {
                animateRequest.dirty = true;
            }.bind(this));
        }
        else {
            // Play an animation.
            animateRequest.animation = this._scene.beginWeightedAnimation(this._skeleton, this._animations[animateRequest.name].from + 2, this._animations[animateRequest.name].to, weight, false, 1, function () {
                animateRequest.dirty = true;
            }.bind(this));
        }
        animateRequest.dirty = false;
        animateRequest.runCount++;
    }
}
class MapCell {
    constructor(coord, vegetation) {
        this.x = coord.x;
        this.y = coord.y;
        this.recursion = coord.recursion;
        this.vegetation = vegetation;
    }
    parentCoordinates(depth) {
        let pX = 0;
        let pY = 0;
        for (let bit = depth - 1; bit >= depth - this.recursion + 1; bit--) {
            let mask = 1 << bit;
            if (mask & this.x) {
                pX |= mask;
            }
            if (mask & this.y) {
                pY |= mask;
            }
            //console.log(bit, mask, pX, pY);
        }
        return { x: pX, y: pY, recursion: this.recursion - 1 };
    }
}
class Scenery {
    constructor(scene, shaddows, ground, size) {
        this._mapSpacing = 1;
        this._treeScale = 200;
        this._treeSeedValue = 75;
        this._headroom = 2;
        console.log("Mesh count before creating scenery: %c" +
            scene.meshes.length.toString(), "background: orange; color: white");
        this._scene = scene;
        this._shaddows = shaddows;
        this._ground = ground;
        this._groundCover = {};
        this._mapSize = size;
        this._maxRecursion = Math.floor(Math.log(this._mapSize) / Math.log(2));
        this._treeRecursion = this._maxRecursion - 3;
        console.assert(Math.pow(2, this._maxRecursion) === this._mapSize &&
            Boolean("Map size is not a power of 2."));
        this._cells = new MyMap(getX, getY, getRecursion);
        this._setVegetationHeights();
        this._plantTrees();
        //this._shaddows.getShadowMap().renderList.push(this._trees);
    }
    // Assign "vegetation" values to map cells which dictates how large plants are.
    _setVegetationHeights() {
        for (let recursion = 0; recursion <= this._maxRecursion; recursion++) {
            let tileSize = Math.pow(2, this._maxRecursion - recursion);
            // console.log(tileSize, recursion);
            for (let x = 0; x < this._mapSize; x += tileSize) {
                for (let y = 0; y < this._mapSize; y += tileSize) {
                    if (this.getCell({ x, y, recursion }) === undefined) {
                        let parentCell = this.getCellParent({ x, y, recursion });
                        if (parentCell === undefined) {
                            this.setCell({ x, y, recursion }, this._treeSeedValue);
                        }
                        else if (recursion === this._treeRecursion &&
                            x <= this._mapSize / 2 && x >= this._mapSize / 2 - tileSize &&
                            y <= this._mapSize / 2 && y >= this._mapSize / 2 - tileSize) {
                            // Center of map should always be empty.
                            this.setCell({ x, y, recursion }, 0);
                        }
                        else if (recursion === this._treeRecursion &&
                            (x < 4 * tileSize ||
                                y < 4 * tileSize ||
                                x >= this._mapSize - 4 * tileSize ||
                                y >= this._mapSize - 4 * tileSize)) {
                            // Dense vegetation round edge.
                            this.setCell({ x, y, recursion }, Math.random() * this._treeSeedValue * 2);
                        }
                        else if (recursion > this._treeRecursion) {
                            this.setCell({ x, y, recursion }, 0);
                        }
                        else {
                            let seed = "" + parentCell.x + "_" + parentCell.y;
                            let childMod = [
                                seededRandom(500, 1000, seed),
                                seededRandom(500, 1000, seed + "_1"),
                                seededRandom(500, 1000, seed + "_2"),
                                seededRandom(500, 1000, seed + "_3")
                            ];
                            let childModTotal = childMod.reduce((total, num) => { return total + num; });
                            childMod.forEach((vegetation, index, array) => { array[index] /= childModTotal; });
                            let childIndex = ((x - parentCell.x) + 2 * (y - parentCell.y)) / tileSize;
                            this.setCell({ x, y, recursion }, parentCell.vegetation * childMod[childIndex] * 4);
                        }
                    }
                }
            }
        }
        console.log("Cell count: ", this._cells.length);
    }
    _findClosestSpace(coord, height) {
        let neighbours = new PriorityQueue(getX, getY);
        let visited = {};
        neighbours.push(coord, 0);
        while (neighbours.length) {
            let working = neighbours.popLow();
            visited[coordToKey(working)] = true;
            if (this.getCell(working).minHeight === undefined ||
                this.getCell(working).minHeight >= height) {
                console.log("in: ", coordToKey(coord), "\tout: ", coordToKey(working));
                return working;
            }
            if (working.x > 0) {
                let node = { "x": working.x - 1, "y": working.y, "recursion": this._maxRecursion };
                if (!visited[coordToKey(node)]) {
                    neighbours.push(node, distBetween(working, coord));
                }
            }
            if (working.x < this._mapSize - 1) {
                let node = { "x": working.x + 1, "y": working.y, "recursion": this._maxRecursion };
                if (!visited[coordToKey(node)]) {
                    neighbours.push(node, distBetween(working, coord));
                }
            }
            if (working.y > 0) {
                let node = { "x": working.x, "y": working.y - 1, "recursion": this._maxRecursion };
                if (!visited[coordToKey(node)]) {
                    neighbours.push(node, distBetween(working, coord));
                }
            }
            if (working.y < this._mapSize - 1) {
                let node = { "x": working.x, "y": working.y + 1, "recursion": this._maxRecursion };
                if (!visited[coordToKey(node)]) {
                    neighbours.push(node, distBetween(working, coord));
                }
            }
        }
        console.log(visited.length);
        console.log("in: ", coordToKey(coord), "\tout: ", undefined);
        return undefined;
    }
    calculatePath(start, destination) {
        console.time("calculatePath");
        let reachedDestination = false;
        start.recursion = this._maxRecursion;
        destination.recursion = this._maxRecursion;
        let startAdjusted = this.getCell(this._findClosestSpace(start, this._headroom));
        let destinationAdjusted = this.getCell(this._findClosestSpace(destination, this._headroom));
        destinationAdjusted.pathScore = 0;
        let neighbours = new PriorityQueue(getX, getY);
        neighbours.push(destinationAdjusted, 0);
        while (neighbours.length) {
            let working = neighbours.popLow();
            if (working.x === startAdjusted.x && working.y === startAdjusted.y) {
                reachedDestination = true;
                break;
            }
            let adjacent = new Array(4);
            if (working.x > 0) {
                adjacent[0] = this.getCell({ "x": working.x - 1, "y": working.y, "recursion": this._maxRecursion });
            }
            if (working.x < this._mapSize - 1) {
                adjacent[1] = this.getCell({ "x": working.x + 1, "y": working.y, "recursion": this._maxRecursion });
            }
            if (working.y > 0) {
                adjacent[2] = this.getCell({ "x": working.x, "y": working.y - 1, "recursion": this._maxRecursion });
            }
            if (working.y < this._mapSize - 1) {
                adjacent[3] = this.getCell({ "x": working.x, "y": working.y + 1, "recursion": this._maxRecursion });
            }
            adjacent.forEach((a) => {
                if (a !== undefined &&
                    (a.minHeight > this._headroom || a.minHeight === undefined)) {
                    if (a.pathScore === undefined) {
                        a.pathScore = working.pathScore + 1;
                        neighbours.push(a, a.pathScore + distBetween(a, startAdjusted));
                    }
                    else {
                        a.pathScore = Math.min(a.pathScore, working.pathScore + 1);
                    }
                }
            });
        }
        /*for (let y = 0; y < this._mapSize; y++) {
          let line = "";
          for (let x = 0; x < this._mapSize; x++) {
            let node = this.getCell({x, y, "recursion": this._maxRecursion});
            let val = "" + node.pathScore;
            if (val === "undefined") {
              val = " ";
              if (this.getCell(node).minHeight <= this._headroom) {
                val = "#";
              }
            } else {
              val = ".";
              let pathNode = BABYLON.MeshBuilder.CreateSphere("path_" + x + "_" + y, {}, this._scene);
              pathNode.position.x = this.mapToWorld(node).x;
              pathNode.position.y = 0;
              pathNode.position.z = this.mapToWorld(node).y;
            }
            if (x === start.x && y === start.y) { val = "*"; }
            if (x === startAdjusted.x && y === startAdjusted.y) { val = "(*)"; }
            if (y < 50 && x < 150) {
              line += val;
            }
          }
          if (y < 50) {
            console.log(line);
          }
        }*/
        console.timeEnd("calculatePath");
        console.log("Sucessfull: ", reachedDestination);
        return reachedDestination;
    }
    _plantTrees() {
        console.log("Planting trees.");
        let treeFactory = new TreeFactory(this._scene, 10, 8);
        this._treeTypes = [];
        this._treeSpecies = 0;
        // Ensure there are always /some/ of each type of tree.
        this._treeTypes.push(this._createTreePine());
        this._treeTypes.push(this._createTreeDeciduous());
        // But most should be random.
        this._treeTypes.push(this._createTree());
        this._treeTypes.push(this._createTree());
        this._treeTypes.push(this._createTree());
        this._treeTypes.push(this._createTree());
        this._treeTypes.push(this._createTree());
        this._treeTypes.push(this._createTree());
        this._treeTypes.push(this._createTree());
        this._treeTypes.push(this._createTree());
        this._treeTypes.push(this._createTree());
        this._treeTypes.push(this._createTree());
        this._shrubTypes = [];
        this._shrubTypes.push(this._createShrub(true));
        this._shrubTypes.push(this._createShrub());
        this._shrubTypes.push(this._createShrub());
        this._shrubTypes.push(this._createShrub());
        this._shrubTypes.push(this._createShrub());
        this._shrubTypes.push(this._createShrub());
        this._shrubTypes.push(this._createShrub());
        this._shrubTypes.push(this._createShrub());
        this._shrubTypes.push(this._createShrub());
        this._shrubTypes.push(this._createShrub());
        this._groundCoverTypes = [];
        this._groundCoverTypes.push(this._createGroundCover());
        this._groundCoverTypes.push(this._createGroundCover());
        this._groundCoverTypes.push(this._createGroundCover());
        this._groundCoverTypes.push(this._createGroundCover());
        this._groundCoverTypes.push(this._createGroundCover());
        this._groundCoverTypes.push(this._createGroundCover());
        this._groundCoverTypes.push(this._createGroundCover());
        this._groundCoverTypes.push(this._createGroundCover());
        let trees = [];
        let tileSize = Math.pow(2, this._maxRecursion - this._treeRecursion);
        for (let x = 0; x < this._mapSize; x += tileSize) {
            for (let y = 0; y < this._mapSize; y += tileSize) {
                let cell = this.getCell({ x, y, recursion: this._treeRecursion });
                let scale = cell.vegetation / this._treeScale;
                let tree;
                if (cell.vegetation > 80) {
                    let treeTypeIndex = Math.round(Math.random() * (this._treeTypes.length - 1));
                    //console.log(treeTypeIndex, this._treeTypes.length);
                    tree = this._treeTypes[treeTypeIndex].clone(this._treeTypes[treeTypeIndex].name + "_" + x + "_" + y);
                }
                else if (cell.vegetation > 50) {
                    let shrubTypes = this._shrubTypes.length;
                    let shrubTypeIndex = Math.round(Math.random() * (this._shrubTypes.length - 1));
                    tree = this._shrubTypes[shrubTypeIndex].clone(this._shrubTypes[shrubTypeIndex].name + "_" + x + "_" + y);
                }
                if (tree !== undefined) {
                    let jitterX = Math.round(Math.random() * 8 - 4);
                    let jitterY = Math.round(Math.random() * 8 - 4);
                    tree.position.x = ((x + jitterX) - this._mapSize / 2) * this._mapSpacing;
                    tree.position.y = 0;
                    tree.position.z = ((y + jitterY) - this._mapSize / 2) * this._mapSpacing;
                    tree.scaling = new BABYLON.Vector3(scale, scale, scale);
                    trees.push(tree);
                    let leaves = tree.getChildMeshes(true, (mesh) => {
                        return mesh.name.split(".")[1] === "leaves";
                    })[0].getBoundingInfo().boundingBox;
                    let leavesTop = leaves.maximumWorld.y * scale;
                    let leavesBottom = leaves.minimumWorld.y * scale;
                    let xMin = (leaves.minimumWorld.x / this._mapSpacing) * scale;
                    let xMax = (leaves.maximumWorld.x / this._mapSpacing) * scale;
                    let yMin = (leaves.minimumWorld.z / this._mapSpacing) * scale;
                    let yMax = (leaves.maximumWorld.z / this._mapSpacing) * scale;
                    //for (let xx = Math.ceil(xMin + jitterX); xx <= Math.floor(xMax + jitterX); xx++) {
                    for (let xx = Math.floor(xMin + jitterX); xx <= Math.ceil(xMax + jitterX); xx++) {
                        //for (let yy = Math.ceil(yMin + jitterY); yy <= Math.floor(yMax + jitterY); yy++) {
                        for (let yy = Math.floor(yMin + jitterY); yy <= Math.ceil(yMax + jitterY); yy++) {
                            let c = this.getCell({ x: xx + x, y: yy + y, recursion: this._maxRecursion });
                            if (c && (c.maxHeight === undefined || c.maxHeight < leavesTop)) {
                                c.maxHeight = leavesTop;
                            }
                            if (c && (c.minHeight > leavesBottom || c.minHeight === undefined)) {
                                c.minHeight = leavesBottom;
                            }
                        }
                    }
                    let c = this.getCell({ x, y, recursion: this._maxRecursion });
                    if (c && (c.minHeight === undefined || c.minHeight > leavesBottom)) {
                        c.minHeight = leavesBottom;
                    }
                    let trunk = tree.getChildMeshes(true, (mesh) => {
                        return mesh.name.split(".")[1] === "trunk";
                    })[0];
                    if (trunk) {
                        let trunkBB = trunk.getBoundingInfo().boundingBox;
                        let xMinT = Math.round(trunkBB.minimumWorld.x * scale / this._mapSpacing);
                        let xMaxT = Math.round(trunkBB.maximumWorld.x * scale / this._mapSpacing);
                        let yMinT = Math.round(trunkBB.minimumWorld.z * scale / this._mapSpacing);
                        let yMaxT = Math.round(trunkBB.maximumWorld.z * scale / this._mapSpacing);
                        for (let xx = Math.ceil(xMinT + jitterX); xx <= Math.floor(xMaxT + jitterX); xx++) {
                            for (let yy = Math.ceil(yMinT + jitterY); yy <= Math.floor(yMaxT + jitterY); yy++) {
                                let c = this.getCell({ x: xx + x,
                                    y: yy + y,
                                    recursion: this._maxRecursion });
                                if (c) {
                                    c.minHeight = 0;
                                }
                            }
                        }
                    }
                    // console.log(xMin, xMax, yMin, yMax);
                    /*let testTreetop = BABYLON.MeshBuilder.CreateBox("test",
                      {"width": (xMax - xMin) * this._mapSpacing,
                       "height": leavesTop - leavesBottom,
                       "depth": (yMax - yMin) * this._mapSpacing},
                      this._scene);
                    var material = new BABYLON.StandardMaterial("myMaterial", this._scene);
                    material.diffuseColor = new BABYLON.Color3(1, 0, 0);
                    //material.wireframe = true;
                    material.alpha = 0.5;
                    testTreetop.material = material;
                    testTreetop.position.x = (x + jitterX - this._mapSize / 2) * this._mapSpacing;
                    testTreetop.position.y = (leavesTop + leavesBottom) / 2;
                    testTreetop.position.z = (y + jitterY - this._mapSize / 2) * this._mapSpacing;*/
                    this._applyGroundCover((x - this._mapSize / 2) * this._mapSpacing, (y - this._mapSize / 2) * this._mapSpacing);
                }
            }
        }
        console.log("Done planting");
        /*for (let x = 0; x < this._mapSize; x++) {
          for (let y = 0; y < this._mapSize; y++) {
            let cell = this.getCell({x, y, recursion: this._maxRecursion});
            if (cell.minHeight !== undefined) {
              //let leavesTop = cell.maxHeight;
              let leavesTop = cell.minHeight;
              let testTreetop = BABYLON.MeshBuilder.CreatePlane(
                "test" + x + "_" + y + " " + this._maxRecursion,
                {size: 1 * this._mapSpacing, sideOrientation: BABYLON.Mesh.DOUBLESIDE},
                this._scene);
              testTreetop.rotation.x = Math.PI / 2;
              testTreetop.position.x = (x - this._mapSize / 2) * this._mapSpacing;
              testTreetop.position.y = leavesTop;
              testTreetop.position.z = (y - this._mapSize / 2) * this._mapSpacing;
            }
          }
        }*/
        // Don't need the prototypes any more so delete them.
        this._treeTypes.forEach((node) => { node.dispose(); });
        this._shrubTypes.forEach((node) => { node.dispose(); });
        console.log("Consolidating trees.");
        this._consolidateTrees(trees);
    }
    worldToMap(coord) {
        let x = Math.round(coord.x / this._mapSpacing + this._mapSize / 2);
        let y = Math.round(coord.y / this._mapSpacing + this._mapSize / 2);
        let recursion = coord.recursion;
        if (recursion === undefined) {
            recursion = this._maxRecursion;
        }
        return { x, y, recursion };
    }
    mapToWorld(coord) {
        let x = Math.round(coord.x * this._mapSpacing - this._mapSize / 2);
        let y = Math.round(coord.y * this._mapSpacing - this._mapSize / 2);
        let recursion = coord.recursion;
        if (recursion === undefined) {
            recursion = this._maxRecursion;
        }
        return { x, y, recursion };
    }
    setCell(coord, vegetation) {
        let cell = new MapCell(coord, vegetation);
        this._cells.put(cell, cell);
    }
    getCell(coord) {
        if (coord.recursion === -1) {
            return this._cells.get({ "x": 0, "y": 0, "recursion": 0 });
        }
        return this._cells.get(coord);
    }
    getHeightWorld(coord) {
        let cell = this.getCellWorld(coord);
        if (!cell) {
            return 0;
        }
        return cell.maxHeight;
    }
    getCellWorld(coord) {
        return this.getCell(this.worldToMap(coord));
    }
    getCellParent(coord) {
        let cell = this.getCell(coord);
        if (cell === undefined) {
            return this.getCell(new MapCell(coord, -1).parentCoordinates(this._maxRecursion));
        }
        return this.getCell(cell.parentCoordinates(this._maxRecursion));
    }
    _consolidateTrees(trees) {
        console.log("Mesh count before _consolidateTrees: %c" +
            this._scene.meshes.length.toString(), "background: orange; color: white");
        let countStart = 0;
        let countFinal = 0;
        let treeFoliageBucket = new Array(this._treeSpecies).fill(undefined);
        let treeTrunkBucket = new Array(this._treeSpecies).fill(undefined);
        trees.forEach((tree) => {
            // Collect the different tree species together in 2 collections:
            // trunks and leaves.
            let treeIndex = parseInt(tree.name.split("_")[1], 10);
            if (treeFoliageBucket[treeIndex] === undefined || treeTrunkBucket == undefined) {
                treeFoliageBucket[treeIndex] = [];
                treeTrunkBucket[treeIndex] = [];
            }
            tree.getChildMeshes(true).forEach((node) => {
                let nodeName = node.name.split(".")[1];
                if (nodeName === "leaves") {
                    let pos = node.getAbsolutePosition();
                    node.setParent(null);
                    node.setAbsolutePosition(pos);
                    treeFoliageBucket[treeIndex].push(node);
                }
                else if (nodeName === "trunk") {
                    let pos = node.getAbsolutePosition();
                    node.setParent(null);
                    node.setAbsolutePosition(pos);
                    treeTrunkBucket[treeIndex].push(node);
                }
                else {
                    console.log(nodeName);
                    console.assert(false && "Unknown tree component");
                }
            });
            // We have the component parts so don't need the original tree anymore.
            tree.dispose();
        });
        // Combine all trunks of the same species together.
        treeTrunkBucket.forEach((bucket) => {
            if (bucket && bucket.length) {
                countStart += bucket.length;
                countFinal++;
                let t = BABYLON.Mesh.MergeMeshes(bucket, true, true, null, true);
                // this._shaddows.getShadowMap().renderList.push(t);
            }
        }, this);
        // Combine all leaves of the same species together.
        treeFoliageBucket.forEach((bucket) => {
            if (bucket && bucket.length) {
                countStart += bucket.length;
                countFinal++;
                let t = BABYLON.Mesh.MergeMeshes(bucket, true, true, null, true);
                // this._shaddows.getShadowMap().renderList.push(t);
            }
        }, this);
        console.log("Tree component count before _consolidateTrees: %c" +
            countStart.toString(), "background: orange; color: white");
        console.log("Mesh count after _consolidateTrees: %c" +
            this._scene.meshes.length.toString(), "background: orange; color: white");
        console.log("Tree component count after _consolidateTrees: %c" +
            countFinal.toString(), "background: orange; color: white");
    }
    _createTree() {
        if (Math.random() > 0.2) {
            return this._createTreeDeciduous();
        }
        return this._createTreePine();
    }
    _createTreePine() {
        let canopies = Math.round(Math.random() * 3) + 4;
        let height = Math.round(Math.random() * 20) + 20;
        let width = 5;
        let trunkMaterial = new BABYLON.StandardMaterial("trunk", this._scene);
        trunkMaterial.diffuseColor = new BABYLON.Color3(0.3 + Math.random() * 0.2, 0.2 + Math.random() * 0.2, 0.2 + Math.random() * 0.1);
        trunkMaterial.specularColor = BABYLON.Color3.Black();
        let leafMaterial = new BABYLON.StandardMaterial("leaf", this._scene);
        leafMaterial.diffuseColor = new BABYLON.Color3(0.4 + Math.random() * 0.2, 0.5 + Math.random() * 0.4, 0.2 + Math.random() * 0.2);
        leafMaterial.specularColor = BABYLON.Color3.Red();
        let tree = PineGenerator(canopies, height, width, trunkMaterial, leafMaterial, this._scene);
        tree.setEnabled(false);
        tree.name += "_" + this._treeSpecies;
        this._treeSpecies++;
        return tree;
    }
    _createTreeDeciduous() {
        let sizeBranch = 15 + Math.random() * 5;
        let sizeTrunk = 10 + Math.random() * 5;
        let radius = 1 + Math.random() * 4;
        let trunkMaterial = new BABYLON.StandardMaterial("trunk", this._scene);
        trunkMaterial.diffuseColor = new BABYLON.Color3(0.3 + Math.random() * 0.3, 0.2 + Math.random() * 0.3, 0.2 + Math.random() * 0.2);
        trunkMaterial.specularColor = BABYLON.Color3.Black();
        let leafMaterial = new BABYLON.StandardMaterial("leaf", this._scene);
        leafMaterial.diffuseColor = new BABYLON.Color3(0.4 + Math.random() * 0.2, 0.5 + Math.random() * 0.4, 0.2 + Math.random() * 0.2);
        leafMaterial.specularColor = BABYLON.Color3.Red();
        let tree = QuickTreeGenerator(sizeBranch, sizeTrunk, radius, trunkMaterial, leafMaterial, this._scene);
        tree.setEnabled(false);
        tree.name += "_" + this._treeSpecies;
        this._treeSpecies++;
        return tree;
    }
    _createShrub(forceSapling) {
        if (Math.random() < 0.1 || forceSapling) {
            let sapling = this._createTree();
            sapling.scaling.x *= 0.2;
            sapling.scaling.y *= 0.2;
            sapling.scaling.z *= 0.2;
            return sapling;
        }
        let sizeBranch = 10 + Math.random() * 20;
        let leafMaterial = new BABYLON.StandardMaterial("leaf", this._scene);
        leafMaterial.diffuseColor = new BABYLON.Color3(0.4 + Math.random() * 0.2, 0.5 + Math.random() * 0.4, 0.2 + Math.random() * 0.2);
        leafMaterial.specularColor = BABYLON.Color3.Gray();
        let tree = QuickShrub(sizeBranch, leafMaterial, this._scene);
        tree.setEnabled(false);
        tree.name += "_" + this._treeSpecies;
        this._treeSpecies++;
        return tree;
    }
    _createGroundCover() {
        let flowers = [
            "greenery1.png",
            "greenery2.png",
            "greenery3.png",
            "greenery4.png",
            "greenery5.png",
            "greenery6.png",
            "greenery7.png",
            "greenery8.png",
        ];
        let image = this._groundCoverTypes.length;
        let decalMaterial = new BABYLON.StandardMaterial(flowers[image], this._scene);
        decalMaterial.diffuseTexture = new BABYLON.Texture("textures/groundcover/" + flowers[image], this._scene);
        decalMaterial.diffuseTexture.hasAlpha = true;
        decalMaterial.zOffset = -Math.round(this._groundCoverTypes.length / 2 + 1);
        decalMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
        decalMaterial.disableDepthWrite = false;
        decalMaterial.forceDepthWrite = true;
        return decalMaterial;
    }
    _applyGroundCover(x, y) {
        for (let i = 0; i < Math.random() * 3; i++) {
            let decalScale = 20 + Math.random() * 40;
            let decalSize = BABYLON.Vector3.One().scale(decalScale);
            let decalRotate = Math.PI * 2 * Math.random();
            let newDecal = BABYLON.MeshBuilder.CreateDecal("groundCover_" + x + "_" + y, this._ground, {
                position: new BABYLON.Vector3(x, 0, y),
                normal: new BABYLON.Vector3(0, 1, 0),
                size: decalSize,
                angle: decalRotate
            });
            let materialIndex = Math.round(Math.random() * (this._groundCoverTypes.length - 1));
            let proposedMaterial = this._groundCoverTypes[materialIndex];
            let decalHeight = proposedMaterial.zOffset;
            // Check the proposed material does not clash with an overlapping material
            // at the same zOffset.
            let noConflict = true;
            for (let decalCoverX = x - Math.round(decalScale / 2); decalCoverX < x + Math.round(decalScale / 2) && noConflict; decalCoverX++) {
                for (let decalCoverY = y - Math.round(decalScale / 2); decalCoverY < y + Math.round(decalScale / 2); decalCoverY++) {
                    let key = "" + decalCoverX + "_" + decalCoverY + "_" + decalHeight;
                    if (this._groundCover[key]) {
                        // Already exists.
                        noConflict = false;
                        break;
                    }
                }
            }
            if (noConflict) {
                newDecal.material = proposedMaterial;
                // Set a record of where this decal covers and at what zOffset.
                for (let decalCoverX = x - Math.round(decalScale / 2); decalCoverX < x + Math.round(decalScale / 2) && noConflict; decalCoverX++) {
                    for (let decalCoverY = y - Math.round(decalScale / 2); decalCoverY < y + Math.round(decalScale / 2); decalCoverY++) {
                        let key = "" + decalCoverX + "_" + decalCoverY + "_" + decalHeight;
                        this._groundCover[key] = true;
                    }
                }
            }
            else {
                newDecal.dispose();
            }
        }
    }
}
class Camera {
    constructor(canvas, scene, actors) {
        this._canvas = canvas;
        this._scene = scene;
        this.cameras = [];
        this._target = BABYLON.MeshBuilder.CreateSphere("targetCamera", { diameterX: 0.1, diameterY: 0.1, diameterZ: 0.1 }, this._scene);
        this._target.position = new BABYLON.Vector3(100, 40, 100);
        this._cameraArc = new BABYLON.ArcRotateCamera("ArcRotateCamera", 0, 0, 2, new BABYLON.Vector3(0, 30, 0), this._scene);
        this._cameraArc.setPosition(new BABYLON.Vector3(5, 17, 30));
        this._cameraArc.minZ = 0.5;
        this._cameraArc.maxZ = 800;
        this._cameraArc.lowerBetaLimit = 0.1;
        this._cameraArc.upperBetaLimit = (Math.PI / 2) - 0.1;
        this._cameraArc.lowerRadiusLimit = 2;
        this._cameraArc.attachControl(this._canvas, true, false);
        this._cameraArc.setTarget(this._target.position);
        this._scene.activeCamera = this._cameraArc;
        this.cameras.push({ "name": "ArcRotate", "camera": this._cameraArc });
        this._cameraUniversal = new BABYLON.UniversalCamera("UniversalCamera", new BABYLON.Vector3(0, 0, -10), this._scene);
        this._cameraUniversal.setTarget(this._target.position);
        this.cameras.push({ "name": "Universal", "camera": this._cameraUniversal });
        this._cameraFollow = new BABYLON.FollowCamera("FollowCamera", new BABYLON.Vector3(0, 1, -10), this._scene);
        this._cameraFollow.radius = 10;
        this._cameraFollow.heightOffset = 1;
        this._cameraFollow.rotationOffset = 180 / 4;
        this._cameraFollow.cameraAcceleration = 0.02;
        this._cameraFollow.maxCameraSpeed = 20;
        this._cameraFollow.attachControl(this._canvas, true);
        this._cameraFollow.lockedTarget = this._target;
        //this._cameraFollow.lowerRadiusLimit = 3;
        //this._cameraFollow.lowerHeightOffsetLimit = 1;
        this.cameras.push({ "name": "Follow", "camera": this._cameraFollow });
        this._scene.onBeforeRenderObservable.add(() => {
            if (this._cameraArc.getTarget() != this._target.position) {
                this._cameraArc.setTarget(this._target.position);
            }
            //this._cameraArc.rebuildAnglesAndRadius();
        });
    }
    setTarget(targetPosition) {
        //this._cameraArc.setTarget(targetPosition);
        //this._cameraUniversal.setTarget(targetPosition);
        let animation = new BABYLON.Animation("cameraTargetEase", "position", 30, BABYLON.Animation.ANIMATIONTYPE_VECTOR3, BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE);
        // Animation keys
        var keys = [];
        keys.push({ frame: 0, value: this._target.position });
        keys.push({ frame: 120, value: targetPosition });
        animation.setKeys(keys);
        var easingFunction = new BABYLON.CircleEase();
        easingFunction.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEINOUT);
        animation.setEasingFunction(easingFunction);
        this._target.animations.push(animation);
        this._scene.beginAnimation(this._target, 0, 120, false);
    }
    setEnabled(camera) {
        console.log(camera, this._scene.activeCamera.name);
        if (this._scene.activeCamera.name == "UniversalCamera") {
            // Move the camera target in front of old camera to allow for animation to
            // new camera orientation.
            let distance = BABYLON.Vector3.Distance(this._cameraUniversal.position, this._cameraArc.target);
            this._target.position = this._cameraUniversal.getFrontPosition(distance);
            this.setTarget(new BABYLON.Vector3(0, 0, 0));
        }
        this._cameraArc.detachControl(this._canvas);
        this._cameraUniversal.detachControl(this._canvas);
        this._cameraFollow.detachControl(this._canvas);
        // Set the new camera.
        if (camera.name === "ArcRotate") {
            this._cameraArc.setPosition(this._scene.activeCamera.position);
            this._cameraArc.rebuildAnglesAndRadius();
            this._cameraArc.attachControl(this._canvas, true, false);
            this._scene.activeCamera = this._cameraArc;
        }
        else if (camera.name === "Universal") {
            this._cameraUniversal.attachControl(this._canvas, true);
            this._cameraUniversal.position = this._scene.activeCamera.position;
            this._cameraUniversal.setTarget(this._target.position);
            this._scene.activeCamera = this._cameraUniversal;
        }
        else if (camera.name === "Follow") {
            this._cameraFollow.position = this._scene.activeCamera.position;
            this._scene.activeCamera = this._cameraFollow;
            this._cameraFollow.inputs.attachInput(this._cameraFollow.inputs.attached.FollowCameraControls);
            this._cameraFollow.attachControl(this._canvas, true);
            console.log(this._cameraFollow.inputs);
        }
    }
}
class Game {
    constructor(canvasElement) {
        // Create canvas and engine.
        this._canvas = document.getElementById(canvasElement);
        this._engine = new BABYLON.Engine(this._canvas, true);
        this._actors = [];
    }
    createScene() {
        BABYLON.SceneLoader.CleanBoneMatrixWeights = true;
        this._scene = new BABYLON.Scene(this._engine);
        this._scene.ambientColor = new BABYLON.Color3(0.3, 0.3, 0.3);
        // Fog
        this._scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
        this._scene.fogColor = new BABYLON.Color3(0.2, 0.2, 0.2);
        this._scene.fogDensity = 0.003;
        // Skybox
        this._skybox = BABYLON.Mesh.CreateBox("skyBox", 1000.0, this._scene);
        this._skybox.scaling.y = 0.125;
        var skyboxMaterial = new BABYLON.StandardMaterial("skyBox", this._scene);
        skyboxMaterial.reflectionTexture = new BABYLON.CubeTexture("textures/skybox", this._scene);
        skyboxMaterial.reflectionTexture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE;
        skyboxMaterial.diffuseColor = new BABYLON.Color3(0, 0, 0);
        skyboxMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
        skyboxMaterial.disableLighting = true;
        skyboxMaterial.backFaceCulling = false;
        this._skybox.material = skyboxMaterial;
        this._skybox.setEnabled(false);
        // Lighting
        this._light = new BABYLON.DirectionalLight("dir01", new BABYLON.Vector3(0, -0.5, -1.0), this._scene);
        this._light.position = new BABYLON.Vector3(20, 150, 70);
        let sun = BABYLON.MeshBuilder.CreateSphere("sun", {}, this._scene);
        sun.position = this._light.position;
        // Camera
        this._camera = new Camera(this._canvas, this._scene, this._actors);
        // Ground
        let ground = BABYLON.Mesh.CreateGround("ground", 1000, 1000, 1, this._scene, false);
        let groundMaterial = new BABYLON.StandardMaterial("ground", this._scene);
        groundMaterial.diffuseTexture = new BABYLON.Texture("textures/grass.png", this._scene);
        groundMaterial.diffuseTexture.uScale = 64;
        groundMaterial.diffuseTexture.vScale = 64;
        groundMaterial.diffuseColor = new BABYLON.Color3(0.4, 0.4, 0.4);
        groundMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
        ground.material = groundMaterial;
        ground.receiveShadows = true;
        // Shadows
        let shadowGenerator = new BABYLON.ShadowGenerator(1024, this._light);
        // Scenery
        let scenery = new Scenery(this._scene, shadowGenerator, ground, 256);
        scenery.calculatePath({ "x": 255, "y": 255 }, { "x": 0, "y": 0 });
        this._scene.onPointerDown = function (evt, pickResult) {
            // if the click hits the ground object, we change the impact position
            if (pickResult.hit) {
                targetHead.position.x = pickResult.pickedPoint.x;
                targetHead.position.y = pickResult.pickedPoint.y;
                targetHead.position.z = pickResult.pickedPoint.z;
            }
        };
        // Meshes
        // World positions: (l/r, u/d, f/b)
        // let debugBase = BABYLON.MeshBuilder.CreateBox("debugBase", {height: 0.01, width: 0.5, depth: 1}, this._scene);
        // debugBase.receiveShadows = true;
        // Moving ball for the fox to watch.
        let targetHead = BABYLON.MeshBuilder.CreateSphere("targetHead", { diameterX: 0.01, diameterY: 0.01, diameterZ: 0.01 }, this._scene);
        targetHead.position = this._light.position.clone();
        shadowGenerator.getShadowMap().renderList.push(targetHead);
        // Fox
        let fox = new Character(this._scene, shadowGenerator, FOX, () => {
            console.log("fox loaded");
            this._camera.setTarget(fox.position);
            fox.lookAt(targetHead.position);
            fox.rotation.y = Math.PI;
        });
        this._actors.push(fox);
        // Star
        let star = new Star(this._scene, scenery);
        star.mesh.position = new BABYLON.Vector3(0, 5, 0);
        setTimeout(function () {
            console.log("Add animations.");
            //this._animationQueue.push({name: "stationary", loop: false, reversed: false});
            fox.queueAnimation({ name: "crouch", loop: false, reversed: false });
            fox.queueAnimation({ name: "crouch", loop: false, reversed: true });
            //this._animationQueue.push({name: "stationary", loop: true, reversed: false});
        }.bind(this), 10000);
        setTimeout(function () {
            console.log("Add crouch animation.");
            fox.queueAnimation({ name: "crouch", loop: false, reversed: false });
            fox.queueAnimation({ name: "crouch", loop: false, reversed: true });
        }.bind(this), 20000);
        setTimeout(function () {
            console.log("Add walk animation.");
            fox.queueAnimation({ name: "walk", loop: true, reversed: false });
        }.bind(this), 30000);
        this.controlPannel();
        console.log("Total meshes in scene: %c" +
            this._scene.meshes.length.toString(), "background: orange; color: white");
    }
    doRender() {
        // Run the render loop.
        this._engine.runRenderLoop(() => {
            this._scene.render();
            let fpsLabel = document.getElementById("fpsLabel");
            fpsLabel.innerHTML = this._engine.getFps().toFixed() + " fps";
        });
        // The canvas/window resize event handler.
        window.addEventListener('resize', () => {
            this._engine.resize();
        });
        window.addEventListener("orientationchange", () => {
            this._engine.resize();
        });
    }
    controlPannel() {
        let advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");
        let grid = new BABYLON.GUI.Grid();
        grid.addColumnDefinition(10, true);
        grid.addColumnDefinition(200, true);
        grid.addRowDefinition(20, true);
        grid.addRowDefinition(20, true);
        this._camera.cameras.forEach((camera) => {
            grid.addRowDefinition(20, true);
        });
        advancedTexture.addControl(grid);
        let gridcount = 0;
        let panel = new BABYLON.GUI.StackPanel();
        panel.width = "220px";
        panel.fontSize = "14px";
        panel.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
        panel.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER;
        let checkbox = new BABYLON.GUI.Checkbox();
        checkbox.width = "20px";
        checkbox.height = "20px";
        checkbox.isChecked = false;
        checkbox.color = "green";
        checkbox.onIsCheckedChangedObservable.add((value) => {
            console.log("%c SkyBox:", "background: blue; color: white", value);
            this._skybox.setEnabled(value);
        });
        grid.addControl(checkbox, gridcount, 0);
        let header = BABYLON.GUI.Control.AddHeader(checkbox, "SkyBox", "180px", { isHorizontal: true, controlFirst: true });
        header.color = "white";
        header.height = "20px";
        header.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        grid.addControl(header, gridcount++, 1);
        let checkbox2 = new BABYLON.GUI.Checkbox();
        checkbox2.width = "20px";
        checkbox2.height = "20px";
        checkbox2.isChecked = true;
        checkbox2.color = "green";
        checkbox2.onIsCheckedChangedObservable.add((value) => {
            console.log("%c Fog:", "background: blue; color: white", value);
            if (value) {
                this._scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
            }
            else {
                //this._scene.fogMode = BABYLON.Scene.FOGMODE_LINEAR;
                //this._scene.fogStart = 100.0;
                //this._scene.fogEnd = 200.0;
                this._scene.fogMode = BABYLON.Scene.FOGMODE_NONE;
            }
        });
        grid.addControl(checkbox2, gridcount, 0);
        let header2 = BABYLON.GUI.Control.AddHeader(checkbox2, "Fog", "180px", { isHorizontal: true, controlFirst: true });
        header2.color = "white";
        header2.height = "20px";
        header2.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        grid.addControl(header2, gridcount++, 1);
        this._camera.cameras.forEach((camera) => {
            let radio = new BABYLON.GUI.RadioButton();
            radio.width = "20px";
            radio.height = "20px";
            radio.color = "green";
            radio.isChecked = (camera.name === "ArcRotate");
            radio.onIsCheckedChangedObservable.add((state) => {
                console.log(camera.name, state);
                if (state) {
                    this._camera.setEnabled(camera);
                }
            });
            grid.addControl(radio, gridcount, 0);
            let radioHead = BABYLON.GUI.Control.AddHeader(radio, "Camera: " + camera.name, "180px", { isHorizontal: true, controlFirst: true });
            radioHead.color = "white";
            radioHead.height = "20px";
            radioHead.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
            grid.addControl(radioHead, gridcount++, 1);
        }, this);
    }
}
window.addEventListener('DOMContentLoaded', () => {
    // Create the game using the 'renderCanvas'.
    let game = new Game('renderCanvas');
    // Create the scene.
    game.createScene();
    // Start render loop.
    game.doRender();
});

},{}],2:[function(require,module,exports){
class TreeFactory {
    constructor(scene, treeTypes, shrubTypes) {
        this._scene = scene;
        this.treeTypes = treeTypes;
        this.shrubTypes = shrubTypes;
        this.trees = [];
        this.shrubs = [];
        this.treeSpecies = [];
        this.shrubSpecies = [];
        this.treeSpecies.push({ generator: this._createPine, minTypes: 2, weight: 0.2 });
        this.treeSpecies.push({ generator: this._createLollypop, minTypes: 2, weight: 0.8 });
        this.shrubSpecies.push({ generator: this._createBush, minTypes: 2, weight: 0.6 });
        this.shrubSpecies.push({ generator: this._createPine, minTypes: 2, weight: 0.2 });
        this.shrubSpecies.push({ generator: this._createLollypop, minTypes: 2, weight: 0.2 });
        // Populate at least the minTypes of each species.
        this.treeSpecies.forEach((genius) => {
            for (let i = 0; i < genius.minTypes; i++) {
                this._createTree(genius.generator);
            }
        }, this);
        this.shrubSpecies.forEach((genius) => {
            for (let i = 0; i < genius.minTypes; i++) {
                this._createShrub(genius.generator);
            }
        }, this);
        // Populate remainder.
        for (let i = this.trees.length; i < this.treeTypes; i++) {
            this._createTree();
        }
        for (let i = this.shrubs.length; i < this.shrubTypes; i++) {
            this._createShrub();
        }
    }
    _createTree(hint) {
        if (!hint) {
            let rnd = Math.random();
            let totalWeight = 0;
            this.treeSpecies.forEach((genius) => {
                if (rnd >= totalWeight && rnd < totalWeight + genius.weight) {
                    hint = genius.generator;
                }
                totalWeight += genius.weight;
            }, this);
        }
        let tree = (hint.bind(this))();
        tree.name = "tree_" + tree.name + "_" + this.trees.length;
        this.trees.push(tree);
        console.log(tree.name);
    }
    _createShrub(hint) {
        if (!hint) {
            let rnd = Math.random();
            let totalWeight = 0;
            this.shrubSpecies.forEach((genius) => {
                if (rnd >= totalWeight && rnd < totalWeight + genius.weight) {
                    hint = genius.generator;
                }
                totalWeight += genius.weight;
            }, this);
        }
        let shrub = (hint.bind(this))();
        shrub.name = "shrub_" + shrub.name + "_" + this.shrubs.length;
        this.shrubs.push(shrub);
        console.log(shrub.name);
    }
    _createPine() {
        let canopies = Math.round(Math.random() * 3) + 4;
        let height = Math.round(Math.random() * 20) + 20;
        let width = 5;
        let tree = PineGenerator(canopies, height, width, this.materialBark(), this.materialLeaves(), this._scene);
        tree.setEnabled(false);
        return tree;
    }
    _createLollypop() {
        let sizeBranch = 15 + Math.random() * 5;
        let sizeTrunk = 10 + Math.random() * 5;
        let radius = 1 + Math.random() * 4;
        let tree = QuickTreeGenerator(sizeBranch, sizeTrunk, radius, this.materialBark(), this.materialLeaves(), this._scene);
        tree.setEnabled(false);
        return tree;
    }
    _createBush() {
        let sizeBranch = 10 + Math.random() * 20;
        let tree = QuickShrub(sizeBranch, this.materialLeaves(), this._scene);
        tree.setEnabled(false);
        return tree;
    }
    materialBark() {
        let material = new BABYLON.StandardMaterial("bark", this._scene);
        material.diffuseColor = new BABYLON.Color3(0.3 + Math.random() * 0.2, 0.2 + Math.random() * 0.2, 0.2 + Math.random() * 0.1);
        material.specularColor = BABYLON.Color3.Black();
        return material;
    }
    materialLeaves() {
        let material = new BABYLON.StandardMaterial("leaves", this._scene);
        material.diffuseColor = new BABYLON.Color3(0.4 + Math.random() * 0.2, 0.5 + Math.random() * 0.4, 0.2 + Math.random() * 0.2);
        material.specularColor = BABYLON.Color3.Red();
        return material;
    }
}
//canopies number of leaf sections, height of tree, materials
// https://www.babylonjs-playground.com/#LG3GS#93
// https://github.com/BabylonJS/Extensions/tree/master/TreeGenerators/SimplePineGenerator
function PineGenerator(canopies, height, width, trunkMaterial, leafMaterial, scene) {
    let nbL = canopies + 1;
    let trunkLen = height / nbL;
    let curvePoints = function (l, t) {
        let path = [];
        let step = l / t;
        for (let i = trunkLen; i < l + trunkLen; i += step) {
            path.push(new BABYLON.Vector3(0, i, 0));
            path.push(new BABYLON.Vector3(0, i, 0));
        }
        return path;
    };
    let curve = curvePoints(height, nbL);
    let radiusFunction = function (i, distance) {
        let fact = 1;
        if (i % 2 == 0) {
            fact = .5;
        }
        let radius = Math.max(0, (nbL * 2 - i - 1) * fact);
        return radius;
    };
    let leaves = BABYLON.Mesh.CreateTube("leaves", curve, 0, 10, radiusFunction, BABYLON.Mesh.CAP_ALL, scene);
    leaves.scaling.x = width / 10;
    leaves.scaling.z = width / 10;
    let trunk = BABYLON.Mesh.CreateCylinder("trunk", height / nbL, nbL * 1.5 - nbL / 2 - 1, nbL * 1.5 - nbL / 2 - 1, 12, 1, scene);
    trunk.position.y = trunkLen / 2;
    trunk.scaling.x = width / 10;
    trunk.scaling.z = width / 10;
    leaves.material = leafMaterial;
    trunk.material = trunkMaterial;
    let tree = BABYLON.Mesh.CreateBox("pine", 1, scene);
    tree.isVisible = false;
    leaves.parent = tree;
    trunk.parent = tree;
    return tree;
}
function QuickTreeGenerator(sizeBranch, sizeTrunk, radius, trunkMaterial, leafMaterial, scene) {
    let leaves = new BABYLON.Mesh("leaves", scene);
    let vertexData = BABYLON.VertexData.CreateSphere({ segments: 2, diameter: sizeBranch });
    vertexData.applyToMesh(leaves, false);
    let positions = leaves.getVerticesData(BABYLON.VertexBuffer.PositionKind);
    let indices = leaves.getIndices();
    let numberOfPoints = positions.length / 3;
    let map = [];
    let v3 = BABYLON.Vector3;
    for (let i = 0; i < numberOfPoints; i++) {
        let p = new v3(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
        let found = false;
        for (let index = 0; index < map.length && !found; index++) {
            let array = map[index];
            let p0 = array[0];
            if (p0.equals(p) || (p0.subtract(p)).lengthSquared() < 0.01) {
                array.push(i * 3);
                found = true;
            }
        }
        if (!found) {
            let array = [];
            array.push(p, i * 3);
            map.push(array);
        }
    }
    let randomNumber = function (min, max) {
        if (min == max) {
            return (min);
        }
        let random = Math.random();
        return ((random * (max - min)) + min);
    };
    map.forEach(function (array) {
        let index, min = -sizeBranch / 10, max = sizeBranch / 10;
        let rx = randomNumber(min, max);
        let ry = randomNumber(min, max);
        let rz = randomNumber(min, max);
        for (index = 1; index < array.length; index++) {
            let i = array[index];
            positions[i] += rx;
            positions[i + 1] += ry;
            positions[i + 2] += rz;
        }
    });
    leaves.setVerticesData(BABYLON.VertexBuffer.PositionKind, positions);
    let normals = [];
    BABYLON.VertexData.ComputeNormals(positions, indices, normals);
    leaves.setVerticesData(BABYLON.VertexBuffer.NormalKind, normals);
    leaves.convertToFlatShadedMesh();
    leaves.material = leafMaterial;
    leaves.position.y = sizeTrunk + sizeBranch / 2 - 2;
    let trunk = BABYLON.Mesh.CreateCylinder("trunk", sizeTrunk, radius - 2 < 1 ? 1 : radius - 2, radius, 10, 2, scene);
    trunk.position.y = sizeTrunk / 2;
    trunk.material = trunkMaterial;
    trunk.convertToFlatShadedMesh();
    let tree = BABYLON.Mesh.CreateBox("tree", 1, scene);
    tree.isVisible = false;
    leaves.parent = tree;
    trunk.parent = tree;
    return tree;
}
function QuickShrub(sizeBranch, leafMaterial, scene) {
    let tree = new BABYLON.Mesh("shrub", scene);
    tree.isVisible = false;
    let leaves = new BABYLON.Mesh("leaves", scene);
    let vertexData = BABYLON.VertexData.CreateSphere({ segments: 2, diameter: sizeBranch });
    vertexData.applyToMesh(leaves, false);
    let positions = leaves.getVerticesData(BABYLON.VertexBuffer.PositionKind);
    let indices = leaves.getIndices();
    let numberOfPoints = positions.length / 3;
    let map = [];
    let v3 = BABYLON.Vector3;
    for (let i = 0; i < numberOfPoints; i++) {
        let p = new v3(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
        let found = false;
        for (let index = 0; index < map.length && !found; index++) {
            let array = map[index];
            let p0 = array[0];
            if (p0.equals(p) || (p0.subtract(p)).lengthSquared() < 0.01) {
                array.push(i * 3);
                found = true;
            }
        }
        if (!found) {
            let array = [];
            array.push(p, i * 3);
            map.push(array);
        }
    }
    let randomNumber = function (min, max) {
        if (min == max) {
            return (min);
        }
        let random = Math.random();
        return ((random * (max - min)) + min);
    };
    map.forEach(function (array) {
        let index, min = -sizeBranch / 5, max = sizeBranch / 5;
        let rx = randomNumber(min, max);
        let ry = randomNumber(min, max);
        let rz = randomNumber(min, max);
        for (index = 1; index < array.length; index++) {
            let i = array[index];
            positions[i] += rx;
            positions[i + 2] += rz;
            if (positions[i + 1] < 0) {
                positions[i + 1] = -sizeBranch / 2;
            }
            else {
                positions[i + 1] += ry;
            }
        }
    });
    leaves.setVerticesData(BABYLON.VertexBuffer.PositionKind, positions);
    let normals = [];
    BABYLON.VertexData.ComputeNormals(positions, indices, normals);
    leaves.setVerticesData(BABYLON.VertexBuffer.NormalKind, normals);
    leaves.convertToFlatShadedMesh();
    leaves.material = leafMaterial;
    leaves.scaling.y = randomNumber(0.2, 1);
    leaves.position.y = 0.1 + leaves.scaling.y * sizeBranch / 2;
    leaves.parent = tree;
    return tree;
}

},{}],3:[function(require,module,exports){
class BigArray extends Array {
    constructor() {
        super(...arguments);
        this.lengthPopulated = 0;
    }
}
class TrivialStack {
    constructor() {
        this.length = 0;
        this._container = [];
    }
    pop() {
        let value = this._container.pop();
        this.length = this._container.length;
        return value;
    }
    push(newValue) {
        this._container.push(newValue);
        this.length = this._container.length;
    }
}
class TrivialQueue {
    constructor() {
        this.length = 0;
        this._container = [];
    }
    pop() {
        let value = this._container.pop();
        this.length = this._container.length;
        return value;
    }
    push(newValue) {
        this._container.unshift(newValue);
        this.length = this._container.length;
    }
}
class MyStack {
    constructor(size) {
        size = size || 10;
        this.length = 0;
        this._container = new BigArray(size);
        this._size = size;
    }
    pop() {
        if (this._container.lengthPopulated === 0) {
            return;
        }
        this._container.lengthPopulated--;
        this.length = this._container.lengthPopulated;
        let value = this._container[this._container.lengthPopulated];
        //delete this._container[this._container.lengthPopulated];
        this._container[this._container.lengthPopulated] = null;
        return value;
    }
    push(newValue) {
        if (this._container.lengthPopulated === this._container.length) {
            this._container.length += this._size;
        }
        this._container[this._container.lengthPopulated] = newValue;
        this._container.lengthPopulated++;
        this.length = this._container.lengthPopulated;
    }
}
class MyQueueNode {
    constructor(value) {
        this.value = value;
    }
}
class MyQueue {
    constructor(size) {
        size = size || 10;
        this.length = 0;
        //this._container = new BigArray(size);
        //this._size = size;
    }
    pop() {
        if (this._head === undefined) {
            return undefined;
        }
        let returnNode = this._head;
        this._head = this._head.next;
        this.length--;
        return returnNode.value;
    }
    push(newValue) {
        let node = new MyQueueNode(newValue);
        if (this._head === undefined) {
            this._head = this._tail = node;
            this.length = 1;
            return;
        }
        this._tail.next = node;
        this._tail = node;
        this.length++;
    }
}
class MyMap {
    constructor(...getProperties) {
        this.length = 0;
        this._container = new BigArray(10);
        this._getProperties = getProperties;
    }
    get(key) {
        let subContainer = this._container;
        this._getProperties.forEach((getProperty) => {
            if (subContainer !== undefined) {
                let subKey = getProperty(key);
                subContainer = subContainer[subKey];
            }
        });
        return subContainer;
    }
    pop() {
        let address = this._popRecurse(this._container);
        let returnVal;
        let subContainer = this._container;
        address.forEach((subKey, index, array) => {
            if (index < array.length - 1) {
                subContainer = subContainer[subKey];
            }
            else {
                returnVal = subContainer[subContainer.lengthPopulated - 1];
                //delete subContainer[subContainer.lengthPopulated - 1];
                subContainer[subContainer.lengthPopulated - 1] = null;
                if (returnVal !== undefined) {
                    subContainer.lengthPopulated--;
                    this.length--;
                }
                while (subContainer.lengthPopulated > 0 &&
                    subContainer[subContainer.lengthPopulated - 1] === undefined) {
                    // While this is expensive, it will only happen for cases when
                    // there are empty spaces to the "left" of the pop-ed value.
                    subContainer.lengthPopulated--;
                }
            }
        });
        return returnVal;
    }
    _popRecurse(rContainer) {
        let returnVal = [];
        rContainer.forEach((node, index, array) => {
            if (returnVal.length === 0) {
                if (Array.isArray(array[index])) {
                    if ((array[index]).lengthPopulated > 0) {
                        returnVal = [index].concat(this._popRecurse(array[index]));
                    }
                }
                else {
                    returnVal = [index];
                }
            }
        });
        return returnVal;
    }
    put(key, value) {
        let subContainer = this._container;
        this._getProperties.forEach((getProperty, index, array) => {
            let subKey = getProperty(key);
            console.assert(subKey !== undefined, ("Problem running " + getProperty.name + " on " + key));
            if (index < array.length - 1) {
                while (subContainer.lengthPopulated - 1 < subKey) {
                    //subContainer.push(new BigArray(10));
                    subContainer[subContainer.lengthPopulated] = new BigArray(10);
                    subContainer.lengthPopulated++;
                }
                subContainer = subContainer[subKey];
            }
            else {
                if (subContainer[subKey] === undefined) {
                    subContainer[subKey] = value;
                    subContainer.lengthPopulated = Math.max(subKey + 1, subContainer.lengthPopulated);
                    this.length++;
                }
            }
        });
    }
    del(key) {
        let returnVal;
        let subContainer = this._container;
        this._getProperties.forEach((getProperty, index, array) => {
            let subKey = getProperty(key);
            console.assert(subKey !== undefined);
            if (index < array.length - 1) {
                let subKey = getProperty(key);
                subContainer = subContainer[subKey];
            }
            else {
                returnVal = subContainer[subKey];
                //delete subContainer[subKey];
                subContainer[subKey] = null;
                if (returnVal !== undefined) {
                    subContainer.lengthPopulated--;
                    this.length--;
                }
            }
        });
        return returnVal;
    }
}
class PriorityQueue {
    constructor(...getProperties) {
        this._getProperties = getProperties;
        this._container = [];
        this.length = 0;
    }
    /* Pop item from highest priority sub-queue. */
    pop() {
        let item;
        this._container.forEach((n, index, array) => {
            let reverseIndex = this._container.length - index - 1;
            if (item === undefined && array[reverseIndex].length) {
                item = array[reverseIndex].pop();
                console.assert(item !== undefined);
                this.length--;
            }
        });
        return item;
    }
    /* Pop item from lowest priority sub-queue. */
    popLow() {
        let item;
        this._container.forEach((n, index, array) => {
            if (item === undefined && array[index].length) {
                item = array[index].pop();
                console.assert(item !== undefined);
                this.length--;
            }
        });
        return item;
    }
    /* Add item at specified priority. */
    push(item, priority) {
        console.assert(item !== undefined);
        console.assert(priority === Math.round(priority), "Priority must be an intiger.");
        while (this._container.length < priority + 1) {
            // Add new priority sub-container.
            let container = new MyStack();
            this._container.push(container);
        }
        this._container[priority].push(item);
        this.length++;
    }
}
class TestMyStack {
    constructor() {
        let tests = [this.test_push, this.test_pop];
        tests.forEach((test) => {
            this._init();
            test.bind(this)();
        }, this);
    }
    _init() {
        this._container = new MyStack();
    }
    test_push() {
        console.log("test_push");
        console.assert(this._container.length === 0);
        this._container.push(1);
        console.assert(this._container.length === 1);
        this._container.push(2);
        console.assert(this._container.length === 2);
        this._container.push(3);
        console.assert(this._container.length === 3);
    }
    test_pop() {
        console.log("test_pop");
        console.assert(this._container.length === 0);
        this._container.push(1);
        this._container.push(2);
        this._container.push(3);
        this._container.push(4);
        console.assert(this._container.length === 4);
        let val = this._container.pop();
        console.assert(val === 4);
        console.assert(this._container.length === 3);
        val = this._container.pop();
        val = this._container.pop();
        val = this._container.pop();
        console.assert(val === 1);
        console.assert(this._container.length === 0);
        val = this._container.pop();
        console.assert(val === undefined);
        console.assert(this._container.length === 0);
    }
}
class TestMyQueue {
    constructor() {
        let tests = [this.test_push, this.test_pop];
        tests.forEach((test) => {
            this._init();
            test.bind(this)();
        }, this);
    }
    _init() {
        this._container = new MyQueue();
    }
    test_push() {
        console.log("test_push");
        console.assert(this._container.length === 0);
        this._container.push(1);
        console.assert(this._container.length === 1);
        this._container.push(2);
        console.assert(this._container.length === 2);
        this._container.push(3);
        console.assert(this._container.length === 3);
    }
    test_pop() {
        console.log("test_pop");
        console.assert(this._container.length === 0);
        this._container.push(1);
        this._container.push(2);
        this._container.push(3);
        this._container.push(4);
        console.assert(this._container.length === 4);
        let val = this._container.pop();
        console.assert(val === 1);
        console.assert(this._container.length === 3);
        val = this._container.pop();
        val = this._container.pop();
        val = this._container.pop();
        console.assert(val === 4);
        console.assert(this._container.length === 0);
        val = this._container.pop();
        console.assert(val === undefined);
        console.assert(this._container.length === 0);
    }
}
class TestMyMap {
    constructor() {
        let tests = [this.test_put, this.test_get, this.test_del, this.test_pop];
        tests.forEach((test) => {
            this._init();
            test.bind(this)();
        }, this);
    }
    _init() {
        function getX(node) {
            return node.x;
        }
        function getY(node) {
            return node.y;
        }
        this._container = new MyMap(getX, getY);
    }
    test_put() {
        console.log("test_put");
        console.assert(this._container.length === 0);
        this._container.put({ "x": 1, "y": 2 }, 3);
        console.assert(this._container.length === 1);
        this._container.put({ "x": 1, "y": 2 }, 3);
        this._container.put({ "x": 1, "y": 2 }, 4);
        console.assert(this._container.length === 1);
        this._container.put({ "x": 1, "y": 1 }, 5);
        console.assert(this._container.length === 2);
        this._container.put({ "x": 1, "y": 3 }, 6);
        console.assert(this._container.length === 3);
        this._container.put({ "x": 0, "y": 3 }, 7);
        console.assert(this._container.length === 4);
        this._container.put({ "x": 2, "y": 3 }, 8);
        console.assert(this._container.length === 5);
        this._container.put({ "x": 0, "y": 0 }, 9);
        console.assert(this._container.length === 6);
    }
    test_get() {
        console.log("test_get");
        console.assert(this._container.length === 0);
        this._container.put({ "x": 0, "y": 2 }, 1);
        this._container.put({ "x": 1, "y": 2 }, 2);
        this._container.put({ "x": 2, "y": 2 }, 3);
        this._container.put({ "x": 3, "y": 0 }, 4);
        this._container.put({ "x": 3, "y": 1 }, 5);
        this._container.put({ "x": 3, "y": 2 }, 6);
        console.assert(this._container.length === 6);
        console.assert(this._container.get({ "x": 0, "y": 2 }) === 1);
        console.assert(this._container.get({ "x": 1, "y": 2 }) === 2);
        console.assert(this._container.get({ "x": 2, "y": 2 }) === 3);
        console.assert(this._container.get({ "x": 3, "y": 0 }) === 4);
        console.assert(this._container.get({ "x": 3, "y": 1 }) === 5);
        console.assert(this._container.get({ "x": 3, "y": 2 }) === 6);
        console.assert(this._container.get({ "x": 3, "y": 3 }) === undefined);
    }
    test_del() {
        console.log("test_del");
        console.assert(this._container.length === 0);
        this._container.put({ "x": 0, "y": 2 }, 1);
        this._container.put({ "x": 1, "y": 2 }, 2);
        this._container.put({ "x": 2, "y": 2 }, 3);
        this._container.put({ "x": 3, "y": 0 }, 4);
        this._container.put({ "x": 3, "y": 1 }, 5);
        this._container.put({ "x": 3, "y": 2 }, 6);
        console.assert(this._container.length === 6);
        console.assert(this._container.del({ "x": 0, "y": 2 }) === 1);
        console.assert(this._container.length === 5);
        console.assert(this._container.del({ "x": 0, "y": 2 }) === undefined);
        console.assert(this._container.length === 5);
        console.assert(this._container.del({ "x": 1, "y": 2 }) === 2);
        console.assert(this._container.del({ "x": 1, "y": 2 }) === undefined);
        console.assert(this._container.del({ "x": 2, "y": 2 }) === 3);
        console.assert(this._container.del({ "x": 3, "y": 0 }) === 4);
        console.assert(this._container.del({ "x": 3, "y": 1 }) === 5);
        console.assert(this._container.del({ "x": 3, "y": 2 }) === 6);
        console.assert(this._container.del({ "x": 3, "y": 3 }) === undefined);
        console.assert(this._container.length === 0);
    }
    test_pop() {
        console.log("test_pop");
        console.assert(this._container.length === 0);
        this._container.put({ "x": 0, "y": 2 }, 1);
        this._container.put({ "x": 1, "y": 2 }, 2);
        this._container.put({ "x": 4, "y": 1 }, 5);
        this._container.put({ "x": 2, "y": 2 }, 3);
        this._container.put({ "x": 4, "y": 0 }, 4);
        this._container.put({ "x": 4, "y": 2 }, 6);
        console.assert(this._container.length === 6);
        let val = this._container.pop();
        console.assert(val >= 1 && val <= 6);
        console.assert(this._container.length === 5);
        val = this._container.pop();
        console.assert(val >= 1 && val <= 6);
        console.assert(this._container.length === 4);
        val = this._container.pop();
        console.assert(val >= 1 && val <= 6);
        console.assert(this._container.length === 3);
        val = this._container.pop();
        console.assert(val >= 1 && val <= 6);
        console.assert(this._container.length === 2);
        val = this._container.pop();
        console.assert(val >= 1 && val <= 6);
        console.assert(this._container.length === 1);
        val = this._container.pop();
        console.assert(val >= 1 && val <= 6);
        console.assert(this._container.length === 0);
        val = this._container.pop();
        console.assert(val === undefined);
        console.assert(this._container.length === 0);
    }
}
class TestPriorityQueue {
    constructor() {
        let tests = [this.test_push, this.test_pop, this.test_popLow];
        tests.forEach((test) => {
            this._init();
            test.bind(this)();
        }, this);
    }
    _init() {
        function getX(node) {
            return node.x;
        }
        function getY(node) {
            return node.y;
        }
        this._pq = new PriorityQueue(getX, getY);
    }
    test_push() {
        console.log("test_push");
        console.assert(this._pq.length === 0);
        this._pq.push({ "x": 1, "y": 1 }, 1);
        console.assert(this._pq.length === 1);
        this._pq.push({ "x": 0, "y": 1 }, 1);
        this._pq.push({ "x": 2, "y": 1 }, 1);
        this._pq.push({ "x": 1, "y": 0 }, 1);
        console.assert(this._pq.length === 4);
    }
    test_pop() {
        console.log("test_pop");
        this._pq.push({ "x": 1, "y": 0 }, 1);
        this._pq.push({ "x": 1, "y": 1 }, 1);
        this._pq.push({ "x": 3, "y": 0 }, 2);
        this._pq.push({ "x": 3, "y": 1 }, 2);
        this._pq.push({ "x": 0, "y": 0 }, 1);
        this._pq.push({ "x": 0, "y": 2 }, 1);
        // Pop higher priority first.
        let item0 = this._pq.pop();
        let item1 = this._pq.pop();
        console.assert(item0["x"] === 3 && item1["x"] === 3);
        console.assert(item0["y"] === 0 || item1["y"] === 0);
        console.assert(item0["y"] === 1 || item1["y"] === 1);
        console.assert(this._pq.length === 4);
        // Pop lower priority next.
        let item2 = this._pq.pop();
        let item3 = this._pq.pop();
        let item4 = this._pq.pop();
        let item5 = this._pq.pop();
        console.assert(item2["x"] < 3);
        console.assert(item3["x"] < 3);
        console.assert(item4["x"] < 3);
        console.assert(item5["x"] < 3);
        console.assert(this._pq.length === 0);
        // None left to pop.
        let item6 = this._pq.pop();
        console.assert(item6 === undefined);
    }
    test_popLow() {
        console.log("test_popLow");
        this._pq.push({ "x": 2, "y": 0 }, 2);
        this._pq.push({ "x": 2, "y": 1 }, 2);
        this._pq.push({ "x": 1, "y": 0 }, 1);
        this._pq.push({ "x": 1, "y": 1 }, 1);
        this._pq.push({ "x": 3, "y": 0 }, 2);
        this._pq.push({ "x": 3, "y": 2 }, 2);
        let item0 = this._pq.popLow();
        let item1 = this._pq.popLow();
        console.assert(item0["x"] === 1 && item1["x"] === 1);
        console.assert(item0["y"] === 0 || item1["y"] === 0);
        console.assert(item0["y"] === 1 || item1["y"] === 1);
        console.assert(this._pq.length === 4);
        let item2 = this._pq.popLow();
        let item3 = this._pq.popLow();
        let item4 = this._pq.popLow();
        let item5 = this._pq.popLow();
        console.assert(item2["x"] > 1);
        console.assert(item3["x"] > 1);
        console.assert(item4["x"] > 1);
        console.assert(item5["x"] > 1);
        console.assert(this._pq.length === 0);
        // None left to pop.
        let item6 = this._pq.pop();
        console.assert(item6 === undefined);
    }
}
class ProfileContainers {
    constructor() {
        let tests = [this.testTrivialStack, this.testTrivialQueue, this.testStack, this.testQueue];
        tests.forEach((test) => {
            this._init();
            test.bind(this)();
        }, this);
    }
    _init() {
    }
    manyPush(container) {
        console.assert(container.length === 0);
        for (let i = 0; i < 100000; i++) {
            container.push(i);
        }
        console.assert(container.length === 100000);
    }
    manyPushPop(container) {
        console.assert(container.length === 0);
        for (let i = 0; i < 100000; i++) {
            container.push(i);
        }
        console.assert(container.length === 100000);
        for (let i = 0; i < 100000 - 1; i++) {
            container.pop();
        }
        console.assert(container.length === 1);
        let val = container.pop();
        console.assert(container.length === 0);
        console.assert(val === 0 || val === 100000 - 1);
    }
    testTrivialStack() {
        console.log("testTrivialStack");
        let container = new TrivialStack();
        console.time("manyPush");
        this.manyPush(container);
        console.timeEnd("manyPush");
        container = new TrivialStack();
        console.time("manyPushPop");
        this.manyPushPop(container);
        console.timeEnd("manyPushPop");
    }
    testTrivialQueue() {
        console.log("testTrivialQueue");
        let container = new TrivialQueue();
        console.time("manyPush");
        this.manyPush(container);
        console.timeEnd("manyPush");
        container = new TrivialQueue();
        console.time("manyPushPop");
        this.manyPushPop(container);
        console.timeEnd("manyPushPop");
    }
    testStack() {
        console.log("testStack");
        let container = new MyStack(1000000);
        console.time("manyPush");
        this.manyPush(container);
        console.timeEnd("manyPush");
        container = new MyStack(1000000);
        console.time("manyPushPop");
        this.manyPushPop(container);
        console.timeEnd("manyPushPop");
    }
    testQueue() {
        console.log("testQueue");
        let container = new MyQueue();
        console.time("manyPush");
        this.manyPush(container);
        console.timeEnd("manyPush");
        container = new MyQueue();
        console.time("manyPushPop");
        this.manyPushPop(container);
        console.timeEnd("manyPushPop");
    }
}

},{}]},{},[1,2,3])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvZ2FtZS50cyIsInNyYy9wbGFudEdlbmVyYXRvci50cyIsInNyYy9wcmlvcml0eVF1ZXVlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUEsd0RBQXdEO0FBQ3hELHlDQUF5QztBQUN6Qyx3Q0FBd0M7QUFFeEMsSUFBSSxTQUFTLEdBQUcsU0FBUyxDQUFDO0FBQzFCLElBQUksR0FBRyxHQUFHLGFBQWEsQ0FBQztBQUN4QixJQUFJLEtBQUssR0FBRyxHQUFHLENBQUM7QUFDaEIsSUFBSSxlQUFlLEdBQUcsSUFBSSxDQUFDO0FBQzNCLElBQUksaUJBQWlCLEdBQUcsQ0FBQyxDQUFDO0FBRTFCLElBQUksYUFBYSxHQUFhLEVBQUUsQ0FBQztBQUNqQyxTQUFTLFlBQVksQ0FBQyxHQUFXLEVBQUUsR0FBVyxFQUFFLElBQVM7SUFDdkQsR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDLENBQUM7SUFDZixHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsQ0FBQztJQUVmLElBQUksYUFBYSxDQUFDLElBQUksQ0FBQyxLQUFLLFNBQVMsRUFBRTtRQUNyQyxhQUFhLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO0tBQ3JDO0lBRUQsT0FBTyxHQUFHLEdBQUcsYUFBYSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQyxDQUFDO0FBQ2pELENBQUM7QUFrQkQsU0FBUyxVQUFVLENBQUMsS0FBWTtJQUM5QixJQUFJLFNBQVMsR0FBRyxFQUFFLEdBQUcsS0FBSyxDQUFDLENBQUMsR0FBRyxHQUFHLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQztJQUM3QyxJQUFJLEtBQUssQ0FBQyxTQUFTLEtBQUssU0FBUyxFQUFFO1FBQ2pDLFNBQVMsSUFBSSxHQUFHLEdBQUcsS0FBSyxDQUFDLFNBQVMsQ0FBQztLQUNwQztJQUNELE9BQU8s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LElBQUksV0FBVyxHQUFHLElBQUksV0FBVyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRXRELElBQUksQ0FBQyxVQUFVLEdBQUcsRUFBRSxDQUFDO1FBQ3JCLElBQUksQ0FBQyxZQUFZLEdBQUcsQ0FBQyxDQUFDO1FBQ3RCLHVEQUF1RDtRQUN2RCxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUMsQ0FBQztRQUM3QyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQyxDQUFDO1FBQ2xELDZCQUE2QjtRQUM3QixJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQztRQUN6QyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQztRQUN6QyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQztRQUN6QyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQztRQUN6QyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQztRQUN6QyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQztRQUN6QyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQztRQUN6QyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQztRQUN6QyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQztRQUN6QyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQztRQUV6QyxJQUFJLENBQUMsV0FBVyxHQUFHLEVBQUUsQ0FBQztRQUN0QixJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDL0MsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUM7UUFDM0MsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUM7UUFDM0MsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUM7UUFDM0MsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUM7UUFDM0MsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUM7UUFDM0MsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUM7UUFDM0MsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUM7UUFDM0MsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUM7UUFDM0MsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUM7UUFFM0MsSUFBSSxDQUFDLGlCQUFpQixHQUFHLEVBQUUsQ0FBQztRQUM1QixJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLENBQUM7UUFDdkQsSUFBSSxDQUFDLGlC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LFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDeEIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDeEIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDeEIsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQztRQUU3QyxJQUFJLEdBQUcsR0FBVyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQ3hDLE9BQU8sQ0FBQyxNQUFNLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQzFCLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFFN0MsR0FBRyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDNUIsR0FBRyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDNUIsR0FBRyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDNUIsT0FBTyxDQUFDLE1BQU0sQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDMUIsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQztRQUU3QyxHQUFHLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUM1QixPQUFPLENBQUMsTUFBTSxDQUFDLEdBQUcsS0FBSyxTQUFTLENBQUMsQ0FBQztRQUNsQyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDO0lBQy9DLENBQUM7Q0FDRjtBQUVELE1BQU0sU0FBUztJQUdiO1FBQ0UsSUFBSSxLQUFLLEdBQUcsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDekUsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFO1lBQ3JCLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNiLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztRQUNwQixDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDWCxDQUFDO0lBRU8sS0FBSztRQUNYLFNBQVMsSUFBSSxDQUFDLElBQWdCO1lBQzVCLE9BQU8sSUFBSSxDQUFDLENBQUMsQ0FBQztRQUNoQixDQUFDO1FBQ0QsU0FBUyxJQUFJLENBQUMsSUFBZ0I7WUFDNUIsT0FBTyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ2hCLENBQUM7UUFDRCxJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksS0FBSyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztJQUMxQyxDQUFDO0lBRUQsUUFBUTtRQUNOLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUM7UUFFeEIsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQztRQUM3QyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3pDLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDN0MsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN6QyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3pDLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDN0MsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN6QyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQzdDLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDekMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQztRQUM3QyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3pDLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDN0MsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN6QyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQzdDLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDekMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQztJQUMvQyxDQUFDO0lBRUQsUUFBUTtRQUNOLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUM7UUFFeEIsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQztRQUM3QyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3pDLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDekMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN6QyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3pDLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDekMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN6QyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBRTdDLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQzVELE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQzVELE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQzVELE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQzVELE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQzVELE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQzVELE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUMsQ0FBQyxLQUFLLFNBQVMsQ0FBQyxDQUFDO0lBQ3RFLENBQUM7SUFFRCxRQUFRO1FBQ04sT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUV4QixPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQzdDLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDekMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN6QyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3pDLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDekMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN6QyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3pDLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFFN0MsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDNUQsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQztRQUM3QyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFDLENBQUMsS0FBSyxTQUFTLENBQUMsQ0FBQztRQUNwRSxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQzdDLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQzVELE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUMsQ0FBQyxLQUFLLFNBQVMsQ0FBQyxDQUFDO1FBQ3BFLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQzVELE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQzVELE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQzVELE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQzVELE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUMsQ0FBQyxLQUFLLFNBQVMsQ0FBQyxDQUFDO1FBQ3BFLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFDL0MsQ0FBQztJQUVELFFBQVE7UUFDTixPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBRXhCLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDN0MsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN6QyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3pDLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDekMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN6QyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3pDLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDekMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQztRQUU3QyxJQUFJLEdBQUcsR0FBVyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQ3hDLE9BQU8sQ0FBQyxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDckMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQztRQUU3QyxHQUFHLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUM1QixPQUFPLENBQUMsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ3JDLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFFN0MsR0FBRyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDNUIsT0FBTyxDQUFDLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUNyQyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBRTdDLEdBQUcsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQzVCLE9BQU8sQ0FBQyxN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QUMsS0FBSyxDQUFDLElBQUksS0FBSyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQ3JELE9BQU8sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxLQUFLLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDckQsT0FBTyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLEtBQUssQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUNyRCxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBRXRDLDJCQUEyQjtRQUMzQixJQUFJLEtBQUssR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQzNCLElBQUksS0FBSyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDM0IsSUFBSSxLQUFLLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUMzQixJQUFJLEtBQUssR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQzNCLE9BQU8sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQy9CLE9BQU8sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQy9CLE9BQU8sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQy9CLE9BQU8sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQy9CLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFFdEMsb0JBQW9CO1FBQ3BCLElBQUksS0FBSyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDM0IsT0FBTyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEtBQUssU0FBUyxDQUFDLENBQUM7SUFDdEMsQ0FBQztJQUVELFdBQVc7UUFDVCxPQUFPLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBQzNCLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDbkMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNuQyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ25DLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDbkMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNuQyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRW5DLElBQUksS0FBSyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDOUIsSUFBSSxLQUFLLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUM5QixPQUFPLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksS0FBSyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQ3JELE9BQU8sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxLQUFLLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDckQsT0FBTyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLEtBQUssQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUNyRCxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBRXRDLElBQUksS0FBSyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDOUIsSUFBSSxLQUFLLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUM5QixJQUFJLEtBQUssR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQzlCLElBQUksS0FBSyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDOUIsT0FBTyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDL0IsT0FBTyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDL0IsT0FBTyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDL0IsT0FBTyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDL0IsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMs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QUFDLENBQUM7UUFDekIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUN6QixPQUFPLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBRTVCLFNBQVMsR0FBRyxJQUFJLE9BQU8sRUFBRSxDQUFDO1FBQzFCLE9BQU8sQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUM7UUFDNUIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUM1QixPQUFPLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFDO0lBQ2pDLENBQUM7Q0FFRiIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsIi8vLzxyZWZlcmVuY2UgcGF0aD1cIjNyZFBhcnR5L2JhYnlsb24uZ3VpLm1vZHVsZS5kLnRzXCIgLz5cbi8vLzxyZWZlcmVuY2UgcGF0aD1cInBsYW50R2VuZXJhdG9yLnRzXCIgLz5cbi8vLzxyZWZlcmVuY2UgcGF0aD1cInByaW9yaXR5UXVldWUudHNcIiAvPlxuXG5sZXQgU0NFTkVQQVRIID0gXCJzY2VuZXMvXCI7XG5sZXQgRk9YID0gXCJmb3guYmFieWxvblwiO1xubGV0IFNDQUxFID0gMTAwO1xubGV0IEFOSU1fTUVSR0VfUkFURSA9IDAuMDU7XG5sZXQgU0NFTkVSWV9SRUNVUlNJT04gPSA4O1xuXG5sZXQgcmFuZG9tTnVtYmVyczogbnVtYmVyW10gPSBbXTtcbmZ1bmN0aW9uIHNlZWRlZFJhbmRvbShtYXg6IG51bWJlciwgbWluOiBudW1iZXIsIHNlZWQ6IGFueSkgOiBudW1iZXIge1xuICBtYXggPSBtYXggfHwgMTtcbiAgbWluID0gbWluIHx8IDA7XG5cbiAgaWYgKHJhbmRvbU51bWJlcnNbc2VlZF0gPT09IHVuZGVmaW5lZCkge1xuICAgIHJhbmRvbU51bWJlcnNbc2VlZF0gPSBNYXRoLnJhbmRvbSgpO1xuICB9XG5cbiAgcmV0dXJuIG1pbiArIHJhbmRvbU51bWJlcnNbc2VlZF0gKiAobWF4IC0gbWluKTtcbn1cblxuaW50ZXJmYWNlIEFuaW1hdGVSZXF1ZXN0IHtcbiAgbmFtZTogc3RyaW5nO1xuICBsb29wOiBib29sZWFuO1xuICByZXZlcnNlZDogYm9vbGVhbjtcbiAgZGlydHk/OiBib29sZWFuO1xuICBydW5Db3VudD86IG51bWJlcjtcbiAgYW5pbWF0aW9uPzogQkFCWUxPTi5BbmltYXRhYmxlO1xuICBjbGVhbnVwPzogYm9vbGVhbjtcbn1cblxuaW50ZXJmYWNlIENvb3JkIHtcbiAgeDogbnVtYmVyO1xuICB5OiBudW1iZXI7XG4gIHJlY3Vyc2lvbj86IG51bWJlcjtcbn1cblxuZnVuY3Rpb24gY29vcmRUb0tleShjb29yZDogQ29vcmQpOiBzdHJpbmcge1xuICBsZXQgcmV0dXJuVmFsID0gXCJcIiArIGNvb3JkLnggKyBcIl9cIiArIGNvb3JkLnk7XG4gIGlmIChjb29yZC5yZWN1cnNpb24gIT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVyblZhbCArPSBcIl9cIiArIGNvb3JkLnJlY3Vyc2lvbjtcbiAgfVxuICByZXR1cm4gcmV0dXJuVmFsO1xufVxuXG5mdW5jdGlvbiBrZXlUb0Nvb3JkKGtleTogc3RyaW5nKTogQ29vcmQge1xuICBsZXQgcGFyYW1zID0ga2V5LnNwbGl0KFwiX1wiKTtcbiAgbGV0IHJldHVyblZhbDogQ29vcmQ7XG4gIHJldHVyblZhbC54ID0gTnVtYmVyKHBhcmFtc1swXSk7XG4gIHJldHVyblZhbC55ID0gTnVtYmVyKHBhcmFtc1sxXSk7XG4gIGlmIChwYXJhbXMubGVuZ3RoID4gMikge1xuICAgIHJldHVyblZhbC5yZWN1cnNpb24gPSBOdW1iZXIocGFyYW1zWzJdKTtcbiAgfVxuICByZXR1cm4gcmV0dXJuVmFsO1xufVxuXG5mdW5jdGlvbiBnZXRYKG5vZGU6IHtcInhcIiwgXCJ5XCJ9KTogbnVtYmVyIHtcbiAgcmV0dXJuIG5vZGUueDtcbn1cbmZ1bmN0aW9uIGdldFkobm9kZToge1wieFwiLCBcInlcIn0pOiBudW1iZXIge1xuICByZXR1cm4gbm9kZS55O1xufVxuZnVuY3Rpb24gZ2V0UmVjdXJzaW9uKG5vZGU6IHtcInhcIiwgXCJ5XCIsIFwicmVjdXJzaW9uXCJ9KTogbnVtYmVyIHtcbiAgcmV0dXJuIG5vZGUucmVjdXJzaW9uO1xufVxuXG4vKiBEb24ndCBib3RoZXIgZG9pbmcgdGhlIHNxdWFyZSByb290IG9mIFB5dGhhZ29yYXMuIFVzZWZ1bCBmb3IgY29tcGFyaW5nIGRpc3RhbmNlcy4gKi9cbmZ1bmN0aW9uIGRpc3RCZXR3ZWVuKGE6IENvb3JkLCBiOiBDb29yZCk6IG51bWJlciB7XG4gIC8vcmV0dXJuIE1hdGguYWJzKGEueCAtIGIueCkgKiBNYXRoLmFicyhhLnggLSBiLngpICsgTWF0aC5hYnMoYS55IC0gYi55KSAqIE1hdGguYWJzKGEueSAtIGIueSk7XG4gIHJldHVybiBNYXRoLnJvdW5kKDEuNSAqIE1hdGguc3FydCgoYS54IC0gYi54KSAqIChhLnggLSBiLngpICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAoYS55IC0gYi55KSAqIChhLnkgLSBiLnkpKSk7XG59XG5cbmNsYXNzIFN0YXIge1xuICBwcml2YXRlIF9zY2VuZTogQkFCWUxPTi5TY2VuZTtcbiAgcHJpdmF0ZSBfc2NlbmVyeTogU2NlbmVyeTtcbiAgcHJpdmF0ZSBfaGVhZGluZzogbnVtYmVyO1xuICBwcml2YXRlIF9oZWFkaW5nRGlmZjogbnVtYmVyO1xuICBwcml2YXRlIF9zcGVlZDogbnVtYmVyO1xuICBwcml2YXRlIF9zcGVlZE1heDogbnVtYmVyO1xuICBwcml2YXRlIF9oZWlnaHREaWZmOiBudW1iZXI7XG4gIHByaXZhdGUgX2RlYnVnVGltZXI6IG51bWJlcjtcbiAgcHJpdmF0ZSBfbmV4dFVwZGF0ZTogbnVtYmVyO1xuICBwcml2YXRlIF90aWNrOiBudW1iZXI7XG5cbiAgbWVzaDogQkFCWUxPTi5NZXNoO1xuXG4gIGNvbnN0cnVjdG9yKHNjZW5lOiBCQUJZTE9OLlNjZW5lLCBzY2VuZXJ5OiBTY2VuZXJ5KSB7XG4gICAgdGhpcy5fc2NlbmUgPSBzY2VuZTtcbiAgICB0aGlzLl9zY2VuZXJ5ID0gc2NlbmVyeTtcbiAgICB0aGlzLl9oZWFkaW5nID0gMDtcbiAgICB0aGlzLl9oZWFkaW5nRGlmZiA9IDAuMDAxO1xuICAgIHRoaXMuX3NwZWVkID0gMTA7XG4gICAgdGhpcy5fc3BlZWRNYXggPSAxMDtcbiAgICB0aGlzLl9oZWlnaHREaWZmID0gMDtcblxuICAgIHZhciBnbCA9IG5ldyBCQUJZTE9OLkdsb3dMYXllcihcImdsb3dcIiwgdGhpcy5fc2NlbmUpO1xuXG4gICAgbGV0IHB5cmFtaWRBID1cbiAgICAgIEJBQllMT04uTWVzaEJ1aWxkZXIuQ3JlYXRlUG9seWhlZHJvbihcInB5cmFtaWRBXCIsIHt0eXBlOiAwLCBzaXplOiAxfSwgdGhpcy5fc2NlbmUpO1xuICAgIGxldCBweXJhbWlkQiA9XG4gICAgICBCQUJZTE9OLk1lc2hCdWlsZGVyLkNyZWF0ZVBvbHloZWRyb24oXCJweXJhbWlkQlwiLCB7dHlwZTogMCwgc2l6ZTogMX0sIHRoaXMuX3NjZW5lKTtcbiAgICBweXJhbWlkQi5yb3RhdGUoQkFCWUxPTi5BeGlzLlksIE1hdGguUEkpO1xuXG4gICAgbGV0IHN0YXJNYXRlcmlhbFcgPSBuZXcgQkFCWUxPTi5TdGFuZGFyZE1hdGVyaWFsKFwic3Rhck1hdGVyaWFsV1wiLCB0aGlzLl9zY2VuZSk7XG4gICAgc3Rhck1hdGVyaWFsVy5lbWlzc2l2ZUNvbG9yID0gbmV3IEJBQllMT04uQ29sb3IzKDEsIDEsIDEpO1xuICAgIGxldCBzdGFyTWF0ZXJpYWxZID0gbmV3IEJBQllMT04uU3RhbmRhcmRNYXRlcmlhbChcInN0YXJNYXRlcmlhbFlcIiwgdGhpcy5fc2NlbmUpO1xuICAgIHN0YXJNYXRlcmlhbFkuZW1pc3NpdmVDb2xvciA9IG5ldyBCQUJZTE9OLkNvbG9yMygwLjUsIDEsIDEpO1xuXG4gICAgcHlyYW1pZEEubWF0ZXJpYWwgPSBzdGFyTWF0ZXJpYWxXO1xuICAgIHB5cmFtaWRCLm1hdGVyaWFsID0gc3Rhck1hdGVyaWFsWTtcblxuICAgIHRoaXMubWVzaCA9IEJBQllMT04uTWVzaC5DcmVhdGVCb3goXCJzdGFyXCIsIDEsIHRoaXMuX3NjZW5lKTtcbiAgICB0aGlzLm1lc2guaXNWaXNpYmxlID0gZmFsc2U7XG4gICAgcHlyYW1pZEEucGFyZW50ID0gdGhpcy5tZXNoO1xuICAgIHB5cmFtaWRCLnBhcmVudCA9IHRoaXMubWVzaDtcblxuICAgIHRoaXMuX3NjZW5lLnJlZ2lzdGVyQmVmb3JlUmVuZGVyKCgpID0+IHtcbiAgICAgIHRoaXMucmFuZG9tV2FsaygpO1xuICAgIH0pO1xuICB9XG5cbiAgcmFuZG9tV2FsaygpIDogdm9pZCB7XG4gICAgbGV0IHRpbWUgPSBNYXRoLnJvdW5kKG5ldyBEYXRlKCkuZ2V0VGltZSgpIC8gMTAwMCk7XG4gICAgbGV0IGZwcyA9IHRoaXMuX3NjZW5lLmdldEVuZ2luZSgpLmdldEZwcygpO1xuXG4gICAgLy8gTGV0IGZwcyBzdGFiaWxpc2UgYWZ0ZXIgbWlzc2luZyBzY3JlZW4gdXBkYXRlcyBkdWUgdG8gaW5hY3RpdmUgYnJvd3NlciB0YWIuXG4gICAgaWYgKHRpbWUgLSB0aGlzLl90aWNrID4gMSkge1xuICAgICAgdGhpcy5fbmV4dFVwZGF0ZSA9IHRpbWUgKyAyO1xuICAgIH1cbiAgICBpZiAodGhpcy5fdGljayAhPT0gdGltZSkge1xuICAgICAgdGhpcy5fdGljayA9IHRpbWU7XG4gICAgfVxuXG4gICAgaWYgKGZwcyA8PSAwIHx8IHRoaXMuX25leHRVcGRhdGUgPiB0aW1lKSB7XG4gICAgICBjb25zb2xlLmxvZyhcIkxpbWl0aW5nIHN0YXIgbW92ZW1lbnQuXCIsIHRoaXMuX25leHRVcGRhdGUsIHRpbWUpO1xuICAgICAgZnBzID0gNjA7XG4gICAgfSBlbHNlIGlmIChmcHMgPiA2MCkge1xuICAgICAgZnBzID0gNjA7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX25leHRVcGRhdGUgPSB0aW1lO1xuICAgIH1cblxuICAgIGxldCBjZWxsSGVpZ2h0ID1cbiAgICAgIHRoaXMuX3NjZW5lcnkuZ2V0SGVpZ2h0V29ybGQoe3g6IHRoaXMubWVzaC5wb3NpdGlvbi54LCB5OiB0aGlzLm1lc2gucG9zaXRpb24uen0pIHx8IDA7XG4gICAgdGhpcy5faGVpZ2h0RGlmZiA9IChjZWxsSGVpZ2h0IC0gdGhpcy5tZXNoLnBvc2l0aW9uLnkpIC8gMyArIDE7XG5cbiAgICBsZXQgZGlzdGFuY2VUb01hcENlbnRlciA9IE1hdGguYWJzKHRoaXMubWVzaC5wb3NpdGlvbi54KSArIE1hdGguYWJzKHRoaXMubWVzaC5wb3NpdGlvbi56KTtcbiAgICBsZXQgYW5nbGVUb01hcENlbnRlciA9IChcbiAgICAgIE1hdGguYXRhbjIodGhpcy5tZXNoLnBvc2l0aW9uLngsIHRoaXMubWVzaC5wb3NpdGlvbi56KSArIE1hdGguUEkpICUgKDIgKiBNYXRoLlBJKTtcblxuICAgIGxldCBhbmdsZURpZmYgPSBhbmdsZVRvTWFwQ2VudGVyIC0gdGhpcy5faGVhZGluZztcbiAgICBsZXQgYmlhc1RvQ2VudGVyID0gMDtcbiAgICBpZiAoYW5nbGVEaWZmIDw9IE1hdGguUEkpIHtcbiAgICAgIGJpYXNUb0NlbnRlciA9IChhbmdsZURpZmYgPCAwKSA/IC0wLjAwMDEgOiAwLjAwMDE7XG4gICAgfSBlbHNlIHtcbiAgICAgIGJpYXNUb0NlbnRlciA9IChhbmdsZURpZmYgPiAwKSA/IC0wLjAwMDEgOiAwLjAwMDE7XG4gICAgfVxuICAgIGJpYXNUb0NlbnRlciAqPSAoNjAgLyBmcHMpO1xuICAgIGJpYXNUb0NlbnRlciAqPSBkaXN0YW5jZVRvTWFwQ2VudGVyIC8gMTA7XG5cbiAgICB0aGlzLl9oZWFkaW5nRGlmZiAvPSAoMS4wMSAqIDYwIC8gZnBzKTtcbiAgICB0aGlzLl9oZWFkaW5nRGlmZiArPSBiaWFzVG9DZW50ZXI7XG4gICAgdGhpcy5faGVhZGluZ0RpZmYgKz0gKE1hdGgucmFuZG9tKCkgLSAwLjUpIC8gZnBzO1xuICAgIHRoaXMudHVybih0aGlzLl9oZWFkaW5nRGlmZik7XG4gICAgdGhpcy5tb3ZlRm9yd2FyZHMoZnBzKTtcblxuICAgIGlmICh0aW1lICUgNjAgPT09IDAgJiYgdGltZSAhPT0gdGhpcy5fZGVidWdUaW1lcikge1xuICAgICAgY29uc29sZS5sb2codGhpcy5tZXNoLnBvc2l0aW9uLngsIHRoaXMubWVzaC5wb3NpdGlvbi55LCB0aGlzLm1lc2gucG9zaXRpb24ueik7XG4gICAgICB0aGlzLl9kZWJ1Z1RpbWVyID0gdGltZTtcbiAgICB9XG4gIH1cblxuICBtb3ZlRm9yd2FyZHMoZnBzOiBudW1iZXIpIDogdm9pZCB7XG4gICAgdGhpcy5tZXNoLnBvc2l0aW9uLnggKz0gdGhpcy5fc3BlZWQgKiBNYXRoLnNpbih0aGlzLl9oZWFkaW5nKSAvIGZwcztcbiAgICB0aGlzLm1lc2gucG9zaXRpb24ueiArPSB0aGlzLl9zcGVlZCAqIE1hdGguY29zKHRoaXMuX2hlYWRpbmcpIC8gZnBzO1xuXG4gICAgdGhpcy5tZXNoLnBvc2l0aW9uLnkgKz0gdGhpcy5fc3BlZWQgKiB0aGlzLl9oZWlnaHREaWZmIC8gKDIgKiBmcHMpO1xuICB9XG5cbiAgdHVybihhbmdsZTogbnVtYmVyKSA6IHZvaWQge1xuICAgIHRoaXMuX2hlYWRpbmcgKz0gYW5nbGU7XG4gICAgaWYgKHRoaXMuX2hlYWRpbmcgPCAwKSB7XG4gICAgICB0aGlzLl9oZWFkaW5nICs9IDIgKiBNYXRoLlBJO1xuICAgIH1cbiAgICBpZiAodGhpcy5faGVhZGluZyA+IDIgKiBNYXRoLlBJKSB7XG4gICAgICB0aGlzLl9oZWFkaW5nIC09IDIgKiBNYXRoLlBJO1xuICAgIH1cbiAgfVxuXG4gIG1vZGlmeVNwZWVkKGRpZmY6IG51bWJlcikgOiB2b2lkIHtcbiAgICB0aGlzLl9zcGVlZCArPSBkaWZmO1xuICAgIGlmICh0aGlzLl9zcGVlZCA8IDApIHtcbiAgICAgIHRoaXMuX3NwZWVkID0gMDtcbiAgICB9XG4gICAgaWYgKHRoaXMuX3NwZWVkID4gdGhpcy5fc3BlZWRNYXgpIHtcbiAgICAgIHRoaXMuX3NwZWVkID0gdGhpcy5fc3BlZWRNYXg7XG4gICAgfVxuICB9XG59XG5cbmNsYXNzIENoYXJhY3RlciB7XG4gIHByaXZhdGUgX3NjZW5lOiBCQUJZTE9OLlNjZW5lO1xuICBwcml2YXRlIF9zaGFkZG93czogQkFCWUxPTi5TaGFkb3dHZW5lcmF0b3I7XG4gIHByaXZhdGUgX21lc2g6IEJBQllMT04uTWVzaDtcbiAgcHJpdmF0ZSBfc2tlbGV0b246IEJBQllMT04uU2tlbGV0b247XG4gIHByaXZhdGUgX2JvbmVzOiB7W2lkOiBzdHJpbmddIDogQkFCWUxPTi5Cb25lfTtcbiAgcHJpdmF0ZSBfb25Mb2FkZWQ6ICgpID0+IHZvaWQ7XG4gIHByaXZhdGUgX2xvb2tBdDogQkFCWUxPTi5WZWN0b3IzO1xuICBwcml2YXRlIF9sb29rQXROZWNrOiBCQUJZTE9OLlZlY3RvcjM7XG4gIHByaXZhdGUgX2xvb2tDdHJsSGVhZDogQkFCWUxPTi5Cb25lTG9va0NvbnRyb2xsZXI7XG4gIHByaXZhdGUgX2xvb2tDdHJsTmVjazogQkFCWUxPTi5Cb25lTG9va0NvbnRyb2xsZXI7XG4gIHByaXZhdGUgX2FuaW1hdGlvbnM6IHtbaWQ6IHN0cmluZ10gOiBCQUJZTE9OLkFuaW1hdGlvblJhbmdlfTtcbiAgcHJpdmF0ZSBfYW5pbWF0aW9uUXVldWU6IEFuaW1hdGVSZXF1ZXN0W107XG4gIHByaXZhdGUgX2FuaW1hdGlvbkN1cnJlbnQ6IEFuaW1hdGVSZXF1ZXN0O1xuICBwcml2YXRlIF9hbmltYXRpb25MYXN0OiBBbmltYXRlUmVxdWVzdDtcbiAgcHJpdmF0ZSBfYW5pbWF0aW9uT2JzZXJ2YWJsZTogQkFCWUxPTi5PYnNlcnZlcjxCQUJZTE9OLlNjZW5lPjtcblxuICBwb3NpdGlvbjogQkFCWUxPTi5WZWN0b3IzO1xuICByb3RhdGlvbjogQkFCWUxPTi5WZWN0b3IzO1xuXG4gIGNvbnN0cnVjdG9yKHNjZW5lOiBCQUJZTE9OLlNjZW5lLFxuICAgICAgICAgICAgICBzaGFkZG93czogQkFCWUxPTi5TaGFkb3dHZW5lcmF0b3IsXG4gICAgICAgICAgICAgIGZpbGVuYW1lOiBzdHJpbmcsXG4gICAgICAgICAgICAgIG9uTG9hZGVkPzogKCkgPT4gdm9pZCkge1xuICAgIGNvbnNvbGUubG9nKFwiQ3JlYXRpbmcgQ2hhcmFjdGVyIGZyb20gXCIgKyBmaWxlbmFtZSk7XG4gICAgdGhpcy5fc2NlbmUgPSBzY2VuZTtcbiAgICB0aGlzLl9zaGFkZG93cyA9IHNoYWRkb3dzO1xuICAgIHRoaXMuX29uTG9hZGVkID0gb25Mb2FkZWQ7XG4gICAgdGhpcy5fYm9uZXMgPSB7fTtcbiAgICB0aGlzLl9sb29rQXROZWNrID0gbmV3IEJBQllMT04uVmVjdG9yMygwLCAwLCAwKTtcbiAgICB0aGlzLl9hbmltYXRpb25zID0ge307XG4gICAgdGhpcy5fYW5pbWF0aW9uUXVldWUgPSBbXTtcbiAgICBCQUJZTE9OLlNjZW5lTG9hZGVyLkltcG9ydE1lc2goXCJcIiwgU0NFTkVQQVRILCBmaWxlbmFtZSwgdGhpcy5fc2NlbmUsIHRoaXMub25TY2VuZUxvYWQuYmluZCh0aGlzKSk7XG4gIH1cblxuICBvblNjZW5lTG9hZChtZXNoZXM6IEJBQllMT04uTWVzaFtdLCBwYXJ0aWNsZVN5c3RlbXM6IFtdLCBza2VsZXRvbnM6IEJBQllMT04uU2tlbGV0b25bXSkgOiB2b2lkIHtcbiAgICB0cnkge1xuICAgICAgY29uc29sZS5hc3NlcnQobWVzaGVzLmxlbmd0aCA9PT0gMSk7XG4gICAgICBjb25zb2xlLmFzc2VydChwYXJ0aWNsZVN5c3RlbXMubGVuZ3RoID09PSAwKTtcbiAgICAgIGNvbnNvbGUuYXNzZXJ0KHNrZWxldG9ucy5sZW5ndGggPT09IDEpO1xuXG4gICAgICB0aGlzLl9tZXNoID0gbWVzaGVzWzBdO1xuICAgICAgdGhpcy5fc2tlbGV0b24gPSBza2VsZXRvbnNbMF07XG5cbiAgICAgIC8vIHRoaXMuX21lc2guaXNWaXNpYmxlID0gZmFsc2U7XG5cbiAgICAgIHRoaXMucG9zaXRpb24gPSB0aGlzLl9tZXNoLnBvc2l0aW9uO1xuICAgICAgdGhpcy5yb3RhdGlvbiA9IHRoaXMuX21lc2gucm90YXRpb247XG4gICAgICAvL3RoaXMuX21lc2guc2NhbGluZyA9IG5ldyBCQUJZTE9OLlZlY3RvcjMoU0NBTEUsIFNDQUxFLCBTQ0FMRSk7XG4gICAgICAvL3RoaXMuX21lc2gucmVjZWl2ZVNoYWRvd3MgPSB0cnVlO1xuICAgICAgLy90aGlzLl9tZXNoLmNvbnZlcnRUb0ZsYXRTaGFkZWRNZXNoKCk7XG5cbiAgICAgIHRoaXMuX21lc2gubWF0ZXJpYWwuek9mZnNldCA9IC0gMTAwO1xuXG4gICAgICBpZiAodGhpcy5fc2hhZGRvd3MpIHtcbiAgICAgICAgdGhpcy5fc2hhZGRvd3MuZ2V0U2hhZG93TWFwKCkucmVuZGVyTGlzdC5wdXNoKHRoaXMuX21lc2gpO1xuICAgICAgfVxuXG4gICAgICAgIC8qbGV0IHNrZWxldG9uVmlld2VyID0gbmV3IEJBQllMT04uRGVidWcuU2tlbGV0b25WaWV3ZXIodGhpcy5fc2tlbGV0b24sIHRoaXMuX21lc2gsIHRoaXMuX3NjZW5lKTtcbiAgICAgIHNrZWxldG9uVmlld2VyLmlzRW5hYmxlZCA9IHRydWU7IC8vIEVuYWJsZSBpdFxuICAgICAgc2tlbGV0b25WaWV3ZXIuY29sb3IgPSBCQUJZTE9OLkNvbG9yMy5SZWQoKTsgLy8gQ2hhbmdlIGRlZmF1bHQgY29sb3IgZnJvbSB3aGl0ZSB0byByZWQqL1xuXG4gICAgICAvLyBQYXJzZSBhbGwgYm9uZXMgYW5kIHN0b3JlIGFueSB3ZSBuZWVkIGxhdGVyIGZvciBmdXR1cmUgYWNjZXNzLlxuICAgICAgZm9yIChsZXQgaW5kZXggPSAwOyBpbmRleCA8IHRoaXMuX3NrZWxldG9uLmJvbmVzLmxlbmd0aDsgaW5kZXgrKykge1xuICAgICAgICBsZXQgYm9uZSA9IHNrZWxldG9uc1swXS5ib25lc1tpbmRleF07XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKGJvbmUudW5pcXVlSWQsIGJvbmUuaWQpO1xuICAgICAgICBzd2l0Y2ggKGJvbmUuaWQpIHtcbiAgICAgICAgICBjYXNlIFwic3BpbmUuaGVhZFwiOlxuICAgICAgICAgICAgdGhpcy5fYm9uZXMuaGVhZCA9IGJvbmU7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBjYXNlIFwic3BpbmUubmVja1wiOlxuICAgICAgICAgICAgdGhpcy5fYm9uZXMubmVjayA9IGJvbmU7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBjYXNlIFwic3BpbmUudXBwZXJcIjpcbiAgICAgICAgICAgIHRoaXMuX2JvbmVzLnNwaW5ldXBwZXIgPSBib25lO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgY2FzZSBcInNwaW5lLnBvaW50XCI6XG4gICAgICAgICAgICB0aGlzLl9ib25lcy5oZWFkUG9pbnQgPSBib25lO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gQW5pbWF0aW9uc1xuICAgICAgZm9yIChsZXQgYSA9IDA7IGEgPCB0aGlzLl9za2VsZXRvbi5nZXRBbmltYXRpb25SYW5nZXMoKS5sZW5ndGg7IGErKykge1xuICAgICAgICBsZXQgYW5pbWF0aW9uID0gdGhpcy5fc2tlbGV0b24uZ2V0QW5pbWF0aW9uUmFuZ2VzKClbYV07XG4gICAgICAgIC8vY29uc29sZS5sb2coYSwgYW5pbWF0aW9uLm5hbWUpO1xuICAgICAgICB0aGlzLl9hbmltYXRpb25zW2FuaW1hdGlvbi5uYW1lXSA9IHRoaXMuX3NrZWxldG9uLmdldEFuaW1hdGlvblJhbmdlcygpW2FdO1xuICAgICAgfVxuICAgICAgdGhpcy5fYW5pbWF0aW9uUXVldWUucHVzaCh7bmFtZTogXCJ3YWxrXCIsIGxvb3A6IHRydWUsIHJldmVyc2VkOiBmYWxzZX0pO1xuXG4gICAgICB0aGlzLl9sb29rQ3RybEhlYWQgPSBuZXcgQkFCWUxPTi5Cb25lTG9va0NvbnRyb2xsZXIoXG4gICAgICAgIHRoaXMuX21lc2gsXG4gICAgICAgIHRoaXMuX2JvbmVzLmhlYWQsXG4gICAgICAgIHRoaXMuX2xvb2tBdCxcbiAgICAgICAge2FkanVzdFBpdGNoOiBNYXRoLlBJIC8gMn1cbiAgICAgICk7XG4gICAgICB0aGlzLl9sb29rQ3RybE5lY2sgPSBuZXcgQkFCWUxPTi5Cb25lTG9va0NvbnRyb2xsZXIoXG4gICAgICAgIHRoaXMuX21lc2gsXG4gICAgICAgIHRoaXMuX2JvbmVzLm5lY2ssXG4gICAgICAgIHRoaXMuX2xvb2tBdE5lY2ssXG4gICAgICAgIHthZGp1c3RQaXRjaDogTWF0aC5QSSAvIDJ9XG4gICAgICApO1xuXG4gICAgICAvLyBQZXJpb2RpYyB1cGRhdGVzLlxuICAgICAgdGhpcy5fc2NlbmUucmVnaXN0ZXJCZWZvcmVSZW5kZXIoKCkgPT4ge1xuICAgICAgICBpZiAoISB0aGlzLnBvc2l0aW9uLmVxdWFscyh0aGlzLl9tZXNoLnBvc2l0aW9uKSkge1xuICAgICAgICAgIHRoaXMuX21lc2gucG9zaXRpb24ueCA9IHRoaXMucG9zaXRpb24ueDtcbiAgICAgICAgICB0aGlzLl9tZXNoLnBvc2l0aW9uLnkgPSB0aGlzLnBvc2l0aW9uLnk7XG4gICAgICAgICAgdGhpcy5fbWVzaC5wb3NpdGlvbi56ID0gdGhpcy5wb3NpdGlvbi56O1xuICAgICAgICB9XG4gICAgICAgIGlmICghIHRoaXMucm90YXRpb24uZXF1YWxzKHRoaXMuX21lc2gucm90YXRpb24pKSB7XG4gICAgICAgICAgdGhpcy5fbWVzaC5yb3RhdGlvbi54ID0gdGhpcy5yb3RhdGlvbi54O1xuICAgICAgICAgIHRoaXMuX21lc2gucm90YXRpb24ueSA9IHRoaXMucm90YXRpb24ueTtcbiAgICAgICAgICB0aGlzLl9tZXNoLnJvdGF0aW9uLnogPSB0aGlzLnJvdGF0aW9uLno7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLl9wbGF5QW5pbWF0aW9uKCk7XG4gICAgICB9KTtcblxuICAgICAgaWYgKHRoaXMuX29uTG9hZGVkKSB7XG4gICAgICAgIHRoaXMuX29uTG9hZGVkKCk7XG4gICAgICB9XG5cbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgLy8gUHJldmVudCBlcnJvciBtZXNzYWdlcyBpbiB0aGlzIHNlY3Rpb24gZ2V0dGluZyBzd2FsbG93ZWQgYnkgQmFieWxvbi5cbiAgICAgIGNvbnNvbGUuZXJyb3IoZXJyb3IpO1xuICAgIH1cbiAgfVxuXG4gIGxvb2tBdCh0YXJnZXQ6IEJBQllMT04uVmVjdG9yMykgOiB2b2lkIHtcbiAgICB0aGlzLl9sb29rQXQgPSB0YXJnZXQ7XG5cbiAgICB0aGlzLl9zY2VuZS5yZWdpc3RlckJlZm9yZVJlbmRlcihmdW5jdGlvbigpIHtcbiAgICAgIC8vIFRoZSBuZWNrIHNob3VsZCBwaW50IGhhbGYgd2F5IGJldHdlZW4gc3RyYWlnaHQgZm9yd2FyZCBhbmQgdGhlXG4gICAgICAvLyBkaXJlY3Rpb24gdGhlIGhlYWQgaXMgcG9pbnRpbmcuXG4gICAgICBsZXQgc3BpbmVVcHBlciA9IHRoaXMuX2JvbmVzLnNwaW5ldXBwZXI7XG5cbiAgICAgIGxldCB0YXJnZXRMb2NhbCA9IHNwaW5lVXBwZXIuZ2V0TG9jYWxQb3NpdGlvbkZyb21BYnNvbHV0ZSh0YXJnZXQsIHRoaXMuX21lc2gpO1xuICAgICAgbGV0IHRhcmdldExvY2FsWFkgPSBuZXcgQkFCWUxPTi5WZWN0b3IzKHRhcmdldExvY2FsLngsIHRhcmdldExvY2FsLnksIDApO1xuICAgICAgbGV0IHRhcmdldExvY2FsWVogPSBuZXcgQkFCWUxPTi5WZWN0b3IzKDAsIHRhcmdldExvY2FsLnksIHRhcmdldExvY2FsLnopO1xuICAgICAgbGV0IGFoZWFkTG9jYWwgPSBuZXcgQkFCWUxPTi5WZWN0b3IzKDAsIHRhcmdldExvY2FsLmxlbmd0aCgpLCAwKTsgIC8vIChsL3IsIGYvYiwgdS9kKVxuXG4gICAgICBsZXQgYW5nbGVYWSA9IEJBQllMT04uVmVjdG9yMy5HZXRBbmdsZUJldHdlZW5WZWN0b3JzKFxuICAgICAgICB0YXJnZXRMb2NhbFhZLCBhaGVhZExvY2FsLCBuZXcgQkFCWUxPTi5WZWN0b3IzKDAsIDAsIDEpKTtcbiAgICAgIGxldCBhbmdsZVlaID0gQkFCWUxPTi5WZWN0b3IzLkdldEFuZ2xlQmV0d2VlblZlY3RvcnMoXG4gICAgICAgIHRhcmdldExvY2FsWVosIGFoZWFkTG9jYWwsIG5ldyBCQUJZTE9OLlZlY3RvcjMoLSAxLCAwLCAwKSk7XG5cbiAgICAgIGxldCBsb29rQXROZWNrTG9jYWwgPVxuICAgICAgICBuZXcgQkFCWUxPTi5WZWN0b3IzKE1hdGguc2luKGFuZ2xlWFkgLyAyKSAqIHRhcmdldExvY2FsWFkubGVuZ3RoKCksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKE1hdGguY29zKGFuZ2xlWFkgLyAyKSAqIHRhcmdldExvY2FsWFkubGVuZ3RoKCkgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBNYXRoLmNvcyhhbmdsZVlaIC8gMikgKiB0YXJnZXRMb2NhbFlaLmxlbmd0aCgpKSAvIDIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgTWF0aC5zaW4oYW5nbGVZWiAvIDIpICogdGFyZ2V0TG9jYWxZWi5sZW5ndGgoKSk7XG4gICAgICBzcGluZVVwcGVyLmdldEFic29sdXRlUG9zaXRpb25Gcm9tTG9jYWxUb1JlZihsb29rQXROZWNrTG9jYWwsIHRoaXMuX21lc2gsIHRoaXMuX2xvb2tBdE5lY2spO1xuXG4gICAgICBpZiAoYW5nbGVYWSA+IC1NYXRoLlBJIC8gMiAmJiBhbmdsZVhZIDwgTWF0aC5QSSAvIDIgJiZcbiAgICAgICAgIGFuZ2xlWVogPiAtTWF0aC5QSSAvIDIgJiYgYW5nbGVZWiA8IE1hdGguUEkgLyAyKSB7XG4gICAgICAgIC8vIE9ubHkgbG9vayBhdCB0aGluZyBpZiBpdCdzIG5vdCBiZWhpbmQgdXMuXG4gICAgICAgIC8vdGhpcy5fbG9va0N0cmxOZWNrLnVwZGF0ZSgpO1xuICAgICAgICAvL3RoaXMuX2xvb2tDdHJsSGVhZC51cGRhdGUoKTtcbiAgICAgICAgdGhpcy5fYm9uZXMubmVjay5yb3RhdGUoQkFCWUxPTi5BeGlzLlosIC1hbmdsZVhZIC8gMiwgQkFCWUxPTi5TcGFjZS5MT0NBTCk7XG4gICAgICAgIHRoaXMuX2JvbmVzLm5lY2sucm90YXRlKEJBQllMT04uQXhpcy5YLCBhbmdsZVlaIC8gMywgQkFCWUxPTi5TcGFjZS5MT0NBTCk7XG4gICAgICAgIHRoaXMuX2JvbmVzLm5lY2sucm90YXRlKEJBQllMT04uQXhpcy5ZLCAtYW5nbGVZWiAqIGFuZ2xlWFkgLyAoMiAqIE1hdGguUEkpLCBCQUJZTE9OLlNwYWNlLkxPQ0FMKTtcblxuICAgICAgICB0aGlzLl9ib25lcy5oZWFkLnJvdGF0ZShCQUJZTE9OLkF4aXMuWiwgLWFuZ2xlWFkgLyAyLCBCQUJZTE9OLlNwYWNlLkxPQ0FMKTtcbiAgICAgICAgdGhpcy5fYm9uZXMuaGVhZC5yb3RhdGUoQkFCWUxPTi5BeGlzLlgsIGFuZ2xlWVogLyAzLCBCQUJZTE9OLlNwYWNlLkxPQ0FMKTtcbiAgICAgICAgdGhpcy5fYm9uZXMuaGVhZC5yb3RhdGUoQkFCWUxPTi5BeGlzLlksIC1hbmdsZVlaICogYW5nbGVYWSAvICgyICogTWF0aC5QSSksIEJBQllMT04uU3BhY2UuTE9DQUwpO1xuICAgICAgfVxuICAgIH0uYmluZCh0aGlzKSk7XG4gIH1cblxuICAvKiBBZGQgYW5pbWF0aW9uIHRvIHRoZSBsaXN0IHRvIGJlIHBsYXllZC4gKi9cbiAgcXVldWVBbmltYXRpb24oYW5pbWF0ZVJlcXVlc3Q6IEFuaW1hdGVSZXF1ZXN0KSA6IHZvaWQge1xuICAgIHRoaXMuX2FuaW1hdGlvblF1ZXVlLnB1c2goYW5pbWF0ZVJlcXVlc3QpO1xuICB9XG5cbiAgLyogUHVsbCBuZXcgYW5pbWF0aW9ucyBmcm9tIHF1ZXVlIGFuZCBjbGVhbiB1cCBmaW5pc2hlZCBhbmltYXRpb25zLlxuICAgKlxuICAgKiBXaGVuIF9hbmltYXRpb25DdXJyZW50IGhhcyBlbmRlZCwgY2hlY2sgX2FuaW1hdGlvblF1ZXVlIGZvciBuZXh0IGFuaW1hdGlvbi5cbiAgICogSWYgX2FuaW1hdGlvbkxhc3QuY2xlYW51cCBpcyBzZXQsIHN0b3AgdGhlIGFuaW1hdGlvbiBhbmQgZGVsZXRlLlxuICAgKi9cbiAgcHJpdmF0ZSBfcGxheUFuaW1hdGlvbigpIDogdm9pZCB7XG4gICAgaWYgKHRoaXMuX2FuaW1hdGlvbkxhc3QgPT09IHVuZGVmaW5lZCAmJiB0aGlzLl9hbmltYXRpb25RdWV1ZS5sZW5ndGggPiAwKSB7XG4gICAgICB0aGlzLl9hbmltYXRpb25MYXN0ID0gdGhpcy5fYW5pbWF0aW9uQ3VycmVudDtcbiAgICAgIHRoaXMuX2FuaW1hdGlvbkN1cnJlbnQgPSB0aGlzLl9hbmltYXRpb25RdWV1ZS5zaGlmdCgpO1xuICAgICAgY29uc29sZS5sb2coXCJOZXc6IFwiICsgdGhpcy5fYW5pbWF0aW9uQ3VycmVudC5uYW1lKTtcbiAgICAgIHRoaXMuX2FuaW1hdGlvbkN1cnJlbnQucnVuQ291bnQgPSAwO1xuICAgIH1cbiAgICB0aGlzLl9zZXJ2aWNlQW5pbWF0aW9uKHRoaXMuX2FuaW1hdGlvbkN1cnJlbnQsIHRydWUpO1xuICAgIHRoaXMuX3NlcnZpY2VBbmltYXRpb24odGhpcy5fYW5pbWF0aW9uTGFzdCwgZmFsc2UpO1xuXG4gICAgaWYgKHRoaXMuX2FuaW1hdGlvbkxhc3QgJiYgdGhpcy5fYW5pbWF0aW9uTGFzdC5jbGVhbnVwKSB7XG4gICAgICB0aGlzLl9hbmltYXRpb25MYXN0LmFuaW1hdGlvbi5zdG9wKCk7XG4gICAgICB0aGlzLl9hbmltYXRpb25MYXN0LmFuaW1hdGlvbiA9IHVuZGVmaW5lZDtcbiAgICAgIHRoaXMuX2FuaW1hdGlvbkxhc3QgPSB1bmRlZmluZWQ7XG4gICAgfVxuICB9XG5cbiAgLyogVXBkYXRlIGFuIEFuaW1hdGVSZXF1ZXN0LlxuICAgKlxuICAgKiBUaGlzIHdpbGwgYmUgY2FsbGVkIHBlcmlvZGljYWxseSBmb3IgYW55IGFjdGl2ZSBBbmltYXRlUmVxdWVzdC5cbiAgICogSWYgaXQgaXMgdGhlIGZpcnN0IHRpbWUgdGhpcyBpcyBydW4gZm9yIGFuIEFuaW1hdGVSZXF1ZXN0IHRoZSBhbmltYXRpb25cbiAgICogd2lsbCBiZSBzdGFydGVkIGFuZCBnaXZlbiBncmVhdGVyIHdlaWdodCBlYWNoIHRpbWUgdGhpcyBtZXRob2QgaXMgY2FsbGVkXG4gICAqIHRoZXJlYWZ0ZXIuXG4gICAqIEFyZ3M6XG4gICAqICAgYW5pbWF0ZVJlcXVlc3Q6IFRoZSBBbmltYXRlUmVxdWVzdCBvYmplY3QgdG8gYWN0IHVwb24uXG4gICAqICAgY3VycmVudDogSWYgdHJ1ZSwgdGhlIGFuaW1hdGlvbiB3ZWlnaHQgd2lsbCBiZSBpbmNyZWFzZWQgd2l0aCBlYWNoIGNhbGxcbiAgICogICAgICh0byBhIG1hdmltdW0gdmFsdWUgb2YgMSkuXG4gICAqICAgICBJZiBmYWxzZSwgdGhlIGFuaW1hdGlvbiB3ZWlnaHQgd2lsbCBiZSBkZWNyZWFzZWQgd2l0aCBlYWNoIGNhbGwgdW50aWxcbiAgICogICAgIGl0IHJlYWNoZXMgMCBhdCB3aGljaCB0aW1lIHRoZSBhbmltYXRpb24gd2lsbCBiZSBzdG9wcGVkIGFuZFxuICAgKiAgICAgQW5pbWF0ZVJlcXVlc3QuY2xlYW51cCB3aWxsIGJlIHNldC5cbiAgICovXG4gIHByaXZhdGUgX3NlcnZpY2VBbmltYXRpb24oYW5pbWF0ZVJlcXVlc3Q6IEFuaW1hdGVSZXF1ZXN0LCBjdXJyZW50OiBib29sZWFuKSA6IHZvaWQge1xuICAgIGlmIChhbmltYXRlUmVxdWVzdCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgbGV0IHdlaWdodCA9IGFuaW1hdGVSZXF1ZXN0LnJ1bkNvdW50ID8gYW5pbWF0ZVJlcXVlc3QuYW5pbWF0aW9uLndlaWdodCA6IDA7XG4gICAgaWYgKGN1cnJlbnQgJiYgd2VpZ2h0IDwgMSkge1xuICAgICAgd2VpZ2h0ICs9IEFOSU1fTUVSR0VfUkFURTtcbiAgICAgIHdlaWdodCA9IE1hdGgubWluKDEsIHdlaWdodCk7XG4gICAgfSBlbHNlIGlmICghY3VycmVudCAmJiB3ZWlnaHQgPiAwKSB7XG4gICAgICB3ZWlnaHQgLT0gQU5JTV9NRVJHRV9SQVRFO1xuICAgICAgd2VpZ2h0ID0gTWF0aC5tYXgoMCwgd2VpZ2h0KTtcbiAgICB9XG5cbiAgICBpZiAoYW5pbWF0ZVJlcXVlc3QuYW5pbWF0aW9uKSB7XG4gICAgICBhbmltYXRlUmVxdWVzdC5hbmltYXRpb24ud2VpZ2h0ID0gd2VpZ2h0O1xuICAgIH1cblxuICAgIGlmICh3ZWlnaHQgPD0gMCkge1xuICAgICAgLy8gVGhpcyBvbGQgQW5pbWF0ZVJlcXVlc3QgaGFzIGJlZW4gZmFkZWQgb3V0IGFuZCBuZWVkcyBzdG9wcGVkIGFuZCByZW1vdmVkLlxuICAgICAgYW5pbWF0ZVJlcXVlc3QuY2xlYW51cCA9IHRydWU7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKGFuaW1hdGVSZXF1ZXN0LmRpcnR5ID09PSBmYWxzZSkge1xuICAgICAgLy8gTm90aGluZyBtb3JlIHRvIGRvLlxuICAgICAgLy8gQW5pbWF0aW9ucyB3aGljaCBlbmQgc2V0IGFuaW1hdGVSZXF1ZXN0LmRpcnR5IHRvIHRydWUgd2hlbiB0aGV5IG5lZWRcbiAgICAgIC8vIHRoaXMgbWV0aG9kIHRvIGNvbnRpbnVlIHBhc3QgdGhpcyBwb2ludC5cbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBjb25zb2xlLmxvZyhhbmltYXRlUmVxdWVzdC5uYW1lLCB3ZWlnaHQsIGN1cnJlbnQpO1xuXG4gICAgaWYgKGFuaW1hdGVSZXF1ZXN0LnJ1bkNvdW50ICYmICFhbmltYXRlUmVxdWVzdC5sb29wICYmIGFuaW1hdGVSZXF1ZXN0LnJldmVyc2VkKSB7XG4gICAgICAvLyBGcmVlemUgZnJhbWUgYXQgZmlyc3QgZnJhbWUgaW4gc2VxdWVuY2UuXG4gICAgICBhbmltYXRlUmVxdWVzdC5hbmltYXRpb24uc3RvcCgpO1xuICAgICAgYW5pbWF0ZVJlcXVlc3QuYW5pbWF0aW9uID0gdGhpcy5fc2NlbmUuYmVnaW5XZWlnaHRlZEFuaW1hdGlvbihcbiAgICAgICAgdGhpcy5fc2tlbGV0b24sXG4gICAgICAgIHRoaXMuX2FuaW1hdGlvbnNbYW5pbWF0ZVJlcXVlc3QubmFtZV0uZnJvbSArIDIsXG4gICAgICAgIHRoaXMuX2FuaW1hdGlvbnNbYW5pbWF0ZVJlcXVlc3QubmFtZV0uZnJvbSArIDIsXG4gICAgICAgIHdlaWdodCxcbiAgICAgICAgZmFsc2UsXG4gICAgICAgIDAuMDEsXG4gICAgICAgIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGFuaW1hdGVSZXF1ZXN0LmRpcnR5ID0gdHJ1ZTtcbiAgICAgICAgfS5iaW5kKHRoaXMpXG4gICAgICApO1xuICAgIH0gZWxzZSBpZiAoYW5pbWF0ZVJlcXVlc3QucnVuQ291bnQgJiYgIWFuaW1hdGVSZXF1ZXN0Lmxvb3ApIHtcbiAgICAgIC8vIEZyZWV6ZSBmcmFtZSBhdCBsYXN0IGZyYW1lIGluIHNlcXVlbmNlLlxuICAgICAgYW5pbWF0ZVJlcXVlc3QuYW5pbWF0aW9uLnN0b3AoKTtcbiAgICAgIGFuaW1hdGVSZXF1ZXN0LmFuaW1hdGlvbiA9IHRoaXMuX3NjZW5lLmJlZ2luV2VpZ2h0ZWRBbmltYXRpb24oXG4gICAgICAgIHRoaXMuX3NrZWxldG9uLFxuICAgICAgICB0aGlzLl9hbmltYXRpb25zW2FuaW1hdGVSZXF1ZXN0Lm5hbWVdLnRvLFxuICAgICAgICB0aGlzLl9hbmltYXRpb25zW2FuaW1hdGVSZXF1ZXN0Lm5hbWVdLnRvLFxuICAgICAgICB3ZWlnaHQsXG4gICAgICAgIGZhbHNlLFxuICAgICAgICAwLjAxLFxuICAgICAgICBmdW5jdGlvbigpIHtcbiAgICAgICAgICBhbmltYXRlUmVxdWVzdC5kaXJ0eSA9IHRydWU7XG4gICAgICAgIH0uYmluZCh0aGlzKVxuICAgICAgKTtcbiAgICB9IGVsc2UgaWYgKGFuaW1hdGVSZXF1ZXN0LnJldmVyc2VkKSB7XG4gICAgICAvLyBQbGF5IGFuIGFuaW1hdGlvbiBpbiByZXZlcnNlLlxuICAgICAgYW5pbWF0ZVJlcXVlc3QuYW5pbWF0aW9uID0gdGhpcy5fc2NlbmUuYmVnaW5XZWlnaHRlZEFuaW1hdGlvbihcbiAgICAgICAgdGhpcy5fc2tlbGV0b24sXG4gICAgICAgIHRoaXMuX2FuaW1hdGlvbnNbYW5pbWF0ZVJlcXVlc3QubmFtZV0udG8sXG4gICAgICAgIHRoaXMuX2FuaW1hdGlvbnNbYW5pbWF0ZVJlcXVlc3QubmFtZV0uZnJvbSArIDIsXG4gICAgICAgIHdlaWdodCxcbiAgICAgICAgZmFsc2UsXG4gICAgICAgIDEsXG4gICAgICAgIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGFuaW1hdGVSZXF1ZXN0LmRpcnR5ID0gdHJ1ZTtcbiAgICAgICAgfS5iaW5kKHRoaXMpXG4gICAgICApO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBQbGF5IGFuIGFuaW1hdGlvbi5cbiAgICAgIGFuaW1hdGVSZXF1ZXN0LmFuaW1hdGlvbiA9IHRoaXMuX3NjZW5lLmJlZ2luV2VpZ2h0ZWRBbmltYXRpb24oXG4gICAgICAgIHRoaXMuX3NrZWxldG9uLFxuICAgICAgICB0aGlzLl9hbmltYXRpb25zW2FuaW1hdGVSZXF1ZXN0Lm5hbWVdLmZyb20gKyAyLFxuICAgICAgICB0aGlzLl9hbmltYXRpb25zW2FuaW1hdGVSZXF1ZXN0Lm5hbWVdLnRvLFxuICAgICAgICB3ZWlnaHQsXG4gICAgICAgIGZhbHNlLFxuICAgICAgICAxLFxuICAgICAgICBmdW5jdGlvbigpIHtcbiAgICAgICAgICBhbmltYXRlUmVxdWVzdC5kaXJ0eSA9IHRydWU7XG4gICAgICAgIH0uYmluZCh0aGlzKVxuICAgICAgKTtcbiAgICB9XG5cbiAgICBhbmltYXRlUmVxdWVzdC5kaXJ0eSA9IGZhbHNlO1xuICAgIGFuaW1hdGVSZXF1ZXN0LnJ1bkNvdW50Kys7XG4gIH1cbn1cblxuY2xhc3MgTWFwQ2VsbCBpbXBsZW1lbnRzIENvb3JkIHtcbiAgeDogbnVtYmVyO1xuICB5OiBudW1iZXI7XG4gIHJlY3Vyc2lvbjogbnVtYmVyO1xuICB2ZWdldGF0aW9uOiBudW1iZXI7XG4gIG1heEhlaWdodDogbnVtYmVyO1xuICBtaW5IZWlnaHQ6IG51bWJlcjtcbiAgcGF0aFNjb3JlOiBudW1iZXI7XG5cbiAgY29uc3RydWN0b3IoY29vcmQ6IENvb3JkLCB2ZWdldGF0aW9uOiBudW1iZXIpIHtcbiAgICB0aGlzLnggPSBjb29yZC54O1xuICAgIHRoaXMueSA9IGNvb3JkLnk7XG4gICAgdGhpcy5yZWN1cnNpb24gPSBjb29yZC5yZWN1cnNpb247XG4gICAgdGhpcy52ZWdldGF0aW9uID0gdmVnZXRhdGlvbjtcbiAgfVxuXG4gIHBhcmVudENvb3JkaW5hdGVzKGRlcHRoOiBudW1iZXIpIDogQ29vcmQge1xuICAgIGxldCBwWCA9IDA7XG4gICAgbGV0IHBZID0gMDtcbiAgICBmb3IgKGxldCBiaXQgPSBkZXB0aCAtIDE7IGJpdCA+PSBkZXB0aCAtIHRoaXMucmVjdXJzaW9uICsgMTsgYml0LS0pIHtcbiAgICAgIGxldCBtYXNrID0gMSA8PCBiaXQ7XG4gICAgICBpZiAobWFzayAmIHRoaXMueCkge1xuICAgICAgICBwWCB8PSBtYXNrO1xuICAgICAgfVxuICAgICAgaWYgKG1hc2sgJiB0aGlzLnkpIHtcbiAgICAgICAgcFkgfD0gbWFzaztcbiAgICAgIH1cbiAgICAgIC8vY29uc29sZS5sb2coYml0LCBtYXNrLCBwWCwgcFkpO1xuICAgIH1cblxuICAgIHJldHVybiB7eDogcFgsIHk6IHBZLCByZWN1cnNpb246IHRoaXMucmVjdXJzaW9uIC0gMX07XG4gIH1cbn1cblxuY2xhc3MgU2NlbmVyeSB7XG4gIHByaXZhdGUgX3NjZW5lOiBCQUJZTE9OLlNjZW5lO1xuICBwcml2YXRlIF9zaGFkZG93czogQkFCWUxPTi5TaGFkb3dHZW5lcmF0b3I7XG4gIHByaXZhdGUgX2dyb3VuZDogQkFCWUxPTi5NZXNoO1xuICBwcml2YXRlIF9tYXBTaXplOiBudW1iZXI7XG4gIHByaXZhdGUgX21heFJlY3Vyc2lvbjogbnVtYmVyO1xuICBwcml2YXRlIF90cmVlUmVjdXJzaW9uOiBudW1iZXI7XG4gIHByaXZhdGUgX2NlbGxzOiBNeU1hcDxDb29yZCwgTWFwQ2VsbD47XG4gIHByaXZhdGUgX3RyZWVUeXBlczogQkFCWUxPTi5NZXNoW107XG4gIHByaXZhdGUgX3NocnViVHlwZXM6IEJBQllMT04uTWVzaFtdO1xuICBwcml2YXRlIF9ncm91bmRDb3ZlclR5cGVzOiBCQUJZTE9OLlN0YW5kYXJkTWF0ZXJpYWxbXTtcbiAgcHJpdmF0ZSBfZ3JvdW5kQ292ZXI6IHtba2V5OiBzdHJpbmddOiBib29sZWFufTtcbiAgcHJpdmF0ZSBfdHJlZVNwZWNpZXM6IG51bWJlcjtcbiAgcHJpdmF0ZSByZWFkb25seSBfbWFwU3BhY2luZzogbnVtYmVyID0gMTtcbiAgcHJpdmF0ZSByZWFkb25seSBfdHJlZVNjYWxlOiBudW1iZXIgPSAyMDA7XG4gIHByaXZhdGUgcmVhZG9ubHkgX3RyZWVTZWVkVmFsdWU6IG51bWJlciA9IDc1O1xuICBwcml2YXRlIHJlYWRvbmx5IF9oZWFkcm9vbTogbnVtYmVyID0gMjtcblxuICBjb25zdHJ1Y3RvcihzY2VuZTogQkFCWUxPTi5TY2VuZSxcbiAgICAgICAgICAgICAgc2hhZGRvd3M6IEJBQllMT04uU2hhZG93R2VuZXJhdG9yLFxuICAgICAgICAgICAgICBncm91bmQ6IEJBQllMT04uTWVzaCxcbiAgICAgICAgICAgICAgc2l6ZTogbnVtYmVyKSB7XG4gICAgY29uc29sZS5sb2coXCJNZXNoIGNvdW50IGJlZm9yZSBjcmVhdGluZyBzY2VuZXJ5OiAlY1wiICtcbiAgICAgICAgICAgICAgICBzY2VuZS5tZXNoZXMubGVuZ3RoLnRvU3RyaW5nKCksXG4gICAgICAgICAgICAgICAgXCJiYWNrZ3JvdW5kOiBvcmFuZ2U7IGNvbG9yOiB3aGl0ZVwiKTtcbiAgICB0aGlzLl9zY2VuZSA9IHNjZW5lO1xuICAgIHRoaXMuX3NoYWRkb3dzID0gc2hhZGRvd3M7XG4gICAgdGhpcy5fZ3JvdW5kID0gZ3JvdW5kO1xuICAgIHRoaXMuX2dyb3VuZENvdmVyID0ge307XG4gICAgdGhpcy5fbWFwU2l6ZSA9IHNpemU7XG4gICAgdGhpcy5fbWF4UmVjdXJzaW9uID0gTWF0aC5mbG9vcihNYXRoLmxvZyh0aGlzLl9tYXBTaXplKSAvIE1hdGgubG9nKDIpKTtcbiAgICB0aGlzLl90cmVlUmVjdXJzaW9uID0gdGhpcy5fbWF4UmVjdXJzaW9uIC0gMztcblxuICAgIGNvbnNvbGUuYXNzZXJ0KE1hdGgucG93KDIsIHRoaXMuX21heFJlY3Vyc2lvbikgPT09IHRoaXMuX21hcFNpemUgJiZcbiAgICAgICAgICAgICAgICAgICBCb29sZWFuKFwiTWFwIHNpemUgaXMgbm90IGEgcG93ZXIgb2YgMi5cIikpO1xuXG4gICAgdGhpcy5fY2VsbHMgPSBuZXcgTXlNYXA8Q29vcmQsIE1hcENlbGw+KGdldFgsIGdldFksIGdldFJlY3Vyc2lvbik7XG5cbiAgICB0aGlzLl9zZXRWZWdldGF0aW9uSGVpZ2h0cygpO1xuICAgIHRoaXMuX3BsYW50VHJlZXMoKTtcblxuICAgIC8vdGhpcy5fc2hhZGRvd3MuZ2V0U2hhZG93TWFwKCkucmVuZGVyTGlzdC5wdXNoKHRoaXMuX3RyZWVzKTtcbiAgfVxuXG4gIC8vIEFzc2lnbiBcInZlZ2V0YXRpb25cIiB2YWx1ZXMgdG8gbWFwIGNlbGxzIHdoaWNoIGRpY3RhdGVzIGhvdyBsYXJnZSBwbGFudHMgYXJlLlxuICBwcml2YXRlIF9zZXRWZWdldGF0aW9uSGVpZ2h0cygpIHtcbiAgICBmb3IgKGxldCByZWN1cnNpb24gPSAwOyByZWN1cnNpb24gPD0gdGhpcy5fbWF4UmVjdXJzaW9uOyByZWN1cnNpb24rKykge1xuICAgICAgbGV0IHRpbGVTaXplID0gTWF0aC5wb3coMiwgdGhpcy5fbWF4UmVjdXJzaW9uIC0gcmVjdXJzaW9uKTtcbiAgICAgIC8vIGNvbnNvbGUubG9nKHRpbGVTaXplLCByZWN1cnNpb24pO1xuICAgICAgZm9yIChsZXQgeCA9IDA7IHggPCB0aGlzLl9tYXBTaXplOyB4ICs9IHRpbGVTaXplKSB7XG4gICAgICAgIGZvciAobGV0IHkgPSAwOyB5IDwgdGhpcy5fbWFwU2l6ZTsgeSArPSB0aWxlU2l6ZSkge1xuICAgICAgICAgIGlmICh0aGlzLmdldENlbGwoe3gsIHksIHJlY3Vyc2lvbn0pID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGxldCBwYXJlbnRDZWxsID0gdGhpcy5nZXRDZWxsUGFyZW50KHt4LCB5LCByZWN1cnNpb259KTtcbiAgICAgICAgICAgIGlmIChwYXJlbnRDZWxsID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgdGhpcy5zZXRDZWxsKHt4LCB5LCByZWN1cnNpb259LCB0aGlzLl90cmVlU2VlZFZhbHVlKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocmVjdXJzaW9uID09PSB0aGlzLl90cmVlUmVjdXJzaW9uICYmXG4gICAgICAgICAgICAgICAgICAgICAgeCA8PSB0aGlzLl9tYXBTaXplIC8gMiAmJiB4ID49IHRoaXMuX21hcFNpemUgLyAyIC0gdGlsZVNpemUgJiZcbiAgICAgICAgICAgICAgICAgICAgICB5IDw9IHRoaXMuX21hcFNpemUgLyAyICYmIHkgPj0gdGhpcy5fbWFwU2l6ZSAvIDIgLSB0aWxlU2l6ZSkge1xuICAgICAgICAgICAgICAvLyBDZW50ZXIgb2YgbWFwIHNob3VsZCBhbHdheXMgYmUgZW1wdHkuXG4gICAgICAgICAgICAgIHRoaXMuc2V0Q2VsbCh7eCwgeSwgcmVjdXJzaW9ufSwgMCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHJlY3Vyc2lvbiA9PT0gdGhpcy5fdHJlZVJlY3Vyc2lvbiAmJlxuICAgICAgICAgICAgICAgICAgICAgICh4IDwgNCAqIHRpbGVTaXplIHx8XG4gICAgICAgICAgICAgICAgICAgICAgIHkgPCA0ICogdGlsZVNpemUgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgeCA+PSB0aGlzLl9tYXBTaXplIC0gNCAqIHRpbGVTaXplIHx8XG4gICAgICAgICAgICAgICAgICAgICAgIHkgPj0gdGhpcy5fbWFwU2l6ZSAtIDQgKiB0aWxlU2l6ZSkpIHtcbiAgICAgICAgICAgICAgLy8gRGVuc2UgdmVnZXRhdGlvbiByb3VuZCBlZGdlLlxuICAgICAgICAgICAgICB0aGlzLnNldENlbGwoe3gsIHksIHJlY3Vyc2lvbn0sIE1hdGgucmFuZG9tKCkgKiB0aGlzLl90cmVlU2VlZFZhbHVlICogMik7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHJlY3Vyc2lvbiA+IHRoaXMuX3RyZWVSZWN1cnNpb24pIHtcbiAgICAgICAgICAgICAgdGhpcy5zZXRDZWxsKHt4LCB5LCByZWN1cnNpb259LCAwKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGxldCBzZWVkID0gXCJcIiArIHBhcmVudENlbGwueCArIFwiX1wiICsgcGFyZW50Q2VsbC55O1xuICAgICAgICAgICAgICBsZXQgY2hpbGRNb2QgPSBbXG4gICAgICAgICAgICAgICAgc2VlZGVkUmFuZG9tKDUwMCwgMTAwMCwgc2VlZCksXG4gICAgICAgICAgICAgICAgc2VlZGVkUmFuZG9tKDUwMCwgMTAwMCwgc2VlZCArIFwiXzFcIiksXG4gICAgICAgICAgICAgICAgc2VlZGVkUmFuZG9tKDUwMCwgMTAwMCwgc2VlZCArIFwiXzJcIiksXG4gICAgICAgICAgICAgICAgc2VlZGVkUmFuZG9tKDUwMCwgMTAwMCwgc2VlZCArIFwiXzNcIildO1xuICAgICAgICAgICAgICBsZXQgY2hpbGRNb2RUb3RhbCA9IGNoaWxkTW9kLnJlZHVjZSgodG90YWwsIG51bSkgPT4geyByZXR1cm4gdG90YWwgKyBudW07IH0pO1xuICAgICAgICAgICAgICBjaGlsZE1vZC5mb3JFYWNoKCh2ZWdldGF0aW9uLCBpbmRleCwgYXJyYXkpID0+IHsgYXJyYXlbaW5kZXhdIC89IGNoaWxkTW9kVG90YWw7IH0pO1xuICAgICAgICAgICAgICBsZXQgY2hpbGRJbmRleCA9ICgoeCAtIHBhcmVudENlbGwueCkgKyAyICogKHkgLSBwYXJlbnRDZWxsLnkpKSAvIHRpbGVTaXplO1xuXG4gICAgICAgICAgICAgIHRoaXMuc2V0Q2VsbCh7eCwgeSwgcmVjdXJzaW9ufSxcbiAgICAgICAgICAgICAgICBwYXJlbnRDZWxsLnZlZ2V0YXRpb24gKiBjaGlsZE1vZFtjaGlsZEluZGV4XSAqIDQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBjb25zb2xlLmxvZyhcIkNlbGwgY291bnQ6IFwiLCB0aGlzLl9jZWxscy5sZW5ndGgpO1xuICB9XG5cbiAgcHJpdmF0ZSBfZmluZENsb3Nlc3RTcGFjZShjb29yZDogQ29vcmQsIGhlaWdodDogbnVtYmVyKTogQ29vcmQge1xuICAgIGxldCBuZWlnaGJvdXJzOiBQcmlvcml0eVF1ZXVlPENvb3JkPiA9IG5ldyBQcmlvcml0eVF1ZXVlPENvb3JkPihnZXRYLCBnZXRZKTtcbiAgICBsZXQgdmlzaXRlZDoge1trZXk6IHN0cmluZ106IGJvb2xlYW59ID0ge307XG4gICAgbmVpZ2hib3Vycy5wdXNoKGNvb3JkLCAwKTtcblxuICAgIHdoaWxlIChuZWlnaGJvdXJzLmxlbmd0aCkge1xuICAgICAgbGV0IHdvcmtpbmcgPSBuZWlnaGJvdXJzLnBvcExvdygpO1xuICAgICAgdmlzaXRlZFtjb29yZFRvS2V5KHdvcmtpbmcpXSA9IHRydWU7XG4gICAgICBpZiAodGhpcy5nZXRDZWxsKHdvcmtpbmcpLm1pbkhlaWdodCA9PT0gdW5kZWZpbmVkIHx8XG4gICAgICAgICB0aGlzLmdldENlbGwod29ya2luZykubWluSGVpZ2h0ID49IGhlaWdodCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcImluOiBcIiwgY29vcmRUb0tleShjb29yZCksIFwiXFx0b3V0OiBcIiwgY29vcmRUb0tleSh3b3JraW5nKSk7XG4gICAgICAgIHJldHVybiB3b3JraW5nO1xuICAgICAgfVxuXG4gICAgICBpZiAod29ya2luZy54ID4gMCkge1xuICAgICAgICBsZXQgbm9kZSA9IHtcInhcIjogd29ya2luZy54IC0gMSwgXCJ5XCI6IHdvcmtpbmcueSwgXCJyZWN1cnNpb25cIjogdGhpcy5fbWF4UmVjdXJzaW9ufTtcbiAgICAgICAgaWYgKCF2aXNpdGVkW2Nvb3JkVG9LZXkobm9kZSldKSB7XG4gICAgICAgICAgbmVpZ2hib3Vycy5wdXNoKG5vZGUsIGRpc3RCZXR3ZWVuKHdvcmtpbmcsIGNvb3JkKSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmICh3b3JraW5nLnggPCB0aGlzLl9tYXBTaXplIC0gMSkge1xuICAgICAgICBsZXQgbm9kZSA9IHtcInhcIjogd29ya2luZy54ICsgMSwgXCJ5XCI6IHdvcmtpbmcueSwgXCJyZWN1cnNpb25cIjogdGhpcy5fbWF4UmVjdXJzaW9ufTtcbiAgICAgICAgaWYgKCF2aXNpdGVkW2Nvb3JkVG9LZXkobm9kZSldKSB7XG4gICAgICAgICAgbmVpZ2hib3Vycy5wdXNoKG5vZGUsIGRpc3RCZXR3ZWVuKHdvcmtpbmcsIGNvb3JkKSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmICh3b3JraW5nLnkgPiAwKSB7XG4gICAgICAgIGxldCBub2RlID0ge1wieFwiOiB3b3JraW5nLngsIFwieVwiOiB3b3JraW5nLnkgLSAxLCBcInJlY3Vyc2lvblwiOiB0aGlzLl9tYXhSZWN1cnNpb259O1xuICAgICAgICBpZiAoIXZpc2l0ZWRbY29vcmRUb0tleShub2RlKV0pIHtcbiAgICAgICAgICBuZWlnaGJvdXJzLnB1c2gobm9kZSwgZGlzdEJldHdlZW4od29ya2luZywgY29vcmQpKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKHdvcmtpbmcueSA8IHRoaXMuX21hcFNpemUgLSAxKSB7XG4gICAgICAgIGxldCBub2RlID0ge1wieFwiOiB3b3JraW5nLngsIFwieVwiOiB3b3JraW5nLnkgKyAxLCBcInJlY3Vyc2lvblwiOiB0aGlzLl9tYXhSZWN1cnNpb259O1xuICAgICAgICBpZiAoIXZpc2l0ZWRbY29vcmRUb0tleShub2RlKV0pIHtcbiAgICAgICAgICBuZWlnaGJvdXJzLnB1c2gobm9kZSwgZGlzdEJldHdlZW4od29ya2luZywgY29vcmQpKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBjb25zb2xlLmxvZyh2aXNpdGVkLmxlbmd0aCk7XG4gICAgY29uc29sZS5sb2coXCJpbjogXCIsIGNvb3JkVG9LZXkoY29vcmQpLCBcIlxcdG91dDogXCIsIHVuZGVmaW5lZCk7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuXG4gIGNhbGN1bGF0ZVBhdGgoc3RhcnQ6IENvb3JkLCBkZXN0aW5hdGlvbjogQ29vcmQpIDogYm9vbGVhbiB7XG4gICAgY29uc29sZS50aW1lKFwiY2FsY3VsYXRlUGF0aFwiKTtcblxuICAgIGxldCByZWFjaGVkRGVzdGluYXRpb24gPSBmYWxzZTtcbiAgICBzdGFydC5yZWN1cnNpb24gPSB0aGlzLl9tYXhSZWN1cnNpb247XG4gICAgZGVzdGluYXRpb24ucmVjdXJzaW9uID0gdGhpcy5fbWF4UmVjdXJzaW9uO1xuXG4gICAgbGV0IHN0YXJ0QWRqdXN0ZWQgPSB0aGlzLmdldENlbGwoXG4gICAgICB0aGlzLl9maW5kQ2xvc2VzdFNwYWNlKHN0YXJ0LCB0aGlzLl9oZWFkcm9vbSkpO1xuICAgIGxldCBkZXN0aW5hdGlvbkFkanVzdGVkID0gdGhpcy5nZXRDZWxsKFxuICAgICAgdGhpcy5fZmluZENsb3Nlc3RTcGFjZShkZXN0aW5hdGlvbiwgdGhpcy5faGVhZHJvb20pKTtcblxuICAgIGRlc3RpbmF0aW9uQWRqdXN0ZWQucGF0aFNjb3JlID0gMDtcblxuICAgIGxldCBuZWlnaGJvdXJzOiBQcmlvcml0eVF1ZXVlPE1hcENlbGw+ID1cbiAgICAgIG5ldyBQcmlvcml0eVF1ZXVlPE1hcENlbGw+KGdldFgsIGdldFkpO1xuICAgIG5laWdoYm91cnMucHVzaChkZXN0aW5hdGlvbkFkanVzdGVkLCAwKTtcblxuICAgIHdoaWxlIChuZWlnaGJvdXJzLmxlbmd0aCkge1xuICAgICAgbGV0IHdvcmtpbmc6IE1hcENlbGwgPSBuZWlnaGJvdXJzLnBvcExvdygpO1xuXG4gICAgICBpZiAod29ya2luZy54ID09PSBzdGFydEFkanVzdGVkLnggJiYgd29ya2luZy55ID09PSBzdGFydEFkanVzdGVkLnkpIHtcbiAgICAgICAgcmVhY2hlZERlc3RpbmF0aW9uID0gdHJ1ZTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG5cbiAgICAgIGxldCBhZGphY2VudDogTWFwQ2VsbFtdID0gbmV3IEFycmF5KDQpO1xuICAgICAgaWYgKHdvcmtpbmcueCA+IDApIHtcbiAgICAgICAgYWRqYWNlbnRbMF0gPSB0aGlzLmdldENlbGwoXG4gICAgICAgICAge1wieFwiOiB3b3JraW5nLnggLSAxLCBcInlcIjogd29ya2luZy55LCBcInJlY3Vyc2lvblwiOiB0aGlzLl9tYXhSZWN1cnNpb259KTtcbiAgICAgIH1cbiAgICAgIGlmICh3b3JraW5nLnggPCB0aGlzLl9tYXBTaXplIC0gMSkge1xuICAgICAgICBhZGphY2VudFsxXSA9IHRoaXMuZ2V0Q2VsbChcbiAgICAgICAgICB7XCJ4XCI6IHdvcmtpbmcueCArIDEsIFwieVwiOiB3b3JraW5nLnksIFwicmVjdXJzaW9uXCI6IHRoaXMuX21heFJlY3Vyc2lvbn0pO1xuICAgICAgfVxuICAgICAgaWYgKHdvcmtpbmcueSA+IDApIHtcbiAgICAgICAgYWRqYWNlbnRbMl0gPSB0aGlzLmdldENlbGwoXG4gICAgICAgICAge1wieFwiOiB3b3JraW5nLngsIFwieVwiOiB3b3JraW5nLnkgLSAxLCBcInJlY3Vyc2lvblwiOiB0aGlzLl9tYXhSZWN1cnNpb259KTtcbiAgICAgIH1cbiAgICAgIGlmICh3b3JraW5nLnkgPCB0aGlzLl9tYXBTaXplIC0gMSkge1xuICAgICAgICBhZGphY2VudFszXSA9IHRoaXMuZ2V0Q2VsbChcbiAgICAgICAgICB7XCJ4XCI6IHdvcmtpbmcueCwgXCJ5XCI6IHdvcmtpbmcueSArIDEsIFwicmVjdXJzaW9uXCI6IHRoaXMuX21heFJlY3Vyc2lvbn0pO1xuICAgICAgfVxuICAgICAgYWRqYWNlbnQuZm9yRWFjaCgoYSkgPT4ge1xuICAgICAgICBpZiAoYSAhPT0gdW5kZWZpbmVkICYmXG4gICAgICAgICAgIChhLm1pbkhlaWdodCA+IHRoaXMuX2hlYWRyb29tIHx8IGEubWluSGVpZ2h0ID09PSB1bmRlZmluZWQpKSB7XG4gICAgICAgICAgaWYgKGEucGF0aFNjb3JlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGEucGF0aFNjb3JlID0gd29ya2luZy5wYXRoU2NvcmUgKyAxO1xuICAgICAgICAgICAgbmVpZ2hib3Vycy5wdXNoKGEsIGEucGF0aFNjb3JlICsgZGlzdEJldHdlZW4oYSwgc3RhcnRBZGp1c3RlZCkpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhLnBhdGhTY29yZSA9IE1hdGgubWluKGEucGF0aFNjb3JlLCB3b3JraW5nLnBhdGhTY29yZSArIDEpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLypmb3IgKGxldCB5ID0gMDsgeSA8IHRoaXMuX21hcFNpemU7IHkrKykge1xuICAgICAgbGV0IGxpbmUgPSBcIlwiO1xuICAgICAgZm9yIChsZXQgeCA9IDA7IHggPCB0aGlzLl9tYXBTaXplOyB4KyspIHtcbiAgICAgICAgbGV0IG5vZGUgPSB0aGlzLmdldENlbGwoe3gsIHksIFwicmVjdXJzaW9uXCI6IHRoaXMuX21heFJlY3Vyc2lvbn0pO1xuICAgICAgICBsZXQgdmFsID0gXCJcIiArIG5vZGUucGF0aFNjb3JlO1xuICAgICAgICBpZiAodmFsID09PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgICAgdmFsID0gXCIgXCI7XG4gICAgICAgICAgaWYgKHRoaXMuZ2V0Q2VsbChub2RlKS5taW5IZWlnaHQgPD0gdGhpcy5faGVhZHJvb20pIHtcbiAgICAgICAgICAgIHZhbCA9IFwiI1wiO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB2YWwgPSBcIi5cIjtcbiAgICAgICAgICBsZXQgcGF0aE5vZGUgPSBCQUJZTE9OLk1lc2hCdWlsZGVyLkNyZWF0ZVNwaGVyZShcInBhdGhfXCIgKyB4ICsgXCJfXCIgKyB5LCB7fSwgdGhpcy5fc2NlbmUpO1xuICAgICAgICAgIHBhdGhOb2RlLnBvc2l0aW9uLnggPSB0aGlzLm1hcFRvV29ybGQobm9kZSkueDtcbiAgICAgICAgICBwYXRoTm9kZS5wb3NpdGlvbi55ID0gMDtcbiAgICAgICAgICBwYXRoTm9kZS5wb3NpdGlvbi56ID0gdGhpcy5tYXBUb1dvcmxkKG5vZGUpLnk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHggPT09IHN0YXJ0LnggJiYgeSA9PT0gc3RhcnQueSkgeyB2YWwgPSBcIipcIjsgfVxuICAgICAgICBpZiAoeCA9PT0gc3RhcnRBZGp1c3RlZC54ICYmIHkgPT09IHN0YXJ0QWRqdXN0ZWQueSkgeyB2YWwgPSBcIigqKVwiOyB9XG4gICAgICAgIGlmICh5IDwgNTAgJiYgeCA8IDE1MCkge1xuICAgICAgICAgIGxpbmUgKz0gdmFsO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoeSA8IDUwKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKGxpbmUpO1xuICAgICAgfVxuICAgIH0qL1xuICAgIGNvbnNvbGUudGltZUVuZChcImNhbGN1bGF0ZVBhdGhcIik7XG4gICAgY29uc29sZS5sb2coXCJTdWNlc3NmdWxsOiBcIiwgcmVhY2hlZERlc3RpbmF0aW9uKTtcbiAgICByZXR1cm4gcmVhY2hlZERlc3RpbmF0aW9uO1xuICB9XG5cbiAgcHJpdmF0ZSBfcGxhbnRUcmVlcygpIDogdm9pZCB7XG4gICAgY29uc29sZS5sb2coXCJQbGFudGluZyB0cmVlcy5cIik7XG5cbiAgICBsZXQgdHJlZUZhY3RvcnkgPSBuZXcgVHJlZUZhY3RvcnkodGhpcy5fc2NlbmUsIDEwLCA4KTtcblxuICAgIHRoaXMuX3RyZWVUeXBlcyA9IFtdO1xuICAgIHRoaXMuX3RyZWVTcGVjaWVzID0gMDtcbiAgICAvLyBFbnN1cmUgdGhlcmUgYXJlIGFsd2F5cyAvc29tZS8gb2YgZWFjaCB0eXBlIG9mIHRyZWUuXG4gICAgdGhpcy5fdHJlZVR5cGVzLnB1c2godGhpcy5fY3JlYXRlVHJlZVBpbmUoKSk7XG4gICAgdGhpcy5fdHJlZVR5cGVzLnB1c2godGhpcy5fY3JlYXRlVHJlZURlY2lkdW91cygpKTtcbiAgICAvLyBCdXQgbW9zdCBzaG91bGQgYmUgcmFuZG9tLlxuICAgIHRoaXMuX3RyZWVUeXBlcy5wdXNoKHRoaXMuX2NyZWF0ZVRyZWUoKSk7XG4gICAgdGhpcy5fdHJlZVR5cGVzLnB1c2godGhpcy5fY3JlYXRlVHJlZSgpKTtcbiAgICB0aGlzLl90cmVlVHlwZXMucHVzaCh0aGlzLl9jcmVhdGVUcmVlKCkpO1xuICAgIHRoaXMuX3RyZWVUeXBlcy5wdXNoKHRoaXMuX2NyZWF0ZVRyZWUoKSk7XG4gICAgdGhpcy5fdHJlZVR5cGVzLnB1c2godGhpcy5fY3JlYXRlVHJlZSgpKTtcbiAgICB0aGlzLl90cmVlVHlwZXMucHVzaCh0aGlzLl9jcmVhdGVUcmVlKCkpO1xuICAgIHRoaXMuX3RyZWVUeXBlcy5wdXNoKHRoaXMuX2NyZWF0ZVRyZWUoKSk7XG4gICAgdGhpcy5fdHJlZVR5cGVzLnB1c2godGhpcy5fY3JlYXRlVHJlZSgpKTtcbiAgICB0aGlzLl90cmVlVHlwZXMucHVzaCh0aGlzLl9jcmVhdGVUcmVlKCkpO1xuICAgIHRoaXMuX3RyZWVUeXBlcy5wdXNoKHRoaXMuX2NyZWF0ZVRyZWUoKSk7XG5cbiAgICB0aGlzLl9zaHJ1YlR5cGVzID0gW107XG4gICAgdGhpcy5fc2hydWJUeXBlcy5wdXNoKHRoaXMuX2NyZWF0ZVNocnViKHRydWUpKTtcbiAgICB0aGlzLl9zaHJ1YlR5cGVzLnB1c2godGhpcy5fY3JlYXRlU2hydWIoKSk7XG4gICAgdGhpcy5fc2hydWJUeXBlcy5wdXNoKHRoaXMuX2NyZWF0ZVNocnViKCkpO1xuICAgIHRoaXMuX3NocnViVHlwZXMucHVzaCh0aGlzLl9jcmVhdGVTaHJ1YigpKTtcbiAgICB0aGlzLl9zaHJ1YlR5cGVzLnB1c2godGhpcy5fY3JlYXRlU2hydWIoKSk7XG4gICAgdGhpcy5fc2hydWJUeXBlcy5wdXNoKHRoaXMuX2NyZWF0ZVNocnViKCkpO1xuICAgIHRoaXMuX3NocnViVHlwZXMucHVzaCh0aGlzLl9jcmVhdGVTaHJ1YigpKTtcbiAgICB0aGlzLl9zaHJ1YlR5cGVzLnB1c2godGhpcy5fY3JlYXRlU2hydWIoKSk7XG4gICAgdGhpcy5fc2hydWJUeXBlcy5wdXNoKHRoaXMuX2NyZWF0ZVNocnViKCkpO1xuICAgIHRoaXMuX3NocnViVHlwZXMucHVzaCh0aGlzLl9jcmVhdGVTaHJ1YigpKTtcblxuICAgIHRoaXMuX2dyb3VuZENvdmVyVHlwZXMgPSBbXTtcbiAgICB0aGlzLl9ncm91bmRDb3ZlclR5cGVzLnB1c2godGhpcy5fY3JlYXRlR3JvdW5kQ292ZXIoKSk7XG4gICAgdGhpcy5fZ3JvdW5kQ292ZXJUeXBlcy5wdXNoKHRoaXMuX2NyZWF0ZUdyb3VuZENvdmVyKCkpO1xuICAgIHRoaXMuX2dyb3VuZENvdmVyVHlwZXMucHVzaCh0aGlzLl9jcmVhdGVHcm91bmRDb3ZlcigpKTtcbiAgICB0aGlzLl9ncm91bmRDb3ZlclR5cGVzLnB1c2godGhpcy5fY3JlYXRlR3JvdW5kQ292ZXIoKSk7XG4gICAgdGhpcy5fZ3JvdW5kQ292ZXJUeXBlcy5wdXNoKHRoaXMuX2NyZWF0ZUdyb3VuZENvdmVyKCkpO1xuICAgIHRoaXMuX2dyb3VuZENvdmVyVHlwZXMucHVzaCh0aGlzLl9jcmVhdGVHcm91bmRDb3ZlcigpKTtcbiAgICB0aGlzLl9ncm91bmRDb3ZlclR5cGVzLnB1c2godGhpcy5fY3JlYXRlR3JvdW5kQ292ZXIoKSk7XG4gICAgdGhpcy5fZ3JvdW5kQ292ZXJUeXBlcy5wdXNoKHRoaXMuX2NyZWF0ZUdyb3VuZENvdmVyKCkpO1xuXG4gICAgbGV0IHRyZWVzID0gW107XG4gICAgbGV0IHRpbGVTaXplID0gTWF0aC5wb3coMiwgdGhpcy5fbWF4UmVjdXJzaW9uIC0gdGhpcy5fdHJlZVJlY3Vyc2lvbik7XG4gICAgZm9yIChsZXQgeCA9IDA7IHggPCB0aGlzLl9tYXBTaXplOyB4ICs9IHRpbGVTaXplKSB7XG4gICAgICBmb3IgKGxldCB5ID0gMDsgeSA8IHRoaXMuX21hcFNpemU7IHkgKz0gdGlsZVNpemUpIHtcbiAgICAgICAgbGV0IGNlbGwgPSB0aGlzLmdldENlbGwoe3gsIHksIHJlY3Vyc2lvbjogdGhpcy5fdHJlZVJlY3Vyc2lvbn0pO1xuICAgICAgICBsZXQgc2NhbGUgPSBjZWxsLnZlZ2V0YXRpb24gLyB0aGlzLl90cmVlU2NhbGU7XG4gICAgICAgIGxldCB0cmVlOiBCQUJZTE9OLk1lc2g7XG4gICAgICAgIGlmIChjZWxsLnZlZ2V0YXRpb24gPiA4MCkge1xuICAgICAgICAgIGxldCB0cmVlVHlwZUluZGV4ID0gTWF0aC5yb3VuZChNYXRoLnJhbmRvbSgpICogKHRoaXMuX3RyZWVUeXBlcy5sZW5ndGggLSAxKSk7XG4gICAgICAgICAgLy9jb25zb2xlLmxvZyh0cmVlVHlwZUluZGV4LCB0aGlzLl90cmVlVHlwZXMubGVuZ3RoKTtcbiAgICAgICAgICB0cmVlID0gdGhpcy5fdHJlZVR5cGVzW3RyZWVUeXBlSW5kZXhdLmNsb25lKFxuICAgICAgICAgICAgdGhpcy5fdHJlZVR5cGVzW3RyZWVUeXBlSW5kZXhdLm5hbWUgKyBcIl9cIiArIHggKyBcIl9cIiArIHkpO1xuICAgICAgICB9IGVsc2UgaWYgKGNlbGwudmVnZXRhdGlvbiA+IDUwKSB7XG4gICAgICAgICAgbGV0IHNocnViVHlwZXMgPSB0aGlzLl9zaHJ1YlR5cGVzLmxlbmd0aDtcbiAgICAgICAgICBsZXQgc2hydWJUeXBlSW5kZXggPSBNYXRoLnJvdW5kKE1hdGgucmFuZG9tKCkgKiAodGhpcy5fc2hydWJUeXBlcy5sZW5ndGggLSAxKSk7XG4gICAgICAgICAgdHJlZSA9IHRoaXMuX3NocnViVHlwZXNbc2hydWJUeXBlSW5kZXhdLmNsb25lKFxuICAgICAgICAgICAgdGhpcy5fc2hydWJUeXBlc1tzaHJ1YlR5cGVJbmRleF0ubmFtZSArIFwiX1wiICsgeCArIFwiX1wiICsgeSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRyZWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGxldCBqaXR0ZXJYID0gTWF0aC5yb3VuZChNYXRoLnJhbmRvbSgpICogOCAtIDQpO1xuICAgICAgICAgIGxldCBqaXR0ZXJZID0gTWF0aC5yb3VuZChNYXRoLnJhbmRvbSgpICogOCAtIDQpO1xuICAgICAgICAgIHRyZWUucG9zaXRpb24ueCA9IChcbiAgICAgICAgICAgICh4ICsgaml0dGVyWCkgLSB0aGlzLl9tYXBTaXplIC8gMikgKiB0aGlzLl9tYXBTcGFjaW5nO1xuICAgICAgICAgIHRyZWUucG9zaXRpb24ueSA9IDA7XG4gICAgICAgICAgdHJlZS5wb3NpdGlvbi56ID0gKFxuICAgICAgICAgICAgKHkgKyBqaXR0ZXJZKSAtIHRoaXMuX21hcFNpemUgLyAyKSAqIHRoaXMuX21hcFNwYWNpbmc7XG4gICAgICAgICAgdHJlZS5zY2FsaW5nID0gbmV3IEJBQllMT04uVmVjdG9yMyhzY2FsZSwgc2NhbGUsIHNjYWxlKTtcbiAgICAgICAgICB0cmVlcy5wdXNoKHRyZWUpO1xuXG4gICAgICAgICAgbGV0IGxlYXZlcyA9IHRyZWUuZ2V0Q2hpbGRNZXNoZXModHJ1ZSwgKG1lc2gpID0+IHtcbiAgICAgICAgICAgIHJldHVybiBtZXNoLm5hbWUuc3BsaXQoXCIuXCIpWzFdID09PSBcImxlYXZlc1wiO1xuICAgICAgICAgICAgfSlbMF0uZ2V0Qm91bmRpbmdJbmZvKCkuYm91bmRpbmdCb3g7XG4gICAgICAgICAgbGV0IGxlYXZlc1RvcCA9IGxlYXZlcy5tYXhpbXVtV29ybGQueSAqIHNjYWxlO1xuICAgICAgICAgIGxldCBsZWF2ZXNCb3R0b20gPSBsZWF2ZXMubWluaW11bVdvcmxkLnkgKiBzY2FsZTtcbiAgICAgICAgICBsZXQgeE1pbiA9IChsZWF2ZXMubWluaW11bVdvcmxkLnggLyB0aGlzLl9tYXBTcGFjaW5nKSAqIHNjYWxlO1xuICAgICAgICAgIGxldCB4TWF4ID0gKGxlYXZlcy5tYXhpbXVtV29ybGQueCAvIHRoaXMuX21hcFNwYWNpbmcpICogc2NhbGU7XG4gICAgICAgICAgbGV0IHlNaW4gPSAobGVhdmVzLm1pbmltdW1Xb3JsZC56IC8gdGhpcy5fbWFwU3BhY2luZykgKiBzY2FsZTtcbiAgICAgICAgICBsZXQgeU1heCA9IChsZWF2ZXMubWF4aW11bVdvcmxkLnogLyB0aGlzLl9tYXBTcGFjaW5nKSAqIHNjYWxlO1xuICAgICAgICAgIC8vZm9yIChsZXQgeHggPSBNYXRoLmNlaWwoeE1pbiArIGppdHRlclgpOyB4eCA8PSBNYXRoLmZsb29yKHhNYXggKyBqaXR0ZXJYKTsgeHgrKykge1xuICAgICAgICAgIGZvciAobGV0IHh4ID0gTWF0aC5mbG9vcih4TWluICsgaml0dGVyWCk7IHh4IDw9IE1hdGguY2VpbCh4TWF4ICsgaml0dGVyWCk7IHh4KyspIHtcbiAgICAgICAgICAgIC8vZm9yIChsZXQgeXkgPSBNYXRoLmNlaWwoeU1pbiArIGppdHRlclkpOyB5eSA8PSBNYXRoLmZsb29yKHlNYXggKyBqaXR0ZXJZKTsgeXkrKykge1xuICAgICAgICAgICAgZm9yIChsZXQgeXkgPSBNYXRoLmZsb29yKHlNaW4gKyBqaXR0ZXJZKTsgeXkgPD0gTWF0aC5jZWlsKHlNYXggKyBqaXR0ZXJZKTsgeXkrKykge1xuICAgICAgICAgICAgICBsZXQgYyA9IHRoaXMuZ2V0Q2VsbCh7eDogeHggKyB4LCB5OiB5eSArIHksIHJlY3Vyc2lvbjogdGhpcy5fbWF4UmVjdXJzaW9ufSk7XG4gICAgICAgICAgICAgIGlmIChjICYmIChjLm1heEhlaWdodCA9PT0gdW5kZWZpbmVkIHx8IGMubWF4SGVpZ2h0IDwgbGVhdmVzVG9wKSkge1xuICAgICAgICAgICAgICAgIGMubWF4SGVpZ2h0ID0gbGVhdmVzVG9wO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGlmIChjICYmIChjLm1pbkhlaWdodCA+IGxlYXZlc0JvdHRvbSB8fCBjLm1pbkhlaWdodCA9PT0gdW5kZWZpbmVkKSkge1xuICAgICAgICAgICAgICAgIGMubWluSGVpZ2h0ID0gbGVhdmVzQm90dG9tO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGxldCBjID0gdGhpcy5nZXRDZWxsKHt4LCB5LCByZWN1cnNpb246IHRoaXMuX21heFJlY3Vyc2lvbn0pO1xuICAgICAgICAgIGlmIChjICYmIChjLm1pbkhlaWdodCA9PT0gdW5kZWZpbmVkIHx8IGMubWluSGVpZ2h0ID4gbGVhdmVzQm90dG9tKSkge1xuICAgICAgICAgICAgYy5taW5IZWlnaHQgPSBsZWF2ZXNCb3R0b207XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgbGV0IHRydW5rID0gdHJlZS5nZXRDaGlsZE1lc2hlcyh0cnVlLCAobWVzaCkgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIG1lc2gubmFtZS5zcGxpdChcIi5cIilbMV0gPT09IFwidHJ1bmtcIjtcbiAgICAgICAgICB9KVswXTtcbiAgICAgICAgICBpZiAodHJ1bmspIHtcbiAgICAgICAgICAgIGxldCB0cnVua0JCID0gdHJ1bmsuZ2V0Qm91bmRpbmdJbmZvKCkuYm91bmRpbmdCb3g7XG4gICAgICAgICAgICBsZXQgeE1pblQgPSBNYXRoLnJvdW5kKHRydW5rQkIubWluaW11bVdvcmxkLnggKiBzY2FsZSAvIHRoaXMuX21hcFNwYWNpbmcpO1xuICAgICAgICAgICAgbGV0IHhNYXhUID0gTWF0aC5yb3VuZCh0cnVua0JCLm1heGltdW1Xb3JsZC54ICogc2NhbGUgLyB0aGlzLl9tYXBTcGFjaW5nKTtcbiAgICAgICAgICAgIGxldCB5TWluVCA9IE1hdGgucm91bmQodHJ1bmtCQi5taW5pbXVtV29ybGQueiAqIHNjYWxlIC8gdGhpcy5fbWFwU3BhY2luZyk7XG4gICAgICAgICAgICBsZXQgeU1heFQgPSBNYXRoLnJvdW5kKHRydW5rQkIubWF4aW11bVdvcmxkLnogKiBzY2FsZSAvIHRoaXMuX21hcFNwYWNpbmcpO1xuICAgICAgICAgICAgZm9yIChsZXQgeHggPSBNYXRoLmNlaWwoeE1pblQgKyBqaXR0ZXJYKTsgeHggPD0gTWF0aC5mbG9vcih4TWF4VCArIGppdHRlclgpOyB4eCsrKSB7XG4gICAgICAgICAgICAgIGZvciAobGV0IHl5ID0gTWF0aC5jZWlsKHlNaW5UICsgaml0dGVyWSk7IHl5IDw9IE1hdGguZmxvb3IoeU1heFQgKyBqaXR0ZXJZKTsgeXkrKykge1xuICAgICAgICAgICAgICAgIGxldCBjID0gdGhpcy5nZXRDZWxsKHt4OiB4eCArIHgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHk6IHl5ICsgeSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVjdXJzaW9uOiB0aGlzLl9tYXhSZWN1cnNpb259KTtcbiAgICAgICAgICAgICAgICBpZiAoYykge1xuICAgICAgICAgICAgICAgICAgYy5taW5IZWlnaHQgPSAwO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIGNvbnNvbGUubG9nKHhNaW4sIHhNYXgsIHlNaW4sIHlNYXgpO1xuICAgICAgICAgIC8qbGV0IHRlc3RUcmVldG9wID0gQkFCWUxPTi5NZXNoQnVpbGRlci5DcmVhdGVCb3goXCJ0ZXN0XCIsXG4gICAgICAgICAgICB7XCJ3aWR0aFwiOiAoeE1heCAtIHhNaW4pICogdGhpcy5fbWFwU3BhY2luZyxcbiAgICAgICAgICAgICBcImhlaWdodFwiOiBsZWF2ZXNUb3AgLSBsZWF2ZXNCb3R0b20sXG4gICAgICAgICAgICAgXCJkZXB0aFwiOiAoeU1heCAtIHlNaW4pICogdGhpcy5fbWFwU3BhY2luZ30sXG4gICAgICAgICAgICB0aGlzLl9zY2VuZSk7XG4gICAgICAgICAgdmFyIG1hdGVyaWFsID0gbmV3IEJBQllMT04uU3RhbmRhcmRNYXRlcmlhbChcIm15TWF0ZXJpYWxcIiwgdGhpcy5fc2NlbmUpO1xuICAgICAgICAgIG1hdGVyaWFsLmRpZmZ1c2VDb2xvciA9IG5ldyBCQUJZTE9OLkNvbG9yMygxLCAwLCAwKTtcbiAgICAgICAgICAvL21hdGVyaWFsLndpcmVmcmFtZSA9IHRydWU7XG4gICAgICAgICAgbWF0ZXJpYWwuYWxwaGEgPSAwLjU7XG4gICAgICAgICAgdGVzdFRyZWV0b3AubWF0ZXJpYWwgPSBtYXRlcmlhbDtcbiAgICAgICAgICB0ZXN0VHJlZXRvcC5wb3NpdGlvbi54ID0gKHggKyBqaXR0ZXJYIC0gdGhpcy5fbWFwU2l6ZSAvIDIpICogdGhpcy5fbWFwU3BhY2luZztcbiAgICAgICAgICB0ZXN0VHJlZXRvcC5wb3NpdGlvbi55ID0gKGxlYXZlc1RvcCArIGxlYXZlc0JvdHRvbSkgLyAyO1xuICAgICAgICAgIHRlc3RUcmVldG9wLnBvc2l0aW9uLnogPSAoeSArIGppdHRlclkgLSB0aGlzLl9tYXBTaXplIC8gMikgKiB0aGlzLl9tYXBTcGFjaW5nOyovXG5cbiAgICAgICAgICB0aGlzLl9hcHBseUdyb3VuZENvdmVyKCh4IC0gdGhpcy5fbWFwU2l6ZSAvIDIpICogdGhpcy5fbWFwU3BhY2luZyxcbiAgICAgICAgICAgICh5IC0gdGhpcy5fbWFwU2l6ZSAvIDIpICogdGhpcy5fbWFwU3BhY2luZyk7XG5cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBjb25zb2xlLmxvZyhcIkRvbmUgcGxhbnRpbmdcIik7XG5cbiAgICAvKmZvciAobGV0IHggPSAwOyB4IDwgdGhpcy5fbWFwU2l6ZTsgeCsrKSB7XG4gICAgICBmb3IgKGxldCB5ID0gMDsgeSA8IHRoaXMuX21hcFNpemU7IHkrKykge1xuICAgICAgICBsZXQgY2VsbCA9IHRoaXMuZ2V0Q2VsbCh7eCwgeSwgcmVjdXJzaW9uOiB0aGlzLl9tYXhSZWN1cnNpb259KTtcbiAgICAgICAgaWYgKGNlbGwubWluSGVpZ2h0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAvL2xldCBsZWF2ZXNUb3AgPSBjZWxsLm1heEhlaWdodDtcbiAgICAgICAgICBsZXQgbGVhdmVzVG9wID0gY2VsbC5taW5IZWlnaHQ7XG4gICAgICAgICAgbGV0IHRlc3RUcmVldG9wID0gQkFCWUxPTi5NZXNoQnVpbGRlci5DcmVhdGVQbGFuZShcbiAgICAgICAgICAgIFwidGVzdFwiICsgeCArIFwiX1wiICsgeSArIFwiIFwiICsgdGhpcy5fbWF4UmVjdXJzaW9uLFxuICAgICAgICAgICAge3NpemU6IDEgKiB0aGlzLl9tYXBTcGFjaW5nLCBzaWRlT3JpZW50YXRpb246IEJBQllMT04uTWVzaC5ET1VCTEVTSURFfSxcbiAgICAgICAgICAgIHRoaXMuX3NjZW5lKTtcbiAgICAgICAgICB0ZXN0VHJlZXRvcC5yb3RhdGlvbi54ID0gTWF0aC5QSSAvIDI7XG4gICAgICAgICAgdGVzdFRyZWV0b3AucG9zaXRpb24ueCA9ICh4IC0gdGhpcy5fbWFwU2l6ZSAvIDIpICogdGhpcy5fbWFwU3BhY2luZztcbiAgICAgICAgICB0ZXN0VHJlZXRvcC5wb3NpdGlvbi55ID0gbGVhdmVzVG9wO1xuICAgICAgICAgIHRlc3RUcmVldG9wLnBvc2l0aW9uLnogPSAoeSAtIHRoaXMuX21hcFNpemUgLyAyKSAqIHRoaXMuX21hcFNwYWNpbmc7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9Ki9cblxuICAgIC8vIERvbid0IG5lZWQgdGhlIHByb3RvdHlwZXMgYW55IG1vcmUgc28gZGVsZXRlIHRoZW0uXG4gICAgdGhpcy5fdHJlZVR5cGVzLmZvckVhY2goKG5vZGUpID0+IHsgbm9kZS5kaXNwb3NlKCk7IH0pO1xuICAgIHRoaXMuX3NocnViVHlwZXMuZm9yRWFjaCgobm9kZSkgPT4geyBub2RlLmRpc3Bvc2UoKTsgfSk7XG5cbiAgICBjb25zb2xlLmxvZyhcIkNvbnNvbGlkYXRpbmcgdHJlZXMuXCIpO1xuICAgIHRoaXMuX2NvbnNvbGlkYXRlVHJlZXModHJlZXMpO1xuICB9XG5cbiAgd29ybGRUb01hcChjb29yZDogQ29vcmQpIDogQ29vcmQge1xuICAgIGxldCB4ID0gTWF0aC5yb3VuZChjb29yZC54IC8gdGhpcy5fbWFwU3BhY2luZyArIHRoaXMuX21hcFNpemUgLyAyKTtcbiAgICBsZXQgeSA9IE1hdGgucm91bmQoY29vcmQueSAvIHRoaXMuX21hcFNwYWNpbmcgKyB0aGlzLl9tYXBTaXplIC8gMik7XG4gICAgbGV0IHJlY3Vyc2lvbiA9IGNvb3JkLnJlY3Vyc2lvbjtcbiAgICBpZiAocmVjdXJzaW9uID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJlY3Vyc2lvbiA9IHRoaXMuX21heFJlY3Vyc2lvbjtcbiAgICB9XG4gICAgcmV0dXJuIHt4LCB5LCByZWN1cnNpb259O1xuICB9XG5cbiAgbWFwVG9Xb3JsZChjb29yZDogQ29vcmQpIDogQ29vcmQge1xuICAgIGxldCB4ID0gTWF0aC5yb3VuZChjb29yZC54ICogdGhpcy5fbWFwU3BhY2luZyAtIHRoaXMuX21hcFNpemUgLyAyKTtcbiAgICBsZXQgeSA9IE1hdGgucm91bmQoY29vcmQueSAqIHRoaXMuX21hcFNwYWNpbmcgLSB0aGlzLl9tYXBTaXplIC8gMik7XG4gICAgbGV0IHJlY3Vyc2lvbiA9IGNvb3JkLnJlY3Vyc2lvbjtcbiAgICBpZiAocmVjdXJzaW9uID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJlY3Vyc2lvbiA9IHRoaXMuX21heFJlY3Vyc2lvbjtcbiAgICB9XG4gICAgcmV0dXJuIHt4LCB5LCByZWN1cnNpb259O1xuICB9XG5cbiAgc2V0Q2VsbChjb29yZDogQ29vcmQsIHZlZ2V0YXRpb246IG51bWJlcikgOiB2b2lkIHtcbiAgICBsZXQgY2VsbCA9IG5ldyBNYXBDZWxsKGNvb3JkLCB2ZWdldGF0aW9uKTtcbiAgICB0aGlzLl9jZWxscy5wdXQoY2VsbCwgY2VsbCk7XG4gIH1cblxuICBnZXRDZWxsKGNvb3JkOiBDb29yZCkgOiBNYXBDZWxsIHtcbiAgICBpZiAoY29vcmQucmVjdXJzaW9uID09PSAtIDEpIHtcbiAgICAgIHJldHVybiB0aGlzLl9jZWxscy5nZXQoe1wieFwiOiAwLCBcInlcIjogMCwgXCJyZWN1cnNpb25cIjogMH0pO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fY2VsbHMuZ2V0KGNvb3JkKTtcbiAgfVxuXG4gIGdldEhlaWdodFdvcmxkKGNvb3JkOiBDb29yZCkgOiBudW1iZXIge1xuICAgIGxldCBjZWxsID0gdGhpcy5nZXRDZWxsV29ybGQoY29vcmQpO1xuICAgIGlmICghY2VsbCkge1xuICAgICAgcmV0dXJuIDA7XG4gICAgfVxuICAgIHJldHVybiBjZWxsLm1heEhlaWdodDtcbiAgfVxuXG4gIGdldENlbGxXb3JsZChjb29yZDogQ29vcmQpIDogTWFwQ2VsbCB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0Q2VsbCh0aGlzLndvcmxkVG9NYXAoY29vcmQpKTtcbiAgfVxuXG4gIGdldENlbGxQYXJlbnQoY29vcmQ6IENvb3JkKSA6IE1hcENlbGwge1xuICAgIGxldCBjZWxsID0gdGhpcy5nZXRDZWxsKGNvb3JkKTtcbiAgICBpZiAoY2VsbCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gdGhpcy5nZXRDZWxsKG5ldyBNYXBDZWxsKGNvb3JkLCAtIDEpLnBhcmVudENvb3JkaW5hdGVzKHRoaXMuX21heFJlY3Vyc2lvbikpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5nZXRDZWxsKGNlbGwucGFyZW50Q29vcmRpbmF0ZXModGhpcy5fbWF4UmVjdXJzaW9uKSk7XG4gIH1cblxuICBwcml2YXRlIF9jb25zb2xpZGF0ZVRyZWVzKHRyZWVzOiBCQUJZTE9OLk1lc2hbXSkgOiB2b2lkIHtcbiAgICBjb25zb2xlLmxvZyhcIk1lc2ggY291bnQgYmVmb3JlIF9jb25zb2xpZGF0ZVRyZWVzOiAlY1wiICtcbiAgICAgICAgICAgICAgICB0aGlzLl9zY2VuZS5tZXNoZXMubGVuZ3RoLnRvU3RyaW5nKCksXG4gICAgICAgICAgICAgICAgXCJiYWNrZ3JvdW5kOiBvcmFuZ2U7IGNvbG9yOiB3aGl0ZVwiKTtcblxuICAgIGxldCBjb3VudFN0YXJ0ID0gMDtcbiAgICBsZXQgY291bnRGaW5hbCA9IDA7XG5cbiAgICBsZXQgdHJlZUZvbGlhZ2VCdWNrZXQgPSBuZXcgQXJyYXkodGhpcy5fdHJlZVNwZWNpZXMpLmZpbGwodW5kZWZpbmVkKTtcbiAgICBsZXQgdHJlZVRydW5rQnVja2V0ID0gbmV3IEFycmF5KHRoaXMuX3RyZWVTcGVjaWVzKS5maWxsKHVuZGVmaW5lZCk7XG4gICAgdHJlZXMuZm9yRWFjaCgodHJlZSkgPT4ge1xuICAgICAgLy8gQ29sbGVjdCB0aGUgZGlmZmVyZW50IHRyZWUgc3BlY2llcyB0b2dldGhlciBpbiAyIGNvbGxlY3Rpb25zOlxuICAgICAgLy8gdHJ1bmtzIGFuZCBsZWF2ZXMuXG4gICAgICBsZXQgdHJlZUluZGV4ID0gcGFyc2VJbnQodHJlZS5uYW1lLnNwbGl0KFwiX1wiKVsxXSwgMTApO1xuICAgICAgaWYgKHRyZWVGb2xpYWdlQnVja2V0W3RyZWVJbmRleF0gPT09IHVuZGVmaW5lZCB8fCB0cmVlVHJ1bmtCdWNrZXQgPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRyZWVGb2xpYWdlQnVja2V0W3RyZWVJbmRleF0gPSBbXTtcbiAgICAgICAgdHJlZVRydW5rQnVja2V0W3RyZWVJbmRleF0gPSBbXTtcbiAgICAgIH1cbiAgICAgIHRyZWUuZ2V0Q2hpbGRNZXNoZXModHJ1ZSkuZm9yRWFjaCgobm9kZSkgPT4ge1xuICAgICAgICBsZXQgbm9kZU5hbWUgPSBub2RlLm5hbWUuc3BsaXQoXCIuXCIpWzFdO1xuICAgICAgICBpZiAobm9kZU5hbWUgPT09IFwibGVhdmVzXCIpIHtcbiAgICAgICAgICBsZXQgcG9zID0gbm9kZS5nZXRBYnNvbHV0ZVBvc2l0aW9uKCk7XG4gICAgICAgICAgbm9kZS5zZXRQYXJlbnQobnVsbCk7XG4gICAgICAgICAgbm9kZS5zZXRBYnNvbHV0ZVBvc2l0aW9uKHBvcyk7XG4gICAgICAgICAgdHJlZUZvbGlhZ2VCdWNrZXRbdHJlZUluZGV4XS5wdXNoKG5vZGUpO1xuICAgICAgICB9IGVsc2UgaWYgKG5vZGVOYW1lID09PSBcInRydW5rXCIpIHtcbiAgICAgICAgICBsZXQgcG9zID0gbm9kZS5nZXRBYnNvbHV0ZVBvc2l0aW9uKCk7XG4gICAgICAgICAgbm9kZS5zZXRQYXJlbnQobnVsbCk7XG4gICAgICAgICAgbm9kZS5zZXRBYnNvbHV0ZVBvc2l0aW9uKHBvcyk7XG4gICAgICAgICAgdHJlZVRydW5rQnVja2V0W3RyZWVJbmRleF0ucHVzaChub2RlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjb25zb2xlLmxvZyhub2RlTmFtZSk7XG4gICAgICAgICAgY29uc29sZS5hc3NlcnQoZmFsc2UgJiYgXCJVbmtub3duIHRyZWUgY29tcG9uZW50XCIpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIC8vIFdlIGhhdmUgdGhlIGNvbXBvbmVudCBwYXJ0cyBzbyBkb24ndCBuZWVkIHRoZSBvcmlnaW5hbCB0cmVlIGFueW1vcmUuXG4gICAgICB0cmVlLmRpc3Bvc2UoKTtcbiAgICB9KTtcblxuICAgIC8vIENvbWJpbmUgYWxsIHRydW5rcyBvZiB0aGUgc2FtZSBzcGVjaWVzIHRvZ2V0aGVyLlxuICAgIHRyZWVUcnVua0J1Y2tldC5mb3JFYWNoKChidWNrZXQpID0+IHtcbiAgICAgIGlmIChidWNrZXQgJiYgYnVja2V0Lmxlbmd0aCkge1xuICAgICAgICBjb3VudFN0YXJ0ICs9IGJ1Y2tldC5sZW5ndGg7XG4gICAgICAgIGNvdW50RmluYWwrKztcbiAgICAgICAgbGV0IHQgPSBCQUJZTE9OLk1lc2guTWVyZ2VNZXNoZXMoYnVja2V0LCB0cnVlLCB0cnVlLCBudWxsLCB0cnVlKTtcbiAgICAgICAgLy8gdGhpcy5fc2hhZGRvd3MuZ2V0U2hhZG93TWFwKCkucmVuZGVyTGlzdC5wdXNoKHQpO1xuICAgICAgfVxuICAgIH0sIHRoaXMpO1xuICAgIC8vIENvbWJpbmUgYWxsIGxlYXZlcyBvZiB0aGUgc2FtZSBzcGVjaWVzIHRvZ2V0aGVyLlxuICAgIHRyZWVGb2xpYWdlQnVja2V0LmZvckVhY2goKGJ1Y2tldCkgPT4ge1xuICAgICAgaWYgKGJ1Y2tldCAmJiBidWNrZXQubGVuZ3RoKSB7XG4gICAgICAgIGNvdW50U3RhcnQgKz0gYnVja2V0Lmxlbmd0aDtcbiAgICAgICAgY291bnRGaW5hbCsrO1xuICAgICAgICBsZXQgdCA9IEJBQllMT04uTWVzaC5NZXJnZU1lc2hlcyhidWNrZXQsIHRydWUsIHRydWUsIG51bGwsIHRydWUpO1xuICAgICAgICAvLyB0aGlzLl9zaGFkZG93cy5nZXRTaGFkb3dNYXAoKS5yZW5kZXJMaXN0LnB1c2godCk7XG4gICAgICB9XG4gICAgfSwgdGhpcyk7XG5cbiAgICBjb25zb2xlLmxvZyhcIlRyZWUgY29tcG9uZW50IGNvdW50IGJlZm9yZSBfY29uc29saWRhdGVUcmVlczogJWNcIiArXG4gICAgICAgICAgICAgICAgY291bnRTdGFydC50b1N0cmluZygpLFxuICAgICAgICAgICAgICAgIFwiYmFja2dyb3VuZDogb3JhbmdlOyBjb2xvcjogd2hpdGVcIik7XG4gICAgY29uc29sZS5sb2coXCJNZXNoIGNvdW50IGFmdGVyIF9jb25zb2xpZGF0ZVRyZWVzOiAlY1wiICtcbiAgICAgICAgICAgICAgICB0aGlzLl9zY2VuZS5tZXNoZXMubGVuZ3RoLnRvU3RyaW5nKCksXG4gICAgICAgICAgICAgICAgXCJiYWNrZ3JvdW5kOiBvcmFuZ2U7IGNvbG9yOiB3aGl0ZVwiKTtcbiAgICBjb25zb2xlLmxvZyhcIlRyZWUgY29tcG9uZW50IGNvdW50IGFmdGVyIF9jb25zb2xpZGF0ZVRyZWVzOiAlY1wiICtcbiAgICAgICAgICAgICAgICBjb3VudEZpbmFsLnRvU3RyaW5nKCksXG4gICAgICAgICAgICAgICAgXCJiYWNrZ3JvdW5kOiBvcmFuZ2U7IGNvbG9yOiB3aGl0ZVwiKTtcbiAgfVxuXG4gIF9jcmVhdGVUcmVlKCkgOiBCQUJZTE9OLk1lc2gge1xuICAgIGlmIChNYXRoLnJhbmRvbSgpID4gMC4yKSB7XG4gICAgICByZXR1cm4gdGhpcy5fY3JlYXRlVHJlZURlY2lkdW91cygpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fY3JlYXRlVHJlZVBpbmUoKTtcbiAgfVxuXG4gIF9jcmVhdGVUcmVlUGluZSgpIDogQkFCWUxPTi5NZXNoIHtcbiAgICBsZXQgY2Fub3BpZXMgPSBNYXRoLnJvdW5kKE1hdGgucmFuZG9tKCkgKiAzKSArIDQ7XG4gICAgbGV0IGhlaWdodCA9IE1hdGgucm91bmQoTWF0aC5yYW5kb20oKSAqIDIwKSArIDIwO1xuICAgIGxldCB3aWR0aCA9IDU7XG4gICAgbGV0IHRydW5rTWF0ZXJpYWwgPSBuZXcgQkFCWUxPTi5TdGFuZGFyZE1hdGVyaWFsKFwidHJ1bmtcIiwgdGhpcy5fc2NlbmUpO1xuICAgIHRydW5rTWF0ZXJpYWwuZGlmZnVzZUNvbG9yID0gbmV3IEJBQllMT04uQ29sb3IzKDAuMyArIE1hdGgucmFuZG9tKCkgKiAwLjIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgMC4yICsgTWF0aC5yYW5kb20oKSAqIDAuMixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAwLjIgKyBNYXRoLnJhbmRvbSgpICogMC4xKTtcbiAgICB0cnVua01hdGVyaWFsLnNwZWN1bGFyQ29sb3IgPSBCQUJZTE9OLkNvbG9yMy5CbGFjaygpO1xuICAgIGxldCBsZWFmTWF0ZXJpYWwgPSBuZXcgQkFCWUxPTi5TdGFuZGFyZE1hdGVyaWFsKFwibGVhZlwiLCB0aGlzLl9zY2VuZSk7XG4gICAgbGVhZk1hdGVyaWFsLmRpZmZ1c2VDb2xvciA9IG5ldyBCQUJZTE9OLkNvbG9yMygwLjQgKyBNYXRoLnJhbmRvbSgpICogMC4yLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgMC41ICsgTWF0aC5yYW5kb20oKSAqIDAuNCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDAuMiArIE1hdGgucmFuZG9tKCkgKiAwLjIpO1xuICAgIGxlYWZNYXRlcmlhbC5zcGVjdWxhckNvbG9yID0gQkFCWUxPTi5Db2xvcjMuUmVkKCk7XG5cbiAgICBsZXQgdHJlZSA9IFBpbmVHZW5lcmF0b3IoXG4gICAgICBjYW5vcGllcywgaGVpZ2h0LCB3aWR0aCwgdHJ1bmtNYXRlcmlhbCwgbGVhZk1hdGVyaWFsLCB0aGlzLl9zY2VuZSk7XG4gICAgdHJlZS5zZXRFbmFibGVkKGZhbHNlKTtcbiAgICB0cmVlLm5hbWUgKz0gXCJfXCIgKyB0aGlzLl90cmVlU3BlY2llcztcbiAgICB0aGlzLl90cmVlU3BlY2llcysrO1xuICAgIHJldHVybiB0cmVlO1xuICB9XG5cbiAgX2NyZWF0ZVRyZWVEZWNpZHVvdXMoKSA6IEJBQllMT04uTWVzaCB7XG4gICAgbGV0IHNpemVCcmFuY2ggPSAxNSArIE1hdGgucmFuZG9tKCkgKiA1O1xuICAgIGxldCBzaXplVHJ1bmsgPSAxMCArIE1hdGgucmFuZG9tKCkgKiA1O1xuICAgIGxldCByYWRpdXMgPSAxICsgTWF0aC5yYW5kb20oKSAqIDQ7XG4gICAgbGV0IHRydW5rTWF0ZXJpYWwgPSBuZXcgQkFCWUxPTi5TdGFuZGFyZE1hdGVyaWFsKFwidHJ1bmtcIiwgdGhpcy5fc2NlbmUpO1xuICAgIHRydW5rTWF0ZXJpYWwuZGlmZnVzZUNvbG9yID0gbmV3IEJBQllMT04uQ29sb3IzKDAuMyArIE1hdGgucmFuZG9tKCkgKiAwLjMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgMC4yICsgTWF0aC5yYW5kb20oKSAqIDAuMyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAwLjIgKyBNYXRoLnJhbmRvbSgpICogMC4yKTtcbiAgICB0cnVua01hdGVyaWFsLnNwZWN1bGFyQ29sb3IgPSBCQUJZTE9OLkNvbG9yMy5CbGFjaygpO1xuICAgIGxldCBsZWFmTWF0ZXJpYWwgPSBuZXcgQkFCWUxPTi5TdGFuZGFyZE1hdGVyaWFsKFwibGVhZlwiLCB0aGlzLl9zY2VuZSk7XG4gICAgbGVhZk1hdGVyaWFsLmRpZmZ1c2VDb2xvciA9IG5ldyBCQUJZTE9OLkNvbG9yMygwLjQgKyBNYXRoLnJhbmRvbSgpICogMC4yLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgMC41ICsgTWF0aC5yYW5kb20oKSAqIDAuNCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDAuMiArIE1hdGgucmFuZG9tKCkgKiAwLjIpO1xuICAgIGxlYWZNYXRlcmlhbC5zcGVjdWxhckNvbG9yID0gQkFCWUxPTi5Db2xvcjMuUmVkKCk7XG4gICAgbGV0IHRyZWUgPSBRdWlja1RyZWVHZW5lcmF0b3IoXG4gICAgICBzaXplQnJhbmNoLCBzaXplVHJ1bmssIHJhZGl1cywgdHJ1bmtNYXRlcmlhbCwgbGVhZk1hdGVyaWFsLCB0aGlzLl9zY2VuZSk7XG4gICAgdHJlZS5zZXRFbmFibGVkKGZhbHNlKTtcbiAgICB0cmVlLm5hbWUgKz0gXCJfXCIgKyB0aGlzLl90cmVlU3BlY2llcztcbiAgICB0aGlzLl90cmVlU3BlY2llcysrO1xuICAgIHJldHVybiB0cmVlO1xuICB9XG5cbiAgX2NyZWF0ZVNocnViKGZvcmNlU2FwbGluZz86IGJvb2xlYW4pIDogQkFCWUxPTi5NZXNoIHtcbiAgICBpZiAoTWF0aC5yYW5kb20oKSA8IDAuMSB8fCBmb3JjZVNhcGxpbmcpIHtcbiAgICAgIGxldCBzYXBsaW5nID0gdGhpcy5fY3JlYXRlVHJlZSgpO1xuICAgICAgc2FwbGluZy5zY2FsaW5nLnggKj0gMC4yO1xuICAgICAgc2FwbGluZy5zY2FsaW5nLnkgKj0gMC4yO1xuICAgICAgc2FwbGluZy5zY2FsaW5nLnogKj0gMC4yO1xuICAgICAgcmV0dXJuIHNhcGxpbmc7XG4gICAgfVxuICAgIGxldCBzaXplQnJhbmNoID0gMTAgKyBNYXRoLnJhbmRvbSgpICogMjA7XG4gICAgbGV0IGxlYWZNYXRlcmlhbCA9IG5ldyBCQUJZTE9OLlN0YW5kYXJkTWF0ZXJpYWwoXCJsZWFmXCIsIHRoaXMuX3NjZW5lKTtcbiAgICBsZWFmTWF0ZXJpYWwuZGlmZnVzZUNvbG9yID0gbmV3IEJBQllMT04uQ29sb3IzKDAuNCArIE1hdGgucmFuZG9tKCkgKiAwLjIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAwLjUgKyBNYXRoLnJhbmRvbSgpICogMC40LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgMC4yICsgTWF0aC5yYW5kb20oKSAqIDAuMik7XG4gICAgbGVhZk1hdGVyaWFsLnNwZWN1bGFyQ29sb3IgPSBCQUJZTE9OLkNvbG9yMy5HcmF5KCk7XG4gICAgbGV0IHRyZWUgPSBRdWlja1NocnViKHNpemVCcmFuY2gsIGxlYWZNYXRlcmlhbCwgdGhpcy5fc2NlbmUpO1xuICAgIHRyZWUuc2V0RW5hYmxlZChmYWxzZSk7XG4gICAgdHJlZS5uYW1lICs9IFwiX1wiICsgdGhpcy5fdHJlZVNwZWNpZXM7XG4gICAgdGhpcy5fdHJlZVNwZWNpZXMrKztcbiAgICByZXR1cm4gdHJlZTtcbiAgfVxuXG4gIF9jcmVhdGVHcm91bmRDb3ZlcigpIDogQkFCWUxPTi5TdGFuZGFyZE1hdGVyaWFsIHtcbiAgICBsZXQgZmxvd2VycyA9IFtcbiAgICAgIFwiZ3JlZW5lcnkxLnBuZ1wiLFxuICAgICAgXCJncmVlbmVyeTIucG5nXCIsXG4gICAgICBcImdyZWVuZXJ5My5wbmdcIixcbiAgICAgIFwiZ3JlZW5lcnk0LnBuZ1wiLFxuICAgICAgXCJncmVlbmVyeTUucG5nXCIsXG4gICAgICBcImdyZWVuZXJ5Ni5wbmdcIixcbiAgICAgIFwiZ3JlZW5lcnk3LnBuZ1wiLFxuICAgICAgXCJncmVlbmVyeTgucG5nXCIsXG4gICAgXTtcbiAgICBsZXQgaW1hZ2UgPSB0aGlzLl9ncm91bmRDb3ZlclR5cGVzLmxlbmd0aDtcblxuICAgIGxldCBkZWNhbE1hdGVyaWFsID0gbmV3IEJBQllMT04uU3RhbmRhcmRNYXRlcmlhbChmbG93ZXJzW2ltYWdlXSwgdGhpcy5fc2NlbmUpO1xuICAgIGRlY2FsTWF0ZXJpYWwuZGlmZnVzZVRleHR1cmUgPSBuZXcgQkFCWUxPTi5UZXh0dXJlKFxuICAgICAgXCJ0ZXh0dXJlcy9ncm91bmRjb3Zlci9cIiArIGZsb3dlcnNbaW1hZ2VdLCB0aGlzLl9zY2VuZSk7XG4gICAgZGVjYWxNYXRlcmlhbC5kaWZmdXNlVGV4dHVyZS5oYXNBbHBoYSA9IHRydWU7XG4gICAgZGVjYWxNYXRlcmlhbC56T2Zmc2V0ID0gLU1hdGgucm91bmQodGhpcy5fZ3JvdW5kQ292ZXJUeXBlcy5sZW5ndGggLyAyICsgMSk7XG4gICAgZGVjYWxNYXRlcmlhbC5zcGVjdWxhckNvbG9yID0gbmV3IEJBQllMT04uQ29sb3IzKDAsIDAsIDApO1xuICAgICAgZGVjYWxNYXRlcmlhbC5kaXNhYmxlRGVwdGhXcml0ZSA9IGZhbHNlO1xuICAgICAgZGVjYWxNYXRlcmlhbC5mb3JjZURlcHRoV3JpdGUgPSB0cnVlO1xuXG4gICAgcmV0dXJuIGRlY2FsTWF0ZXJpYWw7XG4gIH1cblxuICBfYXBwbHlHcm91bmRDb3Zlcih4OiBudW1iZXIsIHk6IG51bWJlcikgOiB2b2lkIHtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IE1hdGgucmFuZG9tKCkgKiAzOyBpKyspIHtcbiAgICAgIGxldCBkZWNhbFNjYWxlID0gMjAgKyBNYXRoLnJhbmRvbSgpICogNDA7XG4gICAgICBsZXQgZGVjYWxTaXplID0gQkFCWUxPTi5WZWN0b3IzLk9uZSgpLnNjYWxlKGRlY2FsU2NhbGUpO1xuICAgICAgbGV0IGRlY2FsUm90YXRlID0gTWF0aC5QSSAqIDIgKiBNYXRoLnJhbmRvbSgpO1xuICAgICAgbGV0IG5ld0RlY2FsID0gQkFCWUxPTi5NZXNoQnVpbGRlci5DcmVhdGVEZWNhbChcbiAgICAgICAgXCJncm91bmRDb3Zlcl9cIiArIHggKyBcIl9cIiArIHksXG4gICAgICAgIHRoaXMuX2dyb3VuZCxcbiAgICAgICAge1xuICAgICAgICAgIHBvc2l0aW9uOiBuZXcgQkFCWUxPTi5WZWN0b3IzKHgsIDAsIHkpLFxuICAgICAgICAgbm9ybWFsOiBuZXcgQkFCWUxPTi5WZWN0b3IzKDAsIDEsIDApLFxuICAgICAgICAgc2l6ZTogZGVjYWxTaXplLFxuICAgICAgICAgYW5nbGU6IGRlY2FsUm90YXRlXG4gICAgICAgIH0pO1xuXG4gICAgICBsZXQgbWF0ZXJpYWxJbmRleCA9IE1hdGgucm91bmQoTWF0aC5yYW5kb20oKSAqICh0aGlzLl9ncm91bmRDb3ZlclR5cGVzLmxlbmd0aCAtIDEpKTtcbiAgICAgIGxldCBwcm9wb3NlZE1hdGVyaWFsID0gdGhpcy5fZ3JvdW5kQ292ZXJUeXBlc1ttYXRlcmlhbEluZGV4XTtcbiAgICAgIGxldCBkZWNhbEhlaWdodCA9IHByb3Bvc2VkTWF0ZXJpYWwuek9mZnNldDtcblxuICAgICAgLy8gQ2hlY2sgdGhlIHByb3Bvc2VkIG1hdGVyaWFsIGRvZXMgbm90IGNsYXNoIHdpdGggYW4gb3ZlcmxhcHBpbmcgbWF0ZXJpYWxcbiAgICAgIC8vIGF0IHRoZSBzYW1lIHpPZmZzZXQuXG4gICAgICBsZXQgbm9Db25mbGljdCA9IHRydWU7XG4gICAgICBmb3IgKGxldCBkZWNhbENvdmVyWCA9IHggLSBNYXRoLnJvdW5kKGRlY2FsU2NhbGUgLyAyKTtcbiAgICAgICAgICBkZWNhbENvdmVyWCA8IHggKyBNYXRoLnJvdW5kKGRlY2FsU2NhbGUgLyAyKSAmJiBub0NvbmZsaWN0O1xuICAgICAgICAgIGRlY2FsQ292ZXJYKyspIHtcbiAgICAgICAgZm9yIChsZXQgZGVjYWxDb3ZlclkgPSB5IC0gTWF0aC5yb3VuZChkZWNhbFNjYWxlIC8gMik7XG4gICAgICAgICAgICBkZWNhbENvdmVyWSA8IHkgKyBNYXRoLnJvdW5kKGRlY2FsU2NhbGUgLyAyKTtcbiAgICAgICAgICAgIGRlY2FsQ292ZXJZKyspIHtcbiAgICAgICAgICBsZXQga2V5ID0gXCJcIiArIGRlY2FsQ292ZXJYICsgXCJfXCIgKyBkZWNhbENvdmVyWSArIFwiX1wiICsgZGVjYWxIZWlnaHQ7XG4gICAgICAgICAgaWYgKHRoaXMuX2dyb3VuZENvdmVyW2tleV0pIHtcbiAgICAgICAgICAgIC8vIEFscmVhZHkgZXhpc3RzLlxuICAgICAgICAgICAgbm9Db25mbGljdCA9IGZhbHNlO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmIChub0NvbmZsaWN0KSB7XG4gICAgICAgIG5ld0RlY2FsLm1hdGVyaWFsID0gcHJvcG9zZWRNYXRlcmlhbDtcbiAgICAgICAgLy8gU2V0IGEgcmVjb3JkIG9mIHdoZXJlIHRoaXMgZGVjYWwgY292ZXJzIGFuZCBhdCB3aGF0IHpPZmZzZXQuXG4gICAgICAgIGZvciAobGV0IGRlY2FsQ292ZXJYID0geCAtIE1hdGgucm91bmQoZGVjYWxTY2FsZSAvIDIpO1xuICAgICAgICAgICAgZGVjYWxDb3ZlclggPCB4ICsgTWF0aC5yb3VuZChkZWNhbFNjYWxlIC8gMikgJiYgbm9Db25mbGljdDtcbiAgICAgICAgICAgIGRlY2FsQ292ZXJYKyspIHtcbiAgICAgICAgICBmb3IgKGxldCBkZWNhbENvdmVyWSA9IHkgLSBNYXRoLnJvdW5kKGRlY2FsU2NhbGUgLyAyKTtcbiAgICAgICAgICAgICAgZGVjYWxDb3ZlclkgPCB5ICsgTWF0aC5yb3VuZChkZWNhbFNjYWxlIC8gMik7XG4gICAgICAgICAgICAgIGRlY2FsQ292ZXJZKyspIHtcbiAgICAgICAgICAgIGxldCBrZXkgPSBcIlwiICsgZGVjYWxDb3ZlclggKyBcIl9cIiArIGRlY2FsQ292ZXJZICsgXCJfXCIgKyBkZWNhbEhlaWdodDtcbiAgICAgICAgICAgIHRoaXMuX2dyb3VuZENvdmVyW2tleV0gPSB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbmV3RGVjYWwuZGlzcG9zZSgpO1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5pbnRlcmZhY2UgQ2FtZXJhRGVzY3JpcHRpb24ge1xuICBuYW1lOiBzdHJpbmc7XG4gIGNhbWVyYTogQkFCWUxPTi5DYW1lcmE7XG59XG5cbmNsYXNzIENhbWVyYSB7XG4gIHByaXZhdGUgX2NhbnZhczogSFRNTENhbnZhc0VsZW1lbnQ7XG4gIHByaXZhdGUgX3NjZW5lOiBCQUJZTE9OLlNjZW5lO1xuICBwcml2YXRlIF9jYW1lcmFBcmM6IEJBQllMT04uQXJjUm90YXRlQ2FtZXJhO1xuICBwcml2YXRlIF9jYW1lcmFVbml2ZXJzYWw6IEJBQllMT04uVW5pdmVyc2FsQ2FtZXJhO1xuICBwcml2YXRlIF9jYW1lcmFGb2xsb3c6IEJBQllMT04uRm9sbG93Q2FtZXJhO1xuICAvL3ByaXZhdGUgX3NlbGVjdGVkQWN0b3I6IDA7XG4gIHByaXZhdGUgX3RhcmdldDogQkFCWUxPTi5NZXNoO1xuXG4gIHJlYWRvbmx5IGNhbWVyYXM6IENhbWVyYURlc2NyaXB0aW9uW107XG5cbiAgY29uc3RydWN0b3IoY2FudmFzOiBIVE1MQ2FudmFzRWxlbWVudCwgc2NlbmU6IEJBQllMT04uU2NlbmUsIGFjdG9yczogQ2hhcmFjdGVyW10pIHtcbiAgICB0aGlzLl9jYW52YXMgPSBjYW52YXM7XG4gICAgdGhpcy5fc2NlbmUgPSBzY2VuZTtcbiAgICB0aGlzLmNhbWVyYXMgPSBbXTtcblxuICAgIHRoaXMuX3RhcmdldCA9IEJBQllMT04uTWVzaEJ1aWxkZXIuQ3JlYXRlU3BoZXJlKFxuICAgICAgXCJ0YXJnZXRDYW1lcmFcIiwge2RpYW1ldGVyWDogMC4xLCBkaWFtZXRlclk6IDAuMSwgZGlhbWV0ZXJaOiAwLjF9LCB0aGlzLl9zY2VuZSk7XG4gICAgdGhpcy5fdGFyZ2V0LnBvc2l0aW9uID0gbmV3IEJBQllMT04uVmVjdG9yMygxMDAsIDQwLCAxMDApO1xuXG4gICAgdGhpcy5fY2FtZXJhQXJjID0gbmV3IEJBQllMT04uQXJjUm90YXRlQ2FtZXJhKFxuICAgICAgXCJBcmNSb3RhdGVDYW1lcmFcIiwgMCwgMCwgMiwgbmV3IEJBQllMT04uVmVjdG9yMygwLCAzMCwgMCksIHRoaXMuX3NjZW5lKTtcbiAgICB0aGlzLl9jYW1lcmFBcmMuc2V0UG9zaXRpb24obmV3IEJBQllMT04uVmVjdG9yMyg1LCAxNywgMzApKTtcbiAgICB0aGlzLl9jYW1lcmFBcmMubWluWiA9IDAuNTtcbiAgICB0aGlzLl9jYW1lcmFBcmMubWF4WiA9IDgwMDtcbiAgICB0aGlzLl9jYW1lcmFBcmMubG93ZXJCZXRhTGltaXQgPSAwLjE7XG4gICAgdGhpcy5fY2FtZXJhQXJjLnVwcGVyQmV0YUxpbWl0ID0gKE1hdGguUEkgLyAyKSAtIDAuMTtcbiAgICB0aGlzLl9jYW1lcmFBcmMubG93ZXJSYWRpdXNMaW1pdCA9IDI7XG4gICAgdGhpcy5fY2FtZXJhQXJjLmF0dGFjaENvbnRyb2wodGhpcy5fY2FudmFzLCB0cnVlLCBmYWxzZSk7XG4gICAgdGhpcy5fY2FtZXJhQXJjLnNldFRhcmdldCh0aGlzLl90YXJnZXQucG9zaXRpb24pO1xuICAgIHRoaXMuX3NjZW5lLmFjdGl2ZUNhbWVyYSA9IHRoaXMuX2NhbWVyYUFyYztcbiAgICB0aGlzLmNhbWVyYXMucHVzaCh7XCJuYW1lXCI6IFwiQXJjUm90YXRlXCIsIFwiY2FtZXJhXCI6IHRoaXMuX2NhbWVyYUFyY30pO1xuXG4gICAgdGhpcy5fY2FtZXJhVW5pdmVyc2FsID0gbmV3IEJBQllMT04uVW5pdmVyc2FsQ2FtZXJhKFxuICAgICAgXCJVbml2ZXJzYWxDYW1lcmFcIiwgbmV3IEJBQllMT04uVmVjdG9yMygwLCAwLCAtIDEwKSwgdGhpcy5fc2NlbmUpO1xuICAgIHRoaXMuX2NhbWVyYVVuaXZlcnNhbC5zZXRUYXJnZXQodGhpcy5fdGFyZ2V0LnBvc2l0aW9uKTtcbiAgICB0aGlzLmNhbWVyYXMucHVzaCh7XCJuYW1lXCI6IFwiVW5pdmVyc2FsXCIsIFwiY2FtZXJhXCI6IHRoaXMuX2NhbWVyYVVuaXZlcnNhbH0pO1xuXG4gICAgdGhpcy5fY2FtZXJhRm9sbG93ID0gbmV3IEJBQllMT04uRm9sbG93Q2FtZXJhKFxuICAgICAgXCJGb2xsb3dDYW1lcmFcIiwgbmV3IEJBQllMT04uVmVjdG9yMygwLCAxLCAtIDEwKSwgdGhpcy5fc2NlbmUpO1xuICAgIHRoaXMuX2NhbWVyYUZvbGxvdy5yYWRpdXMgPSAxMDtcbiAgICB0aGlzLl9jYW1lcmFGb2xsb3cuaGVpZ2h0T2Zmc2V0ID0gMTtcbiAgICB0aGlzLl9jYW1lcmFGb2xsb3cucm90YXRpb25PZmZzZXQgPSAxODAgLyA0O1xuICAgIHRoaXMuX2NhbWVyYUZvbGxvdy5jYW1lcmFBY2NlbGVyYXRpb24gPSAwLjAyO1xuICAgIHRoaXMuX2NhbWVyYUZvbGxvdy5tYXhDYW1lcmFTcGVlZCA9IDIwO1xuICAgIHRoaXMuX2NhbWVyYUZvbGxvdy5hdHRhY2hDb250cm9sKHRoaXMuX2NhbnZhcywgdHJ1ZSk7XG4gICAgdGhpcy5fY2FtZXJhRm9sbG93LmxvY2tlZFRhcmdldCA9IHRoaXMuX3RhcmdldDtcbiAgICAvL3RoaXMuX2NhbWVyYUZvbGxvdy5sb3dlclJhZGl1c0xpbWl0ID0gMztcbiAgICAvL3RoaXMuX2NhbWVyYUZvbGxvdy5sb3dlckhlaWdodE9mZnNldExpbWl0ID0gMTtcbiAgICB0aGlzLmNhbWVyYXMucHVzaCh7XCJuYW1lXCI6IFwiRm9sbG93XCIsIFwiY2FtZXJhXCI6IHRoaXMuX2NhbWVyYUZvbGxvd30pO1xuXG4gICAgdGhpcy5fc2NlbmUub25CZWZvcmVSZW5kZXJPYnNlcnZhYmxlLmFkZCgoKSA9PiB7XG4gICAgICBpZiAodGhpcy5fY2FtZXJhQXJjLmdldFRhcmdldCgpICE9IHRoaXMuX3RhcmdldC5wb3NpdGlvbikge1xuICAgICAgICB0aGlzLl9jYW1lcmFBcmMuc2V0VGFyZ2V0KHRoaXMuX3RhcmdldC5wb3NpdGlvbik7XG4gICAgICB9XG4gICAgICAvL3RoaXMuX2NhbWVyYUFyYy5yZWJ1aWxkQW5nbGVzQW5kUmFkaXVzKCk7XG4gICAgfSk7XG4gIH1cblxuICBzZXRUYXJnZXQodGFyZ2V0UG9zaXRpb246IEJBQllMT04uVmVjdG9yMykge1xuICAgIC8vdGhpcy5fY2FtZXJhQXJjLnNldFRhcmdldCh0YXJnZXRQb3NpdGlvbik7XG4gICAgLy90aGlzLl9jYW1lcmFVbml2ZXJzYWwuc2V0VGFyZ2V0KHRhcmdldFBvc2l0aW9uKTtcblxuICAgIGxldCBhbmltYXRpb24gPSBuZXcgQkFCWUxPTi5BbmltYXRpb24oXG4gICAgICBcImNhbWVyYVRhcmdldEVhc2VcIixcbiAgICAgIFwicG9zaXRpb25cIixcbiAgICAgIDMwLFxuICAgICAgQkFCWUxPTi5BbmltYXRpb24uQU5JTUFUSU9OVFlQRV9WRUNUT1IzLFxuICAgICAgQkFCWUxPTi5BbmltYXRpb24uQU5JTUFUSU9OTE9PUE1PREVfQ1lDTEUpO1xuXG4gICAgLy8gQW5pbWF0aW9uIGtleXNcbiAgICB2YXIga2V5cyA9IFtdO1xuICAgIGtleXMucHVzaCh7IGZyYW1lOiAwLCB2YWx1ZTogdGhpcy5fdGFyZ2V0LnBvc2l0aW9uIH0pO1xuICAgIGtleXMucHVzaCh7IGZyYW1lOiAxMjAsIHZhbHVlOiB0YXJnZXRQb3NpdGlvbiB9KTtcbiAgICBhbmltYXRpb24uc2V0S2V5cyhrZXlzKTtcblxuICAgIHZhciBlYXNpbmdGdW5jdGlvbiA9IG5ldyBCQUJZTE9OLkNpcmNsZUVhc2UoKTtcbiAgICBlYXNpbmdGdW5jdGlvbi5zZXRFYXNpbmdNb2RlKEJBQllMT04uRWFzaW5nRnVuY3Rpb24uRUFTSU5HTU9ERV9FQVNFSU5PVVQpO1xuICAgIGFuaW1hdGlvbi5zZXRFYXNpbmdGdW5jdGlvbihlYXNpbmdGdW5jdGlvbik7XG4gICAgdGhpcy5fdGFyZ2V0LmFuaW1hdGlvbnMucHVzaChhbmltYXRpb24pO1xuICAgIHRoaXMuX3NjZW5lLmJlZ2luQW5pbWF0aW9uKHRoaXMuX3RhcmdldCwgMCwgMTIwLCBmYWxzZSk7XG5cbiAgfVxuXG4gIHNldEVuYWJsZWQoY2FtZXJhOiBDYW1lcmFEZXNjcmlwdGlvbik6IHZvaWQge1xuICAgIGNvbnNvbGUubG9nKGNhbWVyYSwgdGhpcy5fc2NlbmUuYWN0aXZlQ2FtZXJhLm5hbWUpO1xuICAgIGlmICh0aGlzLl9zY2VuZS5hY3RpdmVDYW1lcmEubmFtZSA9PSBcIlVuaXZlcnNhbENhbWVyYVwiKSB7XG4gICAgICAvLyBNb3ZlIHRoZSBjYW1lcmEgdGFyZ2V0IGluIGZyb250IG9mIG9sZCBjYW1lcmEgdG8gYWxsb3cgZm9yIGFuaW1hdGlvbiB0b1xuICAgICAgLy8gbmV3IGNhbWVyYSBvcmllbnRhdGlvbi5cbiAgICAgIGxldCBkaXN0YW5jZSA9IEJBQllMT04uVmVjdG9yMy5EaXN0YW5jZShcbiAgICAgICAgdGhpcy5fY2FtZXJhVW5pdmVyc2FsLnBvc2l0aW9uLCB0aGlzLl9jYW1lcmFBcmMudGFyZ2V0KTtcbiAgICAgIHRoaXMuX3RhcmdldC5wb3NpdGlvbiA9IHRoaXMuX2NhbWVyYVVuaXZlcnNhbC5nZXRGcm9udFBvc2l0aW9uKGRpc3RhbmNlKTtcbiAgICAgIHRoaXMuc2V0VGFyZ2V0KG5ldyBCQUJZTE9OLlZlY3RvcjMoMCwgMCwgMCkpO1xuICAgIH1cbiAgICB0aGlzLl9jYW1lcmFBcmMuZGV0YWNoQ29udHJvbCh0aGlzLl9jYW52YXMpO1xuICAgIHRoaXMuX2NhbWVyYVVuaXZlcnNhbC5kZXRhY2hDb250cm9sKHRoaXMuX2NhbnZhcyk7XG4gICAgdGhpcy5fY2FtZXJhRm9sbG93LmRldGFjaENvbnRyb2wodGhpcy5fY2FudmFzKTtcblxuICAgIC8vIFNldCB0aGUgbmV3IGNhbWVyYS5cbiAgICBpZiAoY2FtZXJhLm5hbWUgPT09IFwiQXJjUm90YXRlXCIpIHtcbiAgICAgIHRoaXMuX2NhbWVyYUFyYy5zZXRQb3NpdGlvbih0aGlzLl9zY2VuZS5hY3RpdmVDYW1lcmEucG9zaXRpb24pO1xuICAgICAgdGhpcy5fY2FtZXJhQXJjLnJlYnVpbGRBbmdsZXNBbmRSYWRpdXMoKTtcbiAgICAgIHRoaXMuX2NhbWVyYUFyYy5hdHRhY2hDb250cm9sKHRoaXMuX2NhbnZhcywgdHJ1ZSwgZmFsc2UpO1xuICAgICAgdGhpcy5fc2NlbmUuYWN0aXZlQ2FtZXJhID0gdGhpcy5fY2FtZXJhQXJjO1xuICAgIH0gZWxzZSBpZiAoY2FtZXJhLm5hbWUgPT09IFwiVW5pdmVyc2FsXCIpIHtcbiAgICAgIHRoaXMuX2NhbWVyYVVuaXZlcnNhbC5hdHRhY2hDb250cm9sKHRoaXMuX2NhbnZhcywgdHJ1ZSk7XG4gICAgICB0aGlzLl9jYW1lcmFVbml2ZXJzYWwucG9zaXRpb24gPSB0aGlzLl9zY2VuZS5hY3RpdmVDYW1lcmEucG9zaXRpb247XG4gICAgICB0aGlzLl9jYW1lcmFVbml2ZXJzYWwuc2V0VGFyZ2V0KHRoaXMuX3RhcmdldC5wb3NpdGlvbik7XG4gICAgICB0aGlzLl9zY2VuZS5hY3RpdmVDYW1lcmEgPSB0aGlzLl9jYW1lcmFVbml2ZXJzYWw7XG4gICAgfSBlbHNlIGlmIChjYW1lcmEubmFtZSA9PT0gXCJGb2xsb3dcIikge1xuICAgICAgdGhpcy5fY2FtZXJhRm9sbG93LnBvc2l0aW9uID0gdGhpcy5fc2NlbmUuYWN0aXZlQ2FtZXJhLnBvc2l0aW9uO1xuICAgICAgdGhpcy5fc2NlbmUuYWN0aXZlQ2FtZXJhID0gdGhpcy5fY2FtZXJhRm9sbG93O1xuXG4gICAgICB0aGlzLl9jYW1lcmFGb2xsb3cuaW5wdXRzLmF0dGFjaElucHV0KFxuICAgICAgICB0aGlzLl9jYW1lcmFGb2xsb3cuaW5wdXRzLmF0dGFjaGVkLkZvbGxvd0NhbWVyYUNvbnRyb2xzKTtcbiAgICAgIHRoaXMuX2NhbWVyYUZvbGxvdy5hdHRhY2hDb250cm9sKHRoaXMuX2NhbnZhcywgdHJ1ZSk7XG4gICAgICBjb25zb2xlLmxvZyh0aGlzLl9jYW1lcmFGb2xsb3cuaW5wdXRzKTtcbiAgICB9XG4gIH1cbn1cblxuY2xhc3MgR2FtZSB7XG4gIHByaXZhdGUgX2NhbnZhczogSFRNTENhbnZhc0VsZW1lbnQ7XG4gIHByaXZhdGUgX2VuZ2luZTogQkFCWUxPTi5FbmdpbmU7XG4gIHByaXZhdGUgX3NjZW5lOiBCQUJZTE9OLlNjZW5lO1xuICBwcml2YXRlIF9saWdodDogQkFCWUxPTi5EaXJlY3Rpb25hbExpZ2h0O1xuICBwcml2YXRlIF9za3lib3g6IEJBQllMT04uTWVzaDtcbiAgcHJpdmF0ZSBfYWN0b3JzOiBDaGFyYWN0ZXJbXTtcbiAgcHJpdmF0ZSBfY2FtZXJhOiBDYW1lcmE7XG5cbiAgY29uc3RydWN0b3IoY2FudmFzRWxlbWVudCA6IHN0cmluZykge1xuICAgIC8vIENyZWF0ZSBjYW52YXMgYW5kIGVuZ2luZS5cbiAgICB0aGlzLl9jYW52YXMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChjYW52YXNFbGVtZW50KSBhcyBIVE1MQ2FudmFzRWxlbWVudDtcbiAgICB0aGlzLl9lbmdpbmUgPSBuZXcgQkFCWUxPTi5FbmdpbmUodGhpcy5fY2FudmFzLCB0cnVlKTtcbiAgICB0aGlzLl9hY3RvcnMgPSBbXTtcbiAgfVxuXG4gIGNyZWF0ZVNjZW5lKCkgOiB2b2lkIHtcbiAgICBCQUJZTE9OLlNjZW5lTG9hZGVyLkNsZWFuQm9uZU1hdHJpeFdlaWdodHMgPSB0cnVlO1xuICAgIHRoaXMuX3NjZW5lID0gbmV3IEJBQllMT04uU2NlbmUodGhpcy5fZW5naW5lKTtcbiAgICB0aGlzLl9zY2VuZS5hbWJpZW50Q29sb3IgPSBuZXcgQkFCWUxPTi5Db2xvcjMoMC4zLCAwLjMsIDAuMyk7XG5cbiAgICAvLyBGb2dcbiAgICB0aGlzLl9zY2VuZS5mb2dNb2RlID0gQkFCWUxPTi5TY2VuZS5GT0dNT0RFX0VYUDI7XG4gICAgdGhpcy5fc2NlbmUuZm9nQ29sb3IgPSBuZXcgQkFCWUxPTi5Db2xvcjMoMC4yLCAwLjIsIDAuMik7XG4gICAgdGhpcy5fc2NlbmUuZm9nRGVuc2l0eSA9IDAuMDAzO1xuXG4gICAgLy8gU2t5Ym94XG4gICAgdGhpcy5fc2t5Ym94ID0gQkFCWUxPTi5NZXNoLkNyZWF0ZUJveChcInNreUJveFwiLCAxMDAwLjAsIHRoaXMuX3NjZW5lKTtcbiAgICB0aGlzLl9za3lib3guc2NhbGluZy55ID0gMC4xMjU7XG4gICAgdmFyIHNreWJveE1hdGVyaWFsID0gbmV3IEJBQllMT04uU3RhbmRhcmRNYXRlcmlhbChcInNreUJveFwiLCB0aGlzLl9zY2VuZSk7XG4gICAgc2t5Ym94TWF0ZXJpYWwucmVmbGVjdGlvblRleHR1cmUgPSBuZXcgQkFCWUxPTi5DdWJlVGV4dHVyZShcInRleHR1cmVzL3NreWJveFwiLCB0aGlzLl9zY2VuZSk7XG4gICAgc2t5Ym94TWF0ZXJpYWwucmVmbGVjdGlvblRleHR1cmUuY29vcmRpbmF0ZXNNb2RlID0gQkFCWUxPTi5UZXh0dXJlLlNLWUJPWF9NT0RFO1xuICAgIHNreWJveE1hdGVyaWFsLmRpZmZ1c2VDb2xvciA9IG5ldyBCQUJZTE9OLkNvbG9yMygwLCAwLCAwKTtcbiAgICBza3lib3hNYXRlcmlhbC5zcGVjdWxhckNvbG9yID0gbmV3IEJBQllMT04uQ29sb3IzKDAsIDAsIDApO1xuICAgIHNreWJveE1hdGVyaWFsLmRpc2FibGVMaWdodGluZyA9IHRydWU7XG4gICAgc2t5Ym94TWF0ZXJpYWwuYmFja0ZhY2VDdWxsaW5nID0gZmFsc2U7XG4gICAgdGhpcy5fc2t5Ym94Lm1hdGVyaWFsID0gc2t5Ym94TWF0ZXJpYWw7XG4gICAgdGhpcy5fc2t5Ym94LnNldEVuYWJsZWQoZmFsc2UpO1xuXG4gICAgLy8gTGlnaHRpbmdcbiAgICB0aGlzLl9saWdodCA9IG5ldyBCQUJZTE9OLkRpcmVjdGlvbmFsTGlnaHQoXG4gICAgICBcImRpcjAxXCIsIG5ldyBCQUJZTE9OLlZlY3RvcjMoMCwgLTAuNSwgLSAxLjApLCB0aGlzLl9zY2VuZSk7XG4gICAgdGhpcy5fbGlnaHQucG9zaXRpb24gPSBuZXcgQkFCWUxPTi5WZWN0b3IzKDIwLCAxNTAsIDcwKTtcbiAgICBsZXQgc3VuID0gQkFCWUxPTi5NZXNoQnVpbGRlci5DcmVhdGVTcGhlcmUoXCJzdW5cIiwge30sIHRoaXMuX3NjZW5lKTtcbiAgICBzdW4ucG9zaXRpb24gPSB0aGlzLl9saWdodC5wb3NpdGlvbjtcblxuICAgIC8vIENhbWVyYVxuICAgIHRoaXMuX2NhbWVyYSA9IG5ldyBDYW1lcmEodGhpcy5fY2FudmFzLCB0aGlzLl9zY2VuZSwgdGhpcy5fYWN0b3JzKTtcblxuICAgIC8vIEdyb3VuZFxuICAgIGxldCBncm91bmQgPSBCQUJZTE9OLk1lc2guQ3JlYXRlR3JvdW5kKFwiZ3JvdW5kXCIsIDEwMDAsIDEwMDAsIDEsIHRoaXMuX3NjZW5lLCBmYWxzZSk7XG4gICAgbGV0IGdyb3VuZE1hdGVyaWFsID0gbmV3IEJBQllMT04uU3RhbmRhcmRNYXRlcmlhbChcImdyb3VuZFwiLCB0aGlzLl9zY2VuZSk7XG4gICAgZ3JvdW5kTWF0ZXJpYWwuZGlmZnVzZVRleHR1cmUgPSBuZXcgQkFCWUxPTi5UZXh0dXJlKFwidGV4dHVyZXMvZ3Jhc3MucG5nXCIsIHRoaXMuX3NjZW5lKTtcbiAgICAoPEJBQllMT04uVGV4dHVyZT5ncm91bmRNYXRlcmlhbC5kaWZmdXNlVGV4dHVyZSkudVNjYWxlID0gNjQ7XG4gICAgKDxCQUJZTE9OLlRleHR1cmU+Z3JvdW5kTWF0ZXJpYWwuZGlmZnVzZVRleHR1cmUpLnZTY2FsZSA9IDY0O1xuICAgIGdyb3VuZE1hdGVyaWFsLmRpZmZ1c2VDb2xvciA9IG5ldyBCQUJZTE9OLkNvbG9yMygwLjQsIDAuNCwgMC40KTtcbiAgICBncm91bmRNYXRlcmlhbC5zcGVjdWxhckNvbG9yID0gbmV3IEJBQllMT04uQ29sb3IzKDAsIDAsIDApO1xuICAgIGdyb3VuZC5tYXRlcmlhbCA9IGdyb3VuZE1hdGVyaWFsO1xuICAgIGdyb3VuZC5yZWNlaXZlU2hhZG93cyA9IHRydWU7XG5cbiAgICAvLyBTaGFkb3dzXG4gICAgbGV0IHNoYWRvd0dlbmVyYXRvciA9IG5ldyBCQUJZTE9OLlNoYWRvd0dlbmVyYXRvcigxMDI0LCB0aGlzLl9saWdodCk7XG5cbiAgICAvLyBTY2VuZXJ5XG4gICAgbGV0IHNjZW5lcnkgPSBuZXcgU2NlbmVyeSh0aGlzLl9zY2VuZSwgc2hhZG93R2VuZXJhdG9yLCBncm91bmQsIDI1Nik7XG4gICAgc2NlbmVyeS5jYWxjdWxhdGVQYXRoKHtcInhcIjogMjU1LCBcInlcIjogMjU1fSwge1wieFwiOiAwLCBcInlcIjogMH0pO1xuXG4gICAgdGhpcy5fc2NlbmUub25Qb2ludGVyRG93biA9IGZ1bmN0aW9uKGV2dCwgcGlja1Jlc3VsdCkge1xuICAgICAgICAvLyBpZiB0aGUgY2xpY2sgaGl0cyB0aGUgZ3JvdW5kIG9iamVjdCwgd2UgY2hhbmdlIHRoZSBpbXBhY3QgcG9zaXRpb25cbiAgICAgICAgaWYgKHBpY2tSZXN1bHQuaGl0KSB7XG4gICAgICAgICAgICB0YXJnZXRIZWFkLnBvc2l0aW9uLnggPSBwaWNrUmVzdWx0LnBpY2tlZFBvaW50Lng7XG4gICAgICAgICAgICB0YXJnZXRIZWFkLnBvc2l0aW9uLnkgPSBwaWNrUmVzdWx0LnBpY2tlZFBvaW50Lnk7XG4gICAgICAgICAgICB0YXJnZXRIZWFkLnBvc2l0aW9uLnogPSBwaWNrUmVzdWx0LnBpY2tlZFBvaW50Lno7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLy8gTWVzaGVzXG4gICAgLy8gV29ybGQgcG9zaXRpb25zOiAobC9yLCB1L2QsIGYvYilcbiAgICAvLyBsZXQgZGVidWdCYXNlID0gQkFCWUxPTi5NZXNoQnVpbGRlci5DcmVhdGVCb3goXCJkZWJ1Z0Jhc2VcIiwge2hlaWdodDogMC4wMSwgd2lkdGg6IDAuNSwgZGVwdGg6IDF9LCB0aGlzLl9zY2VuZSk7XG4gICAgLy8gZGVidWdCYXNlLnJlY2VpdmVTaGFkb3dzID0gdHJ1ZTtcblxuICAgIC8vIE1vdmluZyBiYWxsIGZvciB0aGUgZm94IHRvIHdhdGNoLlxuICAgIGxldCB0YXJnZXRIZWFkID0gQkFCWUxPTi5NZXNoQnVpbGRlci5DcmVhdGVTcGhlcmUoXG4gICAgICBcInRhcmdldEhlYWRcIiwge2RpYW1ldGVyWDogMC4wMSwgZGlhbWV0ZXJZOiAwLjAxLCBkaWFtZXRlclo6IDAuMDF9LCB0aGlzLl9zY2VuZSk7XG4gICAgdGFyZ2V0SGVhZC5wb3NpdGlvbiA9IHRoaXMuX2xpZ2h0LnBvc2l0aW9uLmNsb25lKCk7XG4gICAgc2hhZG93R2VuZXJhdG9yLmdldFNoYWRvd01hcCgpLnJlbmRlckxpc3QucHVzaCh0YXJnZXRIZWFkKTtcbiAgICAvLyBGb3hcbiAgICBsZXQgZm94ID0gbmV3IENoYXJhY3Rlcih0aGlzLl9zY2VuZSwgc2hhZG93R2VuZXJhdG9yLCBGT1gsICgpID0+IHtcbiAgICAgIGNvbnNvbGUubG9nKFwiZm94IGxvYWRlZFwiKTtcbiAgICAgIHRoaXMuX2NhbWVyYS5zZXRUYXJnZXQoZm94LnBvc2l0aW9uKTtcbiAgICAgIGZveC5sb29rQXQodGFyZ2V0SGVhZC5wb3NpdGlvbik7XG4gICAgICBmb3gucm90YXRpb24ueSA9IE1hdGguUEk7XG4gICAgfSk7XG4gICAgdGhpcy5fYWN0b3JzLnB1c2goZm94KTtcbiAgICAvLyBTdGFyXG4gICAgbGV0IHN0YXIgPSBuZXcgU3Rhcih0aGlzLl9zY2VuZSwgc2NlbmVyeSk7XG4gICAgc3Rhci5tZXNoLnBvc2l0aW9uID0gbmV3IEJBQllMT04uVmVjdG9yMygwLCA1LCAwKTtcblxuICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICBjb25zb2xlLmxvZyhcIkFkZCBhbmltYXRpb25zLlwiKTtcbiAgICAgIC8vdGhpcy5fYW5pbWF0aW9uUXVldWUucHVzaCh7bmFtZTogXCJzdGF0aW9uYXJ5XCIsIGxvb3A6IGZhbHNlLCByZXZlcnNlZDogZmFsc2V9KTtcbiAgICAgIGZveC5xdWV1ZUFuaW1hdGlvbih7bmFtZTogXCJjcm91Y2hcIiwgbG9vcDogZmFsc2UsIHJldmVyc2VkOiBmYWxzZX0pO1xuICAgICAgZm94LnF1ZXVlQW5pbWF0aW9uKHtuYW1lOiBcImNyb3VjaFwiLCBsb29wOiBmYWxzZSwgcmV2ZXJzZWQ6IHRydWV9KTtcbiAgICAgIC8vdGhpcy5fYW5pbWF0aW9uUXVldWUucHVzaCh7bmFtZTogXCJzdGF0aW9uYXJ5XCIsIGxvb3A6IHRydWUsIHJldmVyc2VkOiBmYWxzZX0pO1xuICAgIH0uYmluZCh0aGlzKSwgMTAwMDApO1xuXG4gICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgIGNvbnNvbGUubG9nKFwiQWRkIGNyb3VjaCBhbmltYXRpb24uXCIpO1xuICAgICAgZm94LnF1ZXVlQW5pbWF0aW9uKHtuYW1lOiBcImNyb3VjaFwiLCBsb29wOiBmYWxzZSwgcmV2ZXJzZWQ6IGZhbHNlfSk7XG4gICAgICBmb3gucXVldWVBbmltYXRpb24oe25hbWU6IFwiY3JvdWNoXCIsIGxvb3A6IGZhbHNlLCByZXZlcnNlZDogdHJ1ZX0pO1xuICAgIH0uYmluZCh0aGlzKSwgMjAwMDApO1xuXG4gICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgIGNvbnNvbGUubG9nKFwiQWRkIHdhbGsgYW5pbWF0aW9uLlwiKTtcbiAgICAgIGZveC5xdWV1ZUFuaW1hdGlvbih7bmFtZTogXCJ3YWxrXCIsIGxvb3A6IHRydWUsIHJldmVyc2VkOiBmYWxzZX0pO1xuICAgIH0uYmluZCh0aGlzKSwgMzAwMDApO1xuXG4gICAgdGhpcy5jb250cm9sUGFubmVsKCk7XG4gICAgY29uc29sZS5sb2coXCJUb3RhbCBtZXNoZXMgaW4gc2NlbmU6ICVjXCIgK1xuICAgICAgICAgICAgICAgIHRoaXMuX3NjZW5lLm1lc2hlcy5sZW5ndGgudG9TdHJpbmcoKSxcbiAgICAgICAgICAgICAgICBcImJhY2tncm91bmQ6IG9yYW5nZTsgY29sb3I6IHdoaXRlXCIpO1xuICB9XG5cbiAgZG9SZW5kZXIoKSA6IHZvaWQge1xuICAgIC8vIFJ1biB0aGUgcmVuZGVyIGxvb3AuXG4gICAgdGhpcy5fZW5naW5lLnJ1blJlbmRlckxvb3AoKCkgPT4ge1xuICAgICAgdGhpcy5fc2NlbmUucmVuZGVyKCk7XG4gICAgICBsZXQgZnBzTGFiZWwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImZwc0xhYmVsXCIpO1xuICAgICAgZnBzTGFiZWwuaW5uZXJIVE1MID0gdGhpcy5fZW5naW5lLmdldEZwcygpLnRvRml4ZWQoKSArIFwiIGZwc1wiO1xuICAgIH0pO1xuXG4gICAgLy8gVGhlIGNhbnZhcy93aW5kb3cgcmVzaXplIGV2ZW50IGhhbmRsZXIuXG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsICgpID0+IHtcbiAgICAgIHRoaXMuX2VuZ2luZS5yZXNpemUoKTtcbiAgICB9KTtcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcIm9yaWVudGF0aW9uY2hhbmdlXCIsICgpID0+IHtcbiAgICAgIHRoaXMuX2VuZ2luZS5yZXNpemUoKTtcbiAgICB9KTtcbiAgfVxuXG4gIGNvbnRyb2xQYW5uZWwoKSA6IHZvaWQge1xuICAgIGxldCBhZHZhbmNlZFRleHR1cmUgPSBCQUJZTE9OLkdVSS5BZHZhbmNlZER5bmFtaWNUZXh0dXJlLkNyZWF0ZUZ1bGxzY3JlZW5VSShcIlVJXCIpO1xuXG4gICAgbGV0IGdyaWQgPSBuZXcgQkFCWUxPTi5HVUkuR3JpZCgpO1xuICAgIGdyaWQuYWRkQ29sdW1uRGVmaW5pdGlvbigxMCwgdHJ1ZSk7XG4gICAgZ3JpZC5hZGRDb2x1bW5EZWZpbml0aW9uKDIwMCwgdHJ1ZSk7XG4gICAgZ3JpZC5hZGRSb3dEZWZpbml0aW9uKDIwLCB0cnVlKTtcbiAgICBncmlkLmFkZFJvd0RlZmluaXRpb24oMjAsIHRydWUpO1xuICAgIHRoaXMuX2NhbWVyYS5jYW1lcmFzLmZvckVhY2goKGNhbWVyYSkgPT4ge1xuICAgICAgZ3JpZC5hZGRSb3dEZWZpbml0aW9uKDIwLCB0cnVlKTtcbiAgICB9KTtcbiAgICBhZHZhbmNlZFRleHR1cmUuYWRkQ29udHJvbChncmlkKTtcbiAgICBsZXQgZ3JpZGNvdW50ID0gMDtcblxuICAgIGxldCBwYW5lbCA9IG5ldyBCQUJZTE9OLkdVSS5TdGFja1BhbmVsKCk7XG4gICAgcGFuZWwud2lkdGggPSBcIjIyMHB4XCI7XG4gICAgcGFuZWwuZm9udFNpemUgPSBcIjE0cHhcIjtcbiAgICBwYW5lbC5ob3Jpem9udGFsQWxpZ25tZW50ID0gQkFCWUxPTi5HVUkuQ29udHJvbC5IT1JJWk9OVEFMX0FMSUdOTUVOVF9SSUdIVDtcbiAgICBwYW5lbC52ZXJ0aWNhbEFsaWdubWVudCA9IEJBQllMT04uR1VJLkNvbnRyb2wuVkVSVElDQUxfQUxJR05NRU5UX0NFTlRFUjtcblxuICAgIGxldCBjaGVja2JveCA9IG5ldyBCQUJZTE9OLkdVSS5DaGVja2JveCgpO1xuICAgIGNoZWNrYm94LndpZHRoID0gXCIyMHB4XCI7XG4gICAgY2hlY2tib3guaGVpZ2h0ID0gXCIyMHB4XCI7XG4gICAgY2hlY2tib3guaXNDaGVja2VkID0gZmFsc2U7XG4gICAgY2hlY2tib3guY29sb3IgPSBcImdyZWVuXCI7XG4gICAgY2hlY2tib3gub25Jc0NoZWNrZWRDaGFuZ2VkT2JzZXJ2YWJsZS5hZGQoKHZhbHVlKSA9PiB7XG4gICAgICBjb25zb2xlLmxvZyhcIiVjIFNreUJveDpcIiwgXCJiYWNrZ3JvdW5kOiBibHVlOyBjb2xvcjogd2hpdGVcIiwgdmFsdWUpO1xuICAgICAgdGhpcy5fc2t5Ym94LnNldEVuYWJsZWQodmFsdWUpO1xuICAgIH0pO1xuICAgIGdyaWQuYWRkQ29udHJvbChjaGVja2JveCwgZ3JpZGNvdW50LCAwKTtcblxuICAgIGxldCBoZWFkZXIgPSBCQUJZTE9OLkdVSS5Db250cm9sLkFkZEhlYWRlcihcbiAgICAgIGNoZWNrYm94LCBcIlNreUJveFwiLCBcIjE4MHB4XCIsIHsgaXNIb3Jpem9udGFsOiB0cnVlLCBjb250cm9sRmlyc3Q6IHRydWV9KTtcbiAgICBoZWFkZXIuY29sb3IgPSBcIndoaXRlXCI7XG4gICAgaGVhZGVyLmhlaWdodCA9IFwiMjBweFwiO1xuICAgIGhlYWRlci5ob3Jpem9udGFsQWxpZ25tZW50ID0gQkFCWUxPTi5HVUkuQ29udHJvbC5IT1JJWk9OVEFMX0FMSUdOTUVOVF9MRUZUO1xuICAgIGdyaWQuYWRkQ29udHJvbChoZWFkZXIsIGdyaWRjb3VudCsrLCAxKTtcblxuICAgIGxldCBjaGVja2JveDIgPSBuZXcgQkFCWUxPTi5HVUkuQ2hlY2tib3goKTtcbiAgICBjaGVja2JveDIud2lkdGggPSBcIjIwcHhcIjtcbiAgICBjaGVja2JveDIuaGVpZ2h0ID0gXCIyMHB4XCI7XG4gICAgY2hlY2tib3gyLmlzQ2hlY2tlZCA9IHRydWU7XG4gICAgY2hlY2tib3gyLmNvbG9yID0gXCJncmVlblwiO1xuICAgIGNoZWNrYm94Mi5vbklzQ2hlY2tlZENoYW5nZWRPYnNlcnZhYmxlLmFkZCgodmFsdWUpID0+IHtcbiAgICAgIGNvbnNvbGUubG9nKFwiJWMgRm9nOlwiLCBcImJhY2tncm91bmQ6IGJsdWU7IGNvbG9yOiB3aGl0ZVwiLCB2YWx1ZSk7XG4gICAgICBpZiAodmFsdWUpIHtcbiAgICAgICAgdGhpcy5fc2NlbmUuZm9nTW9kZSA9IEJBQllMT04uU2NlbmUuRk9HTU9ERV9FWFAyO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy90aGlzLl9zY2VuZS5mb2dNb2RlID0gQkFCWUxPTi5TY2VuZS5GT0dNT0RFX0xJTkVBUjtcbiAgICAgICAgLy90aGlzLl9zY2VuZS5mb2dTdGFydCA9IDEwMC4wO1xuICAgICAgICAvL3RoaXMuX3NjZW5lLmZvZ0VuZCA9IDIwMC4wO1xuICAgICAgICB0aGlzLl9zY2VuZS5mb2dNb2RlID0gQkFCWUxPTi5TY2VuZS5GT0dNT0RFX05PTkU7XG4gICAgICB9XG4gICAgfSk7XG4gICAgZ3JpZC5hZGRDb250cm9sKGNoZWNrYm94MiwgZ3JpZGNvdW50LCAwKTtcblxuICAgIGxldCBoZWFkZXIyID0gQkFCWUxPTi5HVUkuQ29udHJvbC5BZGRIZWFkZXIoXG4gICAgICBjaGVja2JveDIsIFwiRm9nXCIsIFwiMTgwcHhcIiwgeyBpc0hvcml6b250YWw6IHRydWUsIGNvbnRyb2xGaXJzdDogdHJ1ZX0pO1xuICAgIGhlYWRlcjIuY29sb3IgPSBcIndoaXRlXCI7XG4gICAgaGVhZGVyMi5oZWlnaHQgPSBcIjIwcHhcIjtcbiAgICBoZWFkZXIyLmhvcml6b250YWxBbGlnbm1lbnQgPSBCQUJZTE9OLkdVSS5Db250cm9sLkhPUklaT05UQUxfQUxJR05NRU5UX0xFRlQ7XG4gICAgZ3JpZC5hZGRDb250cm9sKGhlYWRlcjIsIGdyaWRjb3VudCsrLCAxKTtcblxuICAgIHRoaXMuX2NhbWVyYS5jYW1lcmFzLmZvckVhY2goKGNhbWVyYSkgPT4ge1xuICAgICAgbGV0IHJhZGlvID0gbmV3IEJBQllMT04uR1VJLlJhZGlvQnV0dG9uKCk7XG4gICAgICByYWRpby53aWR0aCA9IFwiMjBweFwiO1xuICAgICAgcmFkaW8uaGVpZ2h0ID0gXCIyMHB4XCI7XG4gICAgICByYWRpby5jb2xvciA9IFwiZ3JlZW5cIjtcbiAgICAgIHJhZGlvLmlzQ2hlY2tlZCA9IChjYW1lcmEubmFtZSA9PT0gXCJBcmNSb3RhdGVcIik7XG4gICAgICByYWRpby5vbklzQ2hlY2tlZENoYW5nZWRPYnNlcnZhYmxlLmFkZCgoc3RhdGUpID0+IHtcbiAgICAgICAgY29uc29sZS5sb2coY2FtZXJhLm5hbWUsIHN0YXRlKTtcbiAgICAgICAgaWYgKHN0YXRlKSB7XG4gICAgICAgICAgdGhpcy5fY2FtZXJhLnNldEVuYWJsZWQoY2FtZXJhKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBncmlkLmFkZENvbnRyb2wocmFkaW8sIGdyaWRjb3VudCwgMCk7XG5cbiAgICAgIGxldCByYWRpb0hlYWQgPSBCQUJZTE9OLkdVSS5Db250cm9sLkFkZEhlYWRlcihcbiAgICAgICAgcmFkaW8sIFwiQ2FtZXJhOiBcIiArIGNhbWVyYS5uYW1lLCBcIjE4MHB4XCIsIHsgaXNIb3Jpem9udGFsOiB0cnVlLCBjb250cm9sRmlyc3Q6IHRydWV9KTtcbiAgICAgIHJhZGlvSGVhZC5jb2xvciA9IFwid2hpdGVcIjtcbiAgICAgIHJhZGlvSGVhZC5oZWlnaHQgPSBcIjIwcHhcIjtcbiAgICAgIHJhZGlvSGVhZC5ob3Jpem9udGFsQWxpZ25tZW50ID0gQkFCWUxPTi5HVUkuQ29udHJvbC5IT1JJWk9OVEFMX0FMSUdOTUVOVF9MRUZUO1xuICAgICAgZ3JpZC5hZGRDb250cm9sKHJhZGlvSGVhZCwgZ3JpZGNvdW50KyssIDEpO1xuICAgIH0sIHRoaXMpO1xuICB9XG59XG5cbndpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdET01Db250ZW50TG9hZGVkJywgKCkgPT4ge1xuICAvLyBDcmVhdGUgdGhlIGdhbWUgdXNpbmcgdGhlICdyZW5kZXJDYW52YXMnLlxuICBsZXQgZ2FtZSA9IG5ldyBHYW1lKCdyZW5kZXJDYW52YXMnKTtcblxuICAvLyBDcmVhdGUgdGhlIHNjZW5lLlxuICBnYW1lLmNyZWF0ZVNjZW5lKCk7XG5cbiAgLy8gU3RhcnQgcmVuZGVyIGxvb3AuXG4gIGdhbWUuZG9SZW5kZXIoKTtcbn0pO1xuIiwiaW50ZXJmYWNlIFBsYW50U3BlY2llcyB7XG4gIGdlbmVyYXRvcjogKCkgPT4gQkFCWUxPTi5NZXNoOyAgLy8gTWV0aG9kIHRvIGdlbmVyYXRlIE1lc2guXG4gIG1pblR5cGVzOiBudW1iZXI7ICAgICAgICAgICAgICAgLy8gTXVzdCBiZSBhdCBsZWFzdCB0aGlzIG1hbnkgdHlwZXMuXG4gIHdlaWdodDogbnVtYmVyOyAgICAgICAgICAgICAgICAgLy8gSG93IHByb2xpZmljIHRoaXMgc3BlY2llcyBpcy5cbn1cblxuY2xhc3MgVHJlZUZhY3Rvcnkge1xuICBwdWJsaWMgdHJlZXM6IEJBQllMT04uTWVzaFtdO1xuICBwdWJsaWMgc2hydWJzOiBCQUJZTE9OLk1lc2hbXTtcbiAgcHVibGljIHRyZWVUeXBlczogbnVtYmVyO1xuICBwdWJsaWMgc2hydWJUeXBlczogbnVtYmVyO1xuICBwcml2YXRlIF9zY2VuZTogQkFCWUxPTi5TY2VuZTtcbiAgcHJpdmF0ZSB0cmVlU3BlY2llczogUGxhbnRTcGVjaWVzW107XG4gIHByaXZhdGUgc2hydWJTcGVjaWVzOiBQbGFudFNwZWNpZXNbXTtcblxuICBjb25zdHJ1Y3RvcihzY2VuZTogQkFCWUxPTi5TY2VuZSwgdHJlZVR5cGVzOiBudW1iZXIsIHNocnViVHlwZXM6IG51bWJlcikge1xuICAgIHRoaXMuX3NjZW5lID0gc2NlbmU7XG4gICAgdGhpcy50cmVlVHlwZXMgPSB0cmVlVHlwZXM7XG4gICAgdGhpcy5zaHJ1YlR5cGVzID0gc2hydWJUeXBlcztcblxuICAgIHRoaXMudHJlZXMgPSBbXTtcbiAgICB0aGlzLnNocnVicyA9IFtdO1xuICAgIHRoaXMudHJlZVNwZWNpZXMgPSBbXTtcbiAgICB0aGlzLnNocnViU3BlY2llcyA9IFtdO1xuXG4gICAgdGhpcy50cmVlU3BlY2llcy5wdXNoKHtnZW5lcmF0b3I6IHRoaXMuX2NyZWF0ZVBpbmUsIG1pblR5cGVzOiAyLCB3ZWlnaHQ6IDAuMn0pO1xuICAgIHRoaXMudHJlZVNwZWNpZXMucHVzaCh7Z2VuZXJhdG9yOiB0aGlzLl9jcmVhdGVMb2xseXBvcCwgbWluVHlwZXM6IDIsIHdlaWdodDogMC44fSk7XG4gICAgdGhpcy5zaHJ1YlNwZWNpZXMucHVzaCh7Z2VuZXJhdG9yOiB0aGlzLl9jcmVhdGVCdXNoLCBtaW5UeXBlczogMiwgd2VpZ2h0OiAwLjZ9KTtcbiAgICB0aGlzLnNocnViU3BlY2llcy5wdXNoKHtnZW5lcmF0b3I6IHRoaXMuX2NyZWF0ZVBpbmUsIG1pblR5cGVzOiAyLCB3ZWlnaHQ6IDAuMn0pO1xuICAgIHRoaXMuc2hydWJTcGVjaWVzLnB1c2goe2dlbmVyYXRvcjogdGhpcy5fY3JlYXRlTG9sbHlwb3AsIG1pblR5cGVzOiAyLCB3ZWlnaHQ6IDAuMn0pO1xuXG4gICAgLy8gUG9wdWxhdGUgYXQgbGVhc3QgdGhlIG1pblR5cGVzIG9mIGVhY2ggc3BlY2llcy5cbiAgICB0aGlzLnRyZWVTcGVjaWVzLmZvckVhY2goKGdlbml1cykgPT4ge1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBnZW5pdXMubWluVHlwZXM7IGkrKykge1xuICAgICAgICB0aGlzLl9jcmVhdGVUcmVlKGdlbml1cy5nZW5lcmF0b3IpO1xuICAgICAgfVxuICAgIH0sIHRoaXMpO1xuXG4gICAgdGhpcy5zaHJ1YlNwZWNpZXMuZm9yRWFjaCgoZ2VuaXVzKSA9PiB7XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGdlbml1cy5taW5UeXBlczsgaSsrKSB7XG4gICAgICAgIHRoaXMuX2NyZWF0ZVNocnViKGdlbml1cy5nZW5lcmF0b3IpO1xuICAgICAgfVxuICAgIH0sIHRoaXMpO1xuXG4gICAgLy8gUG9wdWxhdGUgcmVtYWluZGVyLlxuICAgIGZvciAobGV0IGkgPSB0aGlzLnRyZWVzLmxlbmd0aDsgaSA8IHRoaXMudHJlZVR5cGVzOyBpKyspIHtcbiAgICAgIHRoaXMuX2NyZWF0ZVRyZWUoKTtcbiAgICB9XG5cbiAgICBmb3IgKGxldCBpID0gdGhpcy5zaHJ1YnMubGVuZ3RoOyBpIDwgdGhpcy5zaHJ1YlR5cGVzOyBpKyspIHtcbiAgICAgIHRoaXMuX2NyZWF0ZVNocnViKCk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBfY3JlYXRlVHJlZShoaW50PzogKCkgPT4gQkFCWUxPTi5NZXNoKTogdm9pZCB7XG4gICAgaWYgKCFoaW50KSB7XG4gICAgICBsZXQgcm5kID0gTWF0aC5yYW5kb20oKTtcbiAgICAgIGxldCB0b3RhbFdlaWdodCA9IDA7XG4gICAgICB0aGlzLnRyZWVTcGVjaWVzLmZvckVhY2goKGdlbml1cykgPT4ge1xuICAgICAgICBpZiAocm5kID49IHRvdGFsV2VpZ2h0ICYmIHJuZCA8IHRvdGFsV2VpZ2h0ICsgZ2VuaXVzLndlaWdodCkge1xuICAgICAgICAgIGhpbnQgPSBnZW5pdXMuZ2VuZXJhdG9yO1xuICAgICAgICB9XG4gICAgICAgIHRvdGFsV2VpZ2h0ICs9IGdlbml1cy53ZWlnaHQ7XG4gICAgICB9LCB0aGlzKTtcbiAgICB9XG5cbiAgICBsZXQgdHJlZSA9IChoaW50LmJpbmQodGhpcykpKCk7XG4gICAgdHJlZS5uYW1lID0gXCJ0cmVlX1wiICsgdHJlZS5uYW1lICsgXCJfXCIgKyB0aGlzLnRyZWVzLmxlbmd0aDtcbiAgICB0aGlzLnRyZWVzLnB1c2godHJlZSk7XG4gICAgY29uc29sZS5sb2codHJlZS5uYW1lKTtcbiAgfVxuXG4gIHByaXZhdGUgX2NyZWF0ZVNocnViKGhpbnQ/OiAoKSA9PiBCQUJZTE9OLk1lc2gpOiB2b2lkIHtcbiAgICBpZiAoIWhpbnQpIHtcbiAgICAgIGxldCBybmQgPSBNYXRoLnJhbmRvbSgpO1xuICAgICAgbGV0IHRvdGFsV2VpZ2h0ID0gMDtcbiAgICAgIHRoaXMuc2hydWJTcGVjaWVzLmZvckVhY2goKGdlbml1cykgPT4ge1xuICAgICAgICBpZiAocm5kID49IHRvdGFsV2VpZ2h0ICYmIHJuZCA8IHRvdGFsV2VpZ2h0ICsgZ2VuaXVzLndlaWdodCkge1xuICAgICAgICAgIGhpbnQgPSBnZW5pdXMuZ2VuZXJhdG9yO1xuICAgICAgICB9XG4gICAgICAgIHRvdGFsV2VpZ2h0ICs9IGdlbml1cy53ZWlnaHQ7XG4gICAgICB9LCB0aGlzKTtcbiAgICB9XG5cbiAgICBsZXQgc2hydWIgPSAoaGludC5iaW5kKHRoaXMpKSgpO1xuICAgIHNocnViLm5hbWUgPSBcInNocnViX1wiICsgc2hydWIubmFtZSArIFwiX1wiICsgdGhpcy5zaHJ1YnMubGVuZ3RoO1xuICAgIHRoaXMuc2hydWJzLnB1c2goc2hydWIpO1xuICAgIGNvbnNvbGUubG9nKHNocnViLm5hbWUpO1xuICB9XG5cbiAgcHJpdmF0ZSBfY3JlYXRlUGluZSgpOiBCQUJZTE9OLk1lc2gge1xuICAgIGxldCBjYW5vcGllcyA9IE1hdGgucm91bmQoTWF0aC5yYW5kb20oKSAqIDMpICsgNDtcbiAgICBsZXQgaGVpZ2h0ID0gTWF0aC5yb3VuZChNYXRoLnJhbmRvbSgpICogMjApICsgMjA7XG4gICAgbGV0IHdpZHRoID0gNTtcblxuICAgIGxldCB0cmVlID0gUGluZUdlbmVyYXRvcihcbiAgICAgIGNhbm9waWVzLCBoZWlnaHQsIHdpZHRoLCB0aGlzLm1hdGVyaWFsQmFyaygpLCB0aGlzLm1hdGVyaWFsTGVhdmVzKCksIHRoaXMuX3NjZW5lKTtcbiAgICB0cmVlLnNldEVuYWJsZWQoZmFsc2UpO1xuICAgIHJldHVybiB0cmVlO1xuICB9XG5cbiAgcHJpdmF0ZSBfY3JlYXRlTG9sbHlwb3AoKTogQkFCWUxPTi5NZXNoIHtcbiAgICBsZXQgc2l6ZUJyYW5jaCA9IDE1ICsgTWF0aC5yYW5kb20oKSAqIDU7XG4gICAgbGV0IHNpemVUcnVuayA9IDEwICsgTWF0aC5yYW5kb20oKSAqIDU7XG4gICAgbGV0IHJhZGl1cyA9IDEgKyBNYXRoLnJhbmRvbSgpICogNDtcblxuICAgIGxldCB0cmVlID0gUXVpY2tUcmVlR2VuZXJhdG9yKFxuICAgICAgc2l6ZUJyYW5jaCwgc2l6ZVRydW5rLCByYWRpdXMsIHRoaXMubWF0ZXJpYWxCYXJrKCksIHRoaXMubWF0ZXJpYWxMZWF2ZXMoKSwgdGhpcy5fc2NlbmUpO1xuICAgIHRyZWUuc2V0RW5hYmxlZChmYWxzZSk7XG4gICAgcmV0dXJuIHRyZWU7XG4gIH1cblxuICBwcml2YXRlIF9jcmVhdGVCdXNoKCk6IEJBQllMT04uTWVzaCB7XG4gICAgbGV0IHNpemVCcmFuY2ggPSAxMCArIE1hdGgucmFuZG9tKCkgKiAyMDtcblxuICAgIGxldCB0cmVlID0gUXVpY2tTaHJ1YihzaXplQnJhbmNoLCB0aGlzLm1hdGVyaWFsTGVhdmVzKCksIHRoaXMuX3NjZW5lKTtcbiAgICB0cmVlLnNldEVuYWJsZWQoZmFsc2UpO1xuICAgIHJldHVybiB0cmVlO1xuICB9XG5cbiAgcHJpdmF0ZSBtYXRlcmlhbEJhcmsoKTogQkFCWUxPTi5TdGFuZGFyZE1hdGVyaWFsIHtcbiAgICBsZXQgbWF0ZXJpYWwgPSBuZXcgQkFCWUxPTi5TdGFuZGFyZE1hdGVyaWFsKFwiYmFya1wiLCB0aGlzLl9zY2VuZSk7XG4gICAgbWF0ZXJpYWwuZGlmZnVzZUNvbG9yID0gbmV3IEJBQllMT04uQ29sb3IzKDAuMyArIE1hdGgucmFuZG9tKCkgKiAwLjIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDAuMiArIE1hdGgucmFuZG9tKCkgKiAwLjIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDAuMiArIE1hdGgucmFuZG9tKCkgKiAwLjEpO1xuICAgIG1hdGVyaWFsLnNwZWN1bGFyQ29sb3IgPSBCQUJZTE9OLkNvbG9yMy5CbGFjaygpO1xuICAgIHJldHVybiBtYXRlcmlhbDtcbiAgfVxuXG4gIHByaXZhdGUgbWF0ZXJpYWxMZWF2ZXMoKTogQkFCWUxPTi5TdGFuZGFyZE1hdGVyaWFsIHtcbiAgICBsZXQgbWF0ZXJpYWwgPSBuZXcgQkFCWUxPTi5TdGFuZGFyZE1hdGVyaWFsKFwibGVhdmVzXCIsIHRoaXMuX3NjZW5lKTtcbiAgICBtYXRlcmlhbC5kaWZmdXNlQ29sb3IgPSBuZXcgQkFCWUxPTi5Db2xvcjMoMC40ICsgTWF0aC5yYW5kb20oKSAqIDAuMixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgMC41ICsgTWF0aC5yYW5kb20oKSAqIDAuNCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgMC4yICsgTWF0aC5yYW5kb20oKSAqIDAuMik7XG4gICAgbWF0ZXJpYWwuc3BlY3VsYXJDb2xvciA9IEJBQllMT04uQ29sb3IzLlJlZCgpO1xuICAgIHJldHVybiBtYXRlcmlhbDtcbiAgfVxufVxuXG4vL2Nhbm9waWVzIG51bWJlciBvZiBsZWFmIHNlY3Rpb25zLCBoZWlnaHQgb2YgdHJlZSwgbWF0ZXJpYWxzXG4vLyBodHRwczovL3d3dy5iYWJ5bG9uanMtcGxheWdyb3VuZC5jb20vI0xHM0dTIzkzXG4vLyBodHRwczovL2dpdGh1Yi5jb20vQmFieWxvbkpTL0V4dGVuc2lvbnMvdHJlZS9tYXN0ZXIvVHJlZUdlbmVyYXRvcnMvU2ltcGxlUGluZUdlbmVyYXRvclxuZnVuY3Rpb24gUGluZUdlbmVyYXRvcihjYW5vcGllczogbnVtYmVyLCBoZWlnaHQ6IG51bWJlciwgd2lkdGg6IG51bWJlcixcbiAgICAgICAgICAgICAgICAgICAgICAgdHJ1bmtNYXRlcmlhbDogQkFCWUxPTi5TdGFuZGFyZE1hdGVyaWFsLFxuICAgICAgICAgICAgICAgICAgICAgICBsZWFmTWF0ZXJpYWw6IEJBQllMT04uU3RhbmRhcmRNYXRlcmlhbCxcbiAgICAgICAgICAgICAgICAgICAgICAgc2NlbmU6IEJBQllMT04uU2NlbmUpIDogQkFCWUxPTi5NZXNoXG57XG4gIGxldCBuYkwgPSBjYW5vcGllcyArIDE7XG4gIGxldCB0cnVua0xlbiA9IGhlaWdodCAvIG5iTDtcbiAgbGV0IGN1cnZlUG9pbnRzID0gZnVuY3Rpb24obCwgdCkge1xuICAgIGxldCBwYXRoID0gW107XG4gICAgbGV0IHN0ZXAgPSBsIC8gdDtcbiAgICBmb3IgKGxldCBpID0gdHJ1bmtMZW47IGkgPCBsICsgdHJ1bmtMZW47IGkgKz0gc3RlcCkge1xuICAgICAgcGF0aC5wdXNoKG5ldyBCQUJZTE9OLlZlY3RvcjMoMCwgaSwgMCkpO1xuICAgICAgcGF0aC5wdXNoKG5ldyBCQUJZTE9OLlZlY3RvcjMoMCwgaSwgMCkpO1xuICAgIH1cbiAgICByZXR1cm4gcGF0aDtcbiAgfTtcblxuICBsZXQgY3VydmUgPSBjdXJ2ZVBvaW50cyhoZWlnaHQsIG5iTCk7XG5cbiAgbGV0IHJhZGl1c0Z1bmN0aW9uID0gZnVuY3Rpb24oaSwgZGlzdGFuY2UpIHtcbiAgICBsZXQgZmFjdCA9IDE7XG4gICAgaWYgKGkgJSAyID09IDApIHsgZmFjdCA9IC41OyB9XG4gICAgbGV0IHJhZGl1cyA9ICBNYXRoLm1heCgwLCAobmJMICogMiAtIGkgLSAxKSAqIGZhY3QpO1xuICAgIHJldHVybiByYWRpdXM7XG4gIH07XG5cbiAgbGV0IGxlYXZlcyA9IEJBQllMT04uTWVzaC5DcmVhdGVUdWJlKFxuICAgIFwibGVhdmVzXCIsIGN1cnZlLCAwLCAxMCwgcmFkaXVzRnVuY3Rpb24sIEJBQllMT04uTWVzaC5DQVBfQUxMLCBzY2VuZSk7XG4gIGxlYXZlcy5zY2FsaW5nLnggPSB3aWR0aCAvIDEwO1xuICBsZWF2ZXMuc2NhbGluZy56ID0gd2lkdGggLyAxMDtcblxuICBsZXQgdHJ1bmsgPSBCQUJZTE9OLk1lc2guQ3JlYXRlQ3lsaW5kZXIoXG4gICAgXCJ0cnVua1wiLCBoZWlnaHQgLyBuYkwsIG5iTCAqIDEuNSAtIG5iTCAvIDIgLSAxLCBuYkwgKiAxLjUgLSBuYkwgLyAyIC0gMSwgMTIsIDEsIHNjZW5lKTtcbiAgdHJ1bmsucG9zaXRpb24ueSA9IHRydW5rTGVuIC8gMjtcbiAgdHJ1bmsuc2NhbGluZy54ID0gd2lkdGggLyAxMDtcbiAgdHJ1bmsuc2NhbGluZy56ID0gd2lkdGggLyAxMDtcblxuICBsZWF2ZXMubWF0ZXJpYWwgPSBsZWFmTWF0ZXJpYWw7XG4gIHRydW5rLm1hdGVyaWFsID0gdHJ1bmtNYXRlcmlhbDtcblxuICBsZXQgdHJlZSA9IEJBQllMT04uTWVzaC5DcmVhdGVCb3goXCJwaW5lXCIsIDEsIHNjZW5lKTtcbiAgdHJlZS5pc1Zpc2libGUgPSBmYWxzZTtcbiAgbGVhdmVzLnBhcmVudCA9IHRyZWU7XG4gIHRydW5rLnBhcmVudCA9IHRyZWU7XG4gIHJldHVybiB0cmVlO1xufVxuXG5mdW5jdGlvbiBRdWlja1RyZWVHZW5lcmF0b3Ioc2l6ZUJyYW5jaDogbnVtYmVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNpemVUcnVuazogbnVtYmVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJhZGl1czogbnVtYmVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRydW5rTWF0ZXJpYWw6IEJBQllMT04uU3RhbmRhcmRNYXRlcmlhbCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZWFmTWF0ZXJpYWw6IEJBQllMT04uU3RhbmRhcmRNYXRlcmlhbCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzY2VuZTogQkFCWUxPTi5TY2VuZSkgOiBCQUJZTE9OLk1lc2gge1xuICAgIGxldCBsZWF2ZXMgPSBuZXcgQkFCWUxPTi5NZXNoKFwibGVhdmVzXCIsIHNjZW5lKTtcblxuICAgIGxldCB2ZXJ0ZXhEYXRhID0gQkFCWUxPTi5WZXJ0ZXhEYXRhLkNyZWF0ZVNwaGVyZSh7c2VnbWVudHM6IDIsIGRpYW1ldGVyOiBzaXplQnJhbmNofSk7XG5cbiAgICB2ZXJ0ZXhEYXRhLmFwcGx5VG9NZXNoKGxlYXZlcywgZmFsc2UpO1xuXG4gICAgbGV0IHBvc2l0aW9ucyA9IGxlYXZlcy5nZXRWZXJ0aWNlc0RhdGEoQkFCWUxPTi5WZXJ0ZXhCdWZmZXIuUG9zaXRpb25LaW5kKTtcbiAgICBsZXQgaW5kaWNlcyA9IGxlYXZlcy5nZXRJbmRpY2VzKCk7XG4gICAgbGV0IG51bWJlck9mUG9pbnRzID0gcG9zaXRpb25zLmxlbmd0aCAvIDM7XG5cbiAgICBsZXQgbWFwID0gW107XG5cbiAgICBsZXQgdjMgPSBCQUJZTE9OLlZlY3RvcjM7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBudW1iZXJPZlBvaW50czsgaSsrKSB7XG4gICAgICAgIGxldCBwID0gbmV3IHYzKHBvc2l0aW9uc1tpICogM10sIHBvc2l0aW9uc1tpICogMyArIDFdLCBwb3NpdGlvbnNbaSAqIDMgKyAyXSk7XG5cbiAgICAgICAgbGV0IGZvdW5kID0gZmFsc2U7XG4gICAgICAgIGZvciAobGV0IGluZGV4ID0gMDsgaW5kZXggPCBtYXAubGVuZ3RoICYmICFmb3VuZDsgaW5kZXgrKykge1xuICAgICAgICAgICAgbGV0IGFycmF5ID0gbWFwW2luZGV4XTtcbiAgICAgICAgICAgIGxldCBwMCA9IGFycmF5WzBdO1xuICAgICAgICAgICAgaWYgKHAwLmVxdWFscyAocCkgfHwgKHAwLnN1YnRyYWN0KHApKS5sZW5ndGhTcXVhcmVkKCkgPCAwLjAxKSB7XG4gICAgICAgICAgICAgICAgYXJyYXkucHVzaChpICogMyk7XG4gICAgICAgICAgICAgICAgZm91bmQgPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmICghZm91bmQpIHtcbiAgICAgICAgICAgIGxldCBhcnJheSA9IFtdO1xuICAgICAgICAgICAgYXJyYXkucHVzaChwLCBpICogMyk7XG4gICAgICAgICAgICBtYXAucHVzaChhcnJheSk7XG4gICAgICAgIH1cblxuICAgIH1cbiAgICBsZXQgcmFuZG9tTnVtYmVyID0gZnVuY3Rpb24obWluLCBtYXgpIHtcbiAgICAgICAgaWYgKG1pbiA9PSBtYXgpIHtcbiAgICAgICAgICAgIHJldHVybiAobWluKTtcbiAgICAgICAgfVxuICAgICAgICBsZXQgcmFuZG9tID0gTWF0aC5yYW5kb20oKTtcbiAgICAgICAgcmV0dXJuICgocmFuZG9tICogKG1heCAtIG1pbikpICsgbWluKTtcbiAgICB9O1xuXG4gICAgbWFwLmZvckVhY2goZnVuY3Rpb24oYXJyYXkpIHtcbiAgICAgICAgbGV0IGluZGV4LCBtaW4gPSAtc2l6ZUJyYW5jaCAvIDEwLCBtYXggPSBzaXplQnJhbmNoIC8gMTA7XG4gICAgICAgIGxldCByeCA9IHJhbmRvbU51bWJlcihtaW4sIG1heCk7XG4gICAgICAgIGxldCByeSA9IHJhbmRvbU51bWJlcihtaW4sIG1heCk7XG4gICAgICAgIGxldCByeiA9IHJhbmRvbU51bWJlcihtaW4sIG1heCk7XG5cbiAgICAgICAgZm9yIChpbmRleCA9IDE7IGluZGV4IDwgYXJyYXkubGVuZ3RoOyBpbmRleCsrKSB7XG4gICAgICAgICAgICBsZXQgaSA9IGFycmF5W2luZGV4XTtcbiAgICAgICAgICAgIHBvc2l0aW9uc1tpXSArPSByeDtcbiAgICAgICAgICAgIHBvc2l0aW9uc1tpICsgMV0gKz0gcnk7XG4gICAgICAgICAgICBwb3NpdGlvbnNbaSArIDJdICs9IHJ6O1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICBsZWF2ZXMuc2V0VmVydGljZXNEYXRhKEJBQllMT04uVmVydGV4QnVmZmVyLlBvc2l0aW9uS2luZCwgcG9zaXRpb25zKTtcbiAgICBsZXQgbm9ybWFscyA9IFtdO1xuICAgIEJBQllMT04uVmVydGV4RGF0YS5Db21wdXRlTm9ybWFscyhwb3NpdGlvbnMsIGluZGljZXMsIG5vcm1hbHMpO1xuICAgIGxlYXZlcy5zZXRWZXJ0aWNlc0RhdGEoQkFCWUxPTi5WZXJ0ZXhCdWZmZXIuTm9ybWFsS2luZCwgbm9ybWFscyk7XG4gICAgbGVhdmVzLmNvbnZlcnRUb0ZsYXRTaGFkZWRNZXNoKCk7XG5cbiAgICBsZWF2ZXMubWF0ZXJpYWwgPSBsZWFmTWF0ZXJpYWw7XG4gICAgbGVhdmVzLnBvc2l0aW9uLnkgPSBzaXplVHJ1bmsgKyBzaXplQnJhbmNoIC8gMiAtIDI7XG5cbiAgICBsZXQgdHJ1bmsgPSBCQUJZTE9OLk1lc2guQ3JlYXRlQ3lsaW5kZXIoXG4gICAgICBcInRydW5rXCIsIHNpemVUcnVuaywgcmFkaXVzIC0gMiA8IDEgPyAxIDogcmFkaXVzIC0gMiwgcmFkaXVzLCAxMCwgMiwgc2NlbmUpO1xuXG4gICAgdHJ1bmsucG9zaXRpb24ueSA9IHNpemVUcnVuayAvIDI7XG5cbiAgICB0cnVuay5tYXRlcmlhbCA9IHRydW5rTWF0ZXJpYWw7XG4gICAgdHJ1bmsuY29udmVydFRvRmxhdFNoYWRlZE1lc2goKTtcblxuICAgIGxldCB0cmVlID0gQkFCWUxPTi5NZXNoLkNyZWF0ZUJveChcInRyZWVcIiwgMSwgc2NlbmUpO1xuICAgIHRyZWUuaXNWaXNpYmxlID0gZmFsc2U7XG4gICAgbGVhdmVzLnBhcmVudCA9IHRyZWU7XG4gICAgdHJ1bmsucGFyZW50ID0gdHJlZTtcbiAgICByZXR1cm4gdHJlZTtcbn1cblxuZnVuY3Rpb24gUXVpY2tTaHJ1YihzaXplQnJhbmNoOiBudW1iZXIsXG4gICAgICAgICAgICAgICAgICAgIGxlYWZNYXRlcmlhbDogQkFCWUxPTi5TdGFuZGFyZE1hdGVyaWFsLFxuICAgICAgICAgICAgICAgICAgICBzY2VuZTogQkFCWUxPTi5TY2VuZSkgOiBCQUJZTE9OLk1lc2gge1xuICAgIGxldCB0cmVlID0gbmV3IEJBQllMT04uTWVzaChcInNocnViXCIsIHNjZW5lKTtcbiAgICB0cmVlLmlzVmlzaWJsZSA9IGZhbHNlO1xuXG4gICAgbGV0IGxlYXZlcyA9IG5ldyBCQUJZTE9OLk1lc2goXCJsZWF2ZXNcIiwgc2NlbmUpO1xuXG4gICAgbGV0IHZlcnRleERhdGEgPSBCQUJZTE9OLlZlcnRleERhdGEuQ3JlYXRlU3BoZXJlKHtzZWdtZW50czogMiwgZGlhbWV0ZXI6IHNpemVCcmFuY2h9KTtcblxuICAgIHZlcnRleERhdGEuYXBwbHlUb01lc2gobGVhdmVzLCBmYWxzZSk7XG5cbiAgICBsZXQgcG9zaXRpb25zID0gbGVhdmVzLmdldFZlcnRpY2VzRGF0YShCQUJZTE9OLlZlcnRleEJ1ZmZlci5Qb3NpdGlvbktpbmQpO1xuICAgIGxldCBpbmRpY2VzID0gbGVhdmVzLmdldEluZGljZXMoKTtcbiAgICBsZXQgbnVtYmVyT2ZQb2ludHMgPSBwb3NpdGlvbnMubGVuZ3RoIC8gMztcblxuICAgIGxldCBtYXAgPSBbXTtcblxuICAgIGxldCB2MyA9IEJBQllMT04uVmVjdG9yMztcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IG51bWJlck9mUG9pbnRzOyBpKyspIHtcbiAgICAgICAgbGV0IHAgPSBuZXcgdjMocG9zaXRpb25zW2kgKiAzXSwgcG9zaXRpb25zW2kgKiAzICsgMV0sIHBvc2l0aW9uc1tpICogMyArIDJdKTtcblxuICAgICAgICBsZXQgZm91bmQgPSBmYWxzZTtcbiAgICAgICAgZm9yIChsZXQgaW5kZXggPSAwOyBpbmRleCA8IG1hcC5sZW5ndGggJiYgIWZvdW5kOyBpbmRleCsrKSB7XG4gICAgICAgICAgICBsZXQgYXJyYXkgPSBtYXBbaW5kZXhdO1xuICAgICAgICAgICAgbGV0IHAwID0gYXJyYXlbMF07XG4gICAgICAgICAgICBpZiAocDAuZXF1YWxzKHApIHx8IChwMC5zdWJ0cmFjdChwKSkubGVuZ3RoU3F1YXJlZCgpIDwgMC4wMSkge1xuICAgICAgICAgICAgICAgIGFycmF5LnB1c2goaSAqIDMpO1xuICAgICAgICAgICAgICAgIGZvdW5kID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoIWZvdW5kKSB7XG4gICAgICAgICAgICBsZXQgYXJyYXkgPSBbXTtcbiAgICAgICAgICAgIGFycmF5LnB1c2gocCwgaSAqIDMpO1xuICAgICAgICAgICAgbWFwLnB1c2goYXJyYXkpO1xuICAgICAgICB9XG4gICAgfVxuICAgIGxldCByYW5kb21OdW1iZXIgPSBmdW5jdGlvbihtaW4sIG1heCkge1xuICAgICAgICBpZiAobWluID09IG1heCkge1xuICAgICAgICAgICAgcmV0dXJuIChtaW4pO1xuICAgICAgICB9XG4gICAgICAgIGxldCByYW5kb20gPSBNYXRoLnJhbmRvbSgpO1xuICAgICAgICByZXR1cm4gKChyYW5kb20gKiAobWF4IC0gbWluKSkgKyBtaW4pO1xuICAgIH07XG5cbiAgICBtYXAuZm9yRWFjaChmdW5jdGlvbihhcnJheSkge1xuICAgICAgbGV0IGluZGV4LCBtaW4gPSAtc2l6ZUJyYW5jaCAvIDUsIG1heCA9IHNpemVCcmFuY2ggLyA1O1xuICAgICAgbGV0IHJ4ID0gcmFuZG9tTnVtYmVyKG1pbiwgbWF4KTtcbiAgICAgIGxldCByeSA9IHJhbmRvbU51bWJlcihtaW4sIG1heCk7XG4gICAgICBsZXQgcnogPSByYW5kb21OdW1iZXIobWluLCBtYXgpO1xuXG4gICAgICBmb3IgKGluZGV4ID0gMTsgaW5kZXggPCBhcnJheS5sZW5ndGg7IGluZGV4KyspIHtcbiAgICAgICAgbGV0IGkgPSBhcnJheVtpbmRleF07XG4gICAgICAgIHBvc2l0aW9uc1tpXSArPSByeDtcbiAgICAgICAgcG9zaXRpb25zW2kgKyAyXSArPSByejtcbiAgICAgICAgaWYgKHBvc2l0aW9uc1tpICsgMV0gPCAwKSB7XG4gICAgICAgICAgcG9zaXRpb25zW2kgKyAxXSA9IC1zaXplQnJhbmNoIC8gMjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBwb3NpdGlvbnNbaSArIDFdICs9IHJ5O1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBsZWF2ZXMuc2V0VmVydGljZXNEYXRhKEJBQllMT04uVmVydGV4QnVmZmVyLlBvc2l0aW9uS2luZCwgcG9zaXRpb25zKTtcbiAgICBsZXQgbm9ybWFscyA9IFtdO1xuICAgIEJBQllMT04uVmVydGV4RGF0YS5Db21wdXRlTm9ybWFscyhwb3NpdGlvbnMsIGluZGljZXMsIG5vcm1hbHMpO1xuICAgIGxlYXZlcy5zZXRWZXJ0aWNlc0RhdGEoQkFCWUxPTi5WZXJ0ZXhCdWZmZXIuTm9ybWFsS2luZCwgbm9ybWFscyk7XG4gICAgbGVhdmVzLmNvbnZlcnRUb0ZsYXRTaGFkZWRNZXNoKCk7XG5cbiAgICBsZWF2ZXMubWF0ZXJpYWwgPSBsZWFmTWF0ZXJpYWw7XG4gICAgbGVhdmVzLnNjYWxpbmcueSA9IHJhbmRvbU51bWJlcigwLjIsIDEpO1xuICAgIGxlYXZlcy5wb3NpdGlvbi55ID0gMC4xICsgbGVhdmVzLnNjYWxpbmcueSAqIHNpemVCcmFuY2ggLyAyO1xuXG4gICAgbGVhdmVzLnBhcmVudCA9IHRyZWU7XG4gICAgcmV0dXJuIHRyZWU7XG59XG4iLCJjbGFzcyBCaWdBcnJheSBleHRlbmRzIEFycmF5IHtcbiAgbGVuZ3RoUG9wdWxhdGVkOiBudW1iZXIgPSAwO1xufVxuXG5jbGFzcyBUcml2aWFsU3RhY2s8VHZhbHVlPiB7XG4gIHByaXZhdGUgX2NvbnRhaW5lcjogQXJyYXk8VHZhbHVlPjtcbiAgbGVuZ3RoOiBudW1iZXI7XG5cbiAgY29uc3RydWN0b3IoKSB7XG4gICAgdGhpcy5sZW5ndGggPSAwO1xuICAgIHRoaXMuX2NvbnRhaW5lciA9IFtdO1xuICB9XG5cbiAgcG9wKCk6IFR2YWx1ZSB7XG4gICAgbGV0IHZhbHVlID0gdGhpcy5fY29udGFpbmVyLnBvcCgpO1xuICAgIHRoaXMubGVuZ3RoID0gdGhpcy5fY29udGFpbmVyLmxlbmd0aDtcbiAgICByZXR1cm4gdmFsdWU7XG4gIH1cblxuICBwdXNoKG5ld1ZhbHVlOiBUdmFsdWUpOiB2b2lkIHtcbiAgICB0aGlzLl9jb250YWluZXIucHVzaChuZXdWYWx1ZSk7XG4gICAgdGhpcy5sZW5ndGggPSB0aGlzLl9jb250YWluZXIubGVuZ3RoO1xuICB9XG59XG5cbmNsYXNzIFRyaXZpYWxRdWV1ZTxUdmFsdWU+IHtcbiAgcHJpdmF0ZSBfY29udGFpbmVyOiBBcnJheTxUdmFsdWU+O1xuICBsZW5ndGg6IG51bWJlcjtcblxuICBjb25zdHJ1Y3RvcigpIHtcbiAgICB0aGlzLmxlbmd0aCA9IDA7XG4gICAgdGhpcy5fY29udGFpbmVyID0gW107XG4gIH1cblxuICBwb3AoKTogVHZhbHVlIHtcbiAgICBsZXQgdmFsdWUgPSB0aGlzLl9jb250YWluZXIucG9wKCk7XG4gICAgdGhpcy5sZW5ndGggPSB0aGlzLl9jb250YWluZXIubGVuZ3RoO1xuICAgIHJldHVybiB2YWx1ZTtcbiAgfVxuXG4gIHB1c2gobmV3VmFsdWU6IFR2YWx1ZSk6IHZvaWQge1xuICAgIHRoaXMuX2NvbnRhaW5lci51bnNoaWZ0KG5ld1ZhbHVlKTtcbiAgICB0aGlzLmxlbmd0aCA9IHRoaXMuX2NvbnRhaW5lci5sZW5ndGg7XG4gIH1cbn1cblxuY2xhc3MgTXlTdGFjazxUdmFsdWU+IHtcbiAgcHJpdmF0ZSBfY29udGFpbmVyOiBCaWdBcnJheTtcbiAgcHJpdmF0ZSBfc2l6ZTogbnVtYmVyO1xuICBsZW5ndGg6IG51bWJlcjtcblxuICBjb25zdHJ1Y3RvcihzaXplPzogbnVtYmVyKSB7XG4gICAgc2l6ZSA9IHNpemUgfHwgMTA7XG4gICAgdGhpcy5sZW5ndGggPSAwO1xuICAgIHRoaXMuX2NvbnRhaW5lciA9IG5ldyBCaWdBcnJheShzaXplKTtcbiAgICB0aGlzLl9zaXplID0gc2l6ZTtcbiAgfVxuXG4gIHBvcCgpOiBUdmFsdWUge1xuICAgIGlmICh0aGlzLl9jb250YWluZXIubGVuZ3RoUG9wdWxhdGVkID09PSAwKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuX2NvbnRhaW5lci5sZW5ndGhQb3B1bGF0ZWQtLTtcbiAgICB0aGlzLmxlbmd0aCA9IHRoaXMuX2NvbnRhaW5lci5sZW5ndGhQb3B1bGF0ZWQ7XG4gICAgbGV0IHZhbHVlID0gdGhpcy5fY29udGFpbmVyW3RoaXMuX2NvbnRhaW5lci5sZW5ndGhQb3B1bGF0ZWRdO1xuICAgIC8vZGVsZXRlIHRoaXMuX2NvbnRhaW5lclt0aGlzLl9jb250YWluZXIubGVuZ3RoUG9wdWxhdGVkXTtcbiAgICB0aGlzLl9jb250YWluZXJbdGhpcy5fY29udGFpbmVyLmxlbmd0aFBvcHVsYXRlZF0gPSBudWxsO1xuICAgIHJldHVybiB2YWx1ZTtcbiAgfVxuXG4gIHB1c2gobmV3VmFsdWU6IFR2YWx1ZSk6IHZvaWQge1xuICAgIGlmICh0aGlzLl9jb250YWluZXIubGVuZ3RoUG9wdWxhdGVkID09PSB0aGlzLl9jb250YWluZXIubGVuZ3RoKSB7XG4gICAgICB0aGlzLl9jb250YWluZXIubGVuZ3RoICs9IHRoaXMuX3NpemU7XG4gICAgfVxuICAgIHRoaXMuX2NvbnRhaW5lclt0aGlzLl9jb250YWluZXIubGVuZ3RoUG9wdWxhdGVkXSA9IG5ld1ZhbHVlO1xuICAgIHRoaXMuX2NvbnRhaW5lci5sZW5ndGhQb3B1bGF0ZWQrKztcbiAgICB0aGlzLmxlbmd0aCA9IHRoaXMuX2NvbnRhaW5lci5sZW5ndGhQb3B1bGF0ZWQ7XG4gIH1cbn1cblxuY2xhc3MgTXlRdWV1ZU5vZGU8VHZhbHVlPiB7XG4gIHZhbHVlOiBUdmFsdWU7XG4gIG5leHQ6IE15UXVldWVOb2RlPFR2YWx1ZT47XG5cbiAgY29uc3RydWN0b3IodmFsdWU6IFR2YWx1ZSkge1xuICAgIHRoaXMudmFsdWUgPSB2YWx1ZTtcbiAgfVxufVxuXG5jbGFzcyBNeVF1ZXVlPFR2YWx1ZT4ge1xuICAvL3ByaXZhdGUgX2NvbnRhaW5lcjogQmlnQXJyYXk7XG4gIC8vcHJpdmF0ZSBfc2l6ZTogbnVtYmVyO1xuICBwcml2YXRlIF9oZWFkOiBNeVF1ZXVlTm9kZTxUdmFsdWU+O1xuICBwcml2YXRlIF90YWlsOiBNeVF1ZXVlTm9kZTxUdmFsdWU+O1xuICBsZW5ndGg6IG51bWJlcjtcblxuICBjb25zdHJ1Y3RvcihzaXplPzogbnVtYmVyKSB7XG4gICAgc2l6ZSA9IHNpemUgfHwgMTA7XG4gICAgdGhpcy5sZW5ndGggPSAwO1xuICAgIC8vdGhpcy5fY29udGFpbmVyID0gbmV3IEJpZ0FycmF5KHNpemUpO1xuICAgIC8vdGhpcy5fc2l6ZSA9IHNpemU7XG4gIH1cblxuICBwb3AoKTogVHZhbHVlIHtcbiAgICBpZiAodGhpcy5faGVhZCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBsZXQgcmV0dXJuTm9kZSA9IHRoaXMuX2hlYWQ7XG4gICAgdGhpcy5faGVhZCA9IHRoaXMuX2hlYWQubmV4dDtcbiAgICB0aGlzLmxlbmd0aC0tO1xuXG4gICAgcmV0dXJuIHJldHVybk5vZGUudmFsdWU7XG4gIH1cblxuICBwdXNoKG5ld1ZhbHVlOiBUdmFsdWUpOiB2b2lkIHtcbiAgICBsZXQgbm9kZSA9IG5ldyBNeVF1ZXVlTm9kZTxUdmFsdWU+KG5ld1ZhbHVlKTtcblxuICAgIGlmICh0aGlzLl9oZWFkID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMuX2hlYWQgPSB0aGlzLl90YWlsID0gbm9kZTtcbiAgICAgIHRoaXMubGVuZ3RoID0gMTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLl90YWlsLm5leHQgPSBub2RlO1xuICAgIHRoaXMuX3RhaWwgPSBub2RlO1xuICAgIHRoaXMubGVuZ3RoKys7XG4gIH1cbn1cblxuY2xhc3MgTXlNYXA8VGtleSwgVHZhbHVlPiB7XG4gIHByaXZhdGUgX2NvbnRhaW5lcjtcbiAgcHJpdmF0ZSBfZ2V0UHJvcGVydGllczogKChub2RlKSA9PiBudW1iZXIpW107XG4gIGxlbmd0aDogbnVtYmVyO1xuXG4gIGNvbnN0cnVjdG9yKC4uLmdldFByb3BlcnRpZXM6ICgobm9kZSkgPT4gbnVtYmVyKVtdKSB7XG4gICAgdGhpcy5sZW5ndGggPSAwO1xuICAgIHRoaXMuX2NvbnRhaW5lciA9IG5ldyBCaWdBcnJheSgxMCk7XG4gICAgdGhpcy5fZ2V0UHJvcGVydGllcyA9IGdldFByb3BlcnRpZXM7XG4gIH1cblxuICBnZXQoa2V5OiBUa2V5KTogVHZhbHVlIHtcbiAgICBsZXQgc3ViQ29udGFpbmVyID0gdGhpcy5fY29udGFpbmVyO1xuICAgIHRoaXMuX2dldFByb3BlcnRpZXMuZm9yRWFjaCgoZ2V0UHJvcGVydHkpID0+IHtcbiAgICAgIGlmIChzdWJDb250YWluZXIgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBsZXQgc3ViS2V5OiBudW1iZXIgPSBnZXRQcm9wZXJ0eShrZXkpO1xuICAgICAgICBzdWJDb250YWluZXIgPSBzdWJDb250YWluZXJbc3ViS2V5XTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gc3ViQ29udGFpbmVyO1xuICB9XG5cbiAgcG9wKCkgOiBUdmFsdWUge1xuICAgIGxldCBhZGRyZXNzOiBudW1iZXJbXSA9IHRoaXMuX3BvcFJlY3Vyc2UodGhpcy5fY29udGFpbmVyKTtcblxuICAgIGxldCByZXR1cm5WYWw6IFR2YWx1ZTtcbiAgICBsZXQgc3ViQ29udGFpbmVyID0gdGhpcy5fY29udGFpbmVyO1xuICAgIGFkZHJlc3MuZm9yRWFjaCgoc3ViS2V5LCBpbmRleCwgYXJyYXkpID0+IHtcbiAgICAgIGlmIChpbmRleCA8IGFycmF5Lmxlbmd0aCAtIDEpIHtcbiAgICAgICAgc3ViQ29udGFpbmVyID0gc3ViQ29udGFpbmVyW3N1YktleV07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm5WYWwgPSBzdWJDb250YWluZXJbc3ViQ29udGFpbmVyLmxlbmd0aFBvcHVsYXRlZCAtIDFdO1xuICAgICAgICAvL2RlbGV0ZSBzdWJDb250YWluZXJbc3ViQ29udGFpbmVyLmxlbmd0aFBvcHVsYXRlZCAtIDFdO1xuICAgICAgICBzdWJDb250YWluZXJbc3ViQ29udGFpbmVyLmxlbmd0aFBvcHVsYXRlZCAtIDFdID0gbnVsbDtcbiAgICAgICAgaWYgKHJldHVyblZhbCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgc3ViQ29udGFpbmVyLmxlbmd0aFBvcHVsYXRlZC0tO1xuICAgICAgICAgIHRoaXMubGVuZ3RoLS07XG4gICAgICAgIH1cbiAgICAgICAgd2hpbGUgKHN1YkNvbnRhaW5lci5sZW5ndGhQb3B1bGF0ZWQgPiAwICYmXG4gICAgICAgICAgICAgICBzdWJDb250YWluZXJbc3ViQ29udGFpbmVyLmxlbmd0aFBvcHVsYXRlZCAtIDFdID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAvLyBXaGlsZSB0aGlzIGlzIGV4cGVuc2l2ZSwgaXQgd2lsbCBvbmx5IGhhcHBlbiBmb3IgY2FzZXMgd2hlblxuICAgICAgICAgIC8vIHRoZXJlIGFyZSBlbXB0eSBzcGFjZXMgdG8gdGhlIFwibGVmdFwiIG9mIHRoZSBwb3AtZWQgdmFsdWUuXG4gICAgICAgICAgc3ViQ29udGFpbmVyLmxlbmd0aFBvcHVsYXRlZC0tO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHJldHVyblZhbDtcbiAgfVxuXG4gIHByaXZhdGUgX3BvcFJlY3Vyc2UockNvbnRhaW5lcjogW10pOiBudW1iZXJbXSB7XG4gICAgbGV0IHJldHVyblZhbDogbnVtYmVyW10gPSBbXTtcbiAgICByQ29udGFpbmVyLmZvckVhY2goKG5vZGUsIGluZGV4LCBhcnJheSkgPT4ge1xuICAgICAgaWYgKHJldHVyblZhbC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkoYXJyYXlbaW5kZXhdKSkge1xuICAgICAgICAgIGlmICgoPEJpZ0FycmF5PihhcnJheVtpbmRleF0pKS5sZW5ndGhQb3B1bGF0ZWQgPiAwKSB7XG4gICAgICAgICAgICByZXR1cm5WYWwgPSBbaW5kZXhdLmNvbmNhdCh0aGlzLl9wb3BSZWN1cnNlKGFycmF5W2luZGV4XSkpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm5WYWwgPSBbaW5kZXhdO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHJldHVyblZhbDtcbiAgfVxuXG4gIHB1dChrZXk6IFRrZXksIHZhbHVlOiBUdmFsdWUpOiB2b2lkIHtcbiAgICBsZXQgc3ViQ29udGFpbmVyID0gdGhpcy5fY29udGFpbmVyO1xuICAgIHRoaXMuX2dldFByb3BlcnRpZXMuZm9yRWFjaCgoZ2V0UHJvcGVydHksIGluZGV4LCBhcnJheSkgPT4ge1xuICAgICAgbGV0IHN1YktleTogbnVtYmVyID0gZ2V0UHJvcGVydHkoa2V5KTtcbiAgICAgIGNvbnNvbGUuYXNzZXJ0KHN1YktleSAhPT0gdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgICAgICAgKFwiUHJvYmxlbSBydW5uaW5nIFwiICsgZ2V0UHJvcGVydHkubmFtZSArIFwiIG9uIFwiICsga2V5KSk7XG4gICAgICBpZiAoaW5kZXggPCBhcnJheS5sZW5ndGggLSAxKSB7XG4gICAgICAgIHdoaWxlIChzdWJDb250YWluZXIubGVuZ3RoUG9wdWxhdGVkIC0gMSA8IHN1YktleSkge1xuICAgICAgICAgIC8vc3ViQ29udGFpbmVyLnB1c2gobmV3IEJpZ0FycmF5KDEwKSk7XG4gICAgICAgICAgc3ViQ29udGFpbmVyW3N1YkNvbnRhaW5lci5sZW5ndGhQb3B1bGF0ZWRdID0gbmV3IEJpZ0FycmF5KDEwKTtcbiAgICAgICAgICBzdWJDb250YWluZXIubGVuZ3RoUG9wdWxhdGVkKys7XG4gICAgICAgIH1cbiAgICAgICAgc3ViQ29udGFpbmVyID0gc3ViQ29udGFpbmVyW3N1YktleV07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAoc3ViQ29udGFpbmVyW3N1YktleV0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIHN1YkNvbnRhaW5lcltzdWJLZXldID0gdmFsdWU7XG4gICAgICAgICAgc3ViQ29udGFpbmVyLmxlbmd0aFBvcHVsYXRlZCA9IE1hdGgubWF4KHN1YktleSArIDEsIHN1YkNvbnRhaW5lci5sZW5ndGhQb3B1bGF0ZWQpO1xuICAgICAgICAgIHRoaXMubGVuZ3RoKys7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIGRlbChrZXk6IFRrZXkpOiBUdmFsdWUge1xuICAgIGxldCByZXR1cm5WYWw6IFR2YWx1ZTtcblxuICAgIGxldCBzdWJDb250YWluZXIgPSB0aGlzLl9jb250YWluZXI7XG4gICAgdGhpcy5fZ2V0UHJvcGVydGllcy5mb3JFYWNoKChnZXRQcm9wZXJ0eSwgaW5kZXgsIGFycmF5KSA9PiB7XG4gICAgICBsZXQgc3ViS2V5OiBudW1iZXIgPSBnZXRQcm9wZXJ0eShrZXkpO1xuICAgICAgY29uc29sZS5hc3NlcnQoc3ViS2V5ICE9PSB1bmRlZmluZWQpO1xuICAgICAgaWYgKGluZGV4IDwgYXJyYXkubGVuZ3RoIC0gMSkge1xuICAgICAgICBsZXQgc3ViS2V5OiBudW1iZXIgPSBnZXRQcm9wZXJ0eShrZXkpO1xuICAgICAgICBzdWJDb250YWluZXIgPSBzdWJDb250YWluZXJbc3ViS2V5XTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVyblZhbCA9IHN1YkNvbnRhaW5lcltzdWJLZXldO1xuICAgICAgICAvL2RlbGV0ZSBzdWJDb250YWluZXJbc3ViS2V5XTtcbiAgICAgICAgc3ViQ29udGFpbmVyW3N1YktleV0gPSBudWxsO1xuICAgICAgICBpZiAocmV0dXJuVmFsICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBzdWJDb250YWluZXIubGVuZ3RoUG9wdWxhdGVkLS07XG4gICAgICAgICAgdGhpcy5sZW5ndGgtLTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHJldHVyblZhbDtcbiAgfVxufVxuXG5jbGFzcyBQcmlvcml0eVF1ZXVlPFQ+IHtcbiAgcHJpdmF0ZSBfY29udGFpbmVyOiBNeVN0YWNrPFQ+W107XG4gIHByaXZhdGUgX2dldFByb3BlcnRpZXM6ICgobm9kZSkgPT4gbnVtYmVyKVtdO1xuICBsZW5ndGg6IG51bWJlcjtcblxuICBjb25zdHJ1Y3RvciguLi5nZXRQcm9wZXJ0aWVzOiAoKG5vZGUpID0+IG51bWJlcilbXSkge1xuICAgIHRoaXMuX2dldFByb3BlcnRpZXMgPSBnZXRQcm9wZXJ0aWVzO1xuICAgIHRoaXMuX2NvbnRhaW5lciA9IFtdO1xuICAgIHRoaXMubGVuZ3RoID0gMDtcbiAgfVxuXG4gIC8qIFBvcCBpdGVtIGZyb20gaGlnaGVzdCBwcmlvcml0eSBzdWItcXVldWUuICovXG4gIHBvcCgpOiBUIHtcbiAgICBsZXQgaXRlbTogVDtcblxuICAgIHRoaXMuX2NvbnRhaW5lci5mb3JFYWNoKChuLCBpbmRleCwgYXJyYXkpID0+IHtcbiAgICAgIGxldCByZXZlcnNlSW5kZXggPSB0aGlzLl9jb250YWluZXIubGVuZ3RoIC0gaW5kZXggLSAxO1xuXG4gICAgICBpZiAoaXRlbSA9PT0gdW5kZWZpbmVkICYmIGFycmF5W3JldmVyc2VJbmRleF0ubGVuZ3RoKSB7XG4gICAgICAgIGl0ZW0gPSBhcnJheVtyZXZlcnNlSW5kZXhdLnBvcCgpO1xuICAgICAgICBjb25zb2xlLmFzc2VydChpdGVtICE9PSB1bmRlZmluZWQpO1xuICAgICAgICB0aGlzLmxlbmd0aC0tO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBpdGVtO1xuICB9XG5cbiAgLyogUG9wIGl0ZW0gZnJvbSBsb3dlc3QgcHJpb3JpdHkgc3ViLXF1ZXVlLiAqL1xuICBwb3BMb3coKTogVCB7XG4gICAgbGV0IGl0ZW06IFQ7XG5cbiAgICB0aGlzLl9jb250YWluZXIuZm9yRWFjaCgobiwgaW5kZXgsIGFycmF5KSA9PiB7XG4gICAgICBpZiAoaXRlbSA9PT0gdW5kZWZpbmVkICYmIGFycmF5W2luZGV4XS5sZW5ndGgpIHtcbiAgICAgICAgaXRlbSA9IGFycmF5W2luZGV4XS5wb3AoKTtcbiAgICAgICAgY29uc29sZS5hc3NlcnQoaXRlbSAhPT0gdW5kZWZpbmVkKTtcbiAgICAgICAgdGhpcy5sZW5ndGgtLTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gaXRlbTtcbiAgfVxuXG4gIC8qIEFkZCBpdGVtIGF0IHNwZWNpZmllZCBwcmlvcml0eS4gKi9cbiAgcHVzaChpdGVtOiBULCBwcmlvcml0eTogbnVtYmVyKTogdm9pZCB7XG4gICAgY29uc29sZS5hc3NlcnQoaXRlbSAhPT0gdW5kZWZpbmVkKTtcbiAgICBjb25zb2xlLmFzc2VydChwcmlvcml0eSA9PT0gTWF0aC5yb3VuZChwcmlvcml0eSksXG4gICAgICAgICAgICAgICAgICAgXCJQcmlvcml0eSBtdXN0IGJlIGFuIGludGlnZXIuXCIpO1xuXG4gICAgd2hpbGUgKHRoaXMuX2NvbnRhaW5lci5sZW5ndGggPCBwcmlvcml0eSArIDEpIHtcbiAgICAgIC8vIEFkZCBuZXcgcHJpb3JpdHkgc3ViLWNvbnRhaW5lci5cbiAgICAgIGxldCBjb250YWluZXIgPSBuZXcgTXlTdGFjazxUPigpO1xuICAgICAgdGhpcy5fY29udGFpbmVyLnB1c2goY29udGFpbmVyKTtcbiAgICB9XG4gICAgdGhpcy5fY29udGFpbmVyW3ByaW9yaXR5XS5wdXNoKGl0ZW0pO1xuICAgIHRoaXMubGVuZ3RoKys7XG4gIH1cbn1cblxuY2xhc3MgVGVzdE15U3RhY2sge1xuICBwcml2YXRlIF9jb250YWluZXI6IE15U3RhY2s8bnVtYmVyPjtcblxuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBsZXQgdGVzdHMgPSBbdGhpcy50ZXN0X3B1c2gsIHRoaXMudGVzdF9wb3BdO1xuICAgIHRlc3RzLmZvckVhY2goKHRlc3QpID0+IHtcbiAgICAgIHRoaXMuX2luaXQoKTtcbiAgICAgIHRlc3QuYmluZCh0aGlzKSgpO1xuICAgIH0sIHRoaXMpO1xuICB9XG5cbiAgcHJpdmF0ZSBfaW5pdCgpOiB2b2lkIHtcbiAgICB0aGlzLl9jb250YWluZXIgPSBuZXcgTXlTdGFjaygpO1xuICB9XG5cbiAgdGVzdF9wdXNoKCkge1xuICAgIGNvbnNvbGUubG9nKFwidGVzdF9wdXNoXCIpO1xuXG4gICAgY29uc29sZS5hc3NlcnQodGhpcy5fY29udGFpbmVyLmxlbmd0aCA9PT0gMCk7XG4gICAgdGhpcy5fY29udGFpbmVyLnB1c2goMSk7XG4gICAgY29uc29sZS5hc3NlcnQodGhpcy5fY29udGFpbmVyLmxlbmd0aCA9PT0gMSk7XG4gICAgdGhpcy5fY29udGFpbmVyLnB1c2goMik7XG4gICAgY29uc29sZS5hc3NlcnQodGhpcy5fY29udGFpbmVyLmxlbmd0aCA9PT0gMik7XG4gICAgdGhpcy5fY29udGFpbmVyLnB1c2goMyk7XG4gICAgY29uc29sZS5hc3NlcnQodGhpcy5fY29udGFpbmVyLmxlbmd0aCA9PT0gMyk7XG4gIH1cblxuICB0ZXN0X3BvcCgpIHtcbiAgICBjb25zb2xlLmxvZyhcInRlc3RfcG9wXCIpO1xuXG4gICAgY29uc29sZS5hc3NlcnQodGhpcy5fY29udGFpbmVyLmxlbmd0aCA9PT0gMCk7XG4gICAgdGhpcy5fY29udGFpbmVyLnB1c2goMSk7XG4gICAgdGhpcy5fY29udGFpbmVyLnB1c2goMik7XG4gICAgdGhpcy5fY29udGFpbmVyLnB1c2goMyk7XG4gICAgdGhpcy5fY29udGFpbmVyLnB1c2goNCk7XG4gICAgY29uc29sZS5hc3NlcnQodGhpcy5fY29udGFpbmVyLmxlbmd0aCA9PT0gNCk7XG5cbiAgICBsZXQgdmFsOiBudW1iZXIgPSB0aGlzLl9jb250YWluZXIucG9wKCk7XG4gICAgY29uc29sZS5hc3NlcnQodmFsID09PSA0KTtcbiAgICBjb25zb2xlLmFzc2VydCh0aGlzLl9jb250YWluZXIubGVuZ3RoID09PSAzKTtcblxuICAgIHZhbCA9IHRoaXMuX2NvbnRhaW5lci5wb3AoKTtcbiAgICB2YWwgPSB0aGlzLl9jb250YWluZXIucG9wKCk7XG4gICAgdmFsID0gdGhpcy5fY29udGFpbmVyLnBvcCgpO1xuICAgIGNvbnNvbGUuYXNzZXJ0KHZhbCA9PT0gMSk7XG4gICAgY29uc29sZS5hc3NlcnQodGhpcy5fY29udGFpbmVyLmxlbmd0aCA9PT0gMCk7XG5cbiAgICB2YWwgPSB0aGlzLl9jb250YWluZXIucG9wKCk7XG4gICAgY29uc29sZS5hc3NlcnQodmFsID09PSB1bmRlZmluZWQpO1xuICAgIGNvbnNvbGUuYXNzZXJ0KHRoaXMuX2NvbnRhaW5lci5sZW5ndGggPT09IDApO1xuICB9XG59XG5cbmNsYXNzIFRlc3RNeVF1ZXVlIHtcbiAgcHJpdmF0ZSBfY29udGFpbmVyOiBNeVF1ZXVlPG51bWJlcj47XG5cbiAgY29uc3RydWN0b3IoKSB7XG4gICAgbGV0IHRlc3RzID0gW3RoaXMudGVzdF9wdXNoLCB0aGlzLnRlc3RfcG9wXTtcbiAgICB0ZXN0cy5mb3JFYWNoKCh0ZXN0KSA9PiB7XG4gICAgICB0aGlzLl9pbml0KCk7XG4gICAgICB0ZXN0LmJpbmQodGhpcykoKTtcbiAgICB9LCB0aGlzKTtcbiAgfVxuXG4gIHByaXZhdGUgX2luaXQoKTogdm9pZCB7XG4gICAgdGhpcy5fY29udGFpbmVyID0gbmV3IE15UXVldWUoKTtcbiAgfVxuXG4gIHRlc3RfcHVzaCgpIHtcbiAgICBjb25zb2xlLmxvZyhcInRlc3RfcHVzaFwiKTtcblxuICAgIGNvbnNvbGUuYXNzZXJ0KHRoaXMuX2NvbnRhaW5lci5sZW5ndGggPT09IDApO1xuICAgIHRoaXMuX2NvbnRhaW5lci5wdXNoKDEpO1xuICAgIGNvbnNvbGUuYXNzZXJ0KHRoaXMuX2NvbnRhaW5lci5sZW5ndGggPT09IDEpO1xuICAgIHRoaXMuX2NvbnRhaW5lci5wdXNoKDIpO1xuICAgIGNvbnNvbGUuYXNzZXJ0KHRoaXMuX2NvbnRhaW5lci5sZW5ndGggPT09IDIpO1xuICAgIHRoaXMuX2NvbnRhaW5lci5wdXNoKDMpO1xuICAgIGNvbnNvbGUuYXNzZXJ0KHRoaXMuX2NvbnRhaW5lci5sZW5ndGggPT09IDMpO1xuICB9XG5cbiAgdGVzdF9wb3AoKSB7XG4gICAgY29uc29sZS5sb2coXCJ0ZXN0X3BvcFwiKTtcblxuICAgIGNvbnNvbGUuYXNzZXJ0KHRoaXMuX2NvbnRhaW5lci5sZW5ndGggPT09IDApO1xuICAgIHRoaXMuX2NvbnRhaW5lci5wdXNoKDEpO1xuICAgIHRoaXMuX2NvbnRhaW5lci5wdXNoKDIpO1xuICAgIHRoaXMuX2NvbnRhaW5lci5wdXNoKDMpO1xuICAgIHRoaXMuX2NvbnRhaW5lci5wdXNoKDQpO1xuICAgIGNvbnNvbGUuYXNzZXJ0KHRoaXMuX2NvbnRhaW5lci5sZW5ndGggPT09IDQpO1xuXG4gICAgbGV0IHZhbDogbnVtYmVyID0gdGhpcy5fY29udGFpbmVyLnBvcCgpO1xuICAgIGNvbnNvbGUuYXNzZXJ0KHZhbCA9PT0gMSk7XG4gICAgY29uc29sZS5hc3NlcnQodGhpcy5fY29udGFpbmVyLmxlbmd0aCA9PT0gMyk7XG5cbiAgICB2YWwgPSB0aGlzLl9jb250YWluZXIucG9wKCk7XG4gICAgdmFsID0gdGhpcy5fY29udGFpbmVyLnBvcCgpO1xuICAgIHZhbCA9IHRoaXMuX2NvbnRhaW5lci5wb3AoKTtcbiAgICBjb25zb2xlLmFzc2VydCh2YWwgPT09IDQpO1xuICAgIGNvbnNvbGUuYXNzZXJ0KHRoaXMuX2NvbnRhaW5lci5sZW5ndGggPT09IDApO1xuXG4gICAgdmFsID0gdGhpcy5fY29udGFpbmVyLnBvcCgpO1xuICAgIGNvbnNvbGUuYXNzZXJ0KHZhbCA9PT0gdW5kZWZpbmVkKTtcbiAgICBjb25zb2xlLmFzc2VydCh0aGlzLl9jb250YWluZXIubGVuZ3RoID09PSAwKTtcbiAgfVxufVxuXG5jbGFzcyBUZXN0TXlNYXAge1xuICBwcml2YXRlIF9jb250YWluZXI6IE15TWFwPHt9LCBudW1iZXI+O1xuXG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIGxldCB0ZXN0cyA9IFt0aGlzLnRlc3RfcHV0LCB0aGlzLnRlc3RfZ2V0LCB0aGlzLnRlc3RfZGVsLCB0aGlzLnRlc3RfcG9wXTtcbiAgICB0ZXN0cy5mb3JFYWNoKCh0ZXN0KSA9PiB7XG4gICAgICB0aGlzLl9pbml0KCk7XG4gICAgICB0ZXN0LmJpbmQodGhpcykoKTtcbiAgICB9LCB0aGlzKTtcbiAgfVxuXG4gIHByaXZhdGUgX2luaXQoKTogdm9pZCB7XG4gICAgZnVuY3Rpb24gZ2V0WChub2RlOiB7XCJ4XCIsIFwieVwifSk6IG51bWJlciB7XG4gICAgICByZXR1cm4gbm9kZS54O1xuICAgIH1cbiAgICBmdW5jdGlvbiBnZXRZKG5vZGU6IHtcInhcIiwgXCJ5XCJ9KTogbnVtYmVyIHtcbiAgICAgIHJldHVybiBub2RlLnk7XG4gICAgfVxuICAgIHRoaXMuX2NvbnRhaW5lciA9IG5ldyBNeU1hcChnZXRYLCBnZXRZKTtcbiAgfVxuXG4gIHRlc3RfcHV0KCkge1xuICAgIGNvbnNvbGUubG9nKFwidGVzdF9wdXRcIik7XG5cbiAgICBjb25zb2xlLmFzc2VydCh0aGlzLl9jb250YWluZXIubGVuZ3RoID09PSAwKTtcbiAgICB0aGlzLl9jb250YWluZXIucHV0KHtcInhcIjogMSwgXCJ5XCI6IDJ9LCAzKTtcbiAgICBjb25zb2xlLmFzc2VydCh0aGlzLl9jb250YWluZXIubGVuZ3RoID09PSAxKTtcbiAgICB0aGlzLl9jb250YWluZXIucHV0KHtcInhcIjogMSwgXCJ5XCI6IDJ9LCAzKTtcbiAgICB0aGlzLl9jb250YWluZXIucHV0KHtcInhcIjogMSwgXCJ5XCI6IDJ9LCA0KTtcbiAgICBjb25zb2xlLmFzc2VydCh0aGlzLl9jb250YWluZXIubGVuZ3RoID09PSAxKTtcbiAgICB0aGlzLl9jb250YWluZXIucHV0KHtcInhcIjogMSwgXCJ5XCI6IDF9LCA1KTtcbiAgICBjb25zb2xlLmFzc2VydCh0aGlzLl9jb250YWluZXIubGVuZ3RoID09PSAyKTtcbiAgICB0aGlzLl9jb250YWluZXIucHV0KHtcInhcIjogMSwgXCJ5XCI6IDN9LCA2KTtcbiAgICBjb25zb2xlLmFzc2VydCh0aGlzLl9jb250YWluZXIubGVuZ3RoID09PSAzKTtcbiAgICB0aGlzLl9jb250YWluZXIucHV0KHtcInhcIjogMCwgXCJ5XCI6IDN9LCA3KTtcbiAgICBjb25zb2xlLmFzc2VydCh0aGlzLl9jb250YWluZXIubGVuZ3RoID09PSA0KTtcbiAgICB0aGlzLl9jb250YWluZXIucHV0KHtcInhcIjogMiwgXCJ5XCI6IDN9LCA4KTtcbiAgICBjb25zb2xlLmFzc2VydCh0aGlzLl9jb250YWluZXIubGVuZ3RoID09PSA1KTtcbiAgICB0aGlzLl9jb250YWluZXIucHV0KHtcInhcIjogMCwgXCJ5XCI6IDB9LCA5KTtcbiAgICBjb25zb2xlLmFzc2VydCh0aGlzLl9jb250YWluZXIubGVuZ3RoID09PSA2KTtcbiAgfVxuXG4gIHRlc3RfZ2V0KCkge1xuICAgIGNvbnNvbGUubG9nKFwidGVzdF9nZXRcIik7XG5cbiAgICBjb25zb2xlLmFzc2VydCh0aGlzLl9jb250YWluZXIubGVuZ3RoID09PSAwKTtcbiAgICB0aGlzLl9jb250YWluZXIucHV0KHtcInhcIjogMCwgXCJ5XCI6IDJ9LCAxKTtcbiAgICB0aGlzLl9jb250YWluZXIucHV0KHtcInhcIjogMSwgXCJ5XCI6IDJ9LCAyKTtcbiAgICB0aGlzLl9jb250YWluZXIucHV0KHtcInhcIjogMiwgXCJ5XCI6IDJ9LCAzKTtcbiAgICB0aGlzLl9jb250YWluZXIucHV0KHtcInhcIjogMywgXCJ5XCI6IDB9LCA0KTtcbiAgICB0aGlzLl9jb250YWluZXIucHV0KHtcInhcIjogMywgXCJ5XCI6IDF9LCA1KTtcbiAgICB0aGlzLl9jb250YWluZXIucHV0KHtcInhcIjogMywgXCJ5XCI6IDJ9LCA2KTtcbiAgICBjb25zb2xlLmFzc2VydCh0aGlzLl9jb250YWluZXIubGVuZ3RoID09PSA2KTtcblxuICAgIGNvbnNvbGUuYXNzZXJ0KHRoaXMuX2NvbnRhaW5lci5nZXQoe1wieFwiOiAwLCBcInlcIjogMn0pID09PSAxKTtcbiAgICBjb25zb2xlLmFzc2VydCh0aGlzLl9jb250YWluZXIuZ2V0KHtcInhcIjogMSwgXCJ5XCI6IDJ9KSA9PT0gMik7XG4gICAgY29uc29sZS5hc3NlcnQodGhpcy5fY29udGFpbmVyLmdldCh7XCJ4XCI6IDIsIFwieVwiOiAyfSkgPT09IDMpO1xuICAgIGNvbnNvbGUuYXNzZXJ0KHRoaXMuX2NvbnRhaW5lci5nZXQoe1wieFwiOiAzLCBcInlcIjogMH0pID09PSA0KTtcbiAgICBjb25zb2xlLmFzc2VydCh0aGlzLl9jb250YWluZXIuZ2V0KHtcInhcIjogMywgXCJ5XCI6IDF9KSA9PT0gNSk7XG4gICAgY29uc29sZS5hc3NlcnQodGhpcy5fY29udGFpbmVyLmdldCh7XCJ4XCI6IDMsIFwieVwiOiAyfSkgPT09IDYpO1xuICAgIGNvbnNvbGUuYXNzZXJ0KHRoaXMuX2NvbnRhaW5lci5nZXQoe1wieFwiOiAzLCBcInlcIjogM30pID09PSB1bmRlZmluZWQpO1xuICB9XG5cbiAgdGVzdF9kZWwoKSB7XG4gICAgY29uc29sZS5sb2coXCJ0ZXN0X2RlbFwiKTtcblxuICAgIGNvbnNvbGUuYXNzZXJ0KHRoaXMuX2NvbnRhaW5lci5sZW5ndGggPT09IDApO1xuICAgIHRoaXMuX2NvbnRhaW5lci5wdXQoe1wieFwiOiAwLCBcInlcIjogMn0sIDEpO1xuICAgIHRoaXMuX2NvbnRhaW5lci5wdXQoe1wieFwiOiAxLCBcInlcIjogMn0sIDIpO1xuICAgIHRoaXMuX2NvbnRhaW5lci5wdXQoe1wieFwiOiAyLCBcInlcIjogMn0sIDMpO1xuICAgIHRoaXMuX2NvbnRhaW5lci5wdXQoe1wieFwiOiAzLCBcInlcIjogMH0sIDQpO1xuICAgIHRoaXMuX2NvbnRhaW5lci5wdXQoe1wieFwiOiAzLCBcInlcIjogMX0sIDUpO1xuICAgIHRoaXMuX2NvbnRhaW5lci5wdXQoe1wieFwiOiAzLCBcInlcIjogMn0sIDYpO1xuICAgIGNvbnNvbGUuYXNzZXJ0KHRoaXMuX2NvbnRhaW5lci5sZW5ndGggPT09IDYpO1xuXG4gICAgY29uc29sZS5hc3NlcnQodGhpcy5fY29udGFpbmVyLmRlbCh7XCJ4XCI6IDAsIFwieVwiOiAyfSkgPT09IDEpO1xuICAgIGNvbnNvbGUuYXNzZXJ0KHRoaXMuX2NvbnRhaW5lci5sZW5ndGggPT09IDUpO1xuICAgIGNvbnNvbGUuYXNzZXJ0KHRoaXMuX2NvbnRhaW5lci5kZWwoe1wieFwiOiAwLCBcInlcIjogMn0pID09PSB1bmRlZmluZWQpO1xuICAgIGNvbnNvbGUuYXNzZXJ0KHRoaXMuX2NvbnRhaW5lci5sZW5ndGggPT09IDUpO1xuICAgIGNvbnNvbGUuYXNzZXJ0KHRoaXMuX2NvbnRhaW5lci5kZWwoe1wieFwiOiAxLCBcInlcIjogMn0pID09PSAyKTtcbiAgICBjb25zb2xlLmFzc2VydCh0aGlzLl9jb250YWluZXIuZGVsKHtcInhcIjogMSwgXCJ5XCI6IDJ9KSA9PT0gdW5kZWZpbmVkKTtcbiAgICBjb25zb2xlLmFzc2VydCh0aGlzLl9jb250YWluZXIuZGVsKHtcInhcIjogMiwgXCJ5XCI6IDJ9KSA9PT0gMyk7XG4gICAgY29uc29sZS5hc3NlcnQodGhpcy5fY29udGFpbmVyLmRlbCh7XCJ4XCI6IDMsIFwieVwiOiAwfSkgPT09IDQpO1xuICAgIGNvbnNvbGUuYXNzZXJ0KHRoaXMuX2NvbnRhaW5lci5kZWwoe1wieFwiOiAzLCBcInlcIjogMX0pID09PSA1KTtcbiAgICBjb25zb2xlLmFzc2VydCh0aGlzLl9jb250YWluZXIuZGVsKHtcInhcIjogMywgXCJ5XCI6IDJ9KSA9PT0gNik7XG4gICAgY29uc29sZS5hc3NlcnQodGhpcy5fY29udGFpbmVyLmRlbCh7XCJ4XCI6IDMsIFwieVwiOiAzfSkgPT09IHVuZGVmaW5lZCk7XG4gICAgY29uc29sZS5hc3NlcnQodGhpcy5fY29udGFpbmVyLmxlbmd0aCA9PT0gMCk7XG4gIH1cblxuICB0ZXN0X3BvcCgpIHtcbiAgICBjb25zb2xlLmxvZyhcInRlc3RfcG9wXCIpO1xuXG4gICAgY29uc29sZS5hc3NlcnQodGhpcy5fY29udGFpbmVyLmxlbmd0aCA9PT0gMCk7XG4gICAgdGhpcy5fY29udGFpbmVyLnB1dCh7XCJ4XCI6IDAsIFwieVwiOiAyfSwgMSk7XG4gICAgdGhpcy5fY29udGFpbmVyLnB1dCh7XCJ4XCI6IDEsIFwieVwiOiAyfSwgMik7XG4gICAgdGhpcy5fY29udGFpbmVyLnB1dCh7XCJ4XCI6IDQsIFwieVwiOiAxfSwgNSk7XG4gICAgdGhpcy5fY29udGFpbmVyLnB1dCh7XCJ4XCI6IDIsIFwieVwiOiAyfSwgMyk7XG4gICAgdGhpcy5fY29udGFpbmVyLnB1dCh7XCJ4XCI6IDQsIFwieVwiOiAwfSwgNCk7XG4gICAgdGhpcy5fY29udGFpbmVyLnB1dCh7XCJ4XCI6IDQsIFwieVwiOiAyfSwgNik7XG4gICAgY29uc29sZS5hc3NlcnQodGhpcy5fY29udGFpbmVyLmxlbmd0aCA9PT0gNik7XG5cbiAgICBsZXQgdmFsOiBudW1iZXIgPSB0aGlzLl9jb250YWluZXIucG9wKCk7XG4gICAgY29uc29sZS5hc3NlcnQodmFsID49IDEgJiYgdmFsIDw9IDYpO1xuICAgIGNvbnNvbGUuYXNzZXJ0KHRoaXMuX2NvbnRhaW5lci5sZW5ndGggPT09IDUpO1xuXG4gICAgdmFsID0gdGhpcy5fY29udGFpbmVyLnBvcCgpO1xuICAgIGNvbnNvbGUuYXNzZXJ0KHZhbCA+PSAxICYmIHZhbCA8PSA2KTtcbiAgICBjb25zb2xlLmFzc2VydCh0aGlzLl9jb250YWluZXIubGVuZ3RoID09PSA0KTtcblxuICAgIHZhbCA9IHRoaXMuX2NvbnRhaW5lci5wb3AoKTtcbiAgICBjb25zb2xlLmFzc2VydCh2YWwgPj0gMSAmJiB2YWwgPD0gNik7XG4gICAgY29uc29sZS5hc3NlcnQodGhpcy5fY29udGFpbmVyLmxlbmd0aCA9PT0gMyk7XG5cbiAgICB2YWwgPSB0aGlzLl9jb250YWluZXIucG9wKCk7XG4gICAgY29uc29sZS5hc3NlcnQodmFsID49IDEgJiYgdmFsIDw9IDYpO1xuICAgIGNvbnNvbGUuYXNzZXJ0KHRoaXMuX2NvbnRhaW5lci5sZW5ndGggPT09IDIpO1xuXG4gICAgdmFsID0gdGhpcy5fY29udGFpbmVyLnBvcCgpO1xuICAgIGNvbnNvbGUuYXNzZXJ0KHZhbCA+PSAxICYmIHZhbCA8PSA2KTtcbiAgICBjb25zb2xlLmFzc2VydCh0aGlzLl9jb250YWluZXIubGVuZ3RoID09PSAxKTtcblxuICAgIHZhbCA9IHRoaXMuX2NvbnRhaW5lci5wb3AoKTtcbiAgICBjb25zb2xlLmFzc2VydCh2YWwgPj0gMSAmJiB2YWwgPD0gNik7XG4gICAgY29uc29sZS5hc3NlcnQodGhpcy5fY29udGFpbmVyLmxlbmd0aCA9PT0gMCk7XG5cbiAgICB2YWwgPSB0aGlzLl9jb250YWluZXIucG9wKCk7XG4gICAgY29uc29sZS5hc3NlcnQodmFsID09PSB1bmRlZmluZWQpO1xuICAgIGNvbnNvbGUuYXNzZXJ0KHRoaXMuX2NvbnRhaW5lci5sZW5ndGggPT09IDApO1xuICB9XG59XG5cbmNsYXNzIFRlc3RQcmlvcml0eVF1ZXVlIHtcbiAgcHJpdmF0ZSBfcHE6IFByaW9yaXR5UXVldWU8e30+O1xuXG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIGxldCB0ZXN0cyA9IFt0aGlzLnRlc3RfcHVzaCwgdGhpcy50ZXN0X3BvcCwgdGhpcy50ZXN0X3BvcExvd107XG4gICAgdGVzdHMuZm9yRWFjaCgodGVzdCkgPT4ge1xuICAgICAgdGhpcy5faW5pdCgpO1xuICAgICAgdGVzdC5iaW5kKHRoaXMpKCk7XG4gICAgfSwgdGhpcyk7XG4gIH1cblxuICBwcml2YXRlIF9pbml0KCk6IHZvaWQge1xuICAgIGZ1bmN0aW9uIGdldFgobm9kZToge1wieFwiLCBcInlcIn0pOiBudW1iZXIge1xuICAgICAgcmV0dXJuIG5vZGUueDtcbiAgICB9XG4gICAgZnVuY3Rpb24gZ2V0WShub2RlOiB7XCJ4XCIsIFwieVwifSk6IG51bWJlciB7XG4gICAgICByZXR1cm4gbm9kZS55O1xuICAgIH1cbiAgICB0aGlzLl9wcSA9IG5ldyBQcmlvcml0eVF1ZXVlKGdldFgsIGdldFkpO1xuICB9XG5cbiAgdGVzdF9wdXNoKCkge1xuICAgIGNvbnNvbGUubG9nKFwidGVzdF9wdXNoXCIpO1xuXG4gICAgY29uc29sZS5hc3NlcnQodGhpcy5fcHEubGVuZ3RoID09PSAwKTtcbiAgICB0aGlzLl9wcS5wdXNoKHtcInhcIjogMSwgXCJ5XCI6IDF9LCAxKTtcbiAgICBjb25zb2xlLmFzc2VydCh0aGlzLl9wcS5sZW5ndGggPT09IDEpO1xuICAgIHRoaXMuX3BxLnB1c2goe1wieFwiOiAwLCBcInlcIjogMX0sIDEpO1xuICAgIHRoaXMuX3BxLnB1c2goe1wieFwiOiAyLCBcInlcIjogMX0sIDEpO1xuICAgIHRoaXMuX3BxLnB1c2goe1wieFwiOiAxLCBcInlcIjogMH0sIDEpO1xuICAgIGNvbnNvbGUuYXNzZXJ0KHRoaXMuX3BxLmxlbmd0aCA9PT0gNCk7XG4gIH1cblxuICB0ZXN0X3BvcCgpIHtcbiAgICBjb25zb2xlLmxvZyhcInRlc3RfcG9wXCIpO1xuICAgIHRoaXMuX3BxLnB1c2goe1wieFwiOiAxLCBcInlcIjogMH0sIDEpO1xuICAgIHRoaXMuX3BxLnB1c2goe1wieFwiOiAxLCBcInlcIjogMX0sIDEpO1xuICAgIHRoaXMuX3BxLnB1c2goe1wieFwiOiAzLCBcInlcIjogMH0sIDIpO1xuICAgIHRoaXMuX3BxLnB1c2goe1wieFwiOiAzLCBcInlcIjogMX0sIDIpO1xuICAgIHRoaXMuX3BxLnB1c2goe1wieFwiOiAwLCBcInlcIjogMH0sIDEpO1xuICAgIHRoaXMuX3BxLnB1c2goe1wieFwiOiAwLCBcInlcIjogMn0sIDEpO1xuXG4gICAgLy8gUG9wIGhpZ2hlciBwcmlvcml0eSBmaXJzdC5cbiAgICBsZXQgaXRlbTAgPSB0aGlzLl9wcS5wb3AoKTtcbiAgICBsZXQgaXRlbTEgPSB0aGlzLl9wcS5wb3AoKTtcbiAgICBjb25zb2xlLmFzc2VydChpdGVtMFtcInhcIl0gPT09IDMgJiYgaXRlbTFbXCJ4XCJdID09PSAzKTtcbiAgICBjb25zb2xlLmFzc2VydChpdGVtMFtcInlcIl0gPT09IDAgfHwgaXRlbTFbXCJ5XCJdID09PSAwKTtcbiAgICBjb25zb2xlLmFzc2VydChpdGVtMFtcInlcIl0gPT09IDEgfHwgaXRlbTFbXCJ5XCJdID09PSAxKTtcbiAgICBjb25zb2xlLmFzc2VydCh0aGlzLl9wcS5sZW5ndGggPT09IDQpO1xuXG4gICAgLy8gUG9wIGxvd2VyIHByaW9yaXR5IG5leHQuXG4gICAgbGV0IGl0ZW0yID0gdGhpcy5fcHEucG9wKCk7XG4gICAgbGV0IGl0ZW0zID0gdGhpcy5fcHEucG9wKCk7XG4gICAgbGV0IGl0ZW00ID0gdGhpcy5fcHEucG9wKCk7XG4gICAgbGV0IGl0ZW01ID0gdGhpcy5fcHEucG9wKCk7XG4gICAgY29uc29sZS5hc3NlcnQoaXRlbTJbXCJ4XCJdIDwgMyk7XG4gICAgY29uc29sZS5hc3NlcnQoaXRlbTNbXCJ4XCJdIDwgMyk7XG4gICAgY29uc29sZS5hc3NlcnQoaXRlbTRbXCJ4XCJdIDwgMyk7XG4gICAgY29uc29sZS5hc3NlcnQoaXRlbTVbXCJ4XCJdIDwgMyk7XG4gICAgY29uc29sZS5hc3NlcnQodGhpcy5fcHEubGVuZ3RoID09PSAwKTtcblxuICAgIC8vIE5vbmUgbGVmdCB0byBwb3AuXG4gICAgbGV0IGl0ZW02ID0gdGhpcy5fcHEucG9wKCk7XG4gICAgY29uc29sZS5hc3NlcnQoaXRlbTYgPT09IHVuZGVmaW5lZCk7XG4gIH1cblxuICB0ZXN0X3BvcExvdygpIHtcbiAgICBjb25zb2xlLmxvZyhcInRlc3RfcG9wTG93XCIpO1xuICAgIHRoaXMuX3BxLnB1c2goe1wieFwiOiAyLCBcInlcIjogMH0sIDIpO1xuICAgIHRoaXMuX3BxLnB1c2goe1wieFwiOiAyLCBcInlcIjogMX0sIDIpO1xuICAgIHRoaXMuX3BxLnB1c2goe1wieFwiOiAxLCBcInlcIjogMH0sIDEpO1xuICAgIHRoaXMuX3BxLnB1c2goe1wieFwiOiAxLCBcInlcIjogMX0sIDEpO1xuICAgIHRoaXMuX3BxLnB1c2goe1wieFwiOiAzLCBcInlcIjogMH0sIDIpO1xuICAgIHRoaXMuX3BxLnB1c2goe1wieFwiOiAzLCBcInlcIjogMn0sIDIpO1xuXG4gICAgbGV0IGl0ZW0wID0gdGhpcy5fcHEucG9wTG93KCk7XG4gICAgbGV0IGl0ZW0xID0gdGhpcy5fcHEucG9wTG93KCk7XG4gICAgY29uc29sZS5hc3NlcnQoaXRlbTBbXCJ4XCJdID09PSAxICYmIGl0ZW0xW1wieFwiXSA9PT0gMSk7XG4gICAgY29uc29sZS5hc3NlcnQoaXRlbTBbXCJ5XCJdID09PSAwIHx8IGl0ZW0xW1wieVwiXSA9PT0gMCk7XG4gICAgY29uc29sZS5hc3NlcnQoaXRlbTBbXCJ5XCJdID09PSAxIHx8IGl0ZW0xW1wieVwiXSA9PT0gMSk7XG4gICAgY29uc29sZS5hc3NlcnQodGhpcy5fcHEubGVuZ3RoID09PSA0KTtcblxuICAgIGxldCBpdGVtMiA9IHRoaXMuX3BxLnBvcExvdygpO1xuICAgIGxldCBpdGVtMyA9IHRoaXMuX3BxLnBvcExvdygpO1xuICAgIGxldCBpdGVtNCA9IHRoaXMuX3BxLnBvcExvdygpO1xuICAgIGxldCBpdGVtNSA9IHRoaXMuX3BxLnBvcExvdygpO1xuICAgIGNvbnNvbGUuYXNzZXJ0KGl0ZW0yW1wieFwiXSA+IDEpO1xuICAgIGNvbnNvbGUuYXNzZXJ0KGl0ZW0zW1wieFwiXSA+IDEpO1xuICAgIGNvbnNvbGUuYXNzZXJ0KGl0ZW00W1wieFwiXSA+IDEpO1xuICAgIGNvbnNvbGUuYXNzZXJ0KGl0ZW01W1wieFwiXSA+IDEpO1xuICAgIGNvbnNvbGUuYXNzZXJ0KHRoaXMuX3BxLmxlbmd0aCA9PT0gMCk7XG5cbiAgICAvLyBOb25lIGxlZnQgdG8gcG9wLlxuICAgIGxldCBpdGVtNiA9IHRoaXMuX3BxLnBvcCgpO1xuICAgIGNvbnNvbGUuYXNzZXJ0KGl0ZW02ID09PSB1bmRlZmluZWQpO1xuICB9XG59XG5cbmNsYXNzIFByb2ZpbGVDb250YWluZXJzIHtcbiAgcHJpdmF0ZSBfY29udGFpbmVyO1xuXG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIGxldCB0ZXN0cyA9IFt0aGlzLnRlc3RUcml2aWFsU3RhY2ssIHRoaXMudGVzdFRyaXZpYWxRdWV1ZSwgdGhpcy50ZXN0U3RhY2ssIHRoaXMudGVzdFF1ZXVlXTtcbiAgICB0ZXN0cy5mb3JFYWNoKCh0ZXN0KSA9PiB7XG4gICAgICB0aGlzLl9pbml0KCk7XG4gICAgICB0ZXN0LmJpbmQodGhpcykoKTtcbiAgICB9LCB0aGlzKTtcbiAgfVxuXG4gIHByaXZhdGUgX2luaXQoKTogdm9pZCB7XG4gIH1cblxuICBtYW55UHVzaChjb250YWluZXIpOiB2b2lkIHtcbiAgICBjb25zb2xlLmFzc2VydChjb250YWluZXIubGVuZ3RoID09PSAwKTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IDEwMDAwMDsgaSsrKSB7XG4gICAgICBjb250YWluZXIucHVzaChpKTtcbiAgICB9XG4gICAgY29uc29sZS5hc3NlcnQoY29udGFpbmVyLmxlbmd0aCA9PT0gMTAwMDAwKTtcbiAgfVxuXG4gIG1hbnlQdXNoUG9wKGNvbnRhaW5lcik6IHZvaWQge1xuICAgIGNvbnNvbGUuYXNzZXJ0KGNvbnRhaW5lci5sZW5ndGggPT09IDApO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgMTAwMDAwOyBpKyspIHtcbiAgICAgIGNvbnRhaW5lci5wdXNoKGkpO1xuICAgIH1cbiAgICBjb25zb2xlLmFzc2VydChjb250YWluZXIubGVuZ3RoID09PSAxMDAwMDApO1xuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCAxMDAwMDAgLSAxOyBpKyspIHtcbiAgICAgIGNvbnRhaW5lci5wb3AoKTtcbiAgICB9XG4gICAgY29uc29sZS5hc3NlcnQoY29udGFpbmVyLmxlbmd0aCA9PT0gMSk7XG4gICAgbGV0IHZhbCA9IGNvbnRhaW5lci5wb3AoKTtcbiAgICBjb25zb2xlLmFzc2VydChjb250YWluZXIubGVuZ3RoID09PSAwKTtcbiAgICBjb25zb2xlLmFzc2VydCh2YWwgPT09IDAgfHwgdmFsID09PSAxMDAwMDAgLSAxKTtcbiAgfVxuXG4gIHRlc3RUcml2aWFsU3RhY2soKTogdm9pZCB7XG4gICAgY29uc29sZS5sb2coXCJ0ZXN0VHJpdmlhbFN0YWNrXCIpO1xuXG4gICAgbGV0IGNvbnRhaW5lciA9IG5ldyBUcml2aWFsU3RhY2soKTtcbiAgICBjb25zb2xlLnRpbWUoXCJtYW55UHVzaFwiKTtcbiAgICB0aGlzLm1hbnlQdXNoKGNvbnRhaW5lcik7XG4gICAgY29uc29sZS50aW1lRW5kKFwibWFueVB1c2hcIik7XG5cbiAgICBjb250YWluZXIgPSBuZXcgVHJpdmlhbFN0YWNrKCk7XG4gICAgY29uc29sZS50aW1lKFwibWFueVB1c2hQb3BcIik7XG4gICAgdGhpcy5tYW55UHVzaFBvcChjb250YWluZXIpO1xuICAgIGNvbnNvbGUudGltZUVuZChcIm1hbnlQdXNoUG9wXCIpO1xuICB9XG5cbiAgdGVzdFRyaXZpYWxRdWV1ZSgpOiB2b2lkIHtcbiAgICBjb25zb2xlLmxvZyhcInRlc3RUcml2aWFsUXVldWVcIik7XG5cbiAgICBsZXQgY29udGFpbmVyID0gbmV3IFRyaXZpYWxRdWV1ZSgpO1xuICAgIGNvbnNvbGUudGltZShcIm1hbnlQdXNoXCIpO1xuICAgIHRoaXMubWFueVB1c2goY29udGFpbmVyKTtcbiAgICBjb25zb2xlLnRpbWVFbmQoXCJtYW55UHVzaFwiKTtcblxuICAgIGNvbnRhaW5lciA9IG5ldyBUcml2aWFsUXVldWUoKTtcbiAgICBjb25zb2xlLnRpbWUoXCJtYW55UHVzaFBvcFwiKTtcbiAgICB0aGlzLm1hbnlQdXNoUG9wKGNvbnRhaW5lcik7XG4gICAgY29uc29sZS50aW1lRW5kKFwibWFueVB1c2hQb3BcIik7XG4gIH1cblxuICB0ZXN0U3RhY2soKTogdm9pZCB7XG4gICAgY29uc29sZS5sb2coXCJ0ZXN0U3RhY2tcIik7XG5cbiAgICBsZXQgY29udGFpbmVyID0gbmV3IE15U3RhY2soMTAwMDAwMCk7XG4gICAgY29uc29sZS50aW1lKFwibWFueVB1c2hcIik7XG4gICAgdGhpcy5tYW55UHVzaChjb250YWluZXIpO1xuICAgIGNvbnNvbGUudGltZUVuZChcIm1hbnlQdXNoXCIpO1xuXG4gICAgY29udGFpbmVyID0gbmV3IE15U3RhY2soMTAwMDAwMCk7XG4gICAgY29uc29sZS50aW1lKFwibWFueVB1c2hQb3BcIik7XG4gICAgdGhpcy5tYW55UHVzaFBvcChjb250YWluZXIpO1xuICAgIGNvbnNvbGUudGltZUVuZChcIm1hbnlQdXNoUG9wXCIpO1xuICB9XG5cbiAgdGVzdFF1ZXVlKCk6IHZvaWQge1xuICAgIGNvbnNvbGUubG9nKFwidGVzdFF1ZXVlXCIpO1xuXG4gICAgbGV0IGNvbnRhaW5lciA9IG5ldyBNeVF1ZXVlKCk7XG4gICAgY29uc29sZS50aW1lKFwibWFueVB1c2hcIik7XG4gICAgdGhpcy5tYW55UHVzaChjb250YWluZXIpO1xuICAgIGNvbnNvbGUudGltZUVuZChcIm1hbnlQdXNoXCIpO1xuXG4gICAgY29udGFpbmVyID0gbmV3IE15UXVldWUoKTtcbiAgICBjb25zb2xlLnRpbWUoXCJtYW55UHVzaFBvcFwiKTtcbiAgICB0aGlzLm1hbnlQdXNoUG9wKGNvbnRhaW5lcik7XG4gICAgY29uc29sZS50aW1lRW5kKFwibWFueVB1c2hQb3BcIik7XG4gIH1cblxufVxuIl19
