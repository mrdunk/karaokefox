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

},{}]},{},[1,2,3]);
