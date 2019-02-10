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
        let nursery = new Nursery(this._scene, 15, 15);
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
                    tree = nursery.getTree(x, y);
                }
                else if (cell.vegetation > 50) {
                    tree = nursery.getShrub(x, y);
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
        nursery.dispose();
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
class Nursery {
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
    dispose() {
        this.trees.forEach((tree) => { tree.dispose(); });
        this.shrubs.forEach((shrub) => { shrub.dispose(); });
    }
    getTree(x, y) {
        let treeTypeIndex = Math.round(Math.random() * (this.trees.length - 1));
        let species = this.trees[treeTypeIndex];
        return species.clone(species.name + "_" + x + "_" + y);
    }
    getShrub(x, y) {
        let shrubTypeIndex = Math.round(Math.random() * (this.shrubs.length - 1));
        let species = this.shrubs[shrubTypeIndex];
        return species.clone(species.name + "_" + x + "_" + y);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvZ2FtZS50cyIsInNyYy9wbGFudEdlbmVyYXRvci50cyIsInNyYy9wcmlvcml0eVF1ZXVlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUEsd0RBQXdEO0FBQ3hELHlDQUF5QztBQUN6Qyx3Q0FBd0M7QUFFeEMsSUFBSSxTQUFTLEdBQUcsU0FBUyxDQUFDO0FBQzFCLElBQUksR0FBRyxHQUFHLGFBQWEsQ0FBQztBQUN4QixJQUFJLEtBQUssR0FBRyxHQUFHLENBQUM7QUFDaEIsSUFBSSxlQUFlLEdBQUcsSUFBSSxDQUFDO0FBQzNCLElBQUksaUJBQWlCLEdBQUcsQ0FBQyxDQUFDO0FBRTFCLElBQUksYUFBYSxHQUFhLEVBQUUsQ0FBQztBQUNqQyxTQUFTLFlBQVksQ0FBQyxHQUFXLEVBQUUsR0FBVyxFQUFFLElBQVM7SUFDdkQsR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDLENBQUM7SUFDZixHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsQ0FBQztJQUVmLElBQUksYUFBYSxDQUFDLElBQUksQ0FBQyxLQUFLLFNBQVMsRUFBRTtRQUNyQyxhQUFhLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO0tBQ3JDO0lBRUQsT0FBTyxHQUFHLEdBQUcsYUFBYSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQyxDQUFDO0FBQ2pELENBQUM7QUFrQkQsU0FBUyxVQUFVLENBQUMsS0FBWTtJQUM5QixJQUFJLFNBQVMsR0FBRyxFQUFFLEdBQUcsS0FBSyxDQUFDLENBQUMsR0FBRyxHQUFHLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQztJQUM3QyxJQUFJLEtBQUssQ0FBQyxTQUFTLEtBQUssU0FBUyxFQUFFO1FBQ2pDLFNBQVMsSUFBSSxHQUFHLEdBQUcsS0FBSyxDQUFDLFNBQVMsQ0FBQztLQUNwQztJQUNELE9BQU8s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QUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN4QixPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQzdDLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3hCLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDN0MsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDeEIsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQztJQUMvQyxDQUFDO0lBRUQsUUFBUTtRQUNOLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUM7UUFFeEIsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQztRQUM3QyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN4QixJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN4QixJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN4QixJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN4QixPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBRTdDLElBQUksR0FBRyxHQUFXLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDeEMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDMUIsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQztRQUU3QyxHQUFHLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUM1QixHQUFHLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUM1QixHQUFHLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUM1QixPQUFPLENBQUMsTUFBTSxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUMxQixPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBRTdDLEdBQUcsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQzVCLE9BQU8sQ0FBQyxNQUFNLENBQUMsR0FBRyxLQUFLLFNBQVMsQ0FBQyxDQUFDO1FBQ2xDLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFDL0MsQ0FBQztDQUNGO0FBRUQsTUFBTSxXQUFXO0lBR2Y7UUFDRSxJQUFJLEtBQUssR0FBRyxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQzVDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRTtZQUNyQixJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDYixJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7UUFDcEIsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ1gsQ0FBQztJQUVPLEtBQUs7UUFDWCxJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksT0FBTyxFQUFFLENBQUM7SUFDbEMsQ0FBQztJQUVELFNBQVM7UUFDUCxPQUFPLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBRXpCLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDN0MsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDeEIsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQztRQUM3QyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN4QixPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQzdDLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3hCLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFDL0MsQ0FBQztJQUVELFFBQVE7UUFDTixPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBRXhCLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDN0MsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDeEIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDeEIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDeEIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDeEIsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQztRQUU3QyxJQUFJLEdBQUcsR0FBVyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQ3hDLE9BQU8sQ0FBQyxNQUFNLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQzFCLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFFN0MsR0FBRyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDNUIsR0FBRyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDNUIsR0FBRyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDNUIsT0FBTyxDQUFDLE1BQU0sQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDMUIsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQztRQUU3QyxHQUFHLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUM1QixPQUFPLENBQUMsTUFBTSxDQUFDLEdBQUcsS0FBSyxTQUFTLENBQUMsQ0FBQztRQUNsQyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDO0lBQy9DLENBQUM7Q0FDRjtBQUVELE1BQU0sU0FBUztJQUdiO1FBQ0UsSUFBSSxLQUFLLEdBQUcsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDekUsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFO1lBQ3JCLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNiLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztRQUNwQixDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDWCxDQUFDO0lBRU8sS0FBSztRQUNYLFNBQVMsSUFBSSxDQUFDLElBQWdCO1lBQzVCLE9BQU8sSUFBSSxDQUFDLENBQUMsQ0FBQztRQUNoQixDQUFDO1FBQ0QsU0FBUyxJQUFJLENBQUMsSUFBZ0I7WUFDNUIsT0FBTyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ2hCLENBQUM7UUFDRCxJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksS0FBSyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztJQUMxQyxDQUFDO0lBRUQsUUFBUTtRQUNOLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUM7UUFFeEIsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQztRQUM3QyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3pDLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDN0MsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN6QyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3pDLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDN0MsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN6QyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQzdDLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDekMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQztRQUM3QyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3pDLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDN0MsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN6QyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQzdDLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDekMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQztJQUMvQyxDQUFDO0lBRUQsUUFBUTtRQUNOLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUM7UUFFeEIsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQztRQUM3QyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3pDLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDekMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN6QyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3pDLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDekMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN6QyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBRTdDLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQzVELE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQzVELE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQzVELE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQzVELE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQzVELE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQzVELE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUMsQ0FBQyxLQUFLLFNBQVMsQ0FBQyxDQUFDO0lBQ3RFLENBQUM7SUFFRCxRQUFRO1FBQ04sT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUV4QixPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQzdDLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDekMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN6QyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3pDLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDekMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN6QyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3pDLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFFN0MsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDNUQsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQztRQUM3QyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFDLENBQUMsS0FBSyxTQUFTLENBQUMsQ0FBQztRQUNwRSxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQzdDLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQzVELE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUMsQ0FBQyxLQUFLLFNBQVMsQ0FBQyxDQUFDO1FBQ3BFLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQzVELE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQzVELE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQzVELE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQzVELE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUMsQ0FBQyxLQUFLLFNBQVMsQ0FBQyxDQUFDO1FBQ3BFLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFDL0MsQ0FBQztJQUVELFFBQVE7UUFDTixPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBRXhCLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDN0MsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN6QyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3pDLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDekMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN6QyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3pDLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDekMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQztRQUU3QyxJQUFJLEdBQUcsR0FBVyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQ3hDLE9BQU8sQ0FBQyxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDckMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQztRQUU3QyxHQUFHLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUM1QixPQUFPLENBQUMsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ3JDLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFFN0MsR0FBRyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDNUIsT0FBTyxDQUFDLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUNyQyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBRTdDLEdBQUcsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQzVCLE9BQU8sQ0FBQyxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDckMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQztRQUU3QyxHQUFHLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUM1QixPQUFPLENBQUMsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ3JDLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFFN0MsR0FBRyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDNUIsT0FBTyxDQUFDLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUNyQyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBRTdDLEdBQUcsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQzVCLE9BQU8sQ0FBQyxNQUFNLENBQUMsR0FBRyxLQUFLLFNBQVMsQ0FBQyxDQUFDO1FBQ2xDLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFDL0MsQ0FBQztDQUNGO0FBRUQsTUFBTSxpQkFBaUI7SUFHckI7UUFDRSxJQUFJLEtBQUssR0FBRyxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDOUQsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFO1lBQ3JCLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNiLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztRQUNwQixDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDWCxDQUFDO0lBRU8sS0FBSztRQUNYLFNBQVMsSUFBSSxDQUFDLElBQWdCO1lBQzVCLE9BQU8sSUFBSSxDQUFDLENBQUMsQ0FBQztRQUNoQixDQUFDO1FBQ0QsU0FBUyxJQUFJLENBQUMsSUFBZ0I7WUFDNUIsT0FBTyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ2hCLENBQUM7UUFDRCxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksYUFBYSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztJQUMzQyxDQUFDO0lBRUQsU0FBUztRQUNQLE9BQU8sQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUM7UUFFekIsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQztRQUN0QyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ25DLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDdEMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNuQyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ25DLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDbkMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQztJQUN4QyxDQUFDO0lBRUQsUUFBUTtRQUNOLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDeEIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNuQyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxF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SSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNuQyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ25DLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDbkMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNuQyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRW5DLElBQUksS0FBSyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDOUIsSUFBSSxLQUFLLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUM5QixPQUFPLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksS0FBSyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQ3JELE9BQU8sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxLQUFLLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDckQsT0FBTyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLEtBQUssQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFD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Y2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsIi8vLzxyZWZlcmVuY2UgcGF0aD1cIjNyZFBhcnR5L2JhYnlsb24uZ3VpLm1vZHVsZS5kLnRzXCIgLz5cbi8vLzxyZWZlcmVuY2UgcGF0aD1cInBsYW50R2VuZXJhdG9yLnRzXCIgLz5cbi8vLzxyZWZlcmVuY2UgcGF0aD1cInByaW9yaXR5UXVldWUudHNcIiAvPlxuXG5sZXQgU0NFTkVQQVRIID0gXCJzY2VuZXMvXCI7XG5sZXQgRk9YID0gXCJmb3guYmFieWxvblwiO1xubGV0IFNDQUxFID0gMTAwO1xubGV0IEFOSU1fTUVSR0VfUkFURSA9IDAuMDU7XG5sZXQgU0NFTkVSWV9SRUNVUlNJT04gPSA4O1xuXG5sZXQgcmFuZG9tTnVtYmVyczogbnVtYmVyW10gPSBbXTtcbmZ1bmN0aW9uIHNlZWRlZFJhbmRvbShtYXg6IG51bWJlciwgbWluOiBudW1iZXIsIHNlZWQ6IGFueSkgOiBudW1iZXIge1xuICBtYXggPSBtYXggfHwgMTtcbiAgbWluID0gbWluIHx8IDA7XG5cbiAgaWYgKHJhbmRvbU51bWJlcnNbc2VlZF0gPT09IHVuZGVmaW5lZCkge1xuICAgIHJhbmRvbU51bWJlcnNbc2VlZF0gPSBNYXRoLnJhbmRvbSgpO1xuICB9XG5cbiAgcmV0dXJuIG1pbiArIHJhbmRvbU51bWJlcnNbc2VlZF0gKiAobWF4IC0gbWluKTtcbn1cblxuaW50ZXJmYWNlIEFuaW1hdGVSZXF1ZXN0IHtcbiAgbmFtZTogc3RyaW5nO1xuICBsb29wOiBib29sZWFuO1xuICByZXZlcnNlZDogYm9vbGVhbjtcbiAgZGlydHk/OiBib29sZWFuO1xuICBydW5Db3VudD86IG51bWJlcjtcbiAgYW5pbWF0aW9uPzogQkFCWUxPTi5BbmltYXRhYmxlO1xuICBjbGVhbnVwPzogYm9vbGVhbjtcbn1cblxuaW50ZXJmYWNlIENvb3JkIHtcbiAgeDogbnVtYmVyO1xuICB5OiBudW1iZXI7XG4gIHJlY3Vyc2lvbj86IG51bWJlcjtcbn1cblxuZnVuY3Rpb24gY29vcmRUb0tleShjb29yZDogQ29vcmQpOiBzdHJpbmcge1xuICBsZXQgcmV0dXJuVmFsID0gXCJcIiArIGNvb3JkLnggKyBcIl9cIiArIGNvb3JkLnk7XG4gIGlmIChjb29yZC5yZWN1cnNpb24gIT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVyblZhbCArPSBcIl9cIiArIGNvb3JkLnJlY3Vyc2lvbjtcbiAgfVxuICByZXR1cm4gcmV0dXJuVmFsO1xufVxuXG5mdW5jdGlvbiBrZXlUb0Nvb3JkKGtleTogc3RyaW5nKTogQ29vcmQge1xuICBsZXQgcGFyYW1zID0ga2V5LnNwbGl0KFwiX1wiKTtcbiAgbGV0IHJldHVyblZhbDogQ29vcmQ7XG4gIHJldHVyblZhbC54ID0gTnVtYmVyKHBhcmFtc1swXSk7XG4gIHJldHVyblZhbC55ID0gTnVtYmVyKHBhcmFtc1sxXSk7XG4gIGlmIChwYXJhbXMubGVuZ3RoID4gMikge1xuICAgIHJldHVyblZhbC5yZWN1cnNpb24gPSBOdW1iZXIocGFyYW1zWzJdKTtcbiAgfVxuICByZXR1cm4gcmV0dXJuVmFsO1xufVxuXG5mdW5jdGlvbiBnZXRYKG5vZGU6IHtcInhcIiwgXCJ5XCJ9KTogbnVtYmVyIHtcbiAgcmV0dXJuIG5vZGUueDtcbn1cbmZ1bmN0aW9uIGdldFkobm9kZToge1wieFwiLCBcInlcIn0pOiBudW1iZXIge1xuICByZXR1cm4gbm9kZS55O1xufVxuZnVuY3Rpb24gZ2V0UmVjdXJzaW9uKG5vZGU6IHtcInhcIiwgXCJ5XCIsIFwicmVjdXJzaW9uXCJ9KTogbnVtYmVyIHtcbiAgcmV0dXJuIG5vZGUucmVjdXJzaW9uO1xufVxuXG4vKiBEb24ndCBib3RoZXIgZG9pbmcgdGhlIHNxdWFyZSByb290IG9mIFB5dGhhZ29yYXMuIFVzZWZ1bCBmb3IgY29tcGFyaW5nIGRpc3RhbmNlcy4gKi9cbmZ1bmN0aW9uIGRpc3RCZXR3ZWVuKGE6IENvb3JkLCBiOiBDb29yZCk6IG51bWJlciB7XG4gIC8vcmV0dXJuIE1hdGguYWJzKGEueCAtIGIueCkgKiBNYXRoLmFicyhhLnggLSBiLngpICsgTWF0aC5hYnMoYS55IC0gYi55KSAqIE1hdGguYWJzKGEueSAtIGIueSk7XG4gIHJldHVybiBNYXRoLnJvdW5kKDEuNSAqIE1hdGguc3FydCgoYS54IC0gYi54KSAqIChhLnggLSBiLngpICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAoYS55IC0gYi55KSAqIChhLnkgLSBiLnkpKSk7XG59XG5cbmNsYXNzIFN0YXIge1xuICBwcml2YXRlIF9zY2VuZTogQkFCWUxPTi5TY2VuZTtcbiAgcHJpdmF0ZSBfc2NlbmVyeTogU2NlbmVyeTtcbiAgcHJpdmF0ZSBfaGVhZGluZzogbnVtYmVyO1xuICBwcml2YXRlIF9oZWFkaW5nRGlmZjogbnVtYmVyO1xuICBwcml2YXRlIF9zcGVlZDogbnVtYmVyO1xuICBwcml2YXRlIF9zcGVlZE1heDogbnVtYmVyO1xuICBwcml2YXRlIF9oZWlnaHREaWZmOiBudW1iZXI7XG4gIHByaXZhdGUgX2RlYnVnVGltZXI6IG51bWJlcjtcbiAgcHJpdmF0ZSBfbmV4dFVwZGF0ZTogbnVtYmVyO1xuICBwcml2YXRlIF90aWNrOiBudW1iZXI7XG5cbiAgbWVzaDogQkFCWUxPTi5NZXNoO1xuXG4gIGNvbnN0cnVjdG9yKHNjZW5lOiBCQUJZTE9OLlNjZW5lLCBzY2VuZXJ5OiBTY2VuZXJ5KSB7XG4gICAgdGhpcy5fc2NlbmUgPSBzY2VuZTtcbiAgICB0aGlzLl9zY2VuZXJ5ID0gc2NlbmVyeTtcbiAgICB0aGlzLl9oZWFkaW5nID0gMDtcbiAgICB0aGlzLl9oZWFkaW5nRGlmZiA9IDAuMDAxO1xuICAgIHRoaXMuX3NwZWVkID0gMTA7XG4gICAgdGhpcy5fc3BlZWRNYXggPSAxMDtcbiAgICB0aGlzLl9oZWlnaHREaWZmID0gMDtcblxuICAgIHZhciBnbCA9IG5ldyBCQUJZTE9OLkdsb3dMYXllcihcImdsb3dcIiwgdGhpcy5fc2NlbmUpO1xuXG4gICAgbGV0IHB5cmFtaWRBID1cbiAgICAgIEJBQllMT04uTWVzaEJ1aWxkZXIuQ3JlYXRlUG9seWhlZHJvbihcInB5cmFtaWRBXCIsIHt0eXBlOiAwLCBzaXplOiAxfSwgdGhpcy5fc2NlbmUpO1xuICAgIGxldCBweXJhbWlkQiA9XG4gICAgICBCQUJZTE9OLk1lc2hCdWlsZGVyLkNyZWF0ZVBvbHloZWRyb24oXCJweXJhbWlkQlwiLCB7dHlwZTogMCwgc2l6ZTogMX0sIHRoaXMuX3NjZW5lKTtcbiAgICBweXJhbWlkQi5yb3RhdGUoQkFCWUxPTi5BeGlzLlksIE1hdGguUEkpO1xuXG4gICAgbGV0IHN0YXJNYXRlcmlhbFcgPSBuZXcgQkFCWUxPTi5TdGFuZGFyZE1hdGVyaWFsKFwic3Rhck1hdGVyaWFsV1wiLCB0aGlzLl9zY2VuZSk7XG4gICAgc3Rhck1hdGVyaWFsVy5lbWlzc2l2ZUNvbG9yID0gbmV3IEJBQllMT04uQ29sb3IzKDEsIDEsIDEpO1xuICAgIGxldCBzdGFyTWF0ZXJpYWxZID0gbmV3IEJBQllMT04uU3RhbmRhcmRNYXRlcmlhbChcInN0YXJNYXRlcmlhbFlcIiwgdGhpcy5fc2NlbmUpO1xuICAgIHN0YXJNYXRlcmlhbFkuZW1pc3NpdmVDb2xvciA9IG5ldyBCQUJZTE9OLkNvbG9yMygwLjUsIDEsIDEpO1xuXG4gICAgcHlyYW1pZEEubWF0ZXJpYWwgPSBzdGFyTWF0ZXJpYWxXO1xuICAgIHB5cmFtaWRCLm1hdGVyaWFsID0gc3Rhck1hdGVyaWFsWTtcblxuICAgIHRoaXMubWVzaCA9IEJBQllMT04uTWVzaC5DcmVhdGVCb3goXCJzdGFyXCIsIDEsIHRoaXMuX3NjZW5lKTtcbiAgICB0aGlzLm1lc2guaXNWaXNpYmxlID0gZmFsc2U7XG4gICAgcHlyYW1pZEEucGFyZW50ID0gdGhpcy5tZXNoO1xuICAgIHB5cmFtaWRCLnBhcmVudCA9IHRoaXMubWVzaDtcblxuICAgIHRoaXMuX3NjZW5lLnJlZ2lzdGVyQmVmb3JlUmVuZGVyKCgpID0+IHtcbiAgICAgIHRoaXMucmFuZG9tV2FsaygpO1xuICAgIH0pO1xuICB9XG5cbiAgcmFuZG9tV2FsaygpIDogdm9pZCB7XG4gICAgbGV0IHRpbWUgPSBNYXRoLnJvdW5kKG5ldyBEYXRlKCkuZ2V0VGltZSgpIC8gMTAwMCk7XG4gICAgbGV0IGZwcyA9IHRoaXMuX3NjZW5lLmdldEVuZ2luZSgpLmdldEZwcygpO1xuXG4gICAgLy8gTGV0IGZwcyBzdGFiaWxpc2UgYWZ0ZXIgbWlzc2luZyBzY3JlZW4gdXBkYXRlcyBkdWUgdG8gaW5hY3RpdmUgYnJvd3NlciB0YWIuXG4gICAgaWYgKHRpbWUgLSB0aGlzLl90aWNrID4gMSkge1xuICAgICAgdGhpcy5fbmV4dFVwZGF0ZSA9IHRpbWUgKyAyO1xuICAgIH1cbiAgICBpZiAodGhpcy5fdGljayAhPT0gdGltZSkge1xuICAgICAgdGhpcy5fdGljayA9IHRpbWU7XG4gICAgfVxuXG4gICAgaWYgKGZwcyA8PSAwIHx8IHRoaXMuX25leHRVcGRhdGUgPiB0aW1lKSB7XG4gICAgICBjb25zb2xlLmxvZyhcIkxpbWl0aW5nIHN0YXIgbW92ZW1lbnQuXCIsIHRoaXMuX25leHRVcGRhdGUsIHRpbWUpO1xuICAgICAgZnBzID0gNjA7XG4gICAgfSBlbHNlIGlmIChmcHMgPiA2MCkge1xuICAgICAgZnBzID0gNjA7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX25leHRVcGRhdGUgPSB0aW1lO1xuICAgIH1cblxuICAgIGxldCBjZWxsSGVpZ2h0ID1cbiAgICAgIHRoaXMuX3NjZW5lcnkuZ2V0SGVpZ2h0V29ybGQoe3g6IHRoaXMubWVzaC5wb3NpdGlvbi54LCB5OiB0aGlzLm1lc2gucG9zaXRpb24uen0pIHx8IDA7XG4gICAgdGhpcy5faGVpZ2h0RGlmZiA9IChjZWxsSGVpZ2h0IC0gdGhpcy5tZXNoLnBvc2l0aW9uLnkpIC8gMyArIDE7XG5cbiAgICBsZXQgZGlzdGFuY2VUb01hcENlbnRlciA9IE1hdGguYWJzKHRoaXMubWVzaC5wb3NpdGlvbi54KSArIE1hdGguYWJzKHRoaXMubWVzaC5wb3NpdGlvbi56KTtcbiAgICBsZXQgYW5nbGVUb01hcENlbnRlciA9IChcbiAgICAgIE1hdGguYXRhbjIodGhpcy5tZXNoLnBvc2l0aW9uLngsIHRoaXMubWVzaC5wb3NpdGlvbi56KSArIE1hdGguUEkpICUgKDIgKiBNYXRoLlBJKTtcblxuICAgIGxldCBhbmdsZURpZmYgPSBhbmdsZVRvTWFwQ2VudGVyIC0gdGhpcy5faGVhZGluZztcbiAgICBsZXQgYmlhc1RvQ2VudGVyID0gMDtcbiAgICBpZiAoYW5nbGVEaWZmIDw9IE1hdGguUEkpIHtcbiAgICAgIGJpYXNUb0NlbnRlciA9IChhbmdsZURpZmYgPCAwKSA/IC0wLjAwMDEgOiAwLjAwMDE7XG4gICAgfSBlbHNlIHtcbiAgICAgIGJpYXNUb0NlbnRlciA9IChhbmdsZURpZmYgPiAwKSA/IC0wLjAwMDEgOiAwLjAwMDE7XG4gICAgfVxuICAgIGJpYXNUb0NlbnRlciAqPSAoNjAgLyBmcHMpO1xuICAgIGJpYXNUb0NlbnRlciAqPSBkaXN0YW5jZVRvTWFwQ2VudGVyIC8gMTA7XG5cbiAgICB0aGlzLl9oZWFkaW5nRGlmZiAvPSAoMS4wMSAqIDYwIC8gZnBzKTtcbiAgICB0aGlzLl9oZWFkaW5nRGlmZiArPSBiaWFzVG9DZW50ZXI7XG4gICAgdGhpcy5faGVhZGluZ0RpZmYgKz0gKE1hdGgucmFuZG9tKCkgLSAwLjUpIC8gZnBzO1xuICAgIHRoaXMudHVybih0aGlzLl9oZWFkaW5nRGlmZik7XG4gICAgdGhpcy5tb3ZlRm9yd2FyZHMoZnBzKTtcblxuICAgIGlmICh0aW1lICUgNjAgPT09IDAgJiYgdGltZSAhPT0gdGhpcy5fZGVidWdUaW1lcikge1xuICAgICAgY29uc29sZS5sb2codGhpcy5tZXNoLnBvc2l0aW9uLngsIHRoaXMubWVzaC5wb3NpdGlvbi55LCB0aGlzLm1lc2gucG9zaXRpb24ueik7XG4gICAgICB0aGlzLl9kZWJ1Z1RpbWVyID0gdGltZTtcbiAgICB9XG4gIH1cblxuICBtb3ZlRm9yd2FyZHMoZnBzOiBudW1iZXIpIDogdm9pZCB7XG4gICAgdGhpcy5tZXNoLnBvc2l0aW9uLnggKz0gdGhpcy5fc3BlZWQgKiBNYXRoLnNpbih0aGlzLl9oZWFkaW5nKSAvIGZwcztcbiAgICB0aGlzLm1lc2gucG9zaXRpb24ueiArPSB0aGlzLl9zcGVlZCAqIE1hdGguY29zKHRoaXMuX2hlYWRpbmcpIC8gZnBzO1xuXG4gICAgdGhpcy5tZXNoLnBvc2l0aW9uLnkgKz0gdGhpcy5fc3BlZWQgKiB0aGlzLl9oZWlnaHREaWZmIC8gKDIgKiBmcHMpO1xuICB9XG5cbiAgdHVybihhbmdsZTogbnVtYmVyKSA6IHZvaWQge1xuICAgIHRoaXMuX2hlYWRpbmcgKz0gYW5nbGU7XG4gICAgaWYgKHRoaXMuX2hlYWRpbmcgPCAwKSB7XG4gICAgICB0aGlzLl9oZWFkaW5nICs9IDIgKiBNYXRoLlBJO1xuICAgIH1cbiAgICBpZiAodGhpcy5faGVhZGluZyA+IDIgKiBNYXRoLlBJKSB7XG4gICAgICB0aGlzLl9oZWFkaW5nIC09IDIgKiBNYXRoLlBJO1xuICAgIH1cbiAgfVxuXG4gIG1vZGlmeVNwZWVkKGRpZmY6IG51bWJlcikgOiB2b2lkIHtcbiAgICB0aGlzLl9zcGVlZCArPSBkaWZmO1xuICAgIGlmICh0aGlzLl9zcGVlZCA8IDApIHtcbiAgICAgIHRoaXMuX3NwZWVkID0gMDtcbiAgICB9XG4gICAgaWYgKHRoaXMuX3NwZWVkID4gdGhpcy5fc3BlZWRNYXgpIHtcbiAgICAgIHRoaXMuX3NwZWVkID0gdGhpcy5fc3BlZWRNYXg7XG4gICAgfVxuICB9XG59XG5cbmNsYXNzIENoYXJhY3RlciB7XG4gIHByaXZhdGUgX3NjZW5lOiBCQUJZTE9OLlNjZW5lO1xuICBwcml2YXRlIF9zaGFkZG93czogQkFCWUxPTi5TaGFkb3dHZW5lcmF0b3I7XG4gIHByaXZhdGUgX21lc2g6IEJBQllMT04uTWVzaDtcbiAgcHJpdmF0ZSBfc2tlbGV0b246IEJBQllMT04uU2tlbGV0b247XG4gIHByaXZhdGUgX2JvbmVzOiB7W2lkOiBzdHJpbmddIDogQkFCWUxPTi5Cb25lfTtcbiAgcHJpdmF0ZSBfb25Mb2FkZWQ6ICgpID0+IHZvaWQ7XG4gIHByaXZhdGUgX2xvb2tBdDogQkFCWUxPTi5WZWN0b3IzO1xuICBwcml2YXRlIF9sb29rQXROZWNrOiBCQUJZTE9OLlZlY3RvcjM7XG4gIHByaXZhdGUgX2xvb2tDdHJsSGVhZDogQkFCWUxPTi5Cb25lTG9va0NvbnRyb2xsZXI7XG4gIHByaXZhdGUgX2xvb2tDdHJsTmVjazogQkFCWUxPTi5Cb25lTG9va0NvbnRyb2xsZXI7XG4gIHByaXZhdGUgX2FuaW1hdGlvbnM6IHtbaWQ6IHN0cmluZ10gOiBCQUJZTE9OLkFuaW1hdGlvblJhbmdlfTtcbiAgcHJpdmF0ZSBfYW5pbWF0aW9uUXVldWU6IEFuaW1hdGVSZXF1ZXN0W107XG4gIHByaXZhdGUgX2FuaW1hdGlvbkN1cnJlbnQ6IEFuaW1hdGVSZXF1ZXN0O1xuICBwcml2YXRlIF9hbmltYXRpb25MYXN0OiBBbmltYXRlUmVxdWVzdDtcbiAgcHJpdmF0ZSBfYW5pbWF0aW9uT2JzZXJ2YWJsZTogQkFCWUxPTi5PYnNlcnZlcjxCQUJZTE9OLlNjZW5lPjtcblxuICBwb3NpdGlvbjogQkFCWUxPTi5WZWN0b3IzO1xuICByb3RhdGlvbjogQkFCWUxPTi5WZWN0b3IzO1xuXG4gIGNvbnN0cnVjdG9yKHNjZW5lOiBCQUJZTE9OLlNjZW5lLFxuICAgICAgICAgICAgICBzaGFkZG93czogQkFCWUxPTi5TaGFkb3dHZW5lcmF0b3IsXG4gICAgICAgICAgICAgIGZpbGVuYW1lOiBzdHJpbmcsXG4gICAgICAgICAgICAgIG9uTG9hZGVkPzogKCkgPT4gdm9pZCkge1xuICAgIGNvbnNvbGUubG9nKFwiQ3JlYXRpbmcgQ2hhcmFjdGVyIGZyb20gXCIgKyBmaWxlbmFtZSk7XG4gICAgdGhpcy5fc2NlbmUgPSBzY2VuZTtcbiAgICB0aGlzLl9zaGFkZG93cyA9IHNoYWRkb3dzO1xuICAgIHRoaXMuX29uTG9hZGVkID0gb25Mb2FkZWQ7XG4gICAgdGhpcy5fYm9uZXMgPSB7fTtcbiAgICB0aGlzLl9sb29rQXROZWNrID0gbmV3IEJBQllMT04uVmVjdG9yMygwLCAwLCAwKTtcbiAgICB0aGlzLl9hbmltYXRpb25zID0ge307XG4gICAgdGhpcy5fYW5pbWF0aW9uUXVldWUgPSBbXTtcbiAgICBCQUJZTE9OLlNjZW5lTG9hZGVyLkltcG9ydE1lc2goXCJcIiwgU0NFTkVQQVRILCBmaWxlbmFtZSwgdGhpcy5fc2NlbmUsIHRoaXMub25TY2VuZUxvYWQuYmluZCh0aGlzKSk7XG4gIH1cblxuICBvblNjZW5lTG9hZChtZXNoZXM6IEJBQllMT04uTWVzaFtdLCBwYXJ0aWNsZVN5c3RlbXM6IFtdLCBza2VsZXRvbnM6IEJBQllMT04uU2tlbGV0b25bXSkgOiB2b2lkIHtcbiAgICB0cnkge1xuICAgICAgY29uc29sZS5hc3NlcnQobWVzaGVzLmxlbmd0aCA9PT0gMSk7XG4gICAgICBjb25zb2xlLmFzc2VydChwYXJ0aWNsZVN5c3RlbXMubGVuZ3RoID09PSAwKTtcbiAgICAgIGNvbnNvbGUuYXNzZXJ0KHNrZWxldG9ucy5sZW5ndGggPT09IDEpO1xuXG4gICAgICB0aGlzLl9tZXNoID0gbWVzaGVzWzBdO1xuICAgICAgdGhpcy5fc2tlbGV0b24gPSBza2VsZXRvbnNbMF07XG5cbiAgICAgIC8vIHRoaXMuX21lc2guaXNWaXNpYmxlID0gZmFsc2U7XG5cbiAgICAgIHRoaXMucG9zaXRpb24gPSB0aGlzLl9tZXNoLnBvc2l0aW9uO1xuICAgICAgdGhpcy5yb3RhdGlvbiA9IHRoaXMuX21lc2gucm90YXRpb247XG4gICAgICAvL3RoaXMuX21lc2guc2NhbGluZyA9IG5ldyBCQUJZTE9OLlZlY3RvcjMoU0NBTEUsIFNDQUxFLCBTQ0FMRSk7XG4gICAgICAvL3RoaXMuX21lc2gucmVjZWl2ZVNoYWRvd3MgPSB0cnVlO1xuICAgICAgLy90aGlzLl9tZXNoLmNvbnZlcnRUb0ZsYXRTaGFkZWRNZXNoKCk7XG5cbiAgICAgIHRoaXMuX21lc2gubWF0ZXJpYWwuek9mZnNldCA9IC0gMTAwO1xuXG4gICAgICBpZiAodGhpcy5fc2hhZGRvd3MpIHtcbiAgICAgICAgdGhpcy5fc2hhZGRvd3MuZ2V0U2hhZG93TWFwKCkucmVuZGVyTGlzdC5wdXNoKHRoaXMuX21lc2gpO1xuICAgICAgfVxuXG4gICAgICAgIC8qbGV0IHNrZWxldG9uVmlld2VyID0gbmV3IEJBQllMT04uRGVidWcuU2tlbGV0b25WaWV3ZXIodGhpcy5fc2tlbGV0b24sIHRoaXMuX21lc2gsIHRoaXMuX3NjZW5lKTtcbiAgICAgIHNrZWxldG9uVmlld2VyLmlzRW5hYmxlZCA9IHRydWU7IC8vIEVuYWJsZSBpdFxuICAgICAgc2tlbGV0b25WaWV3ZXIuY29sb3IgPSBCQUJZTE9OLkNvbG9yMy5SZWQoKTsgLy8gQ2hhbmdlIGRlZmF1bHQgY29sb3IgZnJvbSB3aGl0ZSB0byByZWQqL1xuXG4gICAgICAvLyBQYXJzZSBhbGwgYm9uZXMgYW5kIHN0b3JlIGFueSB3ZSBuZWVkIGxhdGVyIGZvciBmdXR1cmUgYWNjZXNzLlxuICAgICAgZm9yIChsZXQgaW5kZXggPSAwOyBpbmRleCA8IHRoaXMuX3NrZWxldG9uLmJvbmVzLmxlbmd0aDsgaW5kZXgrKykge1xuICAgICAgICBsZXQgYm9uZSA9IHNrZWxldG9uc1swXS5ib25lc1tpbmRleF07XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKGJvbmUudW5pcXVlSWQsIGJvbmUuaWQpO1xuICAgICAgICBzd2l0Y2ggKGJvbmUuaWQpIHtcbiAgICAgICAgICBjYXNlIFwic3BpbmUuaGVhZFwiOlxuICAgICAgICAgICAgdGhpcy5fYm9uZXMuaGVhZCA9IGJvbmU7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBjYXNlIFwic3BpbmUubmVja1wiOlxuICAgICAgICAgICAgdGhpcy5fYm9uZXMubmVjayA9IGJvbmU7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBjYXNlIFwic3BpbmUudXBwZXJcIjpcbiAgICAgICAgICAgIHRoaXMuX2JvbmVzLnNwaW5ldXBwZXIgPSBib25lO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgY2FzZSBcInNwaW5lLnBvaW50XCI6XG4gICAgICAgICAgICB0aGlzLl9ib25lcy5oZWFkUG9pbnQgPSBib25lO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gQW5pbWF0aW9uc1xuICAgICAgZm9yIChsZXQgYSA9IDA7IGEgPCB0aGlzLl9za2VsZXRvbi5nZXRBbmltYXRpb25SYW5nZXMoKS5sZW5ndGg7IGErKykge1xuICAgICAgICBsZXQgYW5pbWF0aW9uID0gdGhpcy5fc2tlbGV0b24uZ2V0QW5pbWF0aW9uUmFuZ2VzKClbYV07XG4gICAgICAgIC8vY29uc29sZS5sb2coYSwgYW5pbWF0aW9uLm5hbWUpO1xuICAgICAgICB0aGlzLl9hbmltYXRpb25zW2FuaW1hdGlvbi5uYW1lXSA9IHRoaXMuX3NrZWxldG9uLmdldEFuaW1hdGlvblJhbmdlcygpW2FdO1xuICAgICAgfVxuICAgICAgdGhpcy5fYW5pbWF0aW9uUXVldWUucHVzaCh7bmFtZTogXCJ3YWxrXCIsIGxvb3A6IHRydWUsIHJldmVyc2VkOiBmYWxzZX0pO1xuXG4gICAgICB0aGlzLl9sb29rQ3RybEhlYWQgPSBuZXcgQkFCWUxPTi5Cb25lTG9va0NvbnRyb2xsZXIoXG4gICAgICAgIHRoaXMuX21lc2gsXG4gICAgICAgIHRoaXMuX2JvbmVzLmhlYWQsXG4gICAgICAgIHRoaXMuX2xvb2tBdCxcbiAgICAgICAge2FkanVzdFBpdGNoOiBNYXRoLlBJIC8gMn1cbiAgICAgICk7XG4gICAgICB0aGlzLl9sb29rQ3RybE5lY2sgPSBuZXcgQkFCWUxPTi5Cb25lTG9va0NvbnRyb2xsZXIoXG4gICAgICAgIHRoaXMuX21lc2gsXG4gICAgICAgIHRoaXMuX2JvbmVzLm5lY2ssXG4gICAgICAgIHRoaXMuX2xvb2tBdE5lY2ssXG4gICAgICAgIHthZGp1c3RQaXRjaDogTWF0aC5QSSAvIDJ9XG4gICAgICApO1xuXG4gICAgICAvLyBQZXJpb2RpYyB1cGRhdGVzLlxuICAgICAgdGhpcy5fc2NlbmUucmVnaXN0ZXJCZWZvcmVSZW5kZXIoKCkgPT4ge1xuICAgICAgICBpZiAoISB0aGlzLnBvc2l0aW9uLmVxdWFscyh0aGlzLl9tZXNoLnBvc2l0aW9uKSkge1xuICAgICAgICAgIHRoaXMuX21lc2gucG9zaXRpb24ueCA9IHRoaXMucG9zaXRpb24ueDtcbiAgICAgICAgICB0aGlzLl9tZXNoLnBvc2l0aW9uLnkgPSB0aGlzLnBvc2l0aW9uLnk7XG4gICAgICAgICAgdGhpcy5fbWVzaC5wb3NpdGlvbi56ID0gdGhpcy5wb3NpdGlvbi56O1xuICAgICAgICB9XG4gICAgICAgIGlmICghIHRoaXMucm90YXRpb24uZXF1YWxzKHRoaXMuX21lc2gucm90YXRpb24pKSB7XG4gICAgICAgICAgdGhpcy5fbWVzaC5yb3RhdGlvbi54ID0gdGhpcy5yb3RhdGlvbi54O1xuICAgICAgICAgIHRoaXMuX21lc2gucm90YXRpb24ueSA9IHRoaXMucm90YXRpb24ueTtcbiAgICAgICAgICB0aGlzLl9tZXNoLnJvdGF0aW9uLnogPSB0aGlzLnJvdGF0aW9uLno7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLl9wbGF5QW5pbWF0aW9uKCk7XG4gICAgICB9KTtcblxuICAgICAgaWYgKHRoaXMuX29uTG9hZGVkKSB7XG4gICAgICAgIHRoaXMuX29uTG9hZGVkKCk7XG4gICAgICB9XG5cbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgLy8gUHJldmVudCBlcnJvciBtZXNzYWdlcyBpbiB0aGlzIHNlY3Rpb24gZ2V0dGluZyBzd2FsbG93ZWQgYnkgQmFieWxvbi5cbiAgICAgIGNvbnNvbGUuZXJyb3IoZXJyb3IpO1xuICAgIH1cbiAgfVxuXG4gIGxvb2tBdCh0YXJnZXQ6IEJBQllMT04uVmVjdG9yMykgOiB2b2lkIHtcbiAgICB0aGlzLl9sb29rQXQgPSB0YXJnZXQ7XG5cbiAgICB0aGlzLl9zY2VuZS5yZWdpc3RlckJlZm9yZVJlbmRlcihmdW5jdGlvbigpIHtcbiAgICAgIC8vIFRoZSBuZWNrIHNob3VsZCBwaW50IGhhbGYgd2F5IGJldHdlZW4gc3RyYWlnaHQgZm9yd2FyZCBhbmQgdGhlXG4gICAgICAvLyBkaXJlY3Rpb24gdGhlIGhlYWQgaXMgcG9pbnRpbmcuXG4gICAgICBsZXQgc3BpbmVVcHBlciA9IHRoaXMuX2JvbmVzLnNwaW5ldXBwZXI7XG5cbiAgICAgIGxldCB0YXJnZXRMb2NhbCA9IHNwaW5lVXBwZXIuZ2V0TG9jYWxQb3NpdGlvbkZyb21BYnNvbHV0ZSh0YXJnZXQsIHRoaXMuX21lc2gpO1xuICAgICAgbGV0IHRhcmdldExvY2FsWFkgPSBuZXcgQkFCWUxPTi5WZWN0b3IzKHRhcmdldExvY2FsLngsIHRhcmdldExvY2FsLnksIDApO1xuICAgICAgbGV0IHRhcmdldExvY2FsWVogPSBuZXcgQkFCWUxPTi5WZWN0b3IzKDAsIHRhcmdldExvY2FsLnksIHRhcmdldExvY2FsLnopO1xuICAgICAgbGV0IGFoZWFkTG9jYWwgPSBuZXcgQkFCWUxPTi5WZWN0b3IzKDAsIHRhcmdldExvY2FsLmxlbmd0aCgpLCAwKTsgIC8vIChsL3IsIGYvYiwgdS9kKVxuXG4gICAgICBsZXQgYW5nbGVYWSA9IEJBQllMT04uVmVjdG9yMy5HZXRBbmdsZUJldHdlZW5WZWN0b3JzKFxuICAgICAgICB0YXJnZXRMb2NhbFhZLCBhaGVhZExvY2FsLCBuZXcgQkFCWUxPTi5WZWN0b3IzKDAsIDAsIDEpKTtcbiAgICAgIGxldCBhbmdsZVlaID0gQkFCWUxPTi5WZWN0b3IzLkdldEFuZ2xlQmV0d2VlblZlY3RvcnMoXG4gICAgICAgIHRhcmdldExvY2FsWVosIGFoZWFkTG9jYWwsIG5ldyBCQUJZTE9OLlZlY3RvcjMoLSAxLCAwLCAwKSk7XG5cbiAgICAgIGxldCBsb29rQXROZWNrTG9jYWwgPVxuICAgICAgICBuZXcgQkFCWUxPTi5WZWN0b3IzKE1hdGguc2luKGFuZ2xlWFkgLyAyKSAqIHRhcmdldExvY2FsWFkubGVuZ3RoKCksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKE1hdGguY29zKGFuZ2xlWFkgLyAyKSAqIHRhcmdldExvY2FsWFkubGVuZ3RoKCkgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBNYXRoLmNvcyhhbmdsZVlaIC8gMikgKiB0YXJnZXRMb2NhbFlaLmxlbmd0aCgpKSAvIDIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgTWF0aC5zaW4oYW5nbGVZWiAvIDIpICogdGFyZ2V0TG9jYWxZWi5sZW5ndGgoKSk7XG4gICAgICBzcGluZVVwcGVyLmdldEFic29sdXRlUG9zaXRpb25Gcm9tTG9jYWxUb1JlZihsb29rQXROZWNrTG9jYWwsIHRoaXMuX21lc2gsIHRoaXMuX2xvb2tBdE5lY2spO1xuXG4gICAgICBpZiAoYW5nbGVYWSA+IC1NYXRoLlBJIC8gMiAmJiBhbmdsZVhZIDwgTWF0aC5QSSAvIDIgJiZcbiAgICAgICAgIGFuZ2xlWVogPiAtTWF0aC5QSSAvIDIgJiYgYW5nbGVZWiA8IE1hdGguUEkgLyAyKSB7XG4gICAgICAgIC8vIE9ubHkgbG9vayBhdCB0aGluZyBpZiBpdCdzIG5vdCBiZWhpbmQgdXMuXG4gICAgICAgIC8vdGhpcy5fbG9va0N0cmxOZWNrLnVwZGF0ZSgpO1xuICAgICAgICAvL3RoaXMuX2xvb2tDdHJsSGVhZC51cGRhdGUoKTtcbiAgICAgICAgdGhpcy5fYm9uZXMubmVjay5yb3RhdGUoQkFCWUxPTi5BeGlzLlosIC1hbmdsZVhZIC8gMiwgQkFCWUxPTi5TcGFjZS5MT0NBTCk7XG4gICAgICAgIHRoaXMuX2JvbmVzLm5lY2sucm90YXRlKEJBQllMT04uQXhpcy5YLCBhbmdsZVlaIC8gMywgQkFCWUxPTi5TcGFjZS5MT0NBTCk7XG4gICAgICAgIHRoaXMuX2JvbmVzLm5lY2sucm90YXRlKEJBQllMT04uQXhpcy5ZLCAtYW5nbGVZWiAqIGFuZ2xlWFkgLyAoMiAqIE1hdGguUEkpLCBCQUJZTE9OLlNwYWNlLkxPQ0FMKTtcblxuICAgICAgICB0aGlzLl9ib25lcy5oZWFkLnJvdGF0ZShCQUJZTE9OLkF4aXMuWiwgLWFuZ2xlWFkgLyAyLCBCQUJZTE9OLlNwYWNlLkxPQ0FMKTtcbiAgICAgICAgdGhpcy5fYm9uZXMuaGVhZC5yb3RhdGUoQkFCWUxPTi5BeGlzLlgsIGFuZ2xlWVogLyAzLCBCQUJZTE9OLlNwYWNlLkxPQ0FMKTtcbiAgICAgICAgdGhpcy5fYm9uZXMuaGVhZC5yb3RhdGUoQkFCWUxPTi5BeGlzLlksIC1hbmdsZVlaICogYW5nbGVYWSAvICgyICogTWF0aC5QSSksIEJBQllMT04uU3BhY2UuTE9DQUwpO1xuICAgICAgfVxuICAgIH0uYmluZCh0aGlzKSk7XG4gIH1cblxuICAvKiBBZGQgYW5pbWF0aW9uIHRvIHRoZSBsaXN0IHRvIGJlIHBsYXllZC4gKi9cbiAgcXVldWVBbmltYXRpb24oYW5pbWF0ZVJlcXVlc3Q6IEFuaW1hdGVSZXF1ZXN0KSA6IHZvaWQge1xuICAgIHRoaXMuX2FuaW1hdGlvblF1ZXVlLnB1c2goYW5pbWF0ZVJlcXVlc3QpO1xuICB9XG5cbiAgLyogUHVsbCBuZXcgYW5pbWF0aW9ucyBmcm9tIHF1ZXVlIGFuZCBjbGVhbiB1cCBmaW5pc2hlZCBhbmltYXRpb25zLlxuICAgKlxuICAgKiBXaGVuIF9hbmltYXRpb25DdXJyZW50IGhhcyBlbmRlZCwgY2hlY2sgX2FuaW1hdGlvblF1ZXVlIGZvciBuZXh0IGFuaW1hdGlvbi5cbiAgICogSWYgX2FuaW1hdGlvbkxhc3QuY2xlYW51cCBpcyBzZXQsIHN0b3AgdGhlIGFuaW1hdGlvbiBhbmQgZGVsZXRlLlxuICAgKi9cbiAgcHJpdmF0ZSBfcGxheUFuaW1hdGlvbigpIDogdm9pZCB7XG4gICAgaWYgKHRoaXMuX2FuaW1hdGlvbkxhc3QgPT09IHVuZGVmaW5lZCAmJiB0aGlzLl9hbmltYXRpb25RdWV1ZS5sZW5ndGggPiAwKSB7XG4gICAgICB0aGlzLl9hbmltYXRpb25MYXN0ID0gdGhpcy5fYW5pbWF0aW9uQ3VycmVudDtcbiAgICAgIHRoaXMuX2FuaW1hdGlvbkN1cnJlbnQgPSB0aGlzLl9hbmltYXRpb25RdWV1ZS5zaGlmdCgpO1xuICAgICAgY29uc29sZS5sb2coXCJOZXc6IFwiICsgdGhpcy5fYW5pbWF0aW9uQ3VycmVudC5uYW1lKTtcbiAgICAgIHRoaXMuX2FuaW1hdGlvbkN1cnJlbnQucnVuQ291bnQgPSAwO1xuICAgIH1cbiAgICB0aGlzLl9zZXJ2aWNlQW5pbWF0aW9uKHRoaXMuX2FuaW1hdGlvbkN1cnJlbnQsIHRydWUpO1xuICAgIHRoaXMuX3NlcnZpY2VBbmltYXRpb24odGhpcy5fYW5pbWF0aW9uTGFzdCwgZmFsc2UpO1xuXG4gICAgaWYgKHRoaXMuX2FuaW1hdGlvbkxhc3QgJiYgdGhpcy5fYW5pbWF0aW9uTGFzdC5jbGVhbnVwKSB7XG4gICAgICB0aGlzLl9hbmltYXRpb25MYXN0LmFuaW1hdGlvbi5zdG9wKCk7XG4gICAgICB0aGlzLl9hbmltYXRpb25MYXN0LmFuaW1hdGlvbiA9IHVuZGVmaW5lZDtcbiAgICAgIHRoaXMuX2FuaW1hdGlvbkxhc3QgPSB1bmRlZmluZWQ7XG4gICAgfVxuICB9XG5cbiAgLyogVXBkYXRlIGFuIEFuaW1hdGVSZXF1ZXN0LlxuICAgKlxuICAgKiBUaGlzIHdpbGwgYmUgY2FsbGVkIHBlcmlvZGljYWxseSBmb3IgYW55IGFjdGl2ZSBBbmltYXRlUmVxdWVzdC5cbiAgICogSWYgaXQgaXMgdGhlIGZpcnN0IHRpbWUgdGhpcyBpcyBydW4gZm9yIGFuIEFuaW1hdGVSZXF1ZXN0IHRoZSBhbmltYXRpb25cbiAgICogd2lsbCBiZSBzdGFydGVkIGFuZCBnaXZlbiBncmVhdGVyIHdlaWdodCBlYWNoIHRpbWUgdGhpcyBtZXRob2QgaXMgY2FsbGVkXG4gICAqIHRoZXJlYWZ0ZXIuXG4gICAqIEFyZ3M6XG4gICAqICAgYW5pbWF0ZVJlcXVlc3Q6IFRoZSBBbmltYXRlUmVxdWVzdCBvYmplY3QgdG8gYWN0IHVwb24uXG4gICAqICAgY3VycmVudDogSWYgdHJ1ZSwgdGhlIGFuaW1hdGlvbiB3ZWlnaHQgd2lsbCBiZSBpbmNyZWFzZWQgd2l0aCBlYWNoIGNhbGxcbiAgICogICAgICh0byBhIG1hdmltdW0gdmFsdWUgb2YgMSkuXG4gICAqICAgICBJZiBmYWxzZSwgdGhlIGFuaW1hdGlvbiB3ZWlnaHQgd2lsbCBiZSBkZWNyZWFzZWQgd2l0aCBlYWNoIGNhbGwgdW50aWxcbiAgICogICAgIGl0IHJlYWNoZXMgMCBhdCB3aGljaCB0aW1lIHRoZSBhbmltYXRpb24gd2lsbCBiZSBzdG9wcGVkIGFuZFxuICAgKiAgICAgQW5pbWF0ZVJlcXVlc3QuY2xlYW51cCB3aWxsIGJlIHNldC5cbiAgICovXG4gIHByaXZhdGUgX3NlcnZpY2VBbmltYXRpb24oYW5pbWF0ZVJlcXVlc3Q6IEFuaW1hdGVSZXF1ZXN0LCBjdXJyZW50OiBib29sZWFuKSA6IHZvaWQge1xuICAgIGlmIChhbmltYXRlUmVxdWVzdCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgbGV0IHdlaWdodCA9IGFuaW1hdGVSZXF1ZXN0LnJ1bkNvdW50ID8gYW5pbWF0ZVJlcXVlc3QuYW5pbWF0aW9uLndlaWdodCA6IDA7XG4gICAgaWYgKGN1cnJlbnQgJiYgd2VpZ2h0IDwgMSkge1xuICAgICAgd2VpZ2h0ICs9IEFOSU1fTUVSR0VfUkFURTtcbiAgICAgIHdlaWdodCA9IE1hdGgubWluKDEsIHdlaWdodCk7XG4gICAgfSBlbHNlIGlmICghY3VycmVudCAmJiB3ZWlnaHQgPiAwKSB7XG4gICAgICB3ZWlnaHQgLT0gQU5JTV9NRVJHRV9SQVRFO1xuICAgICAgd2VpZ2h0ID0gTWF0aC5tYXgoMCwgd2VpZ2h0KTtcbiAgICB9XG5cbiAgICBpZiAoYW5pbWF0ZVJlcXVlc3QuYW5pbWF0aW9uKSB7XG4gICAgICBhbmltYXRlUmVxdWVzdC5hbmltYXRpb24ud2VpZ2h0ID0gd2VpZ2h0O1xuICAgIH1cblxuICAgIGlmICh3ZWlnaHQgPD0gMCkge1xuICAgICAgLy8gVGhpcyBvbGQgQW5pbWF0ZVJlcXVlc3QgaGFzIGJlZW4gZmFkZWQgb3V0IGFuZCBuZWVkcyBzdG9wcGVkIGFuZCByZW1vdmVkLlxuICAgICAgYW5pbWF0ZVJlcXVlc3QuY2xlYW51cCA9IHRydWU7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKGFuaW1hdGVSZXF1ZXN0LmRpcnR5ID09PSBmYWxzZSkge1xuICAgICAgLy8gTm90aGluZyBtb3JlIHRvIGRvLlxuICAgICAgLy8gQW5pbWF0aW9ucyB3aGljaCBlbmQgc2V0IGFuaW1hdGVSZXF1ZXN0LmRpcnR5IHRvIHRydWUgd2hlbiB0aGV5IG5lZWRcbiAgICAgIC8vIHRoaXMgbWV0aG9kIHRvIGNvbnRpbnVlIHBhc3QgdGhpcyBwb2ludC5cbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBjb25zb2xlLmxvZyhhbmltYXRlUmVxdWVzdC5uYW1lLCB3ZWlnaHQsIGN1cnJlbnQpO1xuXG4gICAgaWYgKGFuaW1hdGVSZXF1ZXN0LnJ1bkNvdW50ICYmICFhbmltYXRlUmVxdWVzdC5sb29wICYmIGFuaW1hdGVSZXF1ZXN0LnJldmVyc2VkKSB7XG4gICAgICAvLyBGcmVlemUgZnJhbWUgYXQgZmlyc3QgZnJhbWUgaW4gc2VxdWVuY2UuXG4gICAgICBhbmltYXRlUmVxdWVzdC5hbmltYXRpb24uc3RvcCgpO1xuICAgICAgYW5pbWF0ZVJlcXVlc3QuYW5pbWF0aW9uID0gdGhpcy5fc2NlbmUuYmVnaW5XZWlnaHRlZEFuaW1hdGlvbihcbiAgICAgICAgdGhpcy5fc2tlbGV0b24sXG4gICAgICAgIHRoaXMuX2FuaW1hdGlvbnNbYW5pbWF0ZVJlcXVlc3QubmFtZV0uZnJvbSArIDIsXG4gICAgICAgIHRoaXMuX2FuaW1hdGlvbnNbYW5pbWF0ZVJlcXVlc3QubmFtZV0uZnJvbSArIDIsXG4gICAgICAgIHdlaWdodCxcbiAgICAgICAgZmFsc2UsXG4gICAgICAgIDAuMDEsXG4gICAgICAgIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGFuaW1hdGVSZXF1ZXN0LmRpcnR5ID0gdHJ1ZTtcbiAgICAgICAgfS5iaW5kKHRoaXMpXG4gICAgICApO1xuICAgIH0gZWxzZSBpZiAoYW5pbWF0ZVJlcXVlc3QucnVuQ291bnQgJiYgIWFuaW1hdGVSZXF1ZXN0Lmxvb3ApIHtcbiAgICAgIC8vIEZyZWV6ZSBmcmFtZSBhdCBsYXN0IGZyYW1lIGluIHNlcXVlbmNlLlxuICAgICAgYW5pbWF0ZVJlcXVlc3QuYW5pbWF0aW9uLnN0b3AoKTtcbiAgICAgIGFuaW1hdGVSZXF1ZXN0LmFuaW1hdGlvbiA9IHRoaXMuX3NjZW5lLmJlZ2luV2VpZ2h0ZWRBbmltYXRpb24oXG4gICAgICAgIHRoaXMuX3NrZWxldG9uLFxuICAgICAgICB0aGlzLl9hbmltYXRpb25zW2FuaW1hdGVSZXF1ZXN0Lm5hbWVdLnRvLFxuICAgICAgICB0aGlzLl9hbmltYXRpb25zW2FuaW1hdGVSZXF1ZXN0Lm5hbWVdLnRvLFxuICAgICAgICB3ZWlnaHQsXG4gICAgICAgIGZhbHNlLFxuICAgICAgICAwLjAxLFxuICAgICAgICBmdW5jdGlvbigpIHtcbiAgICAgICAgICBhbmltYXRlUmVxdWVzdC5kaXJ0eSA9IHRydWU7XG4gICAgICAgIH0uYmluZCh0aGlzKVxuICAgICAgKTtcbiAgICB9IGVsc2UgaWYgKGFuaW1hdGVSZXF1ZXN0LnJldmVyc2VkKSB7XG4gICAgICAvLyBQbGF5IGFuIGFuaW1hdGlvbiBpbiByZXZlcnNlLlxuICAgICAgYW5pbWF0ZVJlcXVlc3QuYW5pbWF0aW9uID0gdGhpcy5fc2NlbmUuYmVnaW5XZWlnaHRlZEFuaW1hdGlvbihcbiAgICAgICAgdGhpcy5fc2tlbGV0b24sXG4gICAgICAgIHRoaXMuX2FuaW1hdGlvbnNbYW5pbWF0ZVJlcXVlc3QubmFtZV0udG8sXG4gICAgICAgIHRoaXMuX2FuaW1hdGlvbnNbYW5pbWF0ZVJlcXVlc3QubmFtZV0uZnJvbSArIDIsXG4gICAgICAgIHdlaWdodCxcbiAgICAgICAgZmFsc2UsXG4gICAgICAgIDEsXG4gICAgICAgIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGFuaW1hdGVSZXF1ZXN0LmRpcnR5ID0gdHJ1ZTtcbiAgICAgICAgfS5iaW5kKHRoaXMpXG4gICAgICApO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBQbGF5IGFuIGFuaW1hdGlvbi5cbiAgICAgIGFuaW1hdGVSZXF1ZXN0LmFuaW1hdGlvbiA9IHRoaXMuX3NjZW5lLmJlZ2luV2VpZ2h0ZWRBbmltYXRpb24oXG4gICAgICAgIHRoaXMuX3NrZWxldG9uLFxuICAgICAgICB0aGlzLl9hbmltYXRpb25zW2FuaW1hdGVSZXF1ZXN0Lm5hbWVdLmZyb20gKyAyLFxuICAgICAgICB0aGlzLl9hbmltYXRpb25zW2FuaW1hdGVSZXF1ZXN0Lm5hbWVdLnRvLFxuICAgICAgICB3ZWlnaHQsXG4gICAgICAgIGZhbHNlLFxuICAgICAgICAxLFxuICAgICAgICBmdW5jdGlvbigpIHtcbiAgICAgICAgICBhbmltYXRlUmVxdWVzdC5kaXJ0eSA9IHRydWU7XG4gICAgICAgIH0uYmluZCh0aGlzKVxuICAgICAgKTtcbiAgICB9XG5cbiAgICBhbmltYXRlUmVxdWVzdC5kaXJ0eSA9IGZhbHNlO1xuICAgIGFuaW1hdGVSZXF1ZXN0LnJ1bkNvdW50Kys7XG4gIH1cbn1cblxuY2xhc3MgTWFwQ2VsbCBpbXBsZW1lbnRzIENvb3JkIHtcbiAgeDogbnVtYmVyO1xuICB5OiBudW1iZXI7XG4gIHJlY3Vyc2lvbjogbnVtYmVyO1xuICB2ZWdldGF0aW9uOiBudW1iZXI7XG4gIG1heEhlaWdodDogbnVtYmVyO1xuICBtaW5IZWlnaHQ6IG51bWJlcjtcbiAgcGF0aFNjb3JlOiBudW1iZXI7XG5cbiAgY29uc3RydWN0b3IoY29vcmQ6IENvb3JkLCB2ZWdldGF0aW9uOiBudW1iZXIpIHtcbiAgICB0aGlzLnggPSBjb29yZC54O1xuICAgIHRoaXMueSA9IGNvb3JkLnk7XG4gICAgdGhpcy5yZWN1cnNpb24gPSBjb29yZC5yZWN1cnNpb247XG4gICAgdGhpcy52ZWdldGF0aW9uID0gdmVnZXRhdGlvbjtcbiAgfVxuXG4gIHBhcmVudENvb3JkaW5hdGVzKGRlcHRoOiBudW1iZXIpIDogQ29vcmQge1xuICAgIGxldCBwWCA9IDA7XG4gICAgbGV0IHBZID0gMDtcbiAgICBmb3IgKGxldCBiaXQgPSBkZXB0aCAtIDE7IGJpdCA+PSBkZXB0aCAtIHRoaXMucmVjdXJzaW9uICsgMTsgYml0LS0pIHtcbiAgICAgIGxldCBtYXNrID0gMSA8PCBiaXQ7XG4gICAgICBpZiAobWFzayAmIHRoaXMueCkge1xuICAgICAgICBwWCB8PSBtYXNrO1xuICAgICAgfVxuICAgICAgaWYgKG1hc2sgJiB0aGlzLnkpIHtcbiAgICAgICAgcFkgfD0gbWFzaztcbiAgICAgIH1cbiAgICAgIC8vY29uc29sZS5sb2coYml0LCBtYXNrLCBwWCwgcFkpO1xuICAgIH1cblxuICAgIHJldHVybiB7eDogcFgsIHk6IHBZLCByZWN1cnNpb246IHRoaXMucmVjdXJzaW9uIC0gMX07XG4gIH1cbn1cblxuY2xhc3MgU2NlbmVyeSB7XG4gIHByaXZhdGUgX3NjZW5lOiBCQUJZTE9OLlNjZW5lO1xuICBwcml2YXRlIF9zaGFkZG93czogQkFCWUxPTi5TaGFkb3dHZW5lcmF0b3I7XG4gIHByaXZhdGUgX2dyb3VuZDogQkFCWUxPTi5NZXNoO1xuICBwcml2YXRlIF9tYXBTaXplOiBudW1iZXI7XG4gIHByaXZhdGUgX21heFJlY3Vyc2lvbjogbnVtYmVyO1xuICBwcml2YXRlIF90cmVlUmVjdXJzaW9uOiBudW1iZXI7XG4gIHByaXZhdGUgX2NlbGxzOiBNeU1hcDxDb29yZCwgTWFwQ2VsbD47XG4gIHByaXZhdGUgX2dyb3VuZENvdmVyVHlwZXM6IEJBQllMT04uU3RhbmRhcmRNYXRlcmlhbFtdO1xuICBwcml2YXRlIF9ncm91bmRDb3Zlcjoge1trZXk6IHN0cmluZ106IGJvb2xlYW59O1xuICBwcml2YXRlIF90cmVlU3BlY2llczogbnVtYmVyO1xuICBwcml2YXRlIHJlYWRvbmx5IF9tYXBTcGFjaW5nOiBudW1iZXIgPSAxO1xuICBwcml2YXRlIHJlYWRvbmx5IF90cmVlU2NhbGU6IG51bWJlciA9IDIwMDtcbiAgcHJpdmF0ZSByZWFkb25seSBfdHJlZVNlZWRWYWx1ZTogbnVtYmVyID0gNzU7XG4gIHByaXZhdGUgcmVhZG9ubHkgX2hlYWRyb29tOiBudW1iZXIgPSAyO1xuXG4gIGNvbnN0cnVjdG9yKHNjZW5lOiBCQUJZTE9OLlNjZW5lLFxuICAgICAgICAgICAgICBzaGFkZG93czogQkFCWUxPTi5TaGFkb3dHZW5lcmF0b3IsXG4gICAgICAgICAgICAgIGdyb3VuZDogQkFCWUxPTi5NZXNoLFxuICAgICAgICAgICAgICBzaXplOiBudW1iZXIpIHtcbiAgICBjb25zb2xlLmxvZyhcIk1lc2ggY291bnQgYmVmb3JlIGNyZWF0aW5nIHNjZW5lcnk6ICVjXCIgK1xuICAgICAgICAgICAgICAgIHNjZW5lLm1lc2hlcy5sZW5ndGgudG9TdHJpbmcoKSxcbiAgICAgICAgICAgICAgICBcImJhY2tncm91bmQ6IG9yYW5nZTsgY29sb3I6IHdoaXRlXCIpO1xuICAgIHRoaXMuX3NjZW5lID0gc2NlbmU7XG4gICAgdGhpcy5fc2hhZGRvd3MgPSBzaGFkZG93cztcbiAgICB0aGlzLl9ncm91bmQgPSBncm91bmQ7XG4gICAgdGhpcy5fZ3JvdW5kQ292ZXIgPSB7fTtcbiAgICB0aGlzLl9tYXBTaXplID0gc2l6ZTtcbiAgICB0aGlzLl9tYXhSZWN1cnNpb24gPSBNYXRoLmZsb29yKE1hdGgubG9nKHRoaXMuX21hcFNpemUpIC8gTWF0aC5sb2coMikpO1xuICAgIHRoaXMuX3RyZWVSZWN1cnNpb24gPSB0aGlzLl9tYXhSZWN1cnNpb24gLSAzO1xuXG4gICAgY29uc29sZS5hc3NlcnQoTWF0aC5wb3coMiwgdGhpcy5fbWF4UmVjdXJzaW9uKSA9PT0gdGhpcy5fbWFwU2l6ZSAmJlxuICAgICAgICAgICAgICAgICAgIEJvb2xlYW4oXCJNYXAgc2l6ZSBpcyBub3QgYSBwb3dlciBvZiAyLlwiKSk7XG5cbiAgICB0aGlzLl9jZWxscyA9IG5ldyBNeU1hcDxDb29yZCwgTWFwQ2VsbD4oZ2V0WCwgZ2V0WSwgZ2V0UmVjdXJzaW9uKTtcblxuICAgIHRoaXMuX3NldFZlZ2V0YXRpb25IZWlnaHRzKCk7XG4gICAgdGhpcy5fcGxhbnRUcmVlcygpO1xuXG4gICAgLy90aGlzLl9zaGFkZG93cy5nZXRTaGFkb3dNYXAoKS5yZW5kZXJMaXN0LnB1c2godGhpcy5fdHJlZXMpO1xuICB9XG5cbiAgLy8gQXNzaWduIFwidmVnZXRhdGlvblwiIHZhbHVlcyB0byBtYXAgY2VsbHMgd2hpY2ggZGljdGF0ZXMgaG93IGxhcmdlIHBsYW50cyBhcmUuXG4gIHByaXZhdGUgX3NldFZlZ2V0YXRpb25IZWlnaHRzKCkge1xuICAgIGZvciAobGV0IHJlY3Vyc2lvbiA9IDA7IHJlY3Vyc2lvbiA8PSB0aGlzLl9tYXhSZWN1cnNpb247IHJlY3Vyc2lvbisrKSB7XG4gICAgICBsZXQgdGlsZVNpemUgPSBNYXRoLnBvdygyLCB0aGlzLl9tYXhSZWN1cnNpb24gLSByZWN1cnNpb24pO1xuICAgICAgLy8gY29uc29sZS5sb2codGlsZVNpemUsIHJlY3Vyc2lvbik7XG4gICAgICBmb3IgKGxldCB4ID0gMDsgeCA8IHRoaXMuX21hcFNpemU7IHggKz0gdGlsZVNpemUpIHtcbiAgICAgICAgZm9yIChsZXQgeSA9IDA7IHkgPCB0aGlzLl9tYXBTaXplOyB5ICs9IHRpbGVTaXplKSB7XG4gICAgICAgICAgaWYgKHRoaXMuZ2V0Q2VsbCh7eCwgeSwgcmVjdXJzaW9ufSkgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgbGV0IHBhcmVudENlbGwgPSB0aGlzLmdldENlbGxQYXJlbnQoe3gsIHksIHJlY3Vyc2lvbn0pO1xuICAgICAgICAgICAgaWYgKHBhcmVudENlbGwgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICB0aGlzLnNldENlbGwoe3gsIHksIHJlY3Vyc2lvbn0sIHRoaXMuX3RyZWVTZWVkVmFsdWUpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChyZWN1cnNpb24gPT09IHRoaXMuX3RyZWVSZWN1cnNpb24gJiZcbiAgICAgICAgICAgICAgICAgICAgICB4IDw9IHRoaXMuX21hcFNpemUgLyAyICYmIHggPj0gdGhpcy5fbWFwU2l6ZSAvIDIgLSB0aWxlU2l6ZSAmJlxuICAgICAgICAgICAgICAgICAgICAgIHkgPD0gdGhpcy5fbWFwU2l6ZSAvIDIgJiYgeSA+PSB0aGlzLl9tYXBTaXplIC8gMiAtIHRpbGVTaXplKSB7XG4gICAgICAgICAgICAgIC8vIENlbnRlciBvZiBtYXAgc2hvdWxkIGFsd2F5cyBiZSBlbXB0eS5cbiAgICAgICAgICAgICAgdGhpcy5zZXRDZWxsKHt4LCB5LCByZWN1cnNpb259LCAwKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocmVjdXJzaW9uID09PSB0aGlzLl90cmVlUmVjdXJzaW9uICYmXG4gICAgICAgICAgICAgICAgICAgICAgKHggPCA0ICogdGlsZVNpemUgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgeSA8IDQgKiB0aWxlU2l6ZSB8fFxuICAgICAgICAgICAgICAgICAgICAgICB4ID49IHRoaXMuX21hcFNpemUgLSA0ICogdGlsZVNpemUgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgeSA+PSB0aGlzLl9tYXBTaXplIC0gNCAqIHRpbGVTaXplKSkge1xuICAgICAgICAgICAgICAvLyBEZW5zZSB2ZWdldGF0aW9uIHJvdW5kIGVkZ2UuXG4gICAgICAgICAgICAgIHRoaXMuc2V0Q2VsbCh7eCwgeSwgcmVjdXJzaW9ufSwgTWF0aC5yYW5kb20oKSAqIHRoaXMuX3RyZWVTZWVkVmFsdWUgKiAyKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocmVjdXJzaW9uID4gdGhpcy5fdHJlZVJlY3Vyc2lvbikge1xuICAgICAgICAgICAgICB0aGlzLnNldENlbGwoe3gsIHksIHJlY3Vyc2lvbn0sIDApO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgbGV0IHNlZWQgPSBcIlwiICsgcGFyZW50Q2VsbC54ICsgXCJfXCIgKyBwYXJlbnRDZWxsLnk7XG4gICAgICAgICAgICAgIGxldCBjaGlsZE1vZCA9IFtcbiAgICAgICAgICAgICAgICBzZWVkZWRSYW5kb20oNTAwLCAxMDAwLCBzZWVkKSxcbiAgICAgICAgICAgICAgICBzZWVkZWRSYW5kb20oNTAwLCAxMDAwLCBzZWVkICsgXCJfMVwiKSxcbiAgICAgICAgICAgICAgICBzZWVkZWRSYW5kb20oNTAwLCAxMDAwLCBzZWVkICsgXCJfMlwiKSxcbiAgICAgICAgICAgICAgICBzZWVkZWRSYW5kb20oNTAwLCAxMDAwLCBzZWVkICsgXCJfM1wiKV07XG4gICAgICAgICAgICAgIGxldCBjaGlsZE1vZFRvdGFsID0gY2hpbGRNb2QucmVkdWNlKCh0b3RhbCwgbnVtKSA9PiB7IHJldHVybiB0b3RhbCArIG51bTsgfSk7XG4gICAgICAgICAgICAgIGNoaWxkTW9kLmZvckVhY2goKHZlZ2V0YXRpb24sIGluZGV4LCBhcnJheSkgPT4geyBhcnJheVtpbmRleF0gLz0gY2hpbGRNb2RUb3RhbDsgfSk7XG4gICAgICAgICAgICAgIGxldCBjaGlsZEluZGV4ID0gKCh4IC0gcGFyZW50Q2VsbC54KSArIDIgKiAoeSAtIHBhcmVudENlbGwueSkpIC8gdGlsZVNpemU7XG5cbiAgICAgICAgICAgICAgdGhpcy5zZXRDZWxsKHt4LCB5LCByZWN1cnNpb259LFxuICAgICAgICAgICAgICAgIHBhcmVudENlbGwudmVnZXRhdGlvbiAqIGNoaWxkTW9kW2NoaWxkSW5kZXhdICogNCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIGNvbnNvbGUubG9nKFwiQ2VsbCBjb3VudDogXCIsIHRoaXMuX2NlbGxzLmxlbmd0aCk7XG4gIH1cblxuICBwcml2YXRlIF9maW5kQ2xvc2VzdFNwYWNlKGNvb3JkOiBDb29yZCwgaGVpZ2h0OiBudW1iZXIpOiBDb29yZCB7XG4gICAgbGV0IG5laWdoYm91cnM6IFByaW9yaXR5UXVldWU8Q29vcmQ+ID0gbmV3IFByaW9yaXR5UXVldWU8Q29vcmQ+KGdldFgsIGdldFkpO1xuICAgIGxldCB2aXNpdGVkOiB7W2tleTogc3RyaW5nXTogYm9vbGVhbn0gPSB7fTtcbiAgICBuZWlnaGJvdXJzLnB1c2goY29vcmQsIDApO1xuXG4gICAgd2hpbGUgKG5laWdoYm91cnMubGVuZ3RoKSB7XG4gICAgICBsZXQgd29ya2luZyA9IG5laWdoYm91cnMucG9wTG93KCk7XG4gICAgICB2aXNpdGVkW2Nvb3JkVG9LZXkod29ya2luZyldID0gdHJ1ZTtcbiAgICAgIGlmICh0aGlzLmdldENlbGwod29ya2luZykubWluSGVpZ2h0ID09PSB1bmRlZmluZWQgfHxcbiAgICAgICAgIHRoaXMuZ2V0Q2VsbCh3b3JraW5nKS5taW5IZWlnaHQgPj0gaGVpZ2h0KSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiaW46IFwiLCBjb29yZFRvS2V5KGNvb3JkKSwgXCJcXHRvdXQ6IFwiLCBjb29yZFRvS2V5KHdvcmtpbmcpKTtcbiAgICAgICAgcmV0dXJuIHdvcmtpbmc7XG4gICAgICB9XG5cbiAgICAgIGlmICh3b3JraW5nLnggPiAwKSB7XG4gICAgICAgIGxldCBub2RlID0ge1wieFwiOiB3b3JraW5nLnggLSAxLCBcInlcIjogd29ya2luZy55LCBcInJlY3Vyc2lvblwiOiB0aGlzLl9tYXhSZWN1cnNpb259O1xuICAgICAgICBpZiAoIXZpc2l0ZWRbY29vcmRUb0tleShub2RlKV0pIHtcbiAgICAgICAgICBuZWlnaGJvdXJzLnB1c2gobm9kZSwgZGlzdEJldHdlZW4od29ya2luZywgY29vcmQpKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKHdvcmtpbmcueCA8IHRoaXMuX21hcFNpemUgLSAxKSB7XG4gICAgICAgIGxldCBub2RlID0ge1wieFwiOiB3b3JraW5nLnggKyAxLCBcInlcIjogd29ya2luZy55LCBcInJlY3Vyc2lvblwiOiB0aGlzLl9tYXhSZWN1cnNpb259O1xuICAgICAgICBpZiAoIXZpc2l0ZWRbY29vcmRUb0tleShub2RlKV0pIHtcbiAgICAgICAgICBuZWlnaGJvdXJzLnB1c2gobm9kZSwgZGlzdEJldHdlZW4od29ya2luZywgY29vcmQpKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKHdvcmtpbmcueSA+IDApIHtcbiAgICAgICAgbGV0IG5vZGUgPSB7XCJ4XCI6IHdvcmtpbmcueCwgXCJ5XCI6IHdvcmtpbmcueSAtIDEsIFwicmVjdXJzaW9uXCI6IHRoaXMuX21heFJlY3Vyc2lvbn07XG4gICAgICAgIGlmICghdmlzaXRlZFtjb29yZFRvS2V5KG5vZGUpXSkge1xuICAgICAgICAgIG5laWdoYm91cnMucHVzaChub2RlLCBkaXN0QmV0d2Vlbih3b3JraW5nLCBjb29yZCkpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAod29ya2luZy55IDwgdGhpcy5fbWFwU2l6ZSAtIDEpIHtcbiAgICAgICAgbGV0IG5vZGUgPSB7XCJ4XCI6IHdvcmtpbmcueCwgXCJ5XCI6IHdvcmtpbmcueSArIDEsIFwicmVjdXJzaW9uXCI6IHRoaXMuX21heFJlY3Vyc2lvbn07XG4gICAgICAgIGlmICghdmlzaXRlZFtjb29yZFRvS2V5KG5vZGUpXSkge1xuICAgICAgICAgIG5laWdoYm91cnMucHVzaChub2RlLCBkaXN0QmV0d2Vlbih3b3JraW5nLCBjb29yZCkpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIGNvbnNvbGUubG9nKHZpc2l0ZWQubGVuZ3RoKTtcbiAgICBjb25zb2xlLmxvZyhcImluOiBcIiwgY29vcmRUb0tleShjb29yZCksIFwiXFx0b3V0OiBcIiwgdW5kZWZpbmVkKTtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG5cbiAgY2FsY3VsYXRlUGF0aChzdGFydDogQ29vcmQsIGRlc3RpbmF0aW9uOiBDb29yZCkgOiBib29sZWFuIHtcbiAgICBjb25zb2xlLnRpbWUoXCJjYWxjdWxhdGVQYXRoXCIpO1xuXG4gICAgbGV0IHJlYWNoZWREZXN0aW5hdGlvbiA9IGZhbHNlO1xuICAgIHN0YXJ0LnJlY3Vyc2lvbiA9IHRoaXMuX21heFJlY3Vyc2lvbjtcbiAgICBkZXN0aW5hdGlvbi5yZWN1cnNpb24gPSB0aGlzLl9tYXhSZWN1cnNpb247XG5cbiAgICBsZXQgc3RhcnRBZGp1c3RlZCA9IHRoaXMuZ2V0Q2VsbChcbiAgICAgIHRoaXMuX2ZpbmRDbG9zZXN0U3BhY2Uoc3RhcnQsIHRoaXMuX2hlYWRyb29tKSk7XG4gICAgbGV0IGRlc3RpbmF0aW9uQWRqdXN0ZWQgPSB0aGlzLmdldENlbGwoXG4gICAgICB0aGlzLl9maW5kQ2xvc2VzdFNwYWNlKGRlc3RpbmF0aW9uLCB0aGlzLl9oZWFkcm9vbSkpO1xuXG4gICAgZGVzdGluYXRpb25BZGp1c3RlZC5wYXRoU2NvcmUgPSAwO1xuXG4gICAgbGV0IG5laWdoYm91cnM6IFByaW9yaXR5UXVldWU8TWFwQ2VsbD4gPVxuICAgICAgbmV3IFByaW9yaXR5UXVldWU8TWFwQ2VsbD4oZ2V0WCwgZ2V0WSk7XG4gICAgbmVpZ2hib3Vycy5wdXNoKGRlc3RpbmF0aW9uQWRqdXN0ZWQsIDApO1xuXG4gICAgd2hpbGUgKG5laWdoYm91cnMubGVuZ3RoKSB7XG4gICAgICBsZXQgd29ya2luZzogTWFwQ2VsbCA9IG5laWdoYm91cnMucG9wTG93KCk7XG5cbiAgICAgIGlmICh3b3JraW5nLnggPT09IHN0YXJ0QWRqdXN0ZWQueCAmJiB3b3JraW5nLnkgPT09IHN0YXJ0QWRqdXN0ZWQueSkge1xuICAgICAgICByZWFjaGVkRGVzdGluYXRpb24gPSB0cnVlO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cblxuICAgICAgbGV0IGFkamFjZW50OiBNYXBDZWxsW10gPSBuZXcgQXJyYXkoNCk7XG4gICAgICBpZiAod29ya2luZy54ID4gMCkge1xuICAgICAgICBhZGphY2VudFswXSA9IHRoaXMuZ2V0Q2VsbChcbiAgICAgICAgICB7XCJ4XCI6IHdvcmtpbmcueCAtIDEsIFwieVwiOiB3b3JraW5nLnksIFwicmVjdXJzaW9uXCI6IHRoaXMuX21heFJlY3Vyc2lvbn0pO1xuICAgICAgfVxuICAgICAgaWYgKHdvcmtpbmcueCA8IHRoaXMuX21hcFNpemUgLSAxKSB7XG4gICAgICAgIGFkamFjZW50WzFdID0gdGhpcy5nZXRDZWxsKFxuICAgICAgICAgIHtcInhcIjogd29ya2luZy54ICsgMSwgXCJ5XCI6IHdvcmtpbmcueSwgXCJyZWN1cnNpb25cIjogdGhpcy5fbWF4UmVjdXJzaW9ufSk7XG4gICAgICB9XG4gICAgICBpZiAod29ya2luZy55ID4gMCkge1xuICAgICAgICBhZGphY2VudFsyXSA9IHRoaXMuZ2V0Q2VsbChcbiAgICAgICAgICB7XCJ4XCI6IHdvcmtpbmcueCwgXCJ5XCI6IHdvcmtpbmcueSAtIDEsIFwicmVjdXJzaW9uXCI6IHRoaXMuX21heFJlY3Vyc2lvbn0pO1xuICAgICAgfVxuICAgICAgaWYgKHdvcmtpbmcueSA8IHRoaXMuX21hcFNpemUgLSAxKSB7XG4gICAgICAgIGFkamFjZW50WzNdID0gdGhpcy5nZXRDZWxsKFxuICAgICAgICAgIHtcInhcIjogd29ya2luZy54LCBcInlcIjogd29ya2luZy55ICsgMSwgXCJyZWN1cnNpb25cIjogdGhpcy5fbWF4UmVjdXJzaW9ufSk7XG4gICAgICB9XG4gICAgICBhZGphY2VudC5mb3JFYWNoKChhKSA9PiB7XG4gICAgICAgIGlmIChhICE9PSB1bmRlZmluZWQgJiZcbiAgICAgICAgICAgKGEubWluSGVpZ2h0ID4gdGhpcy5faGVhZHJvb20gfHwgYS5taW5IZWlnaHQgPT09IHVuZGVmaW5lZCkpIHtcbiAgICAgICAgICBpZiAoYS5wYXRoU2NvcmUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgYS5wYXRoU2NvcmUgPSB3b3JraW5nLnBhdGhTY29yZSArIDE7XG4gICAgICAgICAgICBuZWlnaGJvdXJzLnB1c2goYSwgYS5wYXRoU2NvcmUgKyBkaXN0QmV0d2VlbihhLCBzdGFydEFkanVzdGVkKSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGEucGF0aFNjb3JlID0gTWF0aC5taW4oYS5wYXRoU2NvcmUsIHdvcmtpbmcucGF0aFNjb3JlICsgMSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvKmZvciAobGV0IHkgPSAwOyB5IDwgdGhpcy5fbWFwU2l6ZTsgeSsrKSB7XG4gICAgICBsZXQgbGluZSA9IFwiXCI7XG4gICAgICBmb3IgKGxldCB4ID0gMDsgeCA8IHRoaXMuX21hcFNpemU7IHgrKykge1xuICAgICAgICBsZXQgbm9kZSA9IHRoaXMuZ2V0Q2VsbCh7eCwgeSwgXCJyZWN1cnNpb25cIjogdGhpcy5fbWF4UmVjdXJzaW9ufSk7XG4gICAgICAgIGxldCB2YWwgPSBcIlwiICsgbm9kZS5wYXRoU2NvcmU7XG4gICAgICAgIGlmICh2YWwgPT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgICB2YWwgPSBcIiBcIjtcbiAgICAgICAgICBpZiAodGhpcy5nZXRDZWxsKG5vZGUpLm1pbkhlaWdodCA8PSB0aGlzLl9oZWFkcm9vbSkge1xuICAgICAgICAgICAgdmFsID0gXCIjXCI7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHZhbCA9IFwiLlwiO1xuICAgICAgICAgIGxldCBwYXRoTm9kZSA9IEJBQllMT04uTWVzaEJ1aWxkZXIuQ3JlYXRlU3BoZXJlKFwicGF0aF9cIiArIHggKyBcIl9cIiArIHksIHt9LCB0aGlzLl9zY2VuZSk7XG4gICAgICAgICAgcGF0aE5vZGUucG9zaXRpb24ueCA9IHRoaXMubWFwVG9Xb3JsZChub2RlKS54O1xuICAgICAgICAgIHBhdGhOb2RlLnBvc2l0aW9uLnkgPSAwO1xuICAgICAgICAgIHBhdGhOb2RlLnBvc2l0aW9uLnogPSB0aGlzLm1hcFRvV29ybGQobm9kZSkueTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoeCA9PT0gc3RhcnQueCAmJiB5ID09PSBzdGFydC55KSB7IHZhbCA9IFwiKlwiOyB9XG4gICAgICAgIGlmICh4ID09PSBzdGFydEFkanVzdGVkLnggJiYgeSA9PT0gc3RhcnRBZGp1c3RlZC55KSB7IHZhbCA9IFwiKCopXCI7IH1cbiAgICAgICAgaWYgKHkgPCA1MCAmJiB4IDwgMTUwKSB7XG4gICAgICAgICAgbGluZSArPSB2YWw7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmICh5IDwgNTApIHtcbiAgICAgICAgY29uc29sZS5sb2cobGluZSk7XG4gICAgICB9XG4gICAgfSovXG4gICAgY29uc29sZS50aW1lRW5kKFwiY2FsY3VsYXRlUGF0aFwiKTtcbiAgICBjb25zb2xlLmxvZyhcIlN1Y2Vzc2Z1bGw6IFwiLCByZWFjaGVkRGVzdGluYXRpb24pO1xuICAgIHJldHVybiByZWFjaGVkRGVzdGluYXRpb247XG4gIH1cblxuICBwcml2YXRlIF9wbGFudFRyZWVzKCkgOiB2b2lkIHtcbiAgICBjb25zb2xlLmxvZyhcIlBsYW50aW5nIHRyZWVzLlwiKTtcblxuICAgIGxldCBudXJzZXJ5ID0gbmV3IE51cnNlcnkodGhpcy5fc2NlbmUsIDE1LCAxNSk7XG5cbiAgICB0aGlzLl9ncm91bmRDb3ZlclR5cGVzID0gW107XG4gICAgdGhpcy5fZ3JvdW5kQ292ZXJUeXBlcy5wdXNoKHRoaXMuX2NyZWF0ZUdyb3VuZENvdmVyKCkpO1xuICAgIHRoaXMuX2dyb3VuZENvdmVyVHlwZXMucHVzaCh0aGlzLl9jcmVhdGVHcm91bmRDb3ZlcigpKTtcbiAgICB0aGlzLl9ncm91bmRDb3ZlclR5cGVzLnB1c2godGhpcy5fY3JlYXRlR3JvdW5kQ292ZXIoKSk7XG4gICAgdGhpcy5fZ3JvdW5kQ292ZXJUeXBlcy5wdXNoKHRoaXMuX2NyZWF0ZUdyb3VuZENvdmVyKCkpO1xuICAgIHRoaXMuX2dyb3VuZENvdmVyVHlwZXMucHVzaCh0aGlzLl9jcmVhdGVHcm91bmRDb3ZlcigpKTtcbiAgICB0aGlzLl9ncm91bmRDb3ZlclR5cGVzLnB1c2godGhpcy5fY3JlYXRlR3JvdW5kQ292ZXIoKSk7XG4gICAgdGhpcy5fZ3JvdW5kQ292ZXJUeXBlcy5wdXNoKHRoaXMuX2NyZWF0ZUdyb3VuZENvdmVyKCkpO1xuICAgIHRoaXMuX2dyb3VuZENvdmVyVHlwZXMucHVzaCh0aGlzLl9jcmVhdGVHcm91bmRDb3ZlcigpKTtcblxuICAgIGxldCB0cmVlcyA9IFtdO1xuICAgIGxldCB0aWxlU2l6ZSA9IE1hdGgucG93KDIsIHRoaXMuX21heFJlY3Vyc2lvbiAtIHRoaXMuX3RyZWVSZWN1cnNpb24pO1xuICAgIGZvciAobGV0IHggPSAwOyB4IDwgdGhpcy5fbWFwU2l6ZTsgeCArPSB0aWxlU2l6ZSkge1xuICAgICAgZm9yIChsZXQgeSA9IDA7IHkgPCB0aGlzLl9tYXBTaXplOyB5ICs9IHRpbGVTaXplKSB7XG4gICAgICAgIGxldCBjZWxsID0gdGhpcy5nZXRDZWxsKHt4LCB5LCByZWN1cnNpb246IHRoaXMuX3RyZWVSZWN1cnNpb259KTtcbiAgICAgICAgbGV0IHNjYWxlID0gY2VsbC52ZWdldGF0aW9uIC8gdGhpcy5fdHJlZVNjYWxlO1xuICAgICAgICBsZXQgdHJlZTogQkFCWUxPTi5NZXNoO1xuICAgICAgICBpZiAoY2VsbC52ZWdldGF0aW9uID4gODApIHtcbiAgICAgICAgICB0cmVlID0gbnVyc2VyeS5nZXRUcmVlKHgsIHkpO1xuICAgICAgICB9IGVsc2UgaWYgKGNlbGwudmVnZXRhdGlvbiA+IDUwKSB7XG4gICAgICAgICAgdHJlZSA9IG51cnNlcnkuZ2V0U2hydWIoeCwgeSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRyZWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGxldCBqaXR0ZXJYID0gTWF0aC5yb3VuZChNYXRoLnJhbmRvbSgpICogOCAtIDQpO1xuICAgICAgICAgIGxldCBqaXR0ZXJZID0gTWF0aC5yb3VuZChNYXRoLnJhbmRvbSgpICogOCAtIDQpO1xuICAgICAgICAgIHRyZWUucG9zaXRpb24ueCA9IChcbiAgICAgICAgICAgICh4ICsgaml0dGVyWCkgLSB0aGlzLl9tYXBTaXplIC8gMikgKiB0aGlzLl9tYXBTcGFjaW5nO1xuICAgICAgICAgIHRyZWUucG9zaXRpb24ueSA9IDA7XG4gICAgICAgICAgdHJlZS5wb3NpdGlvbi56ID0gKFxuICAgICAgICAgICAgKHkgKyBqaXR0ZXJZKSAtIHRoaXMuX21hcFNpemUgLyAyKSAqIHRoaXMuX21hcFNwYWNpbmc7XG4gICAgICAgICAgdHJlZS5zY2FsaW5nID0gbmV3IEJBQllMT04uVmVjdG9yMyhzY2FsZSwgc2NhbGUsIHNjYWxlKTtcbiAgICAgICAgICB0cmVlcy5wdXNoKHRyZWUpO1xuXG4gICAgICAgICAgbGV0IGxlYXZlcyA9IHRyZWUuZ2V0Q2hpbGRNZXNoZXModHJ1ZSwgKG1lc2gpID0+IHtcbiAgICAgICAgICAgIHJldHVybiBtZXNoLm5hbWUuc3BsaXQoXCIuXCIpWzFdID09PSBcImxlYXZlc1wiO1xuICAgICAgICAgICAgfSlbMF0uZ2V0Qm91bmRpbmdJbmZvKCkuYm91bmRpbmdCb3g7XG4gICAgICAgICAgbGV0IGxlYXZlc1RvcCA9IGxlYXZlcy5tYXhpbXVtV29ybGQueSAqIHNjYWxlO1xuICAgICAgICAgIGxldCBsZWF2ZXNCb3R0b20gPSBsZWF2ZXMubWluaW11bVdvcmxkLnkgKiBzY2FsZTtcbiAgICAgICAgICBsZXQgeE1pbiA9IChsZWF2ZXMubWluaW11bVdvcmxkLnggLyB0aGlzLl9tYXBTcGFjaW5nKSAqIHNjYWxlO1xuICAgICAgICAgIGxldCB4TWF4ID0gKGxlYXZlcy5tYXhpbXVtV29ybGQueCAvIHRoaXMuX21hcFNwYWNpbmcpICogc2NhbGU7XG4gICAgICAgICAgbGV0IHlNaW4gPSAobGVhdmVzLm1pbmltdW1Xb3JsZC56IC8gdGhpcy5fbWFwU3BhY2luZykgKiBzY2FsZTtcbiAgICAgICAgICBsZXQgeU1heCA9IChsZWF2ZXMubWF4aW11bVdvcmxkLnogLyB0aGlzLl9tYXBTcGFjaW5nKSAqIHNjYWxlO1xuICAgICAgICAgIC8vZm9yIChsZXQgeHggPSBNYXRoLmNlaWwoeE1pbiArIGppdHRlclgpOyB4eCA8PSBNYXRoLmZsb29yKHhNYXggKyBqaXR0ZXJYKTsgeHgrKykge1xuICAgICAgICAgIGZvciAobGV0IHh4ID0gTWF0aC5mbG9vcih4TWluICsgaml0dGVyWCk7IHh4IDw9IE1hdGguY2VpbCh4TWF4ICsgaml0dGVyWCk7IHh4KyspIHtcbiAgICAgICAgICAgIC8vZm9yIChsZXQgeXkgPSBNYXRoLmNlaWwoeU1pbiArIGppdHRlclkpOyB5eSA8PSBNYXRoLmZsb29yKHlNYXggKyBqaXR0ZXJZKTsgeXkrKykge1xuICAgICAgICAgICAgZm9yIChsZXQgeXkgPSBNYXRoLmZsb29yKHlNaW4gKyBqaXR0ZXJZKTsgeXkgPD0gTWF0aC5jZWlsKHlNYXggKyBqaXR0ZXJZKTsgeXkrKykge1xuICAgICAgICAgICAgICBsZXQgYyA9IHRoaXMuZ2V0Q2VsbCh7eDogeHggKyB4LCB5OiB5eSArIHksIHJlY3Vyc2lvbjogdGhpcy5fbWF4UmVjdXJzaW9ufSk7XG4gICAgICAgICAgICAgIGlmIChjICYmIChjLm1heEhlaWdodCA9PT0gdW5kZWZpbmVkIHx8IGMubWF4SGVpZ2h0IDwgbGVhdmVzVG9wKSkge1xuICAgICAgICAgICAgICAgIGMubWF4SGVpZ2h0ID0gbGVhdmVzVG9wO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGlmIChjICYmIChjLm1pbkhlaWdodCA+IGxlYXZlc0JvdHRvbSB8fCBjLm1pbkhlaWdodCA9PT0gdW5kZWZpbmVkKSkge1xuICAgICAgICAgICAgICAgIGMubWluSGVpZ2h0ID0gbGVhdmVzQm90dG9tO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGxldCBjID0gdGhpcy5nZXRDZWxsKHt4LCB5LCByZWN1cnNpb246IHRoaXMuX21heFJlY3Vyc2lvbn0pO1xuICAgICAgICAgIGlmIChjICYmIChjLm1pbkhlaWdodCA9PT0gdW5kZWZpbmVkIHx8IGMubWluSGVpZ2h0ID4gbGVhdmVzQm90dG9tKSkge1xuICAgICAgICAgICAgYy5taW5IZWlnaHQgPSBsZWF2ZXNCb3R0b207XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgbGV0IHRydW5rID0gdHJlZS5nZXRDaGlsZE1lc2hlcyh0cnVlLCAobWVzaCkgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIG1lc2gubmFtZS5zcGxpdChcIi5cIilbMV0gPT09IFwidHJ1bmtcIjtcbiAgICAgICAgICB9KVswXTtcbiAgICAgICAgICBpZiAodHJ1bmspIHtcbiAgICAgICAgICAgIGxldCB0cnVua0JCID0gdHJ1bmsuZ2V0Qm91bmRpbmdJbmZvKCkuYm91bmRpbmdCb3g7XG4gICAgICAgICAgICBsZXQgeE1pblQgPSBNYXRoLnJvdW5kKHRydW5rQkIubWluaW11bVdvcmxkLnggKiBzY2FsZSAvIHRoaXMuX21hcFNwYWNpbmcpO1xuICAgICAgICAgICAgbGV0IHhNYXhUID0gTWF0aC5yb3VuZCh0cnVua0JCLm1heGltdW1Xb3JsZC54ICogc2NhbGUgLyB0aGlzLl9tYXBTcGFjaW5nKTtcbiAgICAgICAgICAgIGxldCB5TWluVCA9IE1hdGgucm91bmQodHJ1bmtCQi5taW5pbXVtV29ybGQueiAqIHNjYWxlIC8gdGhpcy5fbWFwU3BhY2luZyk7XG4gICAgICAgICAgICBsZXQgeU1heFQgPSBNYXRoLnJvdW5kKHRydW5rQkIubWF4aW11bVdvcmxkLnogKiBzY2FsZSAvIHRoaXMuX21hcFNwYWNpbmcpO1xuICAgICAgICAgICAgZm9yIChsZXQgeHggPSBNYXRoLmNlaWwoeE1pblQgKyBqaXR0ZXJYKTsgeHggPD0gTWF0aC5mbG9vcih4TWF4VCArIGppdHRlclgpOyB4eCsrKSB7XG4gICAgICAgICAgICAgIGZvciAobGV0IHl5ID0gTWF0aC5jZWlsKHlNaW5UICsgaml0dGVyWSk7IHl5IDw9IE1hdGguZmxvb3IoeU1heFQgKyBqaXR0ZXJZKTsgeXkrKykge1xuICAgICAgICAgICAgICAgIGxldCBjID0gdGhpcy5nZXRDZWxsKHt4OiB4eCArIHgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHk6IHl5ICsgeSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVjdXJzaW9uOiB0aGlzLl9tYXhSZWN1cnNpb259KTtcbiAgICAgICAgICAgICAgICBpZiAoYykge1xuICAgICAgICAgICAgICAgICAgYy5taW5IZWlnaHQgPSAwO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIGNvbnNvbGUubG9nKHhNaW4sIHhNYXgsIHlNaW4sIHlNYXgpO1xuICAgICAgICAgIC8qbGV0IHRlc3RUcmVldG9wID0gQkFCWUxPTi5NZXNoQnVpbGRlci5DcmVhdGVCb3goXCJ0ZXN0XCIsXG4gICAgICAgICAgICB7XCJ3aWR0aFwiOiAoeE1heCAtIHhNaW4pICogdGhpcy5fbWFwU3BhY2luZyxcbiAgICAgICAgICAgICBcImhlaWdodFwiOiBsZWF2ZXNUb3AgLSBsZWF2ZXNCb3R0b20sXG4gICAgICAgICAgICAgXCJkZXB0aFwiOiAoeU1heCAtIHlNaW4pICogdGhpcy5fbWFwU3BhY2luZ30sXG4gICAgICAgICAgICB0aGlzLl9zY2VuZSk7XG4gICAgICAgICAgdmFyIG1hdGVyaWFsID0gbmV3IEJBQllMT04uU3RhbmRhcmRNYXRlcmlhbChcIm15TWF0ZXJpYWxcIiwgdGhpcy5fc2NlbmUpO1xuICAgICAgICAgIG1hdGVyaWFsLmRpZmZ1c2VDb2xvciA9IG5ldyBCQUJZTE9OLkNvbG9yMygxLCAwLCAwKTtcbiAgICAgICAgICAvL21hdGVyaWFsLndpcmVmcmFtZSA9IHRydWU7XG4gICAgICAgICAgbWF0ZXJpYWwuYWxwaGEgPSAwLjU7XG4gICAgICAgICAgdGVzdFRyZWV0b3AubWF0ZXJpYWwgPSBtYXRlcmlhbDtcbiAgICAgICAgICB0ZXN0VHJlZXRvcC5wb3NpdGlvbi54ID0gKHggKyBqaXR0ZXJYIC0gdGhpcy5fbWFwU2l6ZSAvIDIpICogdGhpcy5fbWFwU3BhY2luZztcbiAgICAgICAgICB0ZXN0VHJlZXRvcC5wb3NpdGlvbi55ID0gKGxlYXZlc1RvcCArIGxlYXZlc0JvdHRvbSkgLyAyO1xuICAgICAgICAgIHRlc3RUcmVldG9wLnBvc2l0aW9uLnogPSAoeSArIGppdHRlclkgLSB0aGlzLl9tYXBTaXplIC8gMikgKiB0aGlzLl9tYXBTcGFjaW5nOyovXG5cbiAgICAgICAgICB0aGlzLl9hcHBseUdyb3VuZENvdmVyKCh4IC0gdGhpcy5fbWFwU2l6ZSAvIDIpICogdGhpcy5fbWFwU3BhY2luZyxcbiAgICAgICAgICAgICh5IC0gdGhpcy5fbWFwU2l6ZSAvIDIpICogdGhpcy5fbWFwU3BhY2luZyk7XG5cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBjb25zb2xlLmxvZyhcIkRvbmUgcGxhbnRpbmdcIik7XG5cbiAgICAvKmZvciAobGV0IHggPSAwOyB4IDwgdGhpcy5fbWFwU2l6ZTsgeCsrKSB7XG4gICAgICBmb3IgKGxldCB5ID0gMDsgeSA8IHRoaXMuX21hcFNpemU7IHkrKykge1xuICAgICAgICBsZXQgY2VsbCA9IHRoaXMuZ2V0Q2VsbCh7eCwgeSwgcmVjdXJzaW9uOiB0aGlzLl9tYXhSZWN1cnNpb259KTtcbiAgICAgICAgaWYgKGNlbGwubWluSGVpZ2h0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAvL2xldCBsZWF2ZXNUb3AgPSBjZWxsLm1heEhlaWdodDtcbiAgICAgICAgICBsZXQgbGVhdmVzVG9wID0gY2VsbC5taW5IZWlnaHQ7XG4gICAgICAgICAgbGV0IHRlc3RUcmVldG9wID0gQkFCWUxPTi5NZXNoQnVpbGRlci5DcmVhdGVQbGFuZShcbiAgICAgICAgICAgIFwidGVzdFwiICsgeCArIFwiX1wiICsgeSArIFwiIFwiICsgdGhpcy5fbWF4UmVjdXJzaW9uLFxuICAgICAgICAgICAge3NpemU6IDEgKiB0aGlzLl9tYXBTcGFjaW5nLCBzaWRlT3JpZW50YXRpb246IEJBQllMT04uTWVzaC5ET1VCTEVTSURFfSxcbiAgICAgICAgICAgIHRoaXMuX3NjZW5lKTtcbiAgICAgICAgICB0ZXN0VHJlZXRvcC5yb3RhdGlvbi54ID0gTWF0aC5QSSAvIDI7XG4gICAgICAgICAgdGVzdFRyZWV0b3AucG9zaXRpb24ueCA9ICh4IC0gdGhpcy5fbWFwU2l6ZSAvIDIpICogdGhpcy5fbWFwU3BhY2luZztcbiAgICAgICAgICB0ZXN0VHJlZXRvcC5wb3NpdGlvbi55ID0gbGVhdmVzVG9wO1xuICAgICAgICAgIHRlc3RUcmVldG9wLnBvc2l0aW9uLnogPSAoeSAtIHRoaXMuX21hcFNpemUgLyAyKSAqIHRoaXMuX21hcFNwYWNpbmc7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9Ki9cblxuICAgIC8vIERvbid0IG5lZWQgdGhlIHByb3RvdHlwZXMgYW55IG1vcmUgc28gZGVsZXRlIHRoZW0uXG4gICAgbnVyc2VyeS5kaXNwb3NlKCk7XG5cbiAgICBjb25zb2xlLmxvZyhcIkNvbnNvbGlkYXRpbmcgdHJlZXMuXCIpO1xuICAgIHRoaXMuX2NvbnNvbGlkYXRlVHJlZXModHJlZXMpO1xuICB9XG5cbiAgd29ybGRUb01hcChjb29yZDogQ29vcmQpIDogQ29vcmQge1xuICAgIGxldCB4ID0gTWF0aC5yb3VuZChjb29yZC54IC8gdGhpcy5fbWFwU3BhY2luZyArIHRoaXMuX21hcFNpemUgLyAyKTtcbiAgICBsZXQgeSA9IE1hdGgucm91bmQoY29vcmQueSAvIHRoaXMuX21hcFNwYWNpbmcgKyB0aGlzLl9tYXBTaXplIC8gMik7XG4gICAgbGV0IHJlY3Vyc2lvbiA9IGNvb3JkLnJlY3Vyc2lvbjtcbiAgICBpZiAocmVjdXJzaW9uID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJlY3Vyc2lvbiA9IHRoaXMuX21heFJlY3Vyc2lvbjtcbiAgICB9XG4gICAgcmV0dXJuIHt4LCB5LCByZWN1cnNpb259O1xuICB9XG5cbiAgbWFwVG9Xb3JsZChjb29yZDogQ29vcmQpIDogQ29vcmQge1xuICAgIGxldCB4ID0gTWF0aC5yb3VuZChjb29yZC54ICogdGhpcy5fbWFwU3BhY2luZyAtIHRoaXMuX21hcFNpemUgLyAyKTtcbiAgICBsZXQgeSA9IE1hdGgucm91bmQoY29vcmQueSAqIHRoaXMuX21hcFNwYWNpbmcgLSB0aGlzLl9tYXBTaXplIC8gMik7XG4gICAgbGV0IHJlY3Vyc2lvbiA9IGNvb3JkLnJlY3Vyc2lvbjtcbiAgICBpZiAocmVjdXJzaW9uID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJlY3Vyc2lvbiA9IHRoaXMuX21heFJlY3Vyc2lvbjtcbiAgICB9XG4gICAgcmV0dXJuIHt4LCB5LCByZWN1cnNpb259O1xuICB9XG5cbiAgc2V0Q2VsbChjb29yZDogQ29vcmQsIHZlZ2V0YXRpb246IG51bWJlcikgOiB2b2lkIHtcbiAgICBsZXQgY2VsbCA9IG5ldyBNYXBDZWxsKGNvb3JkLCB2ZWdldGF0aW9uKTtcbiAgICB0aGlzLl9jZWxscy5wdXQoY2VsbCwgY2VsbCk7XG4gIH1cblxuICBnZXRDZWxsKGNvb3JkOiBDb29yZCkgOiBNYXBDZWxsIHtcbiAgICBpZiAoY29vcmQucmVjdXJzaW9uID09PSAtIDEpIHtcbiAgICAgIHJldHVybiB0aGlzLl9jZWxscy5nZXQoe1wieFwiOiAwLCBcInlcIjogMCwgXCJyZWN1cnNpb25cIjogMH0pO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fY2VsbHMuZ2V0KGNvb3JkKTtcbiAgfVxuXG4gIGdldEhlaWdodFdvcmxkKGNvb3JkOiBDb29yZCkgOiBudW1iZXIge1xuICAgIGxldCBjZWxsID0gdGhpcy5nZXRDZWxsV29ybGQoY29vcmQpO1xuICAgIGlmICghY2VsbCkge1xuICAgICAgcmV0dXJuIDA7XG4gICAgfVxuICAgIHJldHVybiBjZWxsLm1heEhlaWdodDtcbiAgfVxuXG4gIGdldENlbGxXb3JsZChjb29yZDogQ29vcmQpIDogTWFwQ2VsbCB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0Q2VsbCh0aGlzLndvcmxkVG9NYXAoY29vcmQpKTtcbiAgfVxuXG4gIGdldENlbGxQYXJlbnQoY29vcmQ6IENvb3JkKSA6IE1hcENlbGwge1xuICAgIGxldCBjZWxsID0gdGhpcy5nZXRDZWxsKGNvb3JkKTtcbiAgICBpZiAoY2VsbCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gdGhpcy5nZXRDZWxsKG5ldyBNYXBDZWxsKGNvb3JkLCAtIDEpLnBhcmVudENvb3JkaW5hdGVzKHRoaXMuX21heFJlY3Vyc2lvbikpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5nZXRDZWxsKGNlbGwucGFyZW50Q29vcmRpbmF0ZXModGhpcy5fbWF4UmVjdXJzaW9uKSk7XG4gIH1cblxuICBwcml2YXRlIF9jb25zb2xpZGF0ZVRyZWVzKHRyZWVzOiBCQUJZTE9OLk1lc2hbXSkgOiB2b2lkIHtcbiAgICBjb25zb2xlLmxvZyhcIk1lc2ggY291bnQgYmVmb3JlIF9jb25zb2xpZGF0ZVRyZWVzOiAlY1wiICtcbiAgICAgICAgICAgICAgICB0aGlzLl9zY2VuZS5tZXNoZXMubGVuZ3RoLnRvU3RyaW5nKCksXG4gICAgICAgICAgICAgICAgXCJiYWNrZ3JvdW5kOiBvcmFuZ2U7IGNvbG9yOiB3aGl0ZVwiKTtcblxuICAgIGxldCBjb3VudFN0YXJ0ID0gMDtcbiAgICBsZXQgY291bnRGaW5hbCA9IDA7XG5cbiAgICBsZXQgdHJlZUZvbGlhZ2VCdWNrZXQgPSBuZXcgQXJyYXkodGhpcy5fdHJlZVNwZWNpZXMpLmZpbGwodW5kZWZpbmVkKTtcbiAgICBsZXQgdHJlZVRydW5rQnVja2V0ID0gbmV3IEFycmF5KHRoaXMuX3RyZWVTcGVjaWVzKS5maWxsKHVuZGVmaW5lZCk7XG4gICAgdHJlZXMuZm9yRWFjaCgodHJlZSkgPT4ge1xuICAgICAgLy8gQ29sbGVjdCB0aGUgZGlmZmVyZW50IHRyZWUgc3BlY2llcyB0b2dldGhlciBpbiAyIGNvbGxlY3Rpb25zOlxuICAgICAgLy8gdHJ1bmtzIGFuZCBsZWF2ZXMuXG4gICAgICBsZXQgdHJlZUluZGV4ID0gcGFyc2VJbnQodHJlZS5uYW1lLnNwbGl0KFwiX1wiKVsxXSwgMTApO1xuICAgICAgaWYgKHRyZWVGb2xpYWdlQnVja2V0W3RyZWVJbmRleF0gPT09IHVuZGVmaW5lZCB8fCB0cmVlVHJ1bmtCdWNrZXQgPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRyZWVGb2xpYWdlQnVja2V0W3RyZWVJbmRleF0gPSBbXTtcbiAgICAgICAgdHJlZVRydW5rQnVja2V0W3RyZWVJbmRleF0gPSBbXTtcbiAgICAgIH1cbiAgICAgIHRyZWUuZ2V0Q2hpbGRNZXNoZXModHJ1ZSkuZm9yRWFjaCgobm9kZSkgPT4ge1xuICAgICAgICBsZXQgbm9kZU5hbWUgPSBub2RlLm5hbWUuc3BsaXQoXCIuXCIpWzFdO1xuICAgICAgICBpZiAobm9kZU5hbWUgPT09IFwibGVhdmVzXCIpIHtcbiAgICAgICAgICBsZXQgcG9zID0gbm9kZS5nZXRBYnNvbHV0ZVBvc2l0aW9uKCk7XG4gICAgICAgICAgbm9kZS5zZXRQYXJlbnQobnVsbCk7XG4gICAgICAgICAgbm9kZS5zZXRBYnNvbHV0ZVBvc2l0aW9uKHBvcyk7XG4gICAgICAgICAgdHJlZUZvbGlhZ2VCdWNrZXRbdHJlZUluZGV4XS5wdXNoKG5vZGUpO1xuICAgICAgICB9IGVsc2UgaWYgKG5vZGVOYW1lID09PSBcInRydW5rXCIpIHtcbiAgICAgICAgICBsZXQgcG9zID0gbm9kZS5nZXRBYnNvbHV0ZVBvc2l0aW9uKCk7XG4gICAgICAgICAgbm9kZS5zZXRQYXJlbnQobnVsbCk7XG4gICAgICAgICAgbm9kZS5zZXRBYnNvbHV0ZVBvc2l0aW9uKHBvcyk7XG4gICAgICAgICAgdHJlZVRydW5rQnVja2V0W3RyZWVJbmRleF0ucHVzaChub2RlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjb25zb2xlLmxvZyhub2RlTmFtZSk7XG4gICAgICAgICAgY29uc29sZS5hc3NlcnQoZmFsc2UgJiYgXCJVbmtub3duIHRyZWUgY29tcG9uZW50XCIpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIC8vIFdlIGhhdmUgdGhlIGNvbXBvbmVudCBwYXJ0cyBzbyBkb24ndCBuZWVkIHRoZSBvcmlnaW5hbCB0cmVlIGFueW1vcmUuXG4gICAgICB0cmVlLmRpc3Bvc2UoKTtcbiAgICB9KTtcblxuICAgIC8vIENvbWJpbmUgYWxsIHRydW5rcyBvZiB0aGUgc2FtZSBzcGVjaWVzIHRvZ2V0aGVyLlxuICAgIHRyZWVUcnVua0J1Y2tldC5mb3JFYWNoKChidWNrZXQpID0+IHtcbiAgICAgIGlmIChidWNrZXQgJiYgYnVja2V0Lmxlbmd0aCkge1xuICAgICAgICBjb3VudFN0YXJ0ICs9IGJ1Y2tldC5sZW5ndGg7XG4gICAgICAgIGNvdW50RmluYWwrKztcbiAgICAgICAgbGV0IHQgPSBCQUJZTE9OLk1lc2guTWVyZ2VNZXNoZXMoYnVja2V0LCB0cnVlLCB0cnVlLCBudWxsLCB0cnVlKTtcbiAgICAgICAgLy8gdGhpcy5fc2hhZGRvd3MuZ2V0U2hhZG93TWFwKCkucmVuZGVyTGlzdC5wdXNoKHQpO1xuICAgICAgfVxuICAgIH0sIHRoaXMpO1xuICAgIC8vIENvbWJpbmUgYWxsIGxlYXZlcyBvZiB0aGUgc2FtZSBzcGVjaWVzIHRvZ2V0aGVyLlxuICAgIHRyZWVGb2xpYWdlQnVja2V0LmZvckVhY2goKGJ1Y2tldCkgPT4ge1xuICAgICAgaWYgKGJ1Y2tldCAmJiBidWNrZXQubGVuZ3RoKSB7XG4gICAgICAgIGNvdW50U3RhcnQgKz0gYnVja2V0Lmxlbmd0aDtcbiAgICAgICAgY291bnRGaW5hbCsrO1xuICAgICAgICBsZXQgdCA9IEJBQllMT04uTWVzaC5NZXJnZU1lc2hlcyhidWNrZXQsIHRydWUsIHRydWUsIG51bGwsIHRydWUpO1xuICAgICAgICAvLyB0aGlzLl9zaGFkZG93cy5nZXRTaGFkb3dNYXAoKS5yZW5kZXJMaXN0LnB1c2godCk7XG4gICAgICB9XG4gICAgfSwgdGhpcyk7XG5cbiAgICBjb25zb2xlLmxvZyhcIlRyZWUgY29tcG9uZW50IGNvdW50IGJlZm9yZSBfY29uc29saWRhdGVUcmVlczogJWNcIiArXG4gICAgICAgICAgICAgICAgY291bnRTdGFydC50b1N0cmluZygpLFxuICAgICAgICAgICAgICAgIFwiYmFja2dyb3VuZDogb3JhbmdlOyBjb2xvcjogd2hpdGVcIik7XG4gICAgY29uc29sZS5sb2coXCJNZXNoIGNvdW50IGFmdGVyIF9jb25zb2xpZGF0ZVRyZWVzOiAlY1wiICtcbiAgICAgICAgICAgICAgICB0aGlzLl9zY2VuZS5tZXNoZXMubGVuZ3RoLnRvU3RyaW5nKCksXG4gICAgICAgICAgICAgICAgXCJiYWNrZ3JvdW5kOiBvcmFuZ2U7IGNvbG9yOiB3aGl0ZVwiKTtcbiAgICBjb25zb2xlLmxvZyhcIlRyZWUgY29tcG9uZW50IGNvdW50IGFmdGVyIF9jb25zb2xpZGF0ZVRyZWVzOiAlY1wiICtcbiAgICAgICAgICAgICAgICBjb3VudEZpbmFsLnRvU3RyaW5nKCksXG4gICAgICAgICAgICAgICAgXCJiYWNrZ3JvdW5kOiBvcmFuZ2U7IGNvbG9yOiB3aGl0ZVwiKTtcbiAgfVxuXG4gIF9jcmVhdGVHcm91bmRDb3ZlcigpIDogQkFCWUxPTi5TdGFuZGFyZE1hdGVyaWFsIHtcbiAgICBsZXQgZmxvd2VycyA9IFtcbiAgICAgIFwiZ3JlZW5lcnkxLnBuZ1wiLFxuICAgICAgXCJncmVlbmVyeTIucG5nXCIsXG4gICAgICBcImdyZWVuZXJ5My5wbmdcIixcbiAgICAgIFwiZ3JlZW5lcnk0LnBuZ1wiLFxuICAgICAgXCJncmVlbmVyeTUucG5nXCIsXG4gICAgICBcImdyZWVuZXJ5Ni5wbmdcIixcbiAgICAgIFwiZ3JlZW5lcnk3LnBuZ1wiLFxuICAgICAgXCJncmVlbmVyeTgucG5nXCIsXG4gICAgXTtcbiAgICBsZXQgaW1hZ2UgPSB0aGlzLl9ncm91bmRDb3ZlclR5cGVzLmxlbmd0aDtcblxuICAgIGxldCBkZWNhbE1hdGVyaWFsID0gbmV3IEJBQllMT04uU3RhbmRhcmRNYXRlcmlhbChmbG93ZXJzW2ltYWdlXSwgdGhpcy5fc2NlbmUpO1xuICAgIGRlY2FsTWF0ZXJpYWwuZGlmZnVzZVRleHR1cmUgPSBuZXcgQkFCWUxPTi5UZXh0dXJlKFxuICAgICAgXCJ0ZXh0dXJlcy9ncm91bmRjb3Zlci9cIiArIGZsb3dlcnNbaW1hZ2VdLCB0aGlzLl9zY2VuZSk7XG4gICAgZGVjYWxNYXRlcmlhbC5kaWZmdXNlVGV4dHVyZS5oYXNBbHBoYSA9IHRydWU7XG4gICAgZGVjYWxNYXRlcmlhbC56T2Zmc2V0ID0gLU1hdGgucm91bmQodGhpcy5fZ3JvdW5kQ292ZXJUeXBlcy5sZW5ndGggLyAyICsgMSk7XG4gICAgZGVjYWxNYXRlcmlhbC5zcGVjdWxhckNvbG9yID0gbmV3IEJBQllMT04uQ29sb3IzKDAsIDAsIDApO1xuICAgICAgZGVjYWxNYXRlcmlhbC5kaXNhYmxlRGVwdGhXcml0ZSA9IGZhbHNlO1xuICAgICAgZGVjYWxNYXRlcmlhbC5mb3JjZURlcHRoV3JpdGUgPSB0cnVlO1xuXG4gICAgcmV0dXJuIGRlY2FsTWF0ZXJpYWw7XG4gIH1cblxuICBfYXBwbHlHcm91bmRDb3Zlcih4OiBudW1iZXIsIHk6IG51bWJlcikgOiB2b2lkIHtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IE1hdGgucmFuZG9tKCkgKiAzOyBpKyspIHtcbiAgICAgIGxldCBkZWNhbFNjYWxlID0gMjAgKyBNYXRoLnJhbmRvbSgpICogNDA7XG4gICAgICBsZXQgZGVjYWxTaXplID0gQkFCWUxPTi5WZWN0b3IzLk9uZSgpLnNjYWxlKGRlY2FsU2NhbGUpO1xuICAgICAgbGV0IGRlY2FsUm90YXRlID0gTWF0aC5QSSAqIDIgKiBNYXRoLnJhbmRvbSgpO1xuICAgICAgbGV0IG5ld0RlY2FsID0gQkFCWUxPTi5NZXNoQnVpbGRlci5DcmVhdGVEZWNhbChcbiAgICAgICAgXCJncm91bmRDb3Zlcl9cIiArIHggKyBcIl9cIiArIHksXG4gICAgICAgIHRoaXMuX2dyb3VuZCxcbiAgICAgICAge1xuICAgICAgICAgIHBvc2l0aW9uOiBuZXcgQkFCWUxPTi5WZWN0b3IzKHgsIDAsIHkpLFxuICAgICAgICAgbm9ybWFsOiBuZXcgQkFCWUxPTi5WZWN0b3IzKDAsIDEsIDApLFxuICAgICAgICAgc2l6ZTogZGVjYWxTaXplLFxuICAgICAgICAgYW5nbGU6IGRlY2FsUm90YXRlXG4gICAgICAgIH0pO1xuXG4gICAgICBsZXQgbWF0ZXJpYWxJbmRleCA9IE1hdGgucm91bmQoTWF0aC5yYW5kb20oKSAqICh0aGlzLl9ncm91bmRDb3ZlclR5cGVzLmxlbmd0aCAtIDEpKTtcbiAgICAgIGxldCBwcm9wb3NlZE1hdGVyaWFsID0gdGhpcy5fZ3JvdW5kQ292ZXJUeXBlc1ttYXRlcmlhbEluZGV4XTtcbiAgICAgIGxldCBkZWNhbEhlaWdodCA9IHByb3Bvc2VkTWF0ZXJpYWwuek9mZnNldDtcblxuICAgICAgLy8gQ2hlY2sgdGhlIHByb3Bvc2VkIG1hdGVyaWFsIGRvZXMgbm90IGNsYXNoIHdpdGggYW4gb3ZlcmxhcHBpbmcgbWF0ZXJpYWxcbiAgICAgIC8vIGF0IHRoZSBzYW1lIHpPZmZzZXQuXG4gICAgICBsZXQgbm9Db25mbGljdCA9IHRydWU7XG4gICAgICBmb3IgKGxldCBkZWNhbENvdmVyWCA9IHggLSBNYXRoLnJvdW5kKGRlY2FsU2NhbGUgLyAyKTtcbiAgICAgICAgICBkZWNhbENvdmVyWCA8IHggKyBNYXRoLnJvdW5kKGRlY2FsU2NhbGUgLyAyKSAmJiBub0NvbmZsaWN0O1xuICAgICAgICAgIGRlY2FsQ292ZXJYKyspIHtcbiAgICAgICAgZm9yIChsZXQgZGVjYWxDb3ZlclkgPSB5IC0gTWF0aC5yb3VuZChkZWNhbFNjYWxlIC8gMik7XG4gICAgICAgICAgICBkZWNhbENvdmVyWSA8IHkgKyBNYXRoLnJvdW5kKGRlY2FsU2NhbGUgLyAyKTtcbiAgICAgICAgICAgIGRlY2FsQ292ZXJZKyspIHtcbiAgICAgICAgICBsZXQga2V5ID0gXCJcIiArIGRlY2FsQ292ZXJYICsgXCJfXCIgKyBkZWNhbENvdmVyWSArIFwiX1wiICsgZGVjYWxIZWlnaHQ7XG4gICAgICAgICAgaWYgKHRoaXMuX2dyb3VuZENvdmVyW2tleV0pIHtcbiAgICAgICAgICAgIC8vIEFscmVhZHkgZXhpc3RzLlxuICAgICAgICAgICAgbm9Db25mbGljdCA9IGZhbHNlO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmIChub0NvbmZsaWN0KSB7XG4gICAgICAgIG5ld0RlY2FsLm1hdGVyaWFsID0gcHJvcG9zZWRNYXRlcmlhbDtcbiAgICAgICAgLy8gU2V0IGEgcmVjb3JkIG9mIHdoZXJlIHRoaXMgZGVjYWwgY292ZXJzIGFuZCBhdCB3aGF0IHpPZmZzZXQuXG4gICAgICAgIGZvciAobGV0IGRlY2FsQ292ZXJYID0geCAtIE1hdGgucm91bmQoZGVjYWxTY2FsZSAvIDIpO1xuICAgICAgICAgICAgZGVjYWxDb3ZlclggPCB4ICsgTWF0aC5yb3VuZChkZWNhbFNjYWxlIC8gMikgJiYgbm9Db25mbGljdDtcbiAgICAgICAgICAgIGRlY2FsQ292ZXJYKyspIHtcbiAgICAgICAgICBmb3IgKGxldCBkZWNhbENvdmVyWSA9IHkgLSBNYXRoLnJvdW5kKGRlY2FsU2NhbGUgLyAyKTtcbiAgICAgICAgICAgICAgZGVjYWxDb3ZlclkgPCB5ICsgTWF0aC5yb3VuZChkZWNhbFNjYWxlIC8gMik7XG4gICAgICAgICAgICAgIGRlY2FsQ292ZXJZKyspIHtcbiAgICAgICAgICAgIGxldCBrZXkgPSBcIlwiICsgZGVjYWxDb3ZlclggKyBcIl9cIiArIGRlY2FsQ292ZXJZICsgXCJfXCIgKyBkZWNhbEhlaWdodDtcbiAgICAgICAgICAgIHRoaXMuX2dyb3VuZENvdmVyW2tleV0gPSB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbmV3RGVjYWwuZGlzcG9zZSgpO1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5pbnRlcmZhY2UgQ2FtZXJhRGVzY3JpcHRpb24ge1xuICBuYW1lOiBzdHJpbmc7XG4gIGNhbWVyYTogQkFCWUxPTi5DYW1lcmE7XG59XG5cbmNsYXNzIENhbWVyYSB7XG4gIHByaXZhdGUgX2NhbnZhczogSFRNTENhbnZhc0VsZW1lbnQ7XG4gIHByaXZhdGUgX3NjZW5lOiBCQUJZTE9OLlNjZW5lO1xuICBwcml2YXRlIF9jYW1lcmFBcmM6IEJBQllMT04uQXJjUm90YXRlQ2FtZXJhO1xuICBwcml2YXRlIF9jYW1lcmFVbml2ZXJzYWw6IEJBQllMT04uVW5pdmVyc2FsQ2FtZXJhO1xuICBwcml2YXRlIF9jYW1lcmFGb2xsb3c6IEJBQllMT04uRm9sbG93Q2FtZXJhO1xuICAvL3ByaXZhdGUgX3NlbGVjdGVkQWN0b3I6IDA7XG4gIHByaXZhdGUgX3RhcmdldDogQkFCWUxPTi5NZXNoO1xuXG4gIHJlYWRvbmx5IGNhbWVyYXM6IENhbWVyYURlc2NyaXB0aW9uW107XG5cbiAgY29uc3RydWN0b3IoY2FudmFzOiBIVE1MQ2FudmFzRWxlbWVudCwgc2NlbmU6IEJBQllMT04uU2NlbmUsIGFjdG9yczogQ2hhcmFjdGVyW10pIHtcbiAgICB0aGlzLl9jYW52YXMgPSBjYW52YXM7XG4gICAgdGhpcy5fc2NlbmUgPSBzY2VuZTtcbiAgICB0aGlzLmNhbWVyYXMgPSBbXTtcblxuICAgIHRoaXMuX3RhcmdldCA9IEJBQllMT04uTWVzaEJ1aWxkZXIuQ3JlYXRlU3BoZXJlKFxuICAgICAgXCJ0YXJnZXRDYW1lcmFcIiwge2RpYW1ldGVyWDogMC4xLCBkaWFtZXRlclk6IDAuMSwgZGlhbWV0ZXJaOiAwLjF9LCB0aGlzLl9zY2VuZSk7XG4gICAgdGhpcy5fdGFyZ2V0LnBvc2l0aW9uID0gbmV3IEJBQllMT04uVmVjdG9yMygxMDAsIDQwLCAxMDApO1xuXG4gICAgdGhpcy5fY2FtZXJhQXJjID0gbmV3IEJBQllMT04uQXJjUm90YXRlQ2FtZXJhKFxuICAgICAgXCJBcmNSb3RhdGVDYW1lcmFcIiwgMCwgMCwgMiwgbmV3IEJBQllMT04uVmVjdG9yMygwLCAzMCwgMCksIHRoaXMuX3NjZW5lKTtcbiAgICB0aGlzLl9jYW1lcmFBcmMuc2V0UG9zaXRpb24obmV3IEJBQllMT04uVmVjdG9yMyg1LCAxNywgMzApKTtcbiAgICB0aGlzLl9jYW1lcmFBcmMubWluWiA9IDAuNTtcbiAgICB0aGlzLl9jYW1lcmFBcmMubWF4WiA9IDgwMDtcbiAgICB0aGlzLl9jYW1lcmFBcmMubG93ZXJCZXRhTGltaXQgPSAwLjE7XG4gICAgdGhpcy5fY2FtZXJhQXJjLnVwcGVyQmV0YUxpbWl0ID0gKE1hdGguUEkgLyAyKSAtIDAuMTtcbiAgICB0aGlzLl9jYW1lcmFBcmMubG93ZXJSYWRpdXNMaW1pdCA9IDI7XG4gICAgdGhpcy5fY2FtZXJhQXJjLmF0dGFjaENvbnRyb2wodGhpcy5fY2FudmFzLCB0cnVlLCBmYWxzZSk7XG4gICAgdGhpcy5fY2FtZXJhQXJjLnNldFRhcmdldCh0aGlzLl90YXJnZXQucG9zaXRpb24pO1xuICAgIHRoaXMuX3NjZW5lLmFjdGl2ZUNhbWVyYSA9IHRoaXMuX2NhbWVyYUFyYztcbiAgICB0aGlzLmNhbWVyYXMucHVzaCh7XCJuYW1lXCI6IFwiQXJjUm90YXRlXCIsIFwiY2FtZXJhXCI6IHRoaXMuX2NhbWVyYUFyY30pO1xuXG4gICAgdGhpcy5fY2FtZXJhVW5pdmVyc2FsID0gbmV3IEJBQllMT04uVW5pdmVyc2FsQ2FtZXJhKFxuICAgICAgXCJVbml2ZXJzYWxDYW1lcmFcIiwgbmV3IEJBQllMT04uVmVjdG9yMygwLCAwLCAtIDEwKSwgdGhpcy5fc2NlbmUpO1xuICAgIHRoaXMuX2NhbWVyYVVuaXZlcnNhbC5zZXRUYXJnZXQodGhpcy5fdGFyZ2V0LnBvc2l0aW9uKTtcbiAgICB0aGlzLmNhbWVyYXMucHVzaCh7XCJuYW1lXCI6IFwiVW5pdmVyc2FsXCIsIFwiY2FtZXJhXCI6IHRoaXMuX2NhbWVyYVVuaXZlcnNhbH0pO1xuXG4gICAgdGhpcy5fY2FtZXJhRm9sbG93ID0gbmV3IEJBQllMT04uRm9sbG93Q2FtZXJhKFxuICAgICAgXCJGb2xsb3dDYW1lcmFcIiwgbmV3IEJBQllMT04uVmVjdG9yMygwLCAxLCAtIDEwKSwgdGhpcy5fc2NlbmUpO1xuICAgIHRoaXMuX2NhbWVyYUZvbGxvdy5yYWRpdXMgPSAxMDtcbiAgICB0aGlzLl9jYW1lcmFGb2xsb3cuaGVpZ2h0T2Zmc2V0ID0gMTtcbiAgICB0aGlzLl9jYW1lcmFGb2xsb3cucm90YXRpb25PZmZzZXQgPSAxODAgLyA0O1xuICAgIHRoaXMuX2NhbWVyYUZvbGxvdy5jYW1lcmFBY2NlbGVyYXRpb24gPSAwLjAyO1xuICAgIHRoaXMuX2NhbWVyYUZvbGxvdy5tYXhDYW1lcmFTcGVlZCA9IDIwO1xuICAgIHRoaXMuX2NhbWVyYUZvbGxvdy5hdHRhY2hDb250cm9sKHRoaXMuX2NhbnZhcywgdHJ1ZSk7XG4gICAgdGhpcy5fY2FtZXJhRm9sbG93LmxvY2tlZFRhcmdldCA9IHRoaXMuX3RhcmdldDtcbiAgICAvL3RoaXMuX2NhbWVyYUZvbGxvdy5sb3dlclJhZGl1c0xpbWl0ID0gMztcbiAgICAvL3RoaXMuX2NhbWVyYUZvbGxvdy5sb3dlckhlaWdodE9mZnNldExpbWl0ID0gMTtcbiAgICB0aGlzLmNhbWVyYXMucHVzaCh7XCJuYW1lXCI6IFwiRm9sbG93XCIsIFwiY2FtZXJhXCI6IHRoaXMuX2NhbWVyYUZvbGxvd30pO1xuXG4gICAgdGhpcy5fc2NlbmUub25CZWZvcmVSZW5kZXJPYnNlcnZhYmxlLmFkZCgoKSA9PiB7XG4gICAgICBpZiAodGhpcy5fY2FtZXJhQXJjLmdldFRhcmdldCgpICE9IHRoaXMuX3RhcmdldC5wb3NpdGlvbikge1xuICAgICAgICB0aGlzLl9jYW1lcmFBcmMuc2V0VGFyZ2V0KHRoaXMuX3RhcmdldC5wb3NpdGlvbik7XG4gICAgICB9XG4gICAgICAvL3RoaXMuX2NhbWVyYUFyYy5yZWJ1aWxkQW5nbGVzQW5kUmFkaXVzKCk7XG4gICAgfSk7XG4gIH1cblxuICBzZXRUYXJnZXQodGFyZ2V0UG9zaXRpb246IEJBQllMT04uVmVjdG9yMykge1xuICAgIC8vdGhpcy5fY2FtZXJhQXJjLnNldFRhcmdldCh0YXJnZXRQb3NpdGlvbik7XG4gICAgLy90aGlzLl9jYW1lcmFVbml2ZXJzYWwuc2V0VGFyZ2V0KHRhcmdldFBvc2l0aW9uKTtcblxuICAgIGxldCBhbmltYXRpb24gPSBuZXcgQkFCWUxPTi5BbmltYXRpb24oXG4gICAgICBcImNhbWVyYVRhcmdldEVhc2VcIixcbiAgICAgIFwicG9zaXRpb25cIixcbiAgICAgIDMwLFxuICAgICAgQkFCWUxPTi5BbmltYXRpb24uQU5JTUFUSU9OVFlQRV9WRUNUT1IzLFxuICAgICAgQkFCWUxPTi5BbmltYXRpb24uQU5JTUFUSU9OTE9PUE1PREVfQ1lDTEUpO1xuXG4gICAgLy8gQW5pbWF0aW9uIGtleXNcbiAgICB2YXIga2V5cyA9IFtdO1xuICAgIGtleXMucHVzaCh7IGZyYW1lOiAwLCB2YWx1ZTogdGhpcy5fdGFyZ2V0LnBvc2l0aW9uIH0pO1xuICAgIGtleXMucHVzaCh7IGZyYW1lOiAxMjAsIHZhbHVlOiB0YXJnZXRQb3NpdGlvbiB9KTtcbiAgICBhbmltYXRpb24uc2V0S2V5cyhrZXlzKTtcblxuICAgIHZhciBlYXNpbmdGdW5jdGlvbiA9IG5ldyBCQUJZTE9OLkNpcmNsZUVhc2UoKTtcbiAgICBlYXNpbmdGdW5jdGlvbi5zZXRFYXNpbmdNb2RlKEJBQllMT04uRWFzaW5nRnVuY3Rpb24uRUFTSU5HTU9ERV9FQVNFSU5PVVQpO1xuICAgIGFuaW1hdGlvbi5zZXRFYXNpbmdGdW5jdGlvbihlYXNpbmdGdW5jdGlvbik7XG4gICAgdGhpcy5fdGFyZ2V0LmFuaW1hdGlvbnMucHVzaChhbmltYXRpb24pO1xuICAgIHRoaXMuX3NjZW5lLmJlZ2luQW5pbWF0aW9uKHRoaXMuX3RhcmdldCwgMCwgMTIwLCBmYWxzZSk7XG5cbiAgfVxuXG4gIHNldEVuYWJsZWQoY2FtZXJhOiBDYW1lcmFEZXNjcmlwdGlvbik6IHZvaWQge1xuICAgIGNvbnNvbGUubG9nKGNhbWVyYSwgdGhpcy5fc2NlbmUuYWN0aXZlQ2FtZXJhLm5hbWUpO1xuICAgIGlmICh0aGlzLl9zY2VuZS5hY3RpdmVDYW1lcmEubmFtZSA9PSBcIlVuaXZlcnNhbENhbWVyYVwiKSB7XG4gICAgICAvLyBNb3ZlIHRoZSBjYW1lcmEgdGFyZ2V0IGluIGZyb250IG9mIG9sZCBjYW1lcmEgdG8gYWxsb3cgZm9yIGFuaW1hdGlvbiB0b1xuICAgICAgLy8gbmV3IGNhbWVyYSBvcmllbnRhdGlvbi5cbiAgICAgIGxldCBkaXN0YW5jZSA9IEJBQllMT04uVmVjdG9yMy5EaXN0YW5jZShcbiAgICAgICAgdGhpcy5fY2FtZXJhVW5pdmVyc2FsLnBvc2l0aW9uLCB0aGlzLl9jYW1lcmFBcmMudGFyZ2V0KTtcbiAgICAgIHRoaXMuX3RhcmdldC5wb3NpdGlvbiA9IHRoaXMuX2NhbWVyYVVuaXZlcnNhbC5nZXRGcm9udFBvc2l0aW9uKGRpc3RhbmNlKTtcbiAgICAgIHRoaXMuc2V0VGFyZ2V0KG5ldyBCQUJZTE9OLlZlY3RvcjMoMCwgMCwgMCkpO1xuICAgIH1cbiAgICB0aGlzLl9jYW1lcmFBcmMuZGV0YWNoQ29udHJvbCh0aGlzLl9jYW52YXMpO1xuICAgIHRoaXMuX2NhbWVyYVVuaXZlcnNhbC5kZXRhY2hDb250cm9sKHRoaXMuX2NhbnZhcyk7XG4gICAgdGhpcy5fY2FtZXJhRm9sbG93LmRldGFjaENvbnRyb2wodGhpcy5fY2FudmFzKTtcblxuICAgIC8vIFNldCB0aGUgbmV3IGNhbWVyYS5cbiAgICBpZiAoY2FtZXJhLm5hbWUgPT09IFwiQXJjUm90YXRlXCIpIHtcbiAgICAgIHRoaXMuX2NhbWVyYUFyYy5zZXRQb3NpdGlvbih0aGlzLl9zY2VuZS5hY3RpdmVDYW1lcmEucG9zaXRpb24pO1xuICAgICAgdGhpcy5fY2FtZXJhQXJjLnJlYnVpbGRBbmdsZXNBbmRSYWRpdXMoKTtcbiAgICAgIHRoaXMuX2NhbWVyYUFyYy5hdHRhY2hDb250cm9sKHRoaXMuX2NhbnZhcywgdHJ1ZSwgZmFsc2UpO1xuICAgICAgdGhpcy5fc2NlbmUuYWN0aXZlQ2FtZXJhID0gdGhpcy5fY2FtZXJhQXJjO1xuICAgIH0gZWxzZSBpZiAoY2FtZXJhLm5hbWUgPT09IFwiVW5pdmVyc2FsXCIpIHtcbiAgICAgIHRoaXMuX2NhbWVyYVVuaXZlcnNhbC5hdHRhY2hDb250cm9sKHRoaXMuX2NhbnZhcywgdHJ1ZSk7XG4gICAgICB0aGlzLl9jYW1lcmFVbml2ZXJzYWwucG9zaXRpb24gPSB0aGlzLl9zY2VuZS5hY3RpdmVDYW1lcmEucG9zaXRpb247XG4gICAgICB0aGlzLl9jYW1lcmFVbml2ZXJzYWwuc2V0VGFyZ2V0KHRoaXMuX3RhcmdldC5wb3NpdGlvbik7XG4gICAgICB0aGlzLl9zY2VuZS5hY3RpdmVDYW1lcmEgPSB0aGlzLl9jYW1lcmFVbml2ZXJzYWw7XG4gICAgfSBlbHNlIGlmIChjYW1lcmEubmFtZSA9PT0gXCJGb2xsb3dcIikge1xuICAgICAgdGhpcy5fY2FtZXJhRm9sbG93LnBvc2l0aW9uID0gdGhpcy5fc2NlbmUuYWN0aXZlQ2FtZXJhLnBvc2l0aW9uO1xuICAgICAgdGhpcy5fc2NlbmUuYWN0aXZlQ2FtZXJhID0gdGhpcy5fY2FtZXJhRm9sbG93O1xuXG4gICAgICB0aGlzLl9jYW1lcmFGb2xsb3cuaW5wdXRzLmF0dGFjaElucHV0KFxuICAgICAgICB0aGlzLl9jYW1lcmFGb2xsb3cuaW5wdXRzLmF0dGFjaGVkLkZvbGxvd0NhbWVyYUNvbnRyb2xzKTtcbiAgICAgIHRoaXMuX2NhbWVyYUZvbGxvdy5hdHRhY2hDb250cm9sKHRoaXMuX2NhbnZhcywgdHJ1ZSk7XG4gICAgICBjb25zb2xlLmxvZyh0aGlzLl9jYW1lcmFGb2xsb3cuaW5wdXRzKTtcbiAgICB9XG4gIH1cbn1cblxuY2xhc3MgR2FtZSB7XG4gIHByaXZhdGUgX2NhbnZhczogSFRNTENhbnZhc0VsZW1lbnQ7XG4gIHByaXZhdGUgX2VuZ2luZTogQkFCWUxPTi5FbmdpbmU7XG4gIHByaXZhdGUgX3NjZW5lOiBCQUJZTE9OLlNjZW5lO1xuICBwcml2YXRlIF9saWdodDogQkFCWUxPTi5EaXJlY3Rpb25hbExpZ2h0O1xuICBwcml2YXRlIF9za3lib3g6IEJBQllMT04uTWVzaDtcbiAgcHJpdmF0ZSBfYWN0b3JzOiBDaGFyYWN0ZXJbXTtcbiAgcHJpdmF0ZSBfY2FtZXJhOiBDYW1lcmE7XG5cbiAgY29uc3RydWN0b3IoY2FudmFzRWxlbWVudCA6IHN0cmluZykge1xuICAgIC8vIENyZWF0ZSBjYW52YXMgYW5kIGVuZ2luZS5cbiAgICB0aGlzLl9jYW52YXMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChjYW52YXNFbGVtZW50KSBhcyBIVE1MQ2FudmFzRWxlbWVudDtcbiAgICB0aGlzLl9lbmdpbmUgPSBuZXcgQkFCWUxPTi5FbmdpbmUodGhpcy5fY2FudmFzLCB0cnVlKTtcbiAgICB0aGlzLl9hY3RvcnMgPSBbXTtcbiAgfVxuXG4gIGNyZWF0ZVNjZW5lKCkgOiB2b2lkIHtcbiAgICBCQUJZTE9OLlNjZW5lTG9hZGVyLkNsZWFuQm9uZU1hdHJpeFdlaWdodHMgPSB0cnVlO1xuICAgIHRoaXMuX3NjZW5lID0gbmV3IEJBQllMT04uU2NlbmUodGhpcy5fZW5naW5lKTtcbiAgICB0aGlzLl9zY2VuZS5hbWJpZW50Q29sb3IgPSBuZXcgQkFCWUxPTi5Db2xvcjMoMC4zLCAwLjMsIDAuMyk7XG5cbiAgICAvLyBGb2dcbiAgICB0aGlzLl9zY2VuZS5mb2dNb2RlID0gQkFCWUxPTi5TY2VuZS5GT0dNT0RFX0VYUDI7XG4gICAgdGhpcy5fc2NlbmUuZm9nQ29sb3IgPSBuZXcgQkFCWUxPTi5Db2xvcjMoMC4yLCAwLjIsIDAuMik7XG4gICAgdGhpcy5fc2NlbmUuZm9nRGVuc2l0eSA9IDAuMDAzO1xuXG4gICAgLy8gU2t5Ym94XG4gICAgdGhpcy5fc2t5Ym94ID0gQkFCWUxPTi5NZXNoLkNyZWF0ZUJveChcInNreUJveFwiLCAxMDAwLjAsIHRoaXMuX3NjZW5lKTtcbiAgICB0aGlzLl9za3lib3guc2NhbGluZy55ID0gMC4xMjU7XG4gICAgdmFyIHNreWJveE1hdGVyaWFsID0gbmV3IEJBQllMT04uU3RhbmRhcmRNYXRlcmlhbChcInNreUJveFwiLCB0aGlzLl9zY2VuZSk7XG4gICAgc2t5Ym94TWF0ZXJpYWwucmVmbGVjdGlvblRleHR1cmUgPSBuZXcgQkFCWUxPTi5DdWJlVGV4dHVyZShcInRleHR1cmVzL3NreWJveFwiLCB0aGlzLl9zY2VuZSk7XG4gICAgc2t5Ym94TWF0ZXJpYWwucmVmbGVjdGlvblRleHR1cmUuY29vcmRpbmF0ZXNNb2RlID0gQkFCWUxPTi5UZXh0dXJlLlNLWUJPWF9NT0RFO1xuICAgIHNreWJveE1hdGVyaWFsLmRpZmZ1c2VDb2xvciA9IG5ldyBCQUJZTE9OLkNvbG9yMygwLCAwLCAwKTtcbiAgICBza3lib3hNYXRlcmlhbC5zcGVjdWxhckNvbG9yID0gbmV3IEJBQllMT04uQ29sb3IzKDAsIDAsIDApO1xuICAgIHNreWJveE1hdGVyaWFsLmRpc2FibGVMaWdodGluZyA9IHRydWU7XG4gICAgc2t5Ym94TWF0ZXJpYWwuYmFja0ZhY2VDdWxsaW5nID0gZmFsc2U7XG4gICAgdGhpcy5fc2t5Ym94Lm1hdGVyaWFsID0gc2t5Ym94TWF0ZXJpYWw7XG4gICAgdGhpcy5fc2t5Ym94LnNldEVuYWJsZWQoZmFsc2UpO1xuXG4gICAgLy8gTGlnaHRpbmdcbiAgICB0aGlzLl9saWdodCA9IG5ldyBCQUJZTE9OLkRpcmVjdGlvbmFsTGlnaHQoXG4gICAgICBcImRpcjAxXCIsIG5ldyBCQUJZTE9OLlZlY3RvcjMoMCwgLTAuNSwgLSAxLjApLCB0aGlzLl9zY2VuZSk7XG4gICAgdGhpcy5fbGlnaHQucG9zaXRpb24gPSBuZXcgQkFCWUxPTi5WZWN0b3IzKDIwLCAxNTAsIDcwKTtcbiAgICBsZXQgc3VuID0gQkFCWUxPTi5NZXNoQnVpbGRlci5DcmVhdGVTcGhlcmUoXCJzdW5cIiwge30sIHRoaXMuX3NjZW5lKTtcbiAgICBzdW4ucG9zaXRpb24gPSB0aGlzLl9saWdodC5wb3NpdGlvbjtcblxuICAgIC8vIENhbWVyYVxuICAgIHRoaXMuX2NhbWVyYSA9IG5ldyBDYW1lcmEodGhpcy5fY2FudmFzLCB0aGlzLl9zY2VuZSwgdGhpcy5fYWN0b3JzKTtcblxuICAgIC8vIEdyb3VuZFxuICAgIGxldCBncm91bmQgPSBCQUJZTE9OLk1lc2guQ3JlYXRlR3JvdW5kKFwiZ3JvdW5kXCIsIDEwMDAsIDEwMDAsIDEsIHRoaXMuX3NjZW5lLCBmYWxzZSk7XG4gICAgbGV0IGdyb3VuZE1hdGVyaWFsID0gbmV3IEJBQllMT04uU3RhbmRhcmRNYXRlcmlhbChcImdyb3VuZFwiLCB0aGlzLl9zY2VuZSk7XG4gICAgZ3JvdW5kTWF0ZXJpYWwuZGlmZnVzZVRleHR1cmUgPSBuZXcgQkFCWUxPTi5UZXh0dXJlKFwidGV4dHVyZXMvZ3Jhc3MucG5nXCIsIHRoaXMuX3NjZW5lKTtcbiAgICAoPEJBQllMT04uVGV4dHVyZT5ncm91bmRNYXRlcmlhbC5kaWZmdXNlVGV4dHVyZSkudVNjYWxlID0gNjQ7XG4gICAgKDxCQUJZTE9OLlRleHR1cmU+Z3JvdW5kTWF0ZXJpYWwuZGlmZnVzZVRleHR1cmUpLnZTY2FsZSA9IDY0O1xuICAgIGdyb3VuZE1hdGVyaWFsLmRpZmZ1c2VDb2xvciA9IG5ldyBCQUJZTE9OLkNvbG9yMygwLjQsIDAuNCwgMC40KTtcbiAgICBncm91bmRNYXRlcmlhbC5zcGVjdWxhckNvbG9yID0gbmV3IEJBQllMT04uQ29sb3IzKDAsIDAsIDApO1xuICAgIGdyb3VuZC5tYXRlcmlhbCA9IGdyb3VuZE1hdGVyaWFsO1xuICAgIGdyb3VuZC5yZWNlaXZlU2hhZG93cyA9IHRydWU7XG5cbiAgICAvLyBTaGFkb3dzXG4gICAgbGV0IHNoYWRvd0dlbmVyYXRvciA9IG5ldyBCQUJZTE9OLlNoYWRvd0dlbmVyYXRvcigxMDI0LCB0aGlzLl9saWdodCk7XG5cbiAgICAvLyBTY2VuZXJ5XG4gICAgbGV0IHNjZW5lcnkgPSBuZXcgU2NlbmVyeSh0aGlzLl9zY2VuZSwgc2hhZG93R2VuZXJhdG9yLCBncm91bmQsIDI1Nik7XG4gICAgc2NlbmVyeS5jYWxjdWxhdGVQYXRoKHtcInhcIjogMjU1LCBcInlcIjogMjU1fSwge1wieFwiOiAwLCBcInlcIjogMH0pO1xuXG4gICAgdGhpcy5fc2NlbmUub25Qb2ludGVyRG93biA9IGZ1bmN0aW9uKGV2dCwgcGlja1Jlc3VsdCkge1xuICAgICAgICAvLyBpZiB0aGUgY2xpY2sgaGl0cyB0aGUgZ3JvdW5kIG9iamVjdCwgd2UgY2hhbmdlIHRoZSBpbXBhY3QgcG9zaXRpb25cbiAgICAgICAgaWYgKHBpY2tSZXN1bHQuaGl0KSB7XG4gICAgICAgICAgICB0YXJnZXRIZWFkLnBvc2l0aW9uLnggPSBwaWNrUmVzdWx0LnBpY2tlZFBvaW50Lng7XG4gICAgICAgICAgICB0YXJnZXRIZWFkLnBvc2l0aW9uLnkgPSBwaWNrUmVzdWx0LnBpY2tlZFBvaW50Lnk7XG4gICAgICAgICAgICB0YXJnZXRIZWFkLnBvc2l0aW9uLnogPSBwaWNrUmVzdWx0LnBpY2tlZFBvaW50Lno7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLy8gTWVzaGVzXG4gICAgLy8gV29ybGQgcG9zaXRpb25zOiAobC9yLCB1L2QsIGYvYilcbiAgICAvLyBsZXQgZGVidWdCYXNlID0gQkFCWUxPTi5NZXNoQnVpbGRlci5DcmVhdGVCb3goXCJkZWJ1Z0Jhc2VcIiwge2hlaWdodDogMC4wMSwgd2lkdGg6IDAuNSwgZGVwdGg6IDF9LCB0aGlzLl9zY2VuZSk7XG4gICAgLy8gZGVidWdCYXNlLnJlY2VpdmVTaGFkb3dzID0gdHJ1ZTtcblxuICAgIC8vIE1vdmluZyBiYWxsIGZvciB0aGUgZm94IHRvIHdhdGNoLlxuICAgIGxldCB0YXJnZXRIZWFkID0gQkFCWUxPTi5NZXNoQnVpbGRlci5DcmVhdGVTcGhlcmUoXG4gICAgICBcInRhcmdldEhlYWRcIiwge2RpYW1ldGVyWDogMC4wMSwgZGlhbWV0ZXJZOiAwLjAxLCBkaWFtZXRlclo6IDAuMDF9LCB0aGlzLl9zY2VuZSk7XG4gICAgdGFyZ2V0SGVhZC5wb3NpdGlvbiA9IHRoaXMuX2xpZ2h0LnBvc2l0aW9uLmNsb25lKCk7XG4gICAgc2hhZG93R2VuZXJhdG9yLmdldFNoYWRvd01hcCgpLnJlbmRlckxpc3QucHVzaCh0YXJnZXRIZWFkKTtcbiAgICAvLyBGb3hcbiAgICBsZXQgZm94ID0gbmV3IENoYXJhY3Rlcih0aGlzLl9zY2VuZSwgc2hhZG93R2VuZXJhdG9yLCBGT1gsICgpID0+IHtcbiAgICAgIGNvbnNvbGUubG9nKFwiZm94IGxvYWRlZFwiKTtcbiAgICAgIHRoaXMuX2NhbWVyYS5zZXRUYXJnZXQoZm94LnBvc2l0aW9uKTtcbiAgICAgIGZveC5sb29rQXQodGFyZ2V0SGVhZC5wb3NpdGlvbik7XG4gICAgICBmb3gucm90YXRpb24ueSA9IE1hdGguUEk7XG4gICAgfSk7XG4gICAgdGhpcy5fYWN0b3JzLnB1c2goZm94KTtcbiAgICAvLyBTdGFyXG4gICAgbGV0IHN0YXIgPSBuZXcgU3Rhcih0aGlzLl9zY2VuZSwgc2NlbmVyeSk7XG4gICAgc3Rhci5tZXNoLnBvc2l0aW9uID0gbmV3IEJBQllMT04uVmVjdG9yMygwLCA1LCAwKTtcblxuICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICBjb25zb2xlLmxvZyhcIkFkZCBhbmltYXRpb25zLlwiKTtcbiAgICAgIC8vdGhpcy5fYW5pbWF0aW9uUXVldWUucHVzaCh7bmFtZTogXCJzdGF0aW9uYXJ5XCIsIGxvb3A6IGZhbHNlLCByZXZlcnNlZDogZmFsc2V9KTtcbiAgICAgIGZveC5xdWV1ZUFuaW1hdGlvbih7bmFtZTogXCJjcm91Y2hcIiwgbG9vcDogZmFsc2UsIHJldmVyc2VkOiBmYWxzZX0pO1xuICAgICAgZm94LnF1ZXVlQW5pbWF0aW9uKHtuYW1lOiBcImNyb3VjaFwiLCBsb29wOiBmYWxzZSwgcmV2ZXJzZWQ6IHRydWV9KTtcbiAgICAgIC8vdGhpcy5fYW5pbWF0aW9uUXVldWUucHVzaCh7bmFtZTogXCJzdGF0aW9uYXJ5XCIsIGxvb3A6IHRydWUsIHJldmVyc2VkOiBmYWxzZX0pO1xuICAgIH0uYmluZCh0aGlzKSwgMTAwMDApO1xuXG4gICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgIGNvbnNvbGUubG9nKFwiQWRkIGNyb3VjaCBhbmltYXRpb24uXCIpO1xuICAgICAgZm94LnF1ZXVlQW5pbWF0aW9uKHtuYW1lOiBcImNyb3VjaFwiLCBsb29wOiBmYWxzZSwgcmV2ZXJzZWQ6IGZhbHNlfSk7XG4gICAgICBmb3gucXVldWVBbmltYXRpb24oe25hbWU6IFwiY3JvdWNoXCIsIGxvb3A6IGZhbHNlLCByZXZlcnNlZDogdHJ1ZX0pO1xuICAgIH0uYmluZCh0aGlzKSwgMjAwMDApO1xuXG4gICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgIGNvbnNvbGUubG9nKFwiQWRkIHdhbGsgYW5pbWF0aW9uLlwiKTtcbiAgICAgIGZveC5xdWV1ZUFuaW1hdGlvbih7bmFtZTogXCJ3YWxrXCIsIGxvb3A6IHRydWUsIHJldmVyc2VkOiBmYWxzZX0pO1xuICAgIH0uYmluZCh0aGlzKSwgMzAwMDApO1xuXG4gICAgdGhpcy5jb250cm9sUGFubmVsKCk7XG4gICAgY29uc29sZS5sb2coXCJUb3RhbCBtZXNoZXMgaW4gc2NlbmU6ICVjXCIgK1xuICAgICAgICAgICAgICAgIHRoaXMuX3NjZW5lLm1lc2hlcy5sZW5ndGgudG9TdHJpbmcoKSxcbiAgICAgICAgICAgICAgICBcImJhY2tncm91bmQ6IG9yYW5nZTsgY29sb3I6IHdoaXRlXCIpO1xuICB9XG5cbiAgZG9SZW5kZXIoKSA6IHZvaWQge1xuICAgIC8vIFJ1biB0aGUgcmVuZGVyIGxvb3AuXG4gICAgdGhpcy5fZW5naW5lLnJ1blJlbmRlckxvb3AoKCkgPT4ge1xuICAgICAgdGhpcy5fc2NlbmUucmVuZGVyKCk7XG4gICAgICBsZXQgZnBzTGFiZWwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImZwc0xhYmVsXCIpO1xuICAgICAgZnBzTGFiZWwuaW5uZXJIVE1MID0gdGhpcy5fZW5naW5lLmdldEZwcygpLnRvRml4ZWQoKSArIFwiIGZwc1wiO1xuICAgIH0pO1xuXG4gICAgLy8gVGhlIGNhbnZhcy93aW5kb3cgcmVzaXplIGV2ZW50IGhhbmRsZXIuXG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsICgpID0+IHtcbiAgICAgIHRoaXMuX2VuZ2luZS5yZXNpemUoKTtcbiAgICB9KTtcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcIm9yaWVudGF0aW9uY2hhbmdlXCIsICgpID0+IHtcbiAgICAgIHRoaXMuX2VuZ2luZS5yZXNpemUoKTtcbiAgICB9KTtcbiAgfVxuXG4gIGNvbnRyb2xQYW5uZWwoKSA6IHZvaWQge1xuICAgIGxldCBhZHZhbmNlZFRleHR1cmUgPSBCQUJZTE9OLkdVSS5BZHZhbmNlZER5bmFtaWNUZXh0dXJlLkNyZWF0ZUZ1bGxzY3JlZW5VSShcIlVJXCIpO1xuXG4gICAgbGV0IGdyaWQgPSBuZXcgQkFCWUxPTi5HVUkuR3JpZCgpO1xuICAgIGdyaWQuYWRkQ29sdW1uRGVmaW5pdGlvbigxMCwgdHJ1ZSk7XG4gICAgZ3JpZC5hZGRDb2x1bW5EZWZpbml0aW9uKDIwMCwgdHJ1ZSk7XG4gICAgZ3JpZC5hZGRSb3dEZWZpbml0aW9uKDIwLCB0cnVlKTtcbiAgICBncmlkLmFkZFJvd0RlZmluaXRpb24oMjAsIHRydWUpO1xuICAgIHRoaXMuX2NhbWVyYS5jYW1lcmFzLmZvckVhY2goKGNhbWVyYSkgPT4ge1xuICAgICAgZ3JpZC5hZGRSb3dEZWZpbml0aW9uKDIwLCB0cnVlKTtcbiAgICB9KTtcbiAgICBhZHZhbmNlZFRleHR1cmUuYWRkQ29udHJvbChncmlkKTtcbiAgICBsZXQgZ3JpZGNvdW50ID0gMDtcblxuICAgIGxldCBwYW5lbCA9IG5ldyBCQUJZTE9OLkdVSS5TdGFja1BhbmVsKCk7XG4gICAgcGFuZWwud2lkdGggPSBcIjIyMHB4XCI7XG4gICAgcGFuZWwuZm9udFNpemUgPSBcIjE0cHhcIjtcbiAgICBwYW5lbC5ob3Jpem9udGFsQWxpZ25tZW50ID0gQkFCWUxPTi5HVUkuQ29udHJvbC5IT1JJWk9OVEFMX0FMSUdOTUVOVF9SSUdIVDtcbiAgICBwYW5lbC52ZXJ0aWNhbEFsaWdubWVudCA9IEJBQllMT04uR1VJLkNvbnRyb2wuVkVSVElDQUxfQUxJR05NRU5UX0NFTlRFUjtcblxuICAgIGxldCBjaGVja2JveCA9IG5ldyBCQUJZTE9OLkdVSS5DaGVja2JveCgpO1xuICAgIGNoZWNrYm94LndpZHRoID0gXCIyMHB4XCI7XG4gICAgY2hlY2tib3guaGVpZ2h0ID0gXCIyMHB4XCI7XG4gICAgY2hlY2tib3guaXNDaGVja2VkID0gZmFsc2U7XG4gICAgY2hlY2tib3guY29sb3IgPSBcImdyZWVuXCI7XG4gICAgY2hlY2tib3gub25Jc0NoZWNrZWRDaGFuZ2VkT2JzZXJ2YWJsZS5hZGQoKHZhbHVlKSA9PiB7XG4gICAgICBjb25zb2xlLmxvZyhcIiVjIFNreUJveDpcIiwgXCJiYWNrZ3JvdW5kOiBibHVlOyBjb2xvcjogd2hpdGVcIiwgdmFsdWUpO1xuICAgICAgdGhpcy5fc2t5Ym94LnNldEVuYWJsZWQodmFsdWUpO1xuICAgIH0pO1xuICAgIGdyaWQuYWRkQ29udHJvbChjaGVja2JveCwgZ3JpZGNvdW50LCAwKTtcblxuICAgIGxldCBoZWFkZXIgPSBCQUJZTE9OLkdVSS5Db250cm9sLkFkZEhlYWRlcihcbiAgICAgIGNoZWNrYm94LCBcIlNreUJveFwiLCBcIjE4MHB4XCIsIHsgaXNIb3Jpem9udGFsOiB0cnVlLCBjb250cm9sRmlyc3Q6IHRydWV9KTtcbiAgICBoZWFkZXIuY29sb3IgPSBcIndoaXRlXCI7XG4gICAgaGVhZGVyLmhlaWdodCA9IFwiMjBweFwiO1xuICAgIGhlYWRlci5ob3Jpem9udGFsQWxpZ25tZW50ID0gQkFCWUxPTi5HVUkuQ29udHJvbC5IT1JJWk9OVEFMX0FMSUdOTUVOVF9MRUZUO1xuICAgIGdyaWQuYWRkQ29udHJvbChoZWFkZXIsIGdyaWRjb3VudCsrLCAxKTtcblxuICAgIGxldCBjaGVja2JveDIgPSBuZXcgQkFCWUxPTi5HVUkuQ2hlY2tib3goKTtcbiAgICBjaGVja2JveDIud2lkdGggPSBcIjIwcHhcIjtcbiAgICBjaGVja2JveDIuaGVpZ2h0ID0gXCIyMHB4XCI7XG4gICAgY2hlY2tib3gyLmlzQ2hlY2tlZCA9IHRydWU7XG4gICAgY2hlY2tib3gyLmNvbG9yID0gXCJncmVlblwiO1xuICAgIGNoZWNrYm94Mi5vbklzQ2hlY2tlZENoYW5nZWRPYnNlcnZhYmxlLmFkZCgodmFsdWUpID0+IHtcbiAgICAgIGNvbnNvbGUubG9nKFwiJWMgRm9nOlwiLCBcImJhY2tncm91bmQ6IGJsdWU7IGNvbG9yOiB3aGl0ZVwiLCB2YWx1ZSk7XG4gICAgICBpZiAodmFsdWUpIHtcbiAgICAgICAgdGhpcy5fc2NlbmUuZm9nTW9kZSA9IEJBQllMT04uU2NlbmUuRk9HTU9ERV9FWFAyO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy90aGlzLl9zY2VuZS5mb2dNb2RlID0gQkFCWUxPTi5TY2VuZS5GT0dNT0RFX0xJTkVBUjtcbiAgICAgICAgLy90aGlzLl9zY2VuZS5mb2dTdGFydCA9IDEwMC4wO1xuICAgICAgICAvL3RoaXMuX3NjZW5lLmZvZ0VuZCA9IDIwMC4wO1xuICAgICAgICB0aGlzLl9zY2VuZS5mb2dNb2RlID0gQkFCWUxPTi5TY2VuZS5GT0dNT0RFX05PTkU7XG4gICAgICB9XG4gICAgfSk7XG4gICAgZ3JpZC5hZGRDb250cm9sKGNoZWNrYm94MiwgZ3JpZGNvdW50LCAwKTtcblxuICAgIGxldCBoZWFkZXIyID0gQkFCWUxPTi5HVUkuQ29udHJvbC5BZGRIZWFkZXIoXG4gICAgICBjaGVja2JveDIsIFwiRm9nXCIsIFwiMTgwcHhcIiwgeyBpc0hvcml6b250YWw6IHRydWUsIGNvbnRyb2xGaXJzdDogdHJ1ZX0pO1xuICAgIGhlYWRlcjIuY29sb3IgPSBcIndoaXRlXCI7XG4gICAgaGVhZGVyMi5oZWlnaHQgPSBcIjIwcHhcIjtcbiAgICBoZWFkZXIyLmhvcml6b250YWxBbGlnbm1lbnQgPSBCQUJZTE9OLkdVSS5Db250cm9sLkhPUklaT05UQUxfQUxJR05NRU5UX0xFRlQ7XG4gICAgZ3JpZC5hZGRDb250cm9sKGhlYWRlcjIsIGdyaWRjb3VudCsrLCAxKTtcblxuICAgIHRoaXMuX2NhbWVyYS5jYW1lcmFzLmZvckVhY2goKGNhbWVyYSkgPT4ge1xuICAgICAgbGV0IHJhZGlvID0gbmV3IEJBQllMT04uR1VJLlJhZGlvQnV0dG9uKCk7XG4gICAgICByYWRpby53aWR0aCA9IFwiMjBweFwiO1xuICAgICAgcmFkaW8uaGVpZ2h0ID0gXCIyMHB4XCI7XG4gICAgICByYWRpby5jb2xvciA9IFwiZ3JlZW5cIjtcbiAgICAgIHJhZGlvLmlzQ2hlY2tlZCA9IChjYW1lcmEubmFtZSA9PT0gXCJBcmNSb3RhdGVcIik7XG4gICAgICByYWRpby5vbklzQ2hlY2tlZENoYW5nZWRPYnNlcnZhYmxlLmFkZCgoc3RhdGUpID0+IHtcbiAgICAgICAgY29uc29sZS5sb2coY2FtZXJhLm5hbWUsIHN0YXRlKTtcbiAgICAgICAgaWYgKHN0YXRlKSB7XG4gICAgICAgICAgdGhpcy5fY2FtZXJhLnNldEVuYWJsZWQoY2FtZXJhKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBncmlkLmFkZENvbnRyb2wocmFkaW8sIGdyaWRjb3VudCwgMCk7XG5cbiAgICAgIGxldCByYWRpb0hlYWQgPSBCQUJZTE9OLkdVSS5Db250cm9sLkFkZEhlYWRlcihcbiAgICAgICAgcmFkaW8sIFwiQ2FtZXJhOiBcIiArIGNhbWVyYS5uYW1lLCBcIjE4MHB4XCIsIHsgaXNIb3Jpem9udGFsOiB0cnVlLCBjb250cm9sRmlyc3Q6IHRydWV9KTtcbiAgICAgIHJhZGlvSGVhZC5jb2xvciA9IFwid2hpdGVcIjtcbiAgICAgIHJhZGlvSGVhZC5oZWlnaHQgPSBcIjIwcHhcIjtcbiAgICAgIHJhZGlvSGVhZC5ob3Jpem9udGFsQWxpZ25tZW50ID0gQkFCWUxPTi5HVUkuQ29udHJvbC5IT1JJWk9OVEFMX0FMSUdOTUVOVF9MRUZUO1xuICAgICAgZ3JpZC5hZGRDb250cm9sKHJhZGlvSGVhZCwgZ3JpZGNvdW50KyssIDEpO1xuICAgIH0sIHRoaXMpO1xuICB9XG59XG5cbndpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdET01Db250ZW50TG9hZGVkJywgKCkgPT4ge1xuICAvLyBDcmVhdGUgdGhlIGdhbWUgdXNpbmcgdGhlICdyZW5kZXJDYW52YXMnLlxuICBsZXQgZ2FtZSA9IG5ldyBHYW1lKCdyZW5kZXJDYW52YXMnKTtcblxuICAvLyBDcmVhdGUgdGhlIHNjZW5lLlxuICBnYW1lLmNyZWF0ZVNjZW5lKCk7XG5cbiAgLy8gU3RhcnQgcmVuZGVyIGxvb3AuXG4gIGdhbWUuZG9SZW5kZXIoKTtcbn0pO1xuIiwiaW50ZXJmYWNlIFBsYW50U3BlY2llcyB7XG4gIGdlbmVyYXRvcjogKCkgPT4gQkFCWUxPTi5NZXNoOyAgLy8gTWV0aG9kIHRvIGdlbmVyYXRlIE1lc2guXG4gIG1pblR5cGVzOiBudW1iZXI7ICAgICAgICAgICAgICAgLy8gTXVzdCBiZSBhdCBsZWFzdCB0aGlzIG1hbnkgdHlwZXMuXG4gIHdlaWdodDogbnVtYmVyOyAgICAgICAgICAgICAgICAgLy8gSG93IHByb2xpZmljIHRoaXMgc3BlY2llcyBpcy5cbn1cblxuY2xhc3MgTnVyc2VyeSB7XG4gIHB1YmxpYyB0cmVlczogQkFCWUxPTi5NZXNoW107XG4gIHB1YmxpYyBzaHJ1YnM6IEJBQllMT04uTWVzaFtdO1xuICBwdWJsaWMgdHJlZVR5cGVzOiBudW1iZXI7XG4gIHB1YmxpYyBzaHJ1YlR5cGVzOiBudW1iZXI7XG4gIHByaXZhdGUgX3NjZW5lOiBCQUJZTE9OLlNjZW5lO1xuICBwcml2YXRlIHRyZWVTcGVjaWVzOiBQbGFudFNwZWNpZXNbXTtcbiAgcHJpdmF0ZSBzaHJ1YlNwZWNpZXM6IFBsYW50U3BlY2llc1tdO1xuXG4gIGNvbnN0cnVjdG9yKHNjZW5lOiBCQUJZTE9OLlNjZW5lLCB0cmVlVHlwZXM6IG51bWJlciwgc2hydWJUeXBlczogbnVtYmVyKSB7XG4gICAgdGhpcy5fc2NlbmUgPSBzY2VuZTtcbiAgICB0aGlzLnRyZWVUeXBlcyA9IHRyZWVUeXBlcztcbiAgICB0aGlzLnNocnViVHlwZXMgPSBzaHJ1YlR5cGVzO1xuXG4gICAgdGhpcy50cmVlcyA9IFtdO1xuICAgIHRoaXMuc2hydWJzID0gW107XG4gICAgdGhpcy50cmVlU3BlY2llcyA9IFtdO1xuICAgIHRoaXMuc2hydWJTcGVjaWVzID0gW107XG5cbiAgICB0aGlzLnRyZWVTcGVjaWVzLnB1c2goe2dlbmVyYXRvcjogdGhpcy5fY3JlYXRlUGluZSwgbWluVHlwZXM6IDIsIHdlaWdodDogMC4yfSk7XG4gICAgdGhpcy50cmVlU3BlY2llcy5wdXNoKHtnZW5lcmF0b3I6IHRoaXMuX2NyZWF0ZUxvbGx5cG9wLCBtaW5UeXBlczogMiwgd2VpZ2h0OiAwLjh9KTtcbiAgICB0aGlzLnNocnViU3BlY2llcy5wdXNoKHtnZW5lcmF0b3I6IHRoaXMuX2NyZWF0ZUJ1c2gsIG1pblR5cGVzOiAyLCB3ZWlnaHQ6IDAuNn0pO1xuICAgIHRoaXMuc2hydWJTcGVjaWVzLnB1c2goe2dlbmVyYXRvcjogdGhpcy5fY3JlYXRlUGluZSwgbWluVHlwZXM6IDIsIHdlaWdodDogMC4yfSk7XG4gICAgdGhpcy5zaHJ1YlNwZWNpZXMucHVzaCh7Z2VuZXJhdG9yOiB0aGlzLl9jcmVhdGVMb2xseXBvcCwgbWluVHlwZXM6IDIsIHdlaWdodDogMC4yfSk7XG5cbiAgICAvLyBQb3B1bGF0ZSBhdCBsZWFzdCB0aGUgbWluVHlwZXMgb2YgZWFjaCBzcGVjaWVzLlxuICAgIHRoaXMudHJlZVNwZWNpZXMuZm9yRWFjaCgoZ2VuaXVzKSA9PiB7XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGdlbml1cy5taW5UeXBlczsgaSsrKSB7XG4gICAgICAgIHRoaXMuX2NyZWF0ZVRyZWUoZ2VuaXVzLmdlbmVyYXRvcik7XG4gICAgICB9XG4gICAgfSwgdGhpcyk7XG5cbiAgICB0aGlzLnNocnViU3BlY2llcy5mb3JFYWNoKChnZW5pdXMpID0+IHtcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZ2VuaXVzLm1pblR5cGVzOyBpKyspIHtcbiAgICAgICAgdGhpcy5fY3JlYXRlU2hydWIoZ2VuaXVzLmdlbmVyYXRvcik7XG4gICAgICB9XG4gICAgfSwgdGhpcyk7XG5cbiAgICAvLyBQb3B1bGF0ZSByZW1haW5kZXIuXG4gICAgZm9yIChsZXQgaSA9IHRoaXMudHJlZXMubGVuZ3RoOyBpIDwgdGhpcy50cmVlVHlwZXM7IGkrKykge1xuICAgICAgdGhpcy5fY3JlYXRlVHJlZSgpO1xuICAgIH1cblxuICAgIGZvciAobGV0IGkgPSB0aGlzLnNocnVicy5sZW5ndGg7IGkgPCB0aGlzLnNocnViVHlwZXM7IGkrKykge1xuICAgICAgdGhpcy5fY3JlYXRlU2hydWIoKTtcbiAgICB9XG4gIH1cblxuICBwdWJsaWMgZGlzcG9zZSgpOiB2b2lkIHtcbiAgICB0aGlzLnRyZWVzLmZvckVhY2goKHRyZWUpID0+IHsgdHJlZS5kaXNwb3NlKCk7IH0pO1xuICAgIHRoaXMuc2hydWJzLmZvckVhY2goKHNocnViKSA9PiB7IHNocnViLmRpc3Bvc2UoKTsgfSk7XG4gIH1cblxuICBwdWJsaWMgZ2V0VHJlZSh4OiBudW1iZXIsIHk6IG51bWJlcik6IEJBQllMT04uTWVzaCB7XG4gICAgbGV0IHRyZWVUeXBlSW5kZXggPSBNYXRoLnJvdW5kKE1hdGgucmFuZG9tKCkgKiAodGhpcy50cmVlcy5sZW5ndGggLSAxKSk7XG4gICAgbGV0IHNwZWNpZXMgPSB0aGlzLnRyZWVzW3RyZWVUeXBlSW5kZXhdO1xuICAgIHJldHVybiBzcGVjaWVzLmNsb25lKHNwZWNpZXMubmFtZSArIFwiX1wiICsgeCArIFwiX1wiICsgeSk7XG4gIH1cblxuICBwdWJsaWMgZ2V0U2hydWIoeDogbnVtYmVyLCB5OiBudW1iZXIpOiBCQUJZTE9OLk1lc2gge1xuICAgIGxldCBzaHJ1YlR5cGVJbmRleCA9IE1hdGgucm91bmQoTWF0aC5yYW5kb20oKSAqICh0aGlzLnNocnVicy5sZW5ndGggLSAxKSk7XG4gICAgbGV0IHNwZWNpZXMgPSB0aGlzLnNocnVic1tzaHJ1YlR5cGVJbmRleF07XG4gICAgcmV0dXJuIHNwZWNpZXMuY2xvbmUoc3BlY2llcy5uYW1lICsgXCJfXCIgKyB4ICsgXCJfXCIgKyB5KTtcbiAgfVxuXG4gIHByaXZhdGUgX2NyZWF0ZVRyZWUoaGludD86ICgpID0+IEJBQllMT04uTWVzaCk6IHZvaWQge1xuICAgIGlmICghaGludCkge1xuICAgICAgbGV0IHJuZCA9IE1hdGgucmFuZG9tKCk7XG4gICAgICBsZXQgdG90YWxXZWlnaHQgPSAwO1xuICAgICAgdGhpcy50cmVlU3BlY2llcy5mb3JFYWNoKChnZW5pdXMpID0+IHtcbiAgICAgICAgaWYgKHJuZCA+PSB0b3RhbFdlaWdodCAmJiBybmQgPCB0b3RhbFdlaWdodCArIGdlbml1cy53ZWlnaHQpIHtcbiAgICAgICAgICBoaW50ID0gZ2VuaXVzLmdlbmVyYXRvcjtcbiAgICAgICAgfVxuICAgICAgICB0b3RhbFdlaWdodCArPSBnZW5pdXMud2VpZ2h0O1xuICAgICAgfSwgdGhpcyk7XG4gICAgfVxuXG4gICAgbGV0IHRyZWUgPSAoaGludC5iaW5kKHRoaXMpKSgpO1xuICAgIHRyZWUubmFtZSA9IFwidHJlZV9cIiArIHRyZWUubmFtZSArIFwiX1wiICsgdGhpcy50cmVlcy5sZW5ndGg7XG4gICAgdGhpcy50cmVlcy5wdXNoKHRyZWUpO1xuICAgIGNvbnNvbGUubG9nKHRyZWUubmFtZSk7XG4gIH1cblxuICBwcml2YXRlIF9jcmVhdGVTaHJ1YihoaW50PzogKCkgPT4gQkFCWUxPTi5NZXNoKTogdm9pZCB7XG4gICAgaWYgKCFoaW50KSB7XG4gICAgICBsZXQgcm5kID0gTWF0aC5yYW5kb20oKTtcbiAgICAgIGxldCB0b3RhbFdlaWdodCA9IDA7XG4gICAgICB0aGlzLnNocnViU3BlY2llcy5mb3JFYWNoKChnZW5pdXMpID0+IHtcbiAgICAgICAgaWYgKHJuZCA+PSB0b3RhbFdlaWdodCAmJiBybmQgPCB0b3RhbFdlaWdodCArIGdlbml1cy53ZWlnaHQpIHtcbiAgICAgICAgICBoaW50ID0gZ2VuaXVzLmdlbmVyYXRvcjtcbiAgICAgICAgfVxuICAgICAgICB0b3RhbFdlaWdodCArPSBnZW5pdXMud2VpZ2h0O1xuICAgICAgfSwgdGhpcyk7XG4gICAgfVxuXG4gICAgbGV0IHNocnViID0gKGhpbnQuYmluZCh0aGlzKSkoKTtcbiAgICBzaHJ1Yi5uYW1lID0gXCJzaHJ1Yl9cIiArIHNocnViLm5hbWUgKyBcIl9cIiArIHRoaXMuc2hydWJzLmxlbmd0aDtcbiAgICB0aGlzLnNocnVicy5wdXNoKHNocnViKTtcbiAgICBjb25zb2xlLmxvZyhzaHJ1Yi5uYW1lKTtcbiAgfVxuXG4gIHByaXZhdGUgX2NyZWF0ZVBpbmUoKTogQkFCWUxPTi5NZXNoIHtcbiAgICBsZXQgY2Fub3BpZXMgPSBNYXRoLnJvdW5kKE1hdGgucmFuZG9tKCkgKiAzKSArIDQ7XG4gICAgbGV0IGhlaWdodCA9IE1hdGgucm91bmQoTWF0aC5yYW5kb20oKSAqIDIwKSArIDIwO1xuICAgIGxldCB3aWR0aCA9IDU7XG5cbiAgICBsZXQgdHJlZSA9IFBpbmVHZW5lcmF0b3IoXG4gICAgICBjYW5vcGllcywgaGVpZ2h0LCB3aWR0aCwgdGhpcy5tYXRlcmlhbEJhcmsoKSwgdGhpcy5tYXRlcmlhbExlYXZlcygpLCB0aGlzLl9zY2VuZSk7XG4gICAgdHJlZS5zZXRFbmFibGVkKGZhbHNlKTtcbiAgICByZXR1cm4gdHJlZTtcbiAgfVxuXG4gIHByaXZhdGUgX2NyZWF0ZUxvbGx5cG9wKCk6IEJBQllMT04uTWVzaCB7XG4gICAgbGV0IHNpemVCcmFuY2ggPSAxNSArIE1hdGgucmFuZG9tKCkgKiA1O1xuICAgIGxldCBzaXplVHJ1bmsgPSAxMCArIE1hdGgucmFuZG9tKCkgKiA1O1xuICAgIGxldCByYWRpdXMgPSAxICsgTWF0aC5yYW5kb20oKSAqIDQ7XG5cbiAgICBsZXQgdHJlZSA9IFF1aWNrVHJlZUdlbmVyYXRvcihcbiAgICAgIHNpemVCcmFuY2gsIHNpemVUcnVuaywgcmFkaXVzLCB0aGlzLm1hdGVyaWFsQmFyaygpLCB0aGlzLm1hdGVyaWFsTGVhdmVzKCksIHRoaXMuX3NjZW5lKTtcbiAgICB0cmVlLnNldEVuYWJsZWQoZmFsc2UpO1xuICAgIHJldHVybiB0cmVlO1xuICB9XG5cbiAgcHJpdmF0ZSBfY3JlYXRlQnVzaCgpOiBCQUJZTE9OLk1lc2gge1xuICAgIGxldCBzaXplQnJhbmNoID0gMTAgKyBNYXRoLnJhbmRvbSgpICogMjA7XG5cbiAgICBsZXQgdHJlZSA9IFF1aWNrU2hydWIoc2l6ZUJyYW5jaCwgdGhpcy5tYXRlcmlhbExlYXZlcygpLCB0aGlzLl9zY2VuZSk7XG4gICAgdHJlZS5zZXRFbmFibGVkKGZhbHNlKTtcbiAgICByZXR1cm4gdHJlZTtcbiAgfVxuXG4gIHByaXZhdGUgbWF0ZXJpYWxCYXJrKCk6IEJBQllMT04uU3RhbmRhcmRNYXRlcmlhbCB7XG4gICAgbGV0IG1hdGVyaWFsID0gbmV3IEJBQllMT04uU3RhbmRhcmRNYXRlcmlhbChcImJhcmtcIiwgdGhpcy5fc2NlbmUpO1xuICAgIG1hdGVyaWFsLmRpZmZ1c2VDb2xvciA9IG5ldyBCQUJZTE9OLkNvbG9yMygwLjMgKyBNYXRoLnJhbmRvbSgpICogMC4yLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAwLjIgKyBNYXRoLnJhbmRvbSgpICogMC4yLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAwLjIgKyBNYXRoLnJhbmRvbSgpICogMC4xKTtcbiAgICBtYXRlcmlhbC5zcGVjdWxhckNvbG9yID0gQkFCWUxPTi5Db2xvcjMuQmxhY2soKTtcbiAgICByZXR1cm4gbWF0ZXJpYWw7XG4gIH1cblxuICBwcml2YXRlIG1hdGVyaWFsTGVhdmVzKCk6IEJBQllMT04uU3RhbmRhcmRNYXRlcmlhbCB7XG4gICAgbGV0IG1hdGVyaWFsID0gbmV3IEJBQllMT04uU3RhbmRhcmRNYXRlcmlhbChcImxlYXZlc1wiLCB0aGlzLl9zY2VuZSk7XG4gICAgbWF0ZXJpYWwuZGlmZnVzZUNvbG9yID0gbmV3IEJBQllMT04uQ29sb3IzKDAuNCArIE1hdGgucmFuZG9tKCkgKiAwLjIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDAuNSArIE1hdGgucmFuZG9tKCkgKiAwLjQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDAuMiArIE1hdGgucmFuZG9tKCkgKiAwLjIpO1xuICAgIG1hdGVyaWFsLnNwZWN1bGFyQ29sb3IgPSBCQUJZTE9OLkNvbG9yMy5SZWQoKTtcbiAgICByZXR1cm4gbWF0ZXJpYWw7XG4gIH1cbn1cblxuLy9jYW5vcGllcyBudW1iZXIgb2YgbGVhZiBzZWN0aW9ucywgaGVpZ2h0IG9mIHRyZWUsIG1hdGVyaWFsc1xuLy8gaHR0cHM6Ly93d3cuYmFieWxvbmpzLXBsYXlncm91bmQuY29tLyNMRzNHUyM5M1xuLy8gaHR0cHM6Ly9naXRodWIuY29tL0JhYnlsb25KUy9FeHRlbnNpb25zL3RyZWUvbWFzdGVyL1RyZWVHZW5lcmF0b3JzL1NpbXBsZVBpbmVHZW5lcmF0b3JcbmZ1bmN0aW9uIFBpbmVHZW5lcmF0b3IoY2Fub3BpZXM6IG51bWJlciwgaGVpZ2h0OiBudW1iZXIsIHdpZHRoOiBudW1iZXIsXG4gICAgICAgICAgICAgICAgICAgICAgIHRydW5rTWF0ZXJpYWw6IEJBQllMT04uU3RhbmRhcmRNYXRlcmlhbCxcbiAgICAgICAgICAgICAgICAgICAgICAgbGVhZk1hdGVyaWFsOiBCQUJZTE9OLlN0YW5kYXJkTWF0ZXJpYWwsXG4gICAgICAgICAgICAgICAgICAgICAgIHNjZW5lOiBCQUJZTE9OLlNjZW5lKSA6IEJBQllMT04uTWVzaFxue1xuICBsZXQgbmJMID0gY2Fub3BpZXMgKyAxO1xuICBsZXQgdHJ1bmtMZW4gPSBoZWlnaHQgLyBuYkw7XG4gIGxldCBjdXJ2ZVBvaW50cyA9IGZ1bmN0aW9uKGwsIHQpIHtcbiAgICBsZXQgcGF0aCA9IFtdO1xuICAgIGxldCBzdGVwID0gbCAvIHQ7XG4gICAgZm9yIChsZXQgaSA9IHRydW5rTGVuOyBpIDwgbCArIHRydW5rTGVuOyBpICs9IHN0ZXApIHtcbiAgICAgIHBhdGgucHVzaChuZXcgQkFCWUxPTi5WZWN0b3IzKDAsIGksIDApKTtcbiAgICAgIHBhdGgucHVzaChuZXcgQkFCWUxPTi5WZWN0b3IzKDAsIGksIDApKTtcbiAgICB9XG4gICAgcmV0dXJuIHBhdGg7XG4gIH07XG5cbiAgbGV0IGN1cnZlID0gY3VydmVQb2ludHMoaGVpZ2h0LCBuYkwpO1xuXG4gIGxldCByYWRpdXNGdW5jdGlvbiA9IGZ1bmN0aW9uKGksIGRpc3RhbmNlKSB7XG4gICAgbGV0IGZhY3QgPSAxO1xuICAgIGlmIChpICUgMiA9PSAwKSB7IGZhY3QgPSAuNTsgfVxuICAgIGxldCByYWRpdXMgPSAgTWF0aC5tYXgoMCwgKG5iTCAqIDIgLSBpIC0gMSkgKiBmYWN0KTtcbiAgICByZXR1cm4gcmFkaXVzO1xuICB9O1xuXG4gIGxldCBsZWF2ZXMgPSBCQUJZTE9OLk1lc2guQ3JlYXRlVHViZShcbiAgICBcImxlYXZlc1wiLCBjdXJ2ZSwgMCwgMTAsIHJhZGl1c0Z1bmN0aW9uLCBCQUJZTE9OLk1lc2guQ0FQX0FMTCwgc2NlbmUpO1xuICBsZWF2ZXMuc2NhbGluZy54ID0gd2lkdGggLyAxMDtcbiAgbGVhdmVzLnNjYWxpbmcueiA9IHdpZHRoIC8gMTA7XG5cbiAgbGV0IHRydW5rID0gQkFCWUxPTi5NZXNoLkNyZWF0ZUN5bGluZGVyKFxuICAgIFwidHJ1bmtcIiwgaGVpZ2h0IC8gbmJMLCBuYkwgKiAxLjUgLSBuYkwgLyAyIC0gMSwgbmJMICogMS41IC0gbmJMIC8gMiAtIDEsIDEyLCAxLCBzY2VuZSk7XG4gIHRydW5rLnBvc2l0aW9uLnkgPSB0cnVua0xlbiAvIDI7XG4gIHRydW5rLnNjYWxpbmcueCA9IHdpZHRoIC8gMTA7XG4gIHRydW5rLnNjYWxpbmcueiA9IHdpZHRoIC8gMTA7XG5cbiAgbGVhdmVzLm1hdGVyaWFsID0gbGVhZk1hdGVyaWFsO1xuICB0cnVuay5tYXRlcmlhbCA9IHRydW5rTWF0ZXJpYWw7XG5cbiAgbGV0IHRyZWUgPSBCQUJZTE9OLk1lc2guQ3JlYXRlQm94KFwicGluZVwiLCAxLCBzY2VuZSk7XG4gIHRyZWUuaXNWaXNpYmxlID0gZmFsc2U7XG4gIGxlYXZlcy5wYXJlbnQgPSB0cmVlO1xuICB0cnVuay5wYXJlbnQgPSB0cmVlO1xuICByZXR1cm4gdHJlZTtcbn1cblxuZnVuY3Rpb24gUXVpY2tUcmVlR2VuZXJhdG9yKHNpemVCcmFuY2g6IG51bWJlcixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzaXplVHJ1bms6IG51bWJlcixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByYWRpdXM6IG51bWJlcixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cnVua01hdGVyaWFsOiBCQUJZTE9OLlN0YW5kYXJkTWF0ZXJpYWwsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGVhZk1hdGVyaWFsOiBCQUJZTE9OLlN0YW5kYXJkTWF0ZXJpYWwsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2NlbmU6IEJBQllMT04uU2NlbmUpIDogQkFCWUxPTi5NZXNoIHtcbiAgICBsZXQgbGVhdmVzID0gbmV3IEJBQllMT04uTWVzaChcImxlYXZlc1wiLCBzY2VuZSk7XG5cbiAgICBsZXQgdmVydGV4RGF0YSA9IEJBQllMT04uVmVydGV4RGF0YS5DcmVhdGVTcGhlcmUoe3NlZ21lbnRzOiAyLCBkaWFtZXRlcjogc2l6ZUJyYW5jaH0pO1xuXG4gICAgdmVydGV4RGF0YS5hcHBseVRvTWVzaChsZWF2ZXMsIGZhbHNlKTtcblxuICAgIGxldCBwb3NpdGlvbnMgPSBsZWF2ZXMuZ2V0VmVydGljZXNEYXRhKEJBQllMT04uVmVydGV4QnVmZmVyLlBvc2l0aW9uS2luZCk7XG4gICAgbGV0IGluZGljZXMgPSBsZWF2ZXMuZ2V0SW5kaWNlcygpO1xuICAgIGxldCBudW1iZXJPZlBvaW50cyA9IHBvc2l0aW9ucy5sZW5ndGggLyAzO1xuXG4gICAgbGV0IG1hcCA9IFtdO1xuXG4gICAgbGV0IHYzID0gQkFCWUxPTi5WZWN0b3IzO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbnVtYmVyT2ZQb2ludHM7IGkrKykge1xuICAgICAgICBsZXQgcCA9IG5ldyB2Myhwb3NpdGlvbnNbaSAqIDNdLCBwb3NpdGlvbnNbaSAqIDMgKyAxXSwgcG9zaXRpb25zW2kgKiAzICsgMl0pO1xuXG4gICAgICAgIGxldCBmb3VuZCA9IGZhbHNlO1xuICAgICAgICBmb3IgKGxldCBpbmRleCA9IDA7IGluZGV4IDwgbWFwLmxlbmd0aCAmJiAhZm91bmQ7IGluZGV4KyspIHtcbiAgICAgICAgICAgIGxldCBhcnJheSA9IG1hcFtpbmRleF07XG4gICAgICAgICAgICBsZXQgcDAgPSBhcnJheVswXTtcbiAgICAgICAgICAgIGlmIChwMC5lcXVhbHMgKHApIHx8IChwMC5zdWJ0cmFjdChwKSkubGVuZ3RoU3F1YXJlZCgpIDwgMC4wMSkge1xuICAgICAgICAgICAgICAgIGFycmF5LnB1c2goaSAqIDMpO1xuICAgICAgICAgICAgICAgIGZvdW5kID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoIWZvdW5kKSB7XG4gICAgICAgICAgICBsZXQgYXJyYXkgPSBbXTtcbiAgICAgICAgICAgIGFycmF5LnB1c2gocCwgaSAqIDMpO1xuICAgICAgICAgICAgbWFwLnB1c2goYXJyYXkpO1xuICAgICAgICB9XG5cbiAgICB9XG4gICAgbGV0IHJhbmRvbU51bWJlciA9IGZ1bmN0aW9uKG1pbiwgbWF4KSB7XG4gICAgICAgIGlmIChtaW4gPT0gbWF4KSB7XG4gICAgICAgICAgICByZXR1cm4gKG1pbik7XG4gICAgICAgIH1cbiAgICAgICAgbGV0IHJhbmRvbSA9IE1hdGgucmFuZG9tKCk7XG4gICAgICAgIHJldHVybiAoKHJhbmRvbSAqIChtYXggLSBtaW4pKSArIG1pbik7XG4gICAgfTtcblxuICAgIG1hcC5mb3JFYWNoKGZ1bmN0aW9uKGFycmF5KSB7XG4gICAgICAgIGxldCBpbmRleCwgbWluID0gLXNpemVCcmFuY2ggLyAxMCwgbWF4ID0gc2l6ZUJyYW5jaCAvIDEwO1xuICAgICAgICBsZXQgcnggPSByYW5kb21OdW1iZXIobWluLCBtYXgpO1xuICAgICAgICBsZXQgcnkgPSByYW5kb21OdW1iZXIobWluLCBtYXgpO1xuICAgICAgICBsZXQgcnogPSByYW5kb21OdW1iZXIobWluLCBtYXgpO1xuXG4gICAgICAgIGZvciAoaW5kZXggPSAxOyBpbmRleCA8IGFycmF5Lmxlbmd0aDsgaW5kZXgrKykge1xuICAgICAgICAgICAgbGV0IGkgPSBhcnJheVtpbmRleF07XG4gICAgICAgICAgICBwb3NpdGlvbnNbaV0gKz0gcng7XG4gICAgICAgICAgICBwb3NpdGlvbnNbaSArIDFdICs9IHJ5O1xuICAgICAgICAgICAgcG9zaXRpb25zW2kgKyAyXSArPSByejtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgbGVhdmVzLnNldFZlcnRpY2VzRGF0YShCQUJZTE9OLlZlcnRleEJ1ZmZlci5Qb3NpdGlvbktpbmQsIHBvc2l0aW9ucyk7XG4gICAgbGV0IG5vcm1hbHMgPSBbXTtcbiAgICBCQUJZTE9OLlZlcnRleERhdGEuQ29tcHV0ZU5vcm1hbHMocG9zaXRpb25zLCBpbmRpY2VzLCBub3JtYWxzKTtcbiAgICBsZWF2ZXMuc2V0VmVydGljZXNEYXRhKEJBQllMT04uVmVydGV4QnVmZmVyLk5vcm1hbEtpbmQsIG5vcm1hbHMpO1xuICAgIGxlYXZlcy5jb252ZXJ0VG9GbGF0U2hhZGVkTWVzaCgpO1xuXG4gICAgbGVhdmVzLm1hdGVyaWFsID0gbGVhZk1hdGVyaWFsO1xuICAgIGxlYXZlcy5wb3NpdGlvbi55ID0gc2l6ZVRydW5rICsgc2l6ZUJyYW5jaCAvIDIgLSAyO1xuXG4gICAgbGV0IHRydW5rID0gQkFCWUxPTi5NZXNoLkNyZWF0ZUN5bGluZGVyKFxuICAgICAgXCJ0cnVua1wiLCBzaXplVHJ1bmssIHJhZGl1cyAtIDIgPCAxID8gMSA6IHJhZGl1cyAtIDIsIHJhZGl1cywgMTAsIDIsIHNjZW5lKTtcblxuICAgIHRydW5rLnBvc2l0aW9uLnkgPSBzaXplVHJ1bmsgLyAyO1xuXG4gICAgdHJ1bmsubWF0ZXJpYWwgPSB0cnVua01hdGVyaWFsO1xuICAgIHRydW5rLmNvbnZlcnRUb0ZsYXRTaGFkZWRNZXNoKCk7XG5cbiAgICBsZXQgdHJlZSA9IEJBQllMT04uTWVzaC5DcmVhdGVCb3goXCJ0cmVlXCIsIDEsIHNjZW5lKTtcbiAgICB0cmVlLmlzVmlzaWJsZSA9IGZhbHNlO1xuICAgIGxlYXZlcy5wYXJlbnQgPSB0cmVlO1xuICAgIHRydW5rLnBhcmVudCA9IHRyZWU7XG4gICAgcmV0dXJuIHRyZWU7XG59XG5cbmZ1bmN0aW9uIFF1aWNrU2hydWIoc2l6ZUJyYW5jaDogbnVtYmVyLFxuICAgICAgICAgICAgICAgICAgICBsZWFmTWF0ZXJpYWw6IEJBQllMT04uU3RhbmRhcmRNYXRlcmlhbCxcbiAgICAgICAgICAgICAgICAgICAgc2NlbmU6IEJBQllMT04uU2NlbmUpIDogQkFCWUxPTi5NZXNoIHtcbiAgICBsZXQgdHJlZSA9IG5ldyBCQUJZTE9OLk1lc2goXCJzaHJ1YlwiLCBzY2VuZSk7XG4gICAgdHJlZS5pc1Zpc2libGUgPSBmYWxzZTtcblxuICAgIGxldCBsZWF2ZXMgPSBuZXcgQkFCWUxPTi5NZXNoKFwibGVhdmVzXCIsIHNjZW5lKTtcblxuICAgIGxldCB2ZXJ0ZXhEYXRhID0gQkFCWUxPTi5WZXJ0ZXhEYXRhLkNyZWF0ZVNwaGVyZSh7c2VnbWVudHM6IDIsIGRpYW1ldGVyOiBzaXplQnJhbmNofSk7XG5cbiAgICB2ZXJ0ZXhEYXRhLmFwcGx5VG9NZXNoKGxlYXZlcywgZmFsc2UpO1xuXG4gICAgbGV0IHBvc2l0aW9ucyA9IGxlYXZlcy5nZXRWZXJ0aWNlc0RhdGEoQkFCWUxPTi5WZXJ0ZXhCdWZmZXIuUG9zaXRpb25LaW5kKTtcbiAgICBsZXQgaW5kaWNlcyA9IGxlYXZlcy5nZXRJbmRpY2VzKCk7XG4gICAgbGV0IG51bWJlck9mUG9pbnRzID0gcG9zaXRpb25zLmxlbmd0aCAvIDM7XG5cbiAgICBsZXQgbWFwID0gW107XG5cbiAgICBsZXQgdjMgPSBCQUJZTE9OLlZlY3RvcjM7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBudW1iZXJPZlBvaW50czsgaSsrKSB7XG4gICAgICAgIGxldCBwID0gbmV3IHYzKHBvc2l0aW9uc1tpICogM10sIHBvc2l0aW9uc1tpICogMyArIDFdLCBwb3NpdGlvbnNbaSAqIDMgKyAyXSk7XG5cbiAgICAgICAgbGV0IGZvdW5kID0gZmFsc2U7XG4gICAgICAgIGZvciAobGV0IGluZGV4ID0gMDsgaW5kZXggPCBtYXAubGVuZ3RoICYmICFmb3VuZDsgaW5kZXgrKykge1xuICAgICAgICAgICAgbGV0IGFycmF5ID0gbWFwW2luZGV4XTtcbiAgICAgICAgICAgIGxldCBwMCA9IGFycmF5WzBdO1xuICAgICAgICAgICAgaWYgKHAwLmVxdWFscyhwKSB8fCAocDAuc3VidHJhY3QocCkpLmxlbmd0aFNxdWFyZWQoKSA8IDAuMDEpIHtcbiAgICAgICAgICAgICAgICBhcnJheS5wdXNoKGkgKiAzKTtcbiAgICAgICAgICAgICAgICBmb3VuZCA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFmb3VuZCkge1xuICAgICAgICAgICAgbGV0IGFycmF5ID0gW107XG4gICAgICAgICAgICBhcnJheS5wdXNoKHAsIGkgKiAzKTtcbiAgICAgICAgICAgIG1hcC5wdXNoKGFycmF5KTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBsZXQgcmFuZG9tTnVtYmVyID0gZnVuY3Rpb24obWluLCBtYXgpIHtcbiAgICAgICAgaWYgKG1pbiA9PSBtYXgpIHtcbiAgICAgICAgICAgIHJldHVybiAobWluKTtcbiAgICAgICAgfVxuICAgICAgICBsZXQgcmFuZG9tID0gTWF0aC5yYW5kb20oKTtcbiAgICAgICAgcmV0dXJuICgocmFuZG9tICogKG1heCAtIG1pbikpICsgbWluKTtcbiAgICB9O1xuXG4gICAgbWFwLmZvckVhY2goZnVuY3Rpb24oYXJyYXkpIHtcbiAgICAgIGxldCBpbmRleCwgbWluID0gLXNpemVCcmFuY2ggLyA1LCBtYXggPSBzaXplQnJhbmNoIC8gNTtcbiAgICAgIGxldCByeCA9IHJhbmRvbU51bWJlcihtaW4sIG1heCk7XG4gICAgICBsZXQgcnkgPSByYW5kb21OdW1iZXIobWluLCBtYXgpO1xuICAgICAgbGV0IHJ6ID0gcmFuZG9tTnVtYmVyKG1pbiwgbWF4KTtcblxuICAgICAgZm9yIChpbmRleCA9IDE7IGluZGV4IDwgYXJyYXkubGVuZ3RoOyBpbmRleCsrKSB7XG4gICAgICAgIGxldCBpID0gYXJyYXlbaW5kZXhdO1xuICAgICAgICBwb3NpdGlvbnNbaV0gKz0gcng7XG4gICAgICAgIHBvc2l0aW9uc1tpICsgMl0gKz0gcno7XG4gICAgICAgIGlmIChwb3NpdGlvbnNbaSArIDFdIDwgMCkge1xuICAgICAgICAgIHBvc2l0aW9uc1tpICsgMV0gPSAtc2l6ZUJyYW5jaCAvIDI7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcG9zaXRpb25zW2kgKyAxXSArPSByeTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgbGVhdmVzLnNldFZlcnRpY2VzRGF0YShCQUJZTE9OLlZlcnRleEJ1ZmZlci5Qb3NpdGlvbktpbmQsIHBvc2l0aW9ucyk7XG4gICAgbGV0IG5vcm1hbHMgPSBbXTtcbiAgICBCQUJZTE9OLlZlcnRleERhdGEuQ29tcHV0ZU5vcm1hbHMocG9zaXRpb25zLCBpbmRpY2VzLCBub3JtYWxzKTtcbiAgICBsZWF2ZXMuc2V0VmVydGljZXNEYXRhKEJBQllMT04uVmVydGV4QnVmZmVyLk5vcm1hbEtpbmQsIG5vcm1hbHMpO1xuICAgIGxlYXZlcy5jb252ZXJ0VG9GbGF0U2hhZGVkTWVzaCgpO1xuXG4gICAgbGVhdmVzLm1hdGVyaWFsID0gbGVhZk1hdGVyaWFsO1xuICAgIGxlYXZlcy5zY2FsaW5nLnkgPSByYW5kb21OdW1iZXIoMC4yLCAxKTtcbiAgICBsZWF2ZXMucG9zaXRpb24ueSA9IDAuMSArIGxlYXZlcy5zY2FsaW5nLnkgKiBzaXplQnJhbmNoIC8gMjtcblxuICAgIGxlYXZlcy5wYXJlbnQgPSB0cmVlO1xuICAgIHJldHVybiB0cmVlO1xufVxuIiwiY2xhc3MgQmlnQXJyYXkgZXh0ZW5kcyBBcnJheSB7XG4gIGxlbmd0aFBvcHVsYXRlZDogbnVtYmVyID0gMDtcbn1cblxuY2xhc3MgVHJpdmlhbFN0YWNrPFR2YWx1ZT4ge1xuICBwcml2YXRlIF9jb250YWluZXI6IEFycmF5PFR2YWx1ZT47XG4gIGxlbmd0aDogbnVtYmVyO1xuXG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHRoaXMubGVuZ3RoID0gMDtcbiAgICB0aGlzLl9jb250YWluZXIgPSBbXTtcbiAgfVxuXG4gIHBvcCgpOiBUdmFsdWUge1xuICAgIGxldCB2YWx1ZSA9IHRoaXMuX2NvbnRhaW5lci5wb3AoKTtcbiAgICB0aGlzLmxlbmd0aCA9IHRoaXMuX2NvbnRhaW5lci5sZW5ndGg7XG4gICAgcmV0dXJuIHZhbHVlO1xuICB9XG5cbiAgcHVzaChuZXdWYWx1ZTogVHZhbHVlKTogdm9pZCB7XG4gICAgdGhpcy5fY29udGFpbmVyLnB1c2gobmV3VmFsdWUpO1xuICAgIHRoaXMubGVuZ3RoID0gdGhpcy5fY29udGFpbmVyLmxlbmd0aDtcbiAgfVxufVxuXG5jbGFzcyBUcml2aWFsUXVldWU8VHZhbHVlPiB7XG4gIHByaXZhdGUgX2NvbnRhaW5lcjogQXJyYXk8VHZhbHVlPjtcbiAgbGVuZ3RoOiBudW1iZXI7XG5cbiAgY29uc3RydWN0b3IoKSB7XG4gICAgdGhpcy5sZW5ndGggPSAwO1xuICAgIHRoaXMuX2NvbnRhaW5lciA9IFtdO1xuICB9XG5cbiAgcG9wKCk6IFR2YWx1ZSB7XG4gICAgbGV0IHZhbHVlID0gdGhpcy5fY29udGFpbmVyLnBvcCgpO1xuICAgIHRoaXMubGVuZ3RoID0gdGhpcy5fY29udGFpbmVyLmxlbmd0aDtcbiAgICByZXR1cm4gdmFsdWU7XG4gIH1cblxuICBwdXNoKG5ld1ZhbHVlOiBUdmFsdWUpOiB2b2lkIHtcbiAgICB0aGlzLl9jb250YWluZXIudW5zaGlmdChuZXdWYWx1ZSk7XG4gICAgdGhpcy5sZW5ndGggPSB0aGlzLl9jb250YWluZXIubGVuZ3RoO1xuICB9XG59XG5cbmNsYXNzIE15U3RhY2s8VHZhbHVlPiB7XG4gIHByaXZhdGUgX2NvbnRhaW5lcjogQmlnQXJyYXk7XG4gIHByaXZhdGUgX3NpemU6IG51bWJlcjtcbiAgbGVuZ3RoOiBudW1iZXI7XG5cbiAgY29uc3RydWN0b3Ioc2l6ZT86IG51bWJlcikge1xuICAgIHNpemUgPSBzaXplIHx8IDEwO1xuICAgIHRoaXMubGVuZ3RoID0gMDtcbiAgICB0aGlzLl9jb250YWluZXIgPSBuZXcgQmlnQXJyYXkoc2l6ZSk7XG4gICAgdGhpcy5fc2l6ZSA9IHNpemU7XG4gIH1cblxuICBwb3AoKTogVHZhbHVlIHtcbiAgICBpZiAodGhpcy5fY29udGFpbmVyLmxlbmd0aFBvcHVsYXRlZCA9PT0gMCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLl9jb250YWluZXIubGVuZ3RoUG9wdWxhdGVkLS07XG4gICAgdGhpcy5sZW5ndGggPSB0aGlzLl9jb250YWluZXIubGVuZ3RoUG9wdWxhdGVkO1xuICAgIGxldCB2YWx1ZSA9IHRoaXMuX2NvbnRhaW5lclt0aGlzLl9jb250YWluZXIubGVuZ3RoUG9wdWxhdGVkXTtcbiAgICAvL2RlbGV0ZSB0aGlzLl9jb250YWluZXJbdGhpcy5fY29udGFpbmVyLmxlbmd0aFBvcHVsYXRlZF07XG4gICAgdGhpcy5fY29udGFpbmVyW3RoaXMuX2NvbnRhaW5lci5sZW5ndGhQb3B1bGF0ZWRdID0gbnVsbDtcbiAgICByZXR1cm4gdmFsdWU7XG4gIH1cblxuICBwdXNoKG5ld1ZhbHVlOiBUdmFsdWUpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5fY29udGFpbmVyLmxlbmd0aFBvcHVsYXRlZCA9PT0gdGhpcy5fY29udGFpbmVyLmxlbmd0aCkge1xuICAgICAgdGhpcy5fY29udGFpbmVyLmxlbmd0aCArPSB0aGlzLl9zaXplO1xuICAgIH1cbiAgICB0aGlzLl9jb250YWluZXJbdGhpcy5fY29udGFpbmVyLmxlbmd0aFBvcHVsYXRlZF0gPSBuZXdWYWx1ZTtcbiAgICB0aGlzLl9jb250YWluZXIubGVuZ3RoUG9wdWxhdGVkKys7XG4gICAgdGhpcy5sZW5ndGggPSB0aGlzLl9jb250YWluZXIubGVuZ3RoUG9wdWxhdGVkO1xuICB9XG59XG5cbmNsYXNzIE15UXVldWVOb2RlPFR2YWx1ZT4ge1xuICB2YWx1ZTogVHZhbHVlO1xuICBuZXh0OiBNeVF1ZXVlTm9kZTxUdmFsdWU+O1xuXG4gIGNvbnN0cnVjdG9yKHZhbHVlOiBUdmFsdWUpIHtcbiAgICB0aGlzLnZhbHVlID0gdmFsdWU7XG4gIH1cbn1cblxuY2xhc3MgTXlRdWV1ZTxUdmFsdWU+IHtcbiAgLy9wcml2YXRlIF9jb250YWluZXI6IEJpZ0FycmF5O1xuICAvL3ByaXZhdGUgX3NpemU6IG51bWJlcjtcbiAgcHJpdmF0ZSBfaGVhZDogTXlRdWV1ZU5vZGU8VHZhbHVlPjtcbiAgcHJpdmF0ZSBfdGFpbDogTXlRdWV1ZU5vZGU8VHZhbHVlPjtcbiAgbGVuZ3RoOiBudW1iZXI7XG5cbiAgY29uc3RydWN0b3Ioc2l6ZT86IG51bWJlcikge1xuICAgIHNpemUgPSBzaXplIHx8IDEwO1xuICAgIHRoaXMubGVuZ3RoID0gMDtcbiAgICAvL3RoaXMuX2NvbnRhaW5lciA9IG5ldyBCaWdBcnJheShzaXplKTtcbiAgICAvL3RoaXMuX3NpemUgPSBzaXplO1xuICB9XG5cbiAgcG9wKCk6IFR2YWx1ZSB7XG4gICAgaWYgKHRoaXMuX2hlYWQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgbGV0IHJldHVybk5vZGUgPSB0aGlzLl9oZWFkO1xuICAgIHRoaXMuX2hlYWQgPSB0aGlzLl9oZWFkLm5leHQ7XG4gICAgdGhpcy5sZW5ndGgtLTtcblxuICAgIHJldHVybiByZXR1cm5Ob2RlLnZhbHVlO1xuICB9XG5cbiAgcHVzaChuZXdWYWx1ZTogVHZhbHVlKTogdm9pZCB7XG4gICAgbGV0IG5vZGUgPSBuZXcgTXlRdWV1ZU5vZGU8VHZhbHVlPihuZXdWYWx1ZSk7XG5cbiAgICBpZiAodGhpcy5faGVhZCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aGlzLl9oZWFkID0gdGhpcy5fdGFpbCA9IG5vZGU7XG4gICAgICB0aGlzLmxlbmd0aCA9IDE7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5fdGFpbC5uZXh0ID0gbm9kZTtcbiAgICB0aGlzLl90YWlsID0gbm9kZTtcbiAgICB0aGlzLmxlbmd0aCsrO1xuICB9XG59XG5cbmNsYXNzIE15TWFwPFRrZXksIFR2YWx1ZT4ge1xuICBwcml2YXRlIF9jb250YWluZXI7XG4gIHByaXZhdGUgX2dldFByb3BlcnRpZXM6ICgobm9kZSkgPT4gbnVtYmVyKVtdO1xuICBsZW5ndGg6IG51bWJlcjtcblxuICBjb25zdHJ1Y3RvciguLi5nZXRQcm9wZXJ0aWVzOiAoKG5vZGUpID0+IG51bWJlcilbXSkge1xuICAgIHRoaXMubGVuZ3RoID0gMDtcbiAgICB0aGlzLl9jb250YWluZXIgPSBuZXcgQmlnQXJyYXkoMTApO1xuICAgIHRoaXMuX2dldFByb3BlcnRpZXMgPSBnZXRQcm9wZXJ0aWVzO1xuICB9XG5cbiAgZ2V0KGtleTogVGtleSk6IFR2YWx1ZSB7XG4gICAgbGV0IHN1YkNvbnRhaW5lciA9IHRoaXMuX2NvbnRhaW5lcjtcbiAgICB0aGlzLl9nZXRQcm9wZXJ0aWVzLmZvckVhY2goKGdldFByb3BlcnR5KSA9PiB7XG4gICAgICBpZiAoc3ViQ29udGFpbmVyICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgbGV0IHN1YktleTogbnVtYmVyID0gZ2V0UHJvcGVydHkoa2V5KTtcbiAgICAgICAgc3ViQ29udGFpbmVyID0gc3ViQ29udGFpbmVyW3N1YktleV07XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHN1YkNvbnRhaW5lcjtcbiAgfVxuXG4gIHBvcCgpIDogVHZhbHVlIHtcbiAgICBsZXQgYWRkcmVzczogbnVtYmVyW10gPSB0aGlzLl9wb3BSZWN1cnNlKHRoaXMuX2NvbnRhaW5lcik7XG5cbiAgICBsZXQgcmV0dXJuVmFsOiBUdmFsdWU7XG4gICAgbGV0IHN1YkNvbnRhaW5lciA9IHRoaXMuX2NvbnRhaW5lcjtcbiAgICBhZGRyZXNzLmZvckVhY2goKHN1YktleSwgaW5kZXgsIGFycmF5KSA9PiB7XG4gICAgICBpZiAoaW5kZXggPCBhcnJheS5sZW5ndGggLSAxKSB7XG4gICAgICAgIHN1YkNvbnRhaW5lciA9IHN1YkNvbnRhaW5lcltzdWJLZXldO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuVmFsID0gc3ViQ29udGFpbmVyW3N1YkNvbnRhaW5lci5sZW5ndGhQb3B1bGF0ZWQgLSAxXTtcbiAgICAgICAgLy9kZWxldGUgc3ViQ29udGFpbmVyW3N1YkNvbnRhaW5lci5sZW5ndGhQb3B1bGF0ZWQgLSAxXTtcbiAgICAgICAgc3ViQ29udGFpbmVyW3N1YkNvbnRhaW5lci5sZW5ndGhQb3B1bGF0ZWQgLSAxXSA9IG51bGw7XG4gICAgICAgIGlmIChyZXR1cm5WYWwgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIHN1YkNvbnRhaW5lci5sZW5ndGhQb3B1bGF0ZWQtLTtcbiAgICAgICAgICB0aGlzLmxlbmd0aC0tO1xuICAgICAgICB9XG4gICAgICAgIHdoaWxlIChzdWJDb250YWluZXIubGVuZ3RoUG9wdWxhdGVkID4gMCAmJlxuICAgICAgICAgICAgICAgc3ViQ29udGFpbmVyW3N1YkNvbnRhaW5lci5sZW5ndGhQb3B1bGF0ZWQgLSAxXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgLy8gV2hpbGUgdGhpcyBpcyBleHBlbnNpdmUsIGl0IHdpbGwgb25seSBoYXBwZW4gZm9yIGNhc2VzIHdoZW5cbiAgICAgICAgICAvLyB0aGVyZSBhcmUgZW1wdHkgc3BhY2VzIHRvIHRoZSBcImxlZnRcIiBvZiB0aGUgcG9wLWVkIHZhbHVlLlxuICAgICAgICAgIHN1YkNvbnRhaW5lci5sZW5ndGhQb3B1bGF0ZWQtLTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiByZXR1cm5WYWw7XG4gIH1cblxuICBwcml2YXRlIF9wb3BSZWN1cnNlKHJDb250YWluZXI6IFtdKTogbnVtYmVyW10ge1xuICAgIGxldCByZXR1cm5WYWw6IG51bWJlcltdID0gW107XG4gICAgckNvbnRhaW5lci5mb3JFYWNoKChub2RlLCBpbmRleCwgYXJyYXkpID0+IHtcbiAgICAgIGlmIChyZXR1cm5WYWwubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KGFycmF5W2luZGV4XSkpIHtcbiAgICAgICAgICBpZiAoKDxCaWdBcnJheT4oYXJyYXlbaW5kZXhdKSkubGVuZ3RoUG9wdWxhdGVkID4gMCkge1xuICAgICAgICAgICAgcmV0dXJuVmFsID0gW2luZGV4XS5jb25jYXQodGhpcy5fcG9wUmVjdXJzZShhcnJheVtpbmRleF0pKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuVmFsID0gW2luZGV4XTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiByZXR1cm5WYWw7XG4gIH1cblxuICBwdXQoa2V5OiBUa2V5LCB2YWx1ZTogVHZhbHVlKTogdm9pZCB7XG4gICAgbGV0IHN1YkNvbnRhaW5lciA9IHRoaXMuX2NvbnRhaW5lcjtcbiAgICB0aGlzLl9nZXRQcm9wZXJ0aWVzLmZvckVhY2goKGdldFByb3BlcnR5LCBpbmRleCwgYXJyYXkpID0+IHtcbiAgICAgIGxldCBzdWJLZXk6IG51bWJlciA9IGdldFByb3BlcnR5KGtleSk7XG4gICAgICBjb25zb2xlLmFzc2VydChzdWJLZXkgIT09IHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICAgICAgIChcIlByb2JsZW0gcnVubmluZyBcIiArIGdldFByb3BlcnR5Lm5hbWUgKyBcIiBvbiBcIiArIGtleSkpO1xuICAgICAgaWYgKGluZGV4IDwgYXJyYXkubGVuZ3RoIC0gMSkge1xuICAgICAgICB3aGlsZSAoc3ViQ29udGFpbmVyLmxlbmd0aFBvcHVsYXRlZCAtIDEgPCBzdWJLZXkpIHtcbiAgICAgICAgICAvL3N1YkNvbnRhaW5lci5wdXNoKG5ldyBCaWdBcnJheSgxMCkpO1xuICAgICAgICAgIHN1YkNvbnRhaW5lcltzdWJDb250YWluZXIubGVuZ3RoUG9wdWxhdGVkXSA9IG5ldyBCaWdBcnJheSgxMCk7XG4gICAgICAgICAgc3ViQ29udGFpbmVyLmxlbmd0aFBvcHVsYXRlZCsrO1xuICAgICAgICB9XG4gICAgICAgIHN1YkNvbnRhaW5lciA9IHN1YkNvbnRhaW5lcltzdWJLZXldO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKHN1YkNvbnRhaW5lcltzdWJLZXldID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBzdWJDb250YWluZXJbc3ViS2V5XSA9IHZhbHVlO1xuICAgICAgICAgIHN1YkNvbnRhaW5lci5sZW5ndGhQb3B1bGF0ZWQgPSBNYXRoLm1heChzdWJLZXkgKyAxLCBzdWJDb250YWluZXIubGVuZ3RoUG9wdWxhdGVkKTtcbiAgICAgICAgICB0aGlzLmxlbmd0aCsrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICBkZWwoa2V5OiBUa2V5KTogVHZhbHVlIHtcbiAgICBsZXQgcmV0dXJuVmFsOiBUdmFsdWU7XG5cbiAgICBsZXQgc3ViQ29udGFpbmVyID0gdGhpcy5fY29udGFpbmVyO1xuICAgIHRoaXMuX2dldFByb3BlcnRpZXMuZm9yRWFjaCgoZ2V0UHJvcGVydHksIGluZGV4LCBhcnJheSkgPT4ge1xuICAgICAgbGV0IHN1YktleTogbnVtYmVyID0gZ2V0UHJvcGVydHkoa2V5KTtcbiAgICAgIGNvbnNvbGUuYXNzZXJ0KHN1YktleSAhPT0gdW5kZWZpbmVkKTtcbiAgICAgIGlmIChpbmRleCA8IGFycmF5Lmxlbmd0aCAtIDEpIHtcbiAgICAgICAgbGV0IHN1YktleTogbnVtYmVyID0gZ2V0UHJvcGVydHkoa2V5KTtcbiAgICAgICAgc3ViQ29udGFpbmVyID0gc3ViQ29udGFpbmVyW3N1YktleV07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm5WYWwgPSBzdWJDb250YWluZXJbc3ViS2V5XTtcbiAgICAgICAgLy9kZWxldGUgc3ViQ29udGFpbmVyW3N1YktleV07XG4gICAgICAgIHN1YkNvbnRhaW5lcltzdWJLZXldID0gbnVsbDtcbiAgICAgICAgaWYgKHJldHVyblZhbCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgc3ViQ29udGFpbmVyLmxlbmd0aFBvcHVsYXRlZC0tO1xuICAgICAgICAgIHRoaXMubGVuZ3RoLS07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiByZXR1cm5WYWw7XG4gIH1cbn1cblxuY2xhc3MgUHJpb3JpdHlRdWV1ZTxUPiB7XG4gIHByaXZhdGUgX2NvbnRhaW5lcjogTXlTdGFjazxUPltdO1xuICBwcml2YXRlIF9nZXRQcm9wZXJ0aWVzOiAoKG5vZGUpID0+IG51bWJlcilbXTtcbiAgbGVuZ3RoOiBudW1iZXI7XG5cbiAgY29uc3RydWN0b3IoLi4uZ2V0UHJvcGVydGllczogKChub2RlKSA9PiBudW1iZXIpW10pIHtcbiAgICB0aGlzLl9nZXRQcm9wZXJ0aWVzID0gZ2V0UHJvcGVydGllcztcbiAgICB0aGlzLl9jb250YWluZXIgPSBbXTtcbiAgICB0aGlzLmxlbmd0aCA9IDA7XG4gIH1cblxuICAvKiBQb3AgaXRlbSBmcm9tIGhpZ2hlc3QgcHJpb3JpdHkgc3ViLXF1ZXVlLiAqL1xuICBwb3AoKTogVCB7XG4gICAgbGV0IGl0ZW06IFQ7XG5cbiAgICB0aGlzLl9jb250YWluZXIuZm9yRWFjaCgobiwgaW5kZXgsIGFycmF5KSA9PiB7XG4gICAgICBsZXQgcmV2ZXJzZUluZGV4ID0gdGhpcy5fY29udGFpbmVyLmxlbmd0aCAtIGluZGV4IC0gMTtcblxuICAgICAgaWYgKGl0ZW0gPT09IHVuZGVmaW5lZCAmJiBhcnJheVtyZXZlcnNlSW5kZXhdLmxlbmd0aCkge1xuICAgICAgICBpdGVtID0gYXJyYXlbcmV2ZXJzZUluZGV4XS5wb3AoKTtcbiAgICAgICAgY29uc29sZS5hc3NlcnQoaXRlbSAhPT0gdW5kZWZpbmVkKTtcbiAgICAgICAgdGhpcy5sZW5ndGgtLTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gaXRlbTtcbiAgfVxuXG4gIC8qIFBvcCBpdGVtIGZyb20gbG93ZXN0IHByaW9yaXR5IHN1Yi1xdWV1ZS4gKi9cbiAgcG9wTG93KCk6IFQge1xuICAgIGxldCBpdGVtOiBUO1xuXG4gICAgdGhpcy5fY29udGFpbmVyLmZvckVhY2goKG4sIGluZGV4LCBhcnJheSkgPT4ge1xuICAgICAgaWYgKGl0ZW0gPT09IHVuZGVmaW5lZCAmJiBhcnJheVtpbmRleF0ubGVuZ3RoKSB7XG4gICAgICAgIGl0ZW0gPSBhcnJheVtpbmRleF0ucG9wKCk7XG4gICAgICAgIGNvbnNvbGUuYXNzZXJ0KGl0ZW0gIT09IHVuZGVmaW5lZCk7XG4gICAgICAgIHRoaXMubGVuZ3RoLS07XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIGl0ZW07XG4gIH1cblxuICAvKiBBZGQgaXRlbSBhdCBzcGVjaWZpZWQgcHJpb3JpdHkuICovXG4gIHB1c2goaXRlbTogVCwgcHJpb3JpdHk6IG51bWJlcik6IHZvaWQge1xuICAgIGNvbnNvbGUuYXNzZXJ0KGl0ZW0gIT09IHVuZGVmaW5lZCk7XG4gICAgY29uc29sZS5hc3NlcnQocHJpb3JpdHkgPT09IE1hdGgucm91bmQocHJpb3JpdHkpLFxuICAgICAgICAgICAgICAgICAgIFwiUHJpb3JpdHkgbXVzdCBiZSBhbiBpbnRpZ2VyLlwiKTtcblxuICAgIHdoaWxlICh0aGlzLl9jb250YWluZXIubGVuZ3RoIDwgcHJpb3JpdHkgKyAxKSB7XG4gICAgICAvLyBBZGQgbmV3IHByaW9yaXR5IHN1Yi1jb250YWluZXIuXG4gICAgICBsZXQgY29udGFpbmVyID0gbmV3IE15U3RhY2s8VD4oKTtcbiAgICAgIHRoaXMuX2NvbnRhaW5lci5wdXNoKGNvbnRhaW5lcik7XG4gICAgfVxuICAgIHRoaXMuX2NvbnRhaW5lcltwcmlvcml0eV0ucHVzaChpdGVtKTtcbiAgICB0aGlzLmxlbmd0aCsrO1xuICB9XG59XG5cbmNsYXNzIFRlc3RNeVN0YWNrIHtcbiAgcHJpdmF0ZSBfY29udGFpbmVyOiBNeVN0YWNrPG51bWJlcj47XG5cbiAgY29uc3RydWN0b3IoKSB7XG4gICAgbGV0IHRlc3RzID0gW3RoaXMudGVzdF9wdXNoLCB0aGlzLnRlc3RfcG9wXTtcbiAgICB0ZXN0cy5mb3JFYWNoKCh0ZXN0KSA9PiB7XG4gICAgICB0aGlzLl9pbml0KCk7XG4gICAgICB0ZXN0LmJpbmQodGhpcykoKTtcbiAgICB9LCB0aGlzKTtcbiAgfVxuXG4gIHByaXZhdGUgX2luaXQoKTogdm9pZCB7XG4gICAgdGhpcy5fY29udGFpbmVyID0gbmV3IE15U3RhY2soKTtcbiAgfVxuXG4gIHRlc3RfcHVzaCgpIHtcbiAgICBjb25zb2xlLmxvZyhcInRlc3RfcHVzaFwiKTtcblxuICAgIGNvbnNvbGUuYXNzZXJ0KHRoaXMuX2NvbnRhaW5lci5sZW5ndGggPT09IDApO1xuICAgIHRoaXMuX2NvbnRhaW5lci5wdXNoKDEpO1xuICAgIGNvbnNvbGUuYXNzZXJ0KHRoaXMuX2NvbnRhaW5lci5sZW5ndGggPT09IDEpO1xuICAgIHRoaXMuX2NvbnRhaW5lci5wdXNoKDIpO1xuICAgIGNvbnNvbGUuYXNzZXJ0KHRoaXMuX2NvbnRhaW5lci5sZW5ndGggPT09IDIpO1xuICAgIHRoaXMuX2NvbnRhaW5lci5wdXNoKDMpO1xuICAgIGNvbnNvbGUuYXNzZXJ0KHRoaXMuX2NvbnRhaW5lci5sZW5ndGggPT09IDMpO1xuICB9XG5cbiAgdGVzdF9wb3AoKSB7XG4gICAgY29uc29sZS5sb2coXCJ0ZXN0X3BvcFwiKTtcblxuICAgIGNvbnNvbGUuYXNzZXJ0KHRoaXMuX2NvbnRhaW5lci5sZW5ndGggPT09IDApO1xuICAgIHRoaXMuX2NvbnRhaW5lci5wdXNoKDEpO1xuICAgIHRoaXMuX2NvbnRhaW5lci5wdXNoKDIpO1xuICAgIHRoaXMuX2NvbnRhaW5lci5wdXNoKDMpO1xuICAgIHRoaXMuX2NvbnRhaW5lci5wdXNoKDQpO1xuICAgIGNvbnNvbGUuYXNzZXJ0KHRoaXMuX2NvbnRhaW5lci5sZW5ndGggPT09IDQpO1xuXG4gICAgbGV0IHZhbDogbnVtYmVyID0gdGhpcy5fY29udGFpbmVyLnBvcCgpO1xuICAgIGNvbnNvbGUuYXNzZXJ0KHZhbCA9PT0gNCk7XG4gICAgY29uc29sZS5hc3NlcnQodGhpcy5fY29udGFpbmVyLmxlbmd0aCA9PT0gMyk7XG5cbiAgICB2YWwgPSB0aGlzLl9jb250YWluZXIucG9wKCk7XG4gICAgdmFsID0gdGhpcy5fY29udGFpbmVyLnBvcCgpO1xuICAgIHZhbCA9IHRoaXMuX2NvbnRhaW5lci5wb3AoKTtcbiAgICBjb25zb2xlLmFzc2VydCh2YWwgPT09IDEpO1xuICAgIGNvbnNvbGUuYXNzZXJ0KHRoaXMuX2NvbnRhaW5lci5sZW5ndGggPT09IDApO1xuXG4gICAgdmFsID0gdGhpcy5fY29udGFpbmVyLnBvcCgpO1xuICAgIGNvbnNvbGUuYXNzZXJ0KHZhbCA9PT0gdW5kZWZpbmVkKTtcbiAgICBjb25zb2xlLmFzc2VydCh0aGlzLl9jb250YWluZXIubGVuZ3RoID09PSAwKTtcbiAgfVxufVxuXG5jbGFzcyBUZXN0TXlRdWV1ZSB7XG4gIHByaXZhdGUgX2NvbnRhaW5lcjogTXlRdWV1ZTxudW1iZXI+O1xuXG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIGxldCB0ZXN0cyA9IFt0aGlzLnRlc3RfcHVzaCwgdGhpcy50ZXN0X3BvcF07XG4gICAgdGVzdHMuZm9yRWFjaCgodGVzdCkgPT4ge1xuICAgICAgdGhpcy5faW5pdCgpO1xuICAgICAgdGVzdC5iaW5kKHRoaXMpKCk7XG4gICAgfSwgdGhpcyk7XG4gIH1cblxuICBwcml2YXRlIF9pbml0KCk6IHZvaWQge1xuICAgIHRoaXMuX2NvbnRhaW5lciA9IG5ldyBNeVF1ZXVlKCk7XG4gIH1cblxuICB0ZXN0X3B1c2goKSB7XG4gICAgY29uc29sZS5sb2coXCJ0ZXN0X3B1c2hcIik7XG5cbiAgICBjb25zb2xlLmFzc2VydCh0aGlzLl9jb250YWluZXIubGVuZ3RoID09PSAwKTtcbiAgICB0aGlzLl9jb250YWluZXIucHVzaCgxKTtcbiAgICBjb25zb2xlLmFzc2VydCh0aGlzLl9jb250YWluZXIubGVuZ3RoID09PSAxKTtcbiAgICB0aGlzLl9jb250YWluZXIucHVzaCgyKTtcbiAgICBjb25zb2xlLmFzc2VydCh0aGlzLl9jb250YWluZXIubGVuZ3RoID09PSAyKTtcbiAgICB0aGlzLl9jb250YWluZXIucHVzaCgzKTtcbiAgICBjb25zb2xlLmFzc2VydCh0aGlzLl9jb250YWluZXIubGVuZ3RoID09PSAzKTtcbiAgfVxuXG4gIHRlc3RfcG9wKCkge1xuICAgIGNvbnNvbGUubG9nKFwidGVzdF9wb3BcIik7XG5cbiAgICBjb25zb2xlLmFzc2VydCh0aGlzLl9jb250YWluZXIubGVuZ3RoID09PSAwKTtcbiAgICB0aGlzLl9jb250YWluZXIucHVzaCgxKTtcbiAgICB0aGlzLl9jb250YWluZXIucHVzaCgyKTtcbiAgICB0aGlzLl9jb250YWluZXIucHVzaCgzKTtcbiAgICB0aGlzLl9jb250YWluZXIucHVzaCg0KTtcbiAgICBjb25zb2xlLmFzc2VydCh0aGlzLl9jb250YWluZXIubGVuZ3RoID09PSA0KTtcblxuICAgIGxldCB2YWw6IG51bWJlciA9IHRoaXMuX2NvbnRhaW5lci5wb3AoKTtcbiAgICBjb25zb2xlLmFzc2VydCh2YWwgPT09IDEpO1xuICAgIGNvbnNvbGUuYXNzZXJ0KHRoaXMuX2NvbnRhaW5lci5sZW5ndGggPT09IDMpO1xuXG4gICAgdmFsID0gdGhpcy5fY29udGFpbmVyLnBvcCgpO1xuICAgIHZhbCA9IHRoaXMuX2NvbnRhaW5lci5wb3AoKTtcbiAgICB2YWwgPSB0aGlzLl9jb250YWluZXIucG9wKCk7XG4gICAgY29uc29sZS5hc3NlcnQodmFsID09PSA0KTtcbiAgICBjb25zb2xlLmFzc2VydCh0aGlzLl9jb250YWluZXIubGVuZ3RoID09PSAwKTtcblxuICAgIHZhbCA9IHRoaXMuX2NvbnRhaW5lci5wb3AoKTtcbiAgICBjb25zb2xlLmFzc2VydCh2YWwgPT09IHVuZGVmaW5lZCk7XG4gICAgY29uc29sZS5hc3NlcnQodGhpcy5fY29udGFpbmVyLmxlbmd0aCA9PT0gMCk7XG4gIH1cbn1cblxuY2xhc3MgVGVzdE15TWFwIHtcbiAgcHJpdmF0ZSBfY29udGFpbmVyOiBNeU1hcDx7fSwgbnVtYmVyPjtcblxuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBsZXQgdGVzdHMgPSBbdGhpcy50ZXN0X3B1dCwgdGhpcy50ZXN0X2dldCwgdGhpcy50ZXN0X2RlbCwgdGhpcy50ZXN0X3BvcF07XG4gICAgdGVzdHMuZm9yRWFjaCgodGVzdCkgPT4ge1xuICAgICAgdGhpcy5faW5pdCgpO1xuICAgICAgdGVzdC5iaW5kKHRoaXMpKCk7XG4gICAgfSwgdGhpcyk7XG4gIH1cblxuICBwcml2YXRlIF9pbml0KCk6IHZvaWQge1xuICAgIGZ1bmN0aW9uIGdldFgobm9kZToge1wieFwiLCBcInlcIn0pOiBudW1iZXIge1xuICAgICAgcmV0dXJuIG5vZGUueDtcbiAgICB9XG4gICAgZnVuY3Rpb24gZ2V0WShub2RlOiB7XCJ4XCIsIFwieVwifSk6IG51bWJlciB7XG4gICAgICByZXR1cm4gbm9kZS55O1xuICAgIH1cbiAgICB0aGlzLl9jb250YWluZXIgPSBuZXcgTXlNYXAoZ2V0WCwgZ2V0WSk7XG4gIH1cblxuICB0ZXN0X3B1dCgpIHtcbiAgICBjb25zb2xlLmxvZyhcInRlc3RfcHV0XCIpO1xuXG4gICAgY29uc29sZS5hc3NlcnQodGhpcy5fY29udGFpbmVyLmxlbmd0aCA9PT0gMCk7XG4gICAgdGhpcy5fY29udGFpbmVyLnB1dCh7XCJ4XCI6IDEsIFwieVwiOiAyfSwgMyk7XG4gICAgY29uc29sZS5hc3NlcnQodGhpcy5fY29udGFpbmVyLmxlbmd0aCA9PT0gMSk7XG4gICAgdGhpcy5fY29udGFpbmVyLnB1dCh7XCJ4XCI6IDEsIFwieVwiOiAyfSwgMyk7XG4gICAgdGhpcy5fY29udGFpbmVyLnB1dCh7XCJ4XCI6IDEsIFwieVwiOiAyfSwgNCk7XG4gICAgY29uc29sZS5hc3NlcnQodGhpcy5fY29udGFpbmVyLmxlbmd0aCA9PT0gMSk7XG4gICAgdGhpcy5fY29udGFpbmVyLnB1dCh7XCJ4XCI6IDEsIFwieVwiOiAxfSwgNSk7XG4gICAgY29uc29sZS5hc3NlcnQodGhpcy5fY29udGFpbmVyLmxlbmd0aCA9PT0gMik7XG4gICAgdGhpcy5fY29udGFpbmVyLnB1dCh7XCJ4XCI6IDEsIFwieVwiOiAzfSwgNik7XG4gICAgY29uc29sZS5hc3NlcnQodGhpcy5fY29udGFpbmVyLmxlbmd0aCA9PT0gMyk7XG4gICAgdGhpcy5fY29udGFpbmVyLnB1dCh7XCJ4XCI6IDAsIFwieVwiOiAzfSwgNyk7XG4gICAgY29uc29sZS5hc3NlcnQodGhpcy5fY29udGFpbmVyLmxlbmd0aCA9PT0gNCk7XG4gICAgdGhpcy5fY29udGFpbmVyLnB1dCh7XCJ4XCI6IDIsIFwieVwiOiAzfSwgOCk7XG4gICAgY29uc29sZS5hc3NlcnQodGhpcy5fY29udGFpbmVyLmxlbmd0aCA9PT0gNSk7XG4gICAgdGhpcy5fY29udGFpbmVyLnB1dCh7XCJ4XCI6IDAsIFwieVwiOiAwfSwgOSk7XG4gICAgY29uc29sZS5hc3NlcnQodGhpcy5fY29udGFpbmVyLmxlbmd0aCA9PT0gNik7XG4gIH1cblxuICB0ZXN0X2dldCgpIHtcbiAgICBjb25zb2xlLmxvZyhcInRlc3RfZ2V0XCIpO1xuXG4gICAgY29uc29sZS5hc3NlcnQodGhpcy5fY29udGFpbmVyLmxlbmd0aCA9PT0gMCk7XG4gICAgdGhpcy5fY29udGFpbmVyLnB1dCh7XCJ4XCI6IDAsIFwieVwiOiAyfSwgMSk7XG4gICAgdGhpcy5fY29udGFpbmVyLnB1dCh7XCJ4XCI6IDEsIFwieVwiOiAyfSwgMik7XG4gICAgdGhpcy5fY29udGFpbmVyLnB1dCh7XCJ4XCI6IDIsIFwieVwiOiAyfSwgMyk7XG4gICAgdGhpcy5fY29udGFpbmVyLnB1dCh7XCJ4XCI6IDMsIFwieVwiOiAwfSwgNCk7XG4gICAgdGhpcy5fY29udGFpbmVyLnB1dCh7XCJ4XCI6IDMsIFwieVwiOiAxfSwgNSk7XG4gICAgdGhpcy5fY29udGFpbmVyLnB1dCh7XCJ4XCI6IDMsIFwieVwiOiAyfSwgNik7XG4gICAgY29uc29sZS5hc3NlcnQodGhpcy5fY29udGFpbmVyLmxlbmd0aCA9PT0gNik7XG5cbiAgICBjb25zb2xlLmFzc2VydCh0aGlzLl9jb250YWluZXIuZ2V0KHtcInhcIjogMCwgXCJ5XCI6IDJ9KSA9PT0gMSk7XG4gICAgY29uc29sZS5hc3NlcnQodGhpcy5fY29udGFpbmVyLmdldCh7XCJ4XCI6IDEsIFwieVwiOiAyfSkgPT09IDIpO1xuICAgIGNvbnNvbGUuYXNzZXJ0KHRoaXMuX2NvbnRhaW5lci5nZXQoe1wieFwiOiAyLCBcInlcIjogMn0pID09PSAzKTtcbiAgICBjb25zb2xlLmFzc2VydCh0aGlzLl9jb250YWluZXIuZ2V0KHtcInhcIjogMywgXCJ5XCI6IDB9KSA9PT0gNCk7XG4gICAgY29uc29sZS5hc3NlcnQodGhpcy5fY29udGFpbmVyLmdldCh7XCJ4XCI6IDMsIFwieVwiOiAxfSkgPT09IDUpO1xuICAgIGNvbnNvbGUuYXNzZXJ0KHRoaXMuX2NvbnRhaW5lci5nZXQoe1wieFwiOiAzLCBcInlcIjogMn0pID09PSA2KTtcbiAgICBjb25zb2xlLmFzc2VydCh0aGlzLl9jb250YWluZXIuZ2V0KHtcInhcIjogMywgXCJ5XCI6IDN9KSA9PT0gdW5kZWZpbmVkKTtcbiAgfVxuXG4gIHRlc3RfZGVsKCkge1xuICAgIGNvbnNvbGUubG9nKFwidGVzdF9kZWxcIik7XG5cbiAgICBjb25zb2xlLmFzc2VydCh0aGlzLl9jb250YWluZXIubGVuZ3RoID09PSAwKTtcbiAgICB0aGlzLl9jb250YWluZXIucHV0KHtcInhcIjogMCwgXCJ5XCI6IDJ9LCAxKTtcbiAgICB0aGlzLl9jb250YWluZXIucHV0KHtcInhcIjogMSwgXCJ5XCI6IDJ9LCAyKTtcbiAgICB0aGlzLl9jb250YWluZXIucHV0KHtcInhcIjogMiwgXCJ5XCI6IDJ9LCAzKTtcbiAgICB0aGlzLl9jb250YWluZXIucHV0KHtcInhcIjogMywgXCJ5XCI6IDB9LCA0KTtcbiAgICB0aGlzLl9jb250YWluZXIucHV0KHtcInhcIjogMywgXCJ5XCI6IDF9LCA1KTtcbiAgICB0aGlzLl9jb250YWluZXIucHV0KHtcInhcIjogMywgXCJ5XCI6IDJ9LCA2KTtcbiAgICBjb25zb2xlLmFzc2VydCh0aGlzLl9jb250YWluZXIubGVuZ3RoID09PSA2KTtcblxuICAgIGNvbnNvbGUuYXNzZXJ0KHRoaXMuX2NvbnRhaW5lci5kZWwoe1wieFwiOiAwLCBcInlcIjogMn0pID09PSAxKTtcbiAgICBjb25zb2xlLmFzc2VydCh0aGlzLl9jb250YWluZXIubGVuZ3RoID09PSA1KTtcbiAgICBjb25zb2xlLmFzc2VydCh0aGlzLl9jb250YWluZXIuZGVsKHtcInhcIjogMCwgXCJ5XCI6IDJ9KSA9PT0gdW5kZWZpbmVkKTtcbiAgICBjb25zb2xlLmFzc2VydCh0aGlzLl9jb250YWluZXIubGVuZ3RoID09PSA1KTtcbiAgICBjb25zb2xlLmFzc2VydCh0aGlzLl9jb250YWluZXIuZGVsKHtcInhcIjogMSwgXCJ5XCI6IDJ9KSA9PT0gMik7XG4gICAgY29uc29sZS5hc3NlcnQodGhpcy5fY29udGFpbmVyLmRlbCh7XCJ4XCI6IDEsIFwieVwiOiAyfSkgPT09IHVuZGVmaW5lZCk7XG4gICAgY29uc29sZS5hc3NlcnQodGhpcy5fY29udGFpbmVyLmRlbCh7XCJ4XCI6IDIsIFwieVwiOiAyfSkgPT09IDMpO1xuICAgIGNvbnNvbGUuYXNzZXJ0KHRoaXMuX2NvbnRhaW5lci5kZWwoe1wieFwiOiAzLCBcInlcIjogMH0pID09PSA0KTtcbiAgICBjb25zb2xlLmFzc2VydCh0aGlzLl9jb250YWluZXIuZGVsKHtcInhcIjogMywgXCJ5XCI6IDF9KSA9PT0gNSk7XG4gICAgY29uc29sZS5hc3NlcnQodGhpcy5fY29udGFpbmVyLmRlbCh7XCJ4XCI6IDMsIFwieVwiOiAyfSkgPT09IDYpO1xuICAgIGNvbnNvbGUuYXNzZXJ0KHRoaXMuX2NvbnRhaW5lci5kZWwoe1wieFwiOiAzLCBcInlcIjogM30pID09PSB1bmRlZmluZWQpO1xuICAgIGNvbnNvbGUuYXNzZXJ0KHRoaXMuX2NvbnRhaW5lci5sZW5ndGggPT09IDApO1xuICB9XG5cbiAgdGVzdF9wb3AoKSB7XG4gICAgY29uc29sZS5sb2coXCJ0ZXN0X3BvcFwiKTtcblxuICAgIGNvbnNvbGUuYXNzZXJ0KHRoaXMuX2NvbnRhaW5lci5sZW5ndGggPT09IDApO1xuICAgIHRoaXMuX2NvbnRhaW5lci5wdXQoe1wieFwiOiAwLCBcInlcIjogMn0sIDEpO1xuICAgIHRoaXMuX2NvbnRhaW5lci5wdXQoe1wieFwiOiAxLCBcInlcIjogMn0sIDIpO1xuICAgIHRoaXMuX2NvbnRhaW5lci5wdXQoe1wieFwiOiA0LCBcInlcIjogMX0sIDUpO1xuICAgIHRoaXMuX2NvbnRhaW5lci5wdXQoe1wieFwiOiAyLCBcInlcIjogMn0sIDMpO1xuICAgIHRoaXMuX2NvbnRhaW5lci5wdXQoe1wieFwiOiA0LCBcInlcIjogMH0sIDQpO1xuICAgIHRoaXMuX2NvbnRhaW5lci5wdXQoe1wieFwiOiA0LCBcInlcIjogMn0sIDYpO1xuICAgIGNvbnNvbGUuYXNzZXJ0KHRoaXMuX2NvbnRhaW5lci5sZW5ndGggPT09IDYpO1xuXG4gICAgbGV0IHZhbDogbnVtYmVyID0gdGhpcy5fY29udGFpbmVyLnBvcCgpO1xuICAgIGNvbnNvbGUuYXNzZXJ0KHZhbCA+PSAxICYmIHZhbCA8PSA2KTtcbiAgICBjb25zb2xlLmFzc2VydCh0aGlzLl9jb250YWluZXIubGVuZ3RoID09PSA1KTtcblxuICAgIHZhbCA9IHRoaXMuX2NvbnRhaW5lci5wb3AoKTtcbiAgICBjb25zb2xlLmFzc2VydCh2YWwgPj0gMSAmJiB2YWwgPD0gNik7XG4gICAgY29uc29sZS5hc3NlcnQodGhpcy5fY29udGFpbmVyLmxlbmd0aCA9PT0gNCk7XG5cbiAgICB2YWwgPSB0aGlzLl9jb250YWluZXIucG9wKCk7XG4gICAgY29uc29sZS5hc3NlcnQodmFsID49IDEgJiYgdmFsIDw9IDYpO1xuICAgIGNvbnNvbGUuYXNzZXJ0KHRoaXMuX2NvbnRhaW5lci5sZW5ndGggPT09IDMpO1xuXG4gICAgdmFsID0gdGhpcy5fY29udGFpbmVyLnBvcCgpO1xuICAgIGNvbnNvbGUuYXNzZXJ0KHZhbCA+PSAxICYmIHZhbCA8PSA2KTtcbiAgICBjb25zb2xlLmFzc2VydCh0aGlzLl9jb250YWluZXIubGVuZ3RoID09PSAyKTtcblxuICAgIHZhbCA9IHRoaXMuX2NvbnRhaW5lci5wb3AoKTtcbiAgICBjb25zb2xlLmFzc2VydCh2YWwgPj0gMSAmJiB2YWwgPD0gNik7XG4gICAgY29uc29sZS5hc3NlcnQodGhpcy5fY29udGFpbmVyLmxlbmd0aCA9PT0gMSk7XG5cbiAgICB2YWwgPSB0aGlzLl9jb250YWluZXIucG9wKCk7XG4gICAgY29uc29sZS5hc3NlcnQodmFsID49IDEgJiYgdmFsIDw9IDYpO1xuICAgIGNvbnNvbGUuYXNzZXJ0KHRoaXMuX2NvbnRhaW5lci5sZW5ndGggPT09IDApO1xuXG4gICAgdmFsID0gdGhpcy5fY29udGFpbmVyLnBvcCgpO1xuICAgIGNvbnNvbGUuYXNzZXJ0KHZhbCA9PT0gdW5kZWZpbmVkKTtcbiAgICBjb25zb2xlLmFzc2VydCh0aGlzLl9jb250YWluZXIubGVuZ3RoID09PSAwKTtcbiAgfVxufVxuXG5jbGFzcyBUZXN0UHJpb3JpdHlRdWV1ZSB7XG4gIHByaXZhdGUgX3BxOiBQcmlvcml0eVF1ZXVlPHt9PjtcblxuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBsZXQgdGVzdHMgPSBbdGhpcy50ZXN0X3B1c2gsIHRoaXMudGVzdF9wb3AsIHRoaXMudGVzdF9wb3BMb3ddO1xuICAgIHRlc3RzLmZvckVhY2goKHRlc3QpID0+IHtcbiAgICAgIHRoaXMuX2luaXQoKTtcbiAgICAgIHRlc3QuYmluZCh0aGlzKSgpO1xuICAgIH0sIHRoaXMpO1xuICB9XG5cbiAgcHJpdmF0ZSBfaW5pdCgpOiB2b2lkIHtcbiAgICBmdW5jdGlvbiBnZXRYKG5vZGU6IHtcInhcIiwgXCJ5XCJ9KTogbnVtYmVyIHtcbiAgICAgIHJldHVybiBub2RlLng7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGdldFkobm9kZToge1wieFwiLCBcInlcIn0pOiBudW1iZXIge1xuICAgICAgcmV0dXJuIG5vZGUueTtcbiAgICB9XG4gICAgdGhpcy5fcHEgPSBuZXcgUHJpb3JpdHlRdWV1ZShnZXRYLCBnZXRZKTtcbiAgfVxuXG4gIHRlc3RfcHVzaCgpIHtcbiAgICBjb25zb2xlLmxvZyhcInRlc3RfcHVzaFwiKTtcblxuICAgIGNvbnNvbGUuYXNzZXJ0KHRoaXMuX3BxLmxlbmd0aCA9PT0gMCk7XG4gICAgdGhpcy5fcHEucHVzaCh7XCJ4XCI6IDEsIFwieVwiOiAxfSwgMSk7XG4gICAgY29uc29sZS5hc3NlcnQodGhpcy5fcHEubGVuZ3RoID09PSAxKTtcbiAgICB0aGlzLl9wcS5wdXNoKHtcInhcIjogMCwgXCJ5XCI6IDF9LCAxKTtcbiAgICB0aGlzLl9wcS5wdXNoKHtcInhcIjogMiwgXCJ5XCI6IDF9LCAxKTtcbiAgICB0aGlzLl9wcS5wdXNoKHtcInhcIjogMSwgXCJ5XCI6IDB9LCAxKTtcbiAgICBjb25zb2xlLmFzc2VydCh0aGlzLl9wcS5sZW5ndGggPT09IDQpO1xuICB9XG5cbiAgdGVzdF9wb3AoKSB7XG4gICAgY29uc29sZS5sb2coXCJ0ZXN0X3BvcFwiKTtcbiAgICB0aGlzLl9wcS5wdXNoKHtcInhcIjogMSwgXCJ5XCI6IDB9LCAxKTtcbiAgICB0aGlzLl9wcS5wdXNoKHtcInhcIjogMSwgXCJ5XCI6IDF9LCAxKTtcbiAgICB0aGlzLl9wcS5wdXNoKHtcInhcIjogMywgXCJ5XCI6IDB9LCAyKTtcbiAgICB0aGlzLl9wcS5wdXNoKHtcInhcIjogMywgXCJ5XCI6IDF9LCAyKTtcbiAgICB0aGlzLl9wcS5wdXNoKHtcInhcIjogMCwgXCJ5XCI6IDB9LCAxKTtcbiAgICB0aGlzLl9wcS5wdXNoKHtcInhcIjogMCwgXCJ5XCI6IDJ9LCAxKTtcblxuICAgIC8vIFBvcCBoaWdoZXIgcHJpb3JpdHkgZmlyc3QuXG4gICAgbGV0IGl0ZW0wID0gdGhpcy5fcHEucG9wKCk7XG4gICAgbGV0IGl0ZW0xID0gdGhpcy5fcHEucG9wKCk7XG4gICAgY29uc29sZS5hc3NlcnQoaXRlbTBbXCJ4XCJdID09PSAzICYmIGl0ZW0xW1wieFwiXSA9PT0gMyk7XG4gICAgY29uc29sZS5hc3NlcnQoaXRlbTBbXCJ5XCJdID09PSAwIHx8IGl0ZW0xW1wieVwiXSA9PT0gMCk7XG4gICAgY29uc29sZS5hc3NlcnQoaXRlbTBbXCJ5XCJdID09PSAxIHx8IGl0ZW0xW1wieVwiXSA9PT0gMSk7XG4gICAgY29uc29sZS5hc3NlcnQodGhpcy5fcHEubGVuZ3RoID09PSA0KTtcblxuICAgIC8vIFBvcCBsb3dlciBwcmlvcml0eSBuZXh0LlxuICAgIGxldCBpdGVtMiA9IHRoaXMuX3BxLnBvcCgpO1xuICAgIGxldCBpdGVtMyA9IHRoaXMuX3BxLnBvcCgpO1xuICAgIGxldCBpdGVtNCA9IHRoaXMuX3BxLnBvcCgpO1xuICAgIGxldCBpdGVtNSA9IHRoaXMuX3BxLnBvcCgpO1xuICAgIGNvbnNvbGUuYXNzZXJ0KGl0ZW0yW1wieFwiXSA8IDMpO1xuICAgIGNvbnNvbGUuYXNzZXJ0KGl0ZW0zW1wieFwiXSA8IDMpO1xuICAgIGNvbnNvbGUuYXNzZXJ0KGl0ZW00W1wieFwiXSA8IDMpO1xuICAgIGNvbnNvbGUuYXNzZXJ0KGl0ZW01W1wieFwiXSA8IDMpO1xuICAgIGNvbnNvbGUuYXNzZXJ0KHRoaXMuX3BxLmxlbmd0aCA9PT0gMCk7XG5cbiAgICAvLyBOb25lIGxlZnQgdG8gcG9wLlxuICAgIGxldCBpdGVtNiA9IHRoaXMuX3BxLnBvcCgpO1xuICAgIGNvbnNvbGUuYXNzZXJ0KGl0ZW02ID09PSB1bmRlZmluZWQpO1xuICB9XG5cbiAgdGVzdF9wb3BMb3coKSB7XG4gICAgY29uc29sZS5sb2coXCJ0ZXN0X3BvcExvd1wiKTtcbiAgICB0aGlzLl9wcS5wdXNoKHtcInhcIjogMiwgXCJ5XCI6IDB9LCAyKTtcbiAgICB0aGlzLl9wcS5wdXNoKHtcInhcIjogMiwgXCJ5XCI6IDF9LCAyKTtcbiAgICB0aGlzLl9wcS5wdXNoKHtcInhcIjogMSwgXCJ5XCI6IDB9LCAxKTtcbiAgICB0aGlzLl9wcS5wdXNoKHtcInhcIjogMSwgXCJ5XCI6IDF9LCAxKTtcbiAgICB0aGlzLl9wcS5wdXNoKHtcInhcIjogMywgXCJ5XCI6IDB9LCAyKTtcbiAgICB0aGlzLl9wcS5wdXNoKHtcInhcIjogMywgXCJ5XCI6IDJ9LCAyKTtcblxuICAgIGxldCBpdGVtMCA9IHRoaXMuX3BxLnBvcExvdygpO1xuICAgIGxldCBpdGVtMSA9IHRoaXMuX3BxLnBvcExvdygpO1xuICAgIGNvbnNvbGUuYXNzZXJ0KGl0ZW0wW1wieFwiXSA9PT0gMSAmJiBpdGVtMVtcInhcIl0gPT09IDEpO1xuICAgIGNvbnNvbGUuYXNzZXJ0KGl0ZW0wW1wieVwiXSA9PT0gMCB8fCBpdGVtMVtcInlcIl0gPT09IDApO1xuICAgIGNvbnNvbGUuYXNzZXJ0KGl0ZW0wW1wieVwiXSA9PT0gMSB8fCBpdGVtMVtcInlcIl0gPT09IDEpO1xuICAgIGNvbnNvbGUuYXNzZXJ0KHRoaXMuX3BxLmxlbmd0aCA9PT0gNCk7XG5cbiAgICBsZXQgaXRlbTIgPSB0aGlzLl9wcS5wb3BMb3coKTtcbiAgICBsZXQgaXRlbTMgPSB0aGlzLl9wcS5wb3BMb3coKTtcbiAgICBsZXQgaXRlbTQgPSB0aGlzLl9wcS5wb3BMb3coKTtcbiAgICBsZXQgaXRlbTUgPSB0aGlzLl9wcS5wb3BMb3coKTtcbiAgICBjb25zb2xlLmFzc2VydChpdGVtMltcInhcIl0gPiAxKTtcbiAgICBjb25zb2xlLmFzc2VydChpdGVtM1tcInhcIl0gPiAxKTtcbiAgICBjb25zb2xlLmFzc2VydChpdGVtNFtcInhcIl0gPiAxKTtcbiAgICBjb25zb2xlLmFzc2VydChpdGVtNVtcInhcIl0gPiAxKTtcbiAgICBjb25zb2xlLmFzc2VydCh0aGlzLl9wcS5sZW5ndGggPT09IDApO1xuXG4gICAgLy8gTm9uZSBsZWZ0IHRvIHBvcC5cbiAgICBsZXQgaXRlbTYgPSB0aGlzLl9wcS5wb3AoKTtcbiAgICBjb25zb2xlLmFzc2VydChpdGVtNiA9PT0gdW5kZWZpbmVkKTtcbiAgfVxufVxuXG5jbGFzcyBQcm9maWxlQ29udGFpbmVycyB7XG4gIHByaXZhdGUgX2NvbnRhaW5lcjtcblxuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBsZXQgdGVzdHMgPSBbdGhpcy50ZXN0VHJpdmlhbFN0YWNrLCB0aGlzLnRlc3RUcml2aWFsUXVldWUsIHRoaXMudGVzdFN0YWNrLCB0aGlzLnRlc3RRdWV1ZV07XG4gICAgdGVzdHMuZm9yRWFjaCgodGVzdCkgPT4ge1xuICAgICAgdGhpcy5faW5pdCgpO1xuICAgICAgdGVzdC5iaW5kKHRoaXMpKCk7XG4gICAgfSwgdGhpcyk7XG4gIH1cblxuICBwcml2YXRlIF9pbml0KCk6IHZvaWQge1xuICB9XG5cbiAgbWFueVB1c2goY29udGFpbmVyKTogdm9pZCB7XG4gICAgY29uc29sZS5hc3NlcnQoY29udGFpbmVyLmxlbmd0aCA9PT0gMCk7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCAxMDAwMDA7IGkrKykge1xuICAgICAgY29udGFpbmVyLnB1c2goaSk7XG4gICAgfVxuICAgIGNvbnNvbGUuYXNzZXJ0KGNvbnRhaW5lci5sZW5ndGggPT09IDEwMDAwMCk7XG4gIH1cblxuICBtYW55UHVzaFBvcChjb250YWluZXIpOiB2b2lkIHtcbiAgICBjb25zb2xlLmFzc2VydChjb250YWluZXIubGVuZ3RoID09PSAwKTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IDEwMDAwMDsgaSsrKSB7XG4gICAgICBjb250YWluZXIucHVzaChpKTtcbiAgICB9XG4gICAgY29uc29sZS5hc3NlcnQoY29udGFpbmVyLmxlbmd0aCA9PT0gMTAwMDAwKTtcblxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgMTAwMDAwIC0gMTsgaSsrKSB7XG4gICAgICBjb250YWluZXIucG9wKCk7XG4gICAgfVxuICAgIGNvbnNvbGUuYXNzZXJ0KGNvbnRhaW5lci5sZW5ndGggPT09IDEpO1xuICAgIGxldCB2YWwgPSBjb250YWluZXIucG9wKCk7XG4gICAgY29uc29sZS5hc3NlcnQoY29udGFpbmVyLmxlbmd0aCA9PT0gMCk7XG4gICAgY29uc29sZS5hc3NlcnQodmFsID09PSAwIHx8IHZhbCA9PT0gMTAwMDAwIC0gMSk7XG4gIH1cblxuICB0ZXN0VHJpdmlhbFN0YWNrKCk6IHZvaWQge1xuICAgIGNvbnNvbGUubG9nKFwidGVzdFRyaXZpYWxTdGFja1wiKTtcblxuICAgIGxldCBjb250YWluZXIgPSBuZXcgVHJpdmlhbFN0YWNrKCk7XG4gICAgY29uc29sZS50aW1lKFwibWFueVB1c2hcIik7XG4gICAgdGhpcy5tYW55UHVzaChjb250YWluZXIpO1xuICAgIGNvbnNvbGUudGltZUVuZChcIm1hbnlQdXNoXCIpO1xuXG4gICAgY29udGFpbmVyID0gbmV3IFRyaXZpYWxTdGFjaygpO1xuICAgIGNvbnNvbGUudGltZShcIm1hbnlQdXNoUG9wXCIpO1xuICAgIHRoaXMubWFueVB1c2hQb3AoY29udGFpbmVyKTtcbiAgICBjb25zb2xlLnRpbWVFbmQoXCJtYW55UHVzaFBvcFwiKTtcbiAgfVxuXG4gIHRlc3RUcml2aWFsUXVldWUoKTogdm9pZCB7XG4gICAgY29uc29sZS5sb2coXCJ0ZXN0VHJpdmlhbFF1ZXVlXCIpO1xuXG4gICAgbGV0IGNvbnRhaW5lciA9IG5ldyBUcml2aWFsUXVldWUoKTtcbiAgICBjb25zb2xlLnRpbWUoXCJtYW55UHVzaFwiKTtcbiAgICB0aGlzLm1hbnlQdXNoKGNvbnRhaW5lcik7XG4gICAgY29uc29sZS50aW1lRW5kKFwibWFueVB1c2hcIik7XG5cbiAgICBjb250YWluZXIgPSBuZXcgVHJpdmlhbFF1ZXVlKCk7XG4gICAgY29uc29sZS50aW1lKFwibWFueVB1c2hQb3BcIik7XG4gICAgdGhpcy5tYW55UHVzaFBvcChjb250YWluZXIpO1xuICAgIGNvbnNvbGUudGltZUVuZChcIm1hbnlQdXNoUG9wXCIpO1xuICB9XG5cbiAgdGVzdFN0YWNrKCk6IHZvaWQge1xuICAgIGNvbnNvbGUubG9nKFwidGVzdFN0YWNrXCIpO1xuXG4gICAgbGV0IGNvbnRhaW5lciA9IG5ldyBNeVN0YWNrKDEwMDAwMDApO1xuICAgIGNvbnNvbGUudGltZShcIm1hbnlQdXNoXCIpO1xuICAgIHRoaXMubWFueVB1c2goY29udGFpbmVyKTtcbiAgICBjb25zb2xlLnRpbWVFbmQoXCJtYW55UHVzaFwiKTtcblxuICAgIGNvbnRhaW5lciA9IG5ldyBNeVN0YWNrKDEwMDAwMDApO1xuICAgIGNvbnNvbGUudGltZShcIm1hbnlQdXNoUG9wXCIpO1xuICAgIHRoaXMubWFueVB1c2hQb3AoY29udGFpbmVyKTtcbiAgICBjb25zb2xlLnRpbWVFbmQoXCJtYW55UHVzaFBvcFwiKTtcbiAgfVxuXG4gIHRlc3RRdWV1ZSgpOiB2b2lkIHtcbiAgICBjb25zb2xlLmxvZyhcInRlc3RRdWV1ZVwiKTtcblxuICAgIGxldCBjb250YWluZXIgPSBuZXcgTXlRdWV1ZSgpO1xuICAgIGNvbnNvbGUudGltZShcIm1hbnlQdXNoXCIpO1xuICAgIHRoaXMubWFueVB1c2goY29udGFpbmVyKTtcbiAgICBjb25zb2xlLnRpbWVFbmQoXCJtYW55UHVzaFwiKTtcblxuICAgIGNvbnRhaW5lciA9IG5ldyBNeVF1ZXVlKCk7XG4gICAgY29uc29sZS50aW1lKFwibWFueVB1c2hQb3BcIik7XG4gICAgdGhpcy5tYW55UHVzaFBvcChjb250YWluZXIpO1xuICAgIGNvbnNvbGUudGltZUVuZChcIm1hbnlQdXNoUG9wXCIpO1xuICB9XG5cbn1cbiJdfQ==
