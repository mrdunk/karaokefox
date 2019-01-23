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
class SceneryCell {
    constructor(coord, vegitation) {
        this.x = coord.x;
        this.y = coord.y;
        this.recursion = coord.recursion;
        this.vegitation = vegitation;
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
                            childMod.forEach((vegitation, index, array) => { array[index] /= childModTotal; });
                            let childIndex = ((x - parentCell.x) + 2 * (y - parentCell.y)) / tileSize;
                            //this.setCell({x, y, recursion},
                            //parentCell.vegitation * (0.5 + Math.random()));
                            this.setCell({ x, y, recursion }, parentCell.vegitation * childMod[childIndex] * 4);
                        }
                    }
                }
            }
        }
        console.log("Cell count: ", this._cells.length);
        /*for (let x = 0; x < this._mapSize; x++) {
          let line = "";
          for (let y = 0; y < this._mapSize; y++) {
            line += " " + Math.round(this.getCell({x, y, recursion: this._maxRecursion}).vegitation);
          }
          console.log(line);
        }*/
        this._plantTrees();
        //this._shaddows.getShadowMap().renderList.push(this._trees);
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
                let scale = cell.vegitation / this._treeScale;
                let tree;
                if (cell.vegitation > 80) {
                    let treeTypeIndex = Math.round(Math.random() * (this._treeTypes.length - 1));
                    //console.log(treeTypeIndex, this._treeTypes.length);
                    tree = this._treeTypes[treeTypeIndex].clone(this._treeTypes[treeTypeIndex].name + "_" + x + "_" + y);
                }
                else if (cell.vegitation > 50) {
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
    setCell(coord, vegitation) {
        let cell = new SceneryCell(coord, vegitation);
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
            return this.getCell(new SceneryCell(coord, -1).parentCoordinates(this._maxRecursion));
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvZ2FtZS50cyIsInNyYy9wbGFudEdlbmVyYXRvci50cyIsInNyYy9wcmlvcml0eVF1ZXVlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUEsd0RBQXdEO0FBQ3hELHlDQUF5QztBQUN6Qyx3Q0FBd0M7QUFFeEMsSUFBSSxTQUFTLEdBQUcsU0FBUyxDQUFDO0FBQzFCLElBQUksR0FBRyxHQUFHLGFBQWEsQ0FBQztBQUN4QixJQUFJLEtBQUssR0FBRyxHQUFHLENBQUM7QUFDaEIsSUFBSSxlQUFlLEdBQUcsSUFBSSxDQUFDO0FBQzNCLElBQUksaUJBQWlCLEdBQUcsQ0FBQyxDQUFDO0FBRTFCLElBQUksYUFBYSxHQUFhLEVBQUUsQ0FBQztBQUNqQyxTQUFTLFlBQVksQ0FBQyxHQUFXLEVBQUUsR0FBVyxFQUFFLElBQVM7SUFDdkQsR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDLENBQUM7SUFDZixHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsQ0FBQztJQUVmLElBQUksYUFBYSxDQUFDLElBQUksQ0FBQyxLQUFLLFNBQVMsRUFBRTtRQUNyQyxhQUFhLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO0tBQ3JDO0lBRUQsT0FBTyxHQUFHLEdBQUcsYUFBYSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQyxDQUFDO0FBQ2pELENBQUM7QUFrQkQsU0FBUyxVQUFVLENBQUMsS0FBWTtJQUM5QixJQUFJLFNBQVMsR0FBRyxFQUFFLEdBQUcsS0FBSyxDQUFDLENBQUMsR0FBRyxHQUFHLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQztJQUM3QyxJQUFJLEtBQUssQ0FBQyxTQUFTLEtBQUssU0FBUyxFQUFFO1FBQ2pDLFNBQVMsSUFBSSxHQUFHLEdBQUcsS0FBSyxDQUFDLFNBQVMsQ0FBQztLQUNwQztJQUNELE9BQU8s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RSxDQUFDO1FBQ3JCLElBQUksQ0FBQyxZQUFZLEdBQUcsQ0FBQyxDQUFDO1FBQ3RCLHVEQUF1RDtRQUN2RCxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUMsQ0FBQztRQUM3QyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQyxDQUFDO1FBQ2xELDZCQUE2QjtRQUM3QixJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQztRQUN6QyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQztRQUN6QyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQztRQUN6QyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQztRQUN6QyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQztRQUN6QyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQztRQUN6QyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQztRQUN6QyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQztRQUN6QyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQztRQUN6QyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQztRQUV6QyxJQUFJLENBQUMsV0FBVyxHQUFHLEVBQUUsQ0FBQztRQUN0QixJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDL0MsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUM7UUFDM0MsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUM7UUFDM0MsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUM7UUFDM0MsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUM7UUFDM0MsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUM7UUFDM0MsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUM7UUFDM0MsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUM7UUFDM0MsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUM7UUFDM0MsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUM7UUFFM0MsSUFBSSxDQUFDLGlCQUFpQixHQUFHLEVBQUUsQ0FBQztRQUM1QixJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLENBQUM7UUFDdkQsSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDO1FBQ3ZELElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGtCQUFr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LFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDeEIsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQztRQUM3QyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN4QixPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDO0lBQy9DLENBQUM7SUFFRCxRQUFRO1FBQ04sT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUV4QixPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQzdDLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3hCLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3hCLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3hCLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3hCLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFFN0MsSUFBSSxHQUFHLEdBQVcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUN4QyxPQUFPLENBQUMsTUFBTSxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUMxQixPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBRTdDLEdBQUcsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQzVCLEdBQUcsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQzVCLEdBQUcsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQzVCLE9BQU8sQ0FBQyxNQUFNLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQzFCLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFFN0MsR0FBRyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDNUIsT0FBTyxDQUFDLE1BQU0sQ0FBQyxHQUFHLEtBQUssU0FBUyxDQUFDLENBQUM7UUFDbEMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQztJQUMvQyxDQUFDO0NBQ0Y7QUFFRCxNQUFNLFdBQVc7SUFHZjtRQUNFLElBQUksS0FBSyxHQUFHLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDNUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFO1lBQ3JCLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNiLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztRQUNwQixDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDWCxDQUFDO0lBRU8sS0FBSztRQUNYLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxPQUFPLEVBQUUsQ0FBQztJQUNsQyxDQUFDO0lBRUQsU0FBUztRQUNQLE9BQU8sQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUM7UUFFekIsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQztRQUM3QyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN4QixPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQzdDLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3hCLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDN0MsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDeEIsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQztJQUMvQyxDQUFDO0lBRUQsUUFBUTtRQUNOLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUM7UUFFeEIsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQztRQUM3QyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN4QixJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN4QixJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN4QixJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN4QixPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBRTdDLElBQUksR0FBRyxHQUFXLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDeEMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDMUIsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQztRQUU3QyxHQUFHLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUM1QixHQUFHLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUM1QixHQUFHLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUM1QixPQUFPLENBQUMsTUFBTSxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUMxQixPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBRTdDLEdBQUcsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQzVCLE9BQU8sQ0FBQyxNQUFNLENBQUMsR0FBRyxLQUFLLFNBQVMsQ0FBQyxDQUFDO1FBQ2xDLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFDL0MsQ0FBQztDQUNGO0FBRUQsTUFBTSxTQUFTO0lBR2I7UUFDRSxJQUFJLEtBQUssR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUN6RSxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUU7WUFDckIsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ2IsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO1FBQ3BCLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUNYLENBQUM7SUFFTyxLQUFLO1FBQ1gsU0FBUyxJQUFJLENBQUMsSUFBZ0I7WUFDNUIsT0FBTyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ2hCLENBQUM7UUFDRCxTQUFTLElBQUksQ0FBQyxJQUFnQjtZQUM1QixPQUFPLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDaEIsQ0FBQztRQUNELElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxLQUFLLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQzFDLENBQUM7SUFFRCxRQUFRO1FBQ04sT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUV4QixPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQzdDLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDekMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQztRQUM3QyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3pDLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDekMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQztRQUM3QyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3pDLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDN0MsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN6QyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQzdDLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDekMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQztRQUM3QyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3pDLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDN0MsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN6QyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDO0lBQy9DLENBQUM7SUFFRCxRQUFRO1FBQ04sT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUV4QixPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQzdDLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDekMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN6QyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3pDLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDekMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN6QyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3pDLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFFN0MsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDNUQsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDNUQsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDNUQsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDNUQsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDNUQsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDNUQsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBQyxDQUFDLEtBQUssU0FBUyxDQUFDLENBQUM7SUFDdEUsQ0FBQztJQUVELFFBQVE7UUFDTixPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBRXhCLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDN0MsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN6QyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3pDLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDekMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN6QyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3pDLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDekMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQztRQUU3QyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUM1RCxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQzdDLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUMsQ0FBQyxLQUFLLFNBQVMsQ0FBQyxDQUFDO1FBQ3BFLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDN0MsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDNUQsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBQyxDQUFDLEtBQUssU0FBUyxDQUFDLENBQUM7UUFDcEUsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDNUQsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDNUQsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDNUQsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDNUQsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBQyxDQUFDLEtBQUssU0FBUyxDQUFDLENBQUM7UUFDcEUsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQztJQUMvQyxDQUFDO0lBRUQsUUFBUTtRQUNOLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUM7UUFFeEIsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQztRQUM3QyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3pDLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDekMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN6QyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3pDLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDekMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN6QyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBRTdDLElBQUksR0FBRyxHQUFXLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDeEMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUNyQyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBRTdDLEdBQUcsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQzVCLE9BQU8sQ0FBQyxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDckMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQztRQUU3QyxHQUFHLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUM1QixPQUFPLENBQUMsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ3JDLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFFN0MsR0FBRyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDNUIsT0FBTyxDQUFDLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUNyQyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBRTdDLEdBQUcsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQzVCLE9BQU8sQ0FBQyxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDckMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQztRQUU3QyxHQUFHLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUM1QixPQUFPLENBQUMsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ3JDLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFFN0MsR0FBRyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDNUIsT0FBTyxDQUFDLE1BQU0sQ0FBQyxHQUFHLEtBQUssU0FBUyxDQUFDLENBQUM7UUFDbEMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQztJQUMvQyxDQUFDO0NBQ0Y7QUFFRCxNQUFNLGlCQUFpQjtJQUdyQjtRQUNFLElBQUksS0FBSyxHQUFHLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUM5RCxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUU7WUFDckIsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ2IsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO1FBQ3BCLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUNYLENBQUM7SUFFTyxLQUFLO1FBQ1gsU0FBUyxJQUFJLENBQUMsSUFBZ0I7WUFDNUIsT0FBTyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ2hCLENBQUM7UUFDRCxTQUFTLElBQUksQ0FBQyxJQUFnQjtZQUM1QixPQUFPLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDaEIsQ0FBQztRQUNELElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxhQUFhLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQzNDLENBQUM7SUFFRCxTQUFTO1FBQ1AsT0FBTyxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUV6QixPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQ3RDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDbkMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQztRQUN0QyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ25DLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDbkMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNuQyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDO0lBQ3hDLENBQUM7SUFFRCxRQUFRO1FBQ04sT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUN4QixJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ25DLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDbkMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUMsRUFBRSxDQUFD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QUFDLEVBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDbkMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNuQyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ25DLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFbkMsSUFBSSxLQUFLLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUM5QixJQUFJLEtBQUssR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQzlCLE9BQU8sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxLQUFLLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDckQsT0FBTyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLEtBQUssQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUNyRCxPQUFPLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksS0FBSyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQ3JELE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFFdEMsSUFBSSxLQUFLLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxN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Q0FBQztRQUV6QixJQUFJLFNBQVMsR0FBRyxJQUFJLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNyQyxPQUFPLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ3pCLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDekIsT0FBTyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUU1QixTQUFTLEdBQUcsSUFBSSxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDakMsT0FBTyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUM1QixJQUFJLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQzVCLE9BQU8sQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLENBQUM7SUFDakMsQ0FBQztJQUVELFNBQVM7UUFDUCxPQUFPLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBRXpCLElBQUksU0FBUyxHQUFHLElBQUksT0FBTyxFQUFFLENBQUM7UUFDOUIsT0FBTyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUN6QixJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ3pCLE9BQU8sQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7UUFFNUIsU0FBUyxHQUFHLElBQUksT0FBTyxFQUFFLENBQUM7UUFDMUIsT0FBTyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUM1QixJQUFJLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQzVCLE9BQU8sQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLENBQUM7SUFDakMsQ0FBQztDQUVGIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwiLy8vPHJlZmVyZW5jZSBwYXRoPVwiM3JkUGFydHkvYmFieWxvbi5ndWkubW9kdWxlLmQudHNcIiAvPlxuLy8vPHJlZmVyZW5jZSBwYXRoPVwicGxhbnRHZW5lcmF0b3IudHNcIiAvPlxuLy8vPHJlZmVyZW5jZSBwYXRoPVwicHJpb3JpdHlRdWV1ZS50c1wiIC8+XG5cbmxldCBTQ0VORVBBVEggPSBcInNjZW5lcy9cIjtcbmxldCBGT1ggPSBcImZveC5iYWJ5bG9uXCI7XG5sZXQgU0NBTEUgPSAxMDA7XG5sZXQgQU5JTV9NRVJHRV9SQVRFID0gMC4wNTtcbmxldCBTQ0VORVJZX1JFQ1VSU0lPTiA9IDg7XG5cbmxldCByYW5kb21OdW1iZXJzOiBudW1iZXJbXSA9IFtdO1xuZnVuY3Rpb24gc2VlZGVkUmFuZG9tKG1heDogbnVtYmVyLCBtaW46IG51bWJlciwgc2VlZDogYW55KSA6IG51bWJlciB7XG4gIG1heCA9IG1heCB8fCAxO1xuICBtaW4gPSBtaW4gfHwgMDtcblxuICBpZiAocmFuZG9tTnVtYmVyc1tzZWVkXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgcmFuZG9tTnVtYmVyc1tzZWVkXSA9IE1hdGgucmFuZG9tKCk7XG4gIH1cblxuICByZXR1cm4gbWluICsgcmFuZG9tTnVtYmVyc1tzZWVkXSAqIChtYXggLSBtaW4pO1xufVxuXG5pbnRlcmZhY2UgQW5pbWF0ZVJlcXVlc3Qge1xuICBuYW1lOiBzdHJpbmc7XG4gIGxvb3A6IGJvb2xlYW47XG4gIHJldmVyc2VkOiBib29sZWFuO1xuICBkaXJ0eT86IGJvb2xlYW47XG4gIHJ1bkNvdW50PzogbnVtYmVyO1xuICBhbmltYXRpb24/OiBCQUJZTE9OLkFuaW1hdGFibGU7XG4gIGNsZWFudXA/OiBib29sZWFuO1xufVxuXG5pbnRlcmZhY2UgQ29vcmQge1xuICB4OiBudW1iZXI7XG4gIHk6IG51bWJlcjtcbiAgcmVjdXJzaW9uPzogbnVtYmVyO1xufVxuXG5mdW5jdGlvbiBjb29yZFRvS2V5KGNvb3JkOiBDb29yZCk6IHN0cmluZyB7XG4gIGxldCByZXR1cm5WYWwgPSBcIlwiICsgY29vcmQueCArIFwiX1wiICsgY29vcmQueTtcbiAgaWYgKGNvb3JkLnJlY3Vyc2lvbiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgcmV0dXJuVmFsICs9IFwiX1wiICsgY29vcmQucmVjdXJzaW9uO1xuICB9XG4gIHJldHVybiByZXR1cm5WYWw7XG59XG5cbmZ1bmN0aW9uIGtleVRvQ29vcmQoa2V5OiBzdHJpbmcpOiBDb29yZCB7XG4gIGxldCBwYXJhbXMgPSBrZXkuc3BsaXQoXCJfXCIpO1xuICBsZXQgcmV0dXJuVmFsOiBDb29yZDtcbiAgcmV0dXJuVmFsLnggPSBOdW1iZXIocGFyYW1zWzBdKTtcbiAgcmV0dXJuVmFsLnkgPSBOdW1iZXIocGFyYW1zWzFdKTtcbiAgaWYgKHBhcmFtcy5sZW5ndGggPiAyKSB7XG4gICAgcmV0dXJuVmFsLnJlY3Vyc2lvbiA9IE51bWJlcihwYXJhbXNbMl0pO1xuICB9XG4gIHJldHVybiByZXR1cm5WYWw7XG59XG5cbmZ1bmN0aW9uIGdldFgobm9kZToge1wieFwiLCBcInlcIn0pOiBudW1iZXIge1xuICByZXR1cm4gbm9kZS54O1xufVxuZnVuY3Rpb24gZ2V0WShub2RlOiB7XCJ4XCIsIFwieVwifSk6IG51bWJlciB7XG4gIHJldHVybiBub2RlLnk7XG59XG5mdW5jdGlvbiBnZXRSZWN1cnNpb24obm9kZToge1wieFwiLCBcInlcIiwgXCJyZWN1cnNpb25cIn0pOiBudW1iZXIge1xuICByZXR1cm4gbm9kZS5yZWN1cnNpb247XG59XG5cbi8qIERvbid0IGJvdGhlciBkb2luZyB0aGUgc3F1YXJlIHJvb3Qgb2YgUHl0aGFnb3Jhcy4gVXNlZnVsIGZvciBjb21wYXJpbmcgZGlzdGFuY2VzLiAqL1xuZnVuY3Rpb24gZGlzdEJldHdlZW4oYTogQ29vcmQsIGI6IENvb3JkKTogbnVtYmVyIHtcbiAgLy9yZXR1cm4gTWF0aC5hYnMoYS54IC0gYi54KSAqIE1hdGguYWJzKGEueCAtIGIueCkgKyBNYXRoLmFicyhhLnkgLSBiLnkpICogTWF0aC5hYnMoYS55IC0gYi55KTtcbiAgcmV0dXJuIE1hdGgucm91bmQoMS41ICogTWF0aC5zcXJ0KChhLnggLSBiLngpICogKGEueCAtIGIueCkgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIChhLnkgLSBiLnkpICogKGEueSAtIGIueSkpKTtcbn1cblxuY2xhc3MgU3RhciB7XG4gIHByaXZhdGUgX3NjZW5lOiBCQUJZTE9OLlNjZW5lO1xuICBwcml2YXRlIF9zY2VuZXJ5OiBTY2VuZXJ5O1xuICBwcml2YXRlIF9oZWFkaW5nOiBudW1iZXI7XG4gIHByaXZhdGUgX2hlYWRpbmdEaWZmOiBudW1iZXI7XG4gIHByaXZhdGUgX3NwZWVkOiBudW1iZXI7XG4gIHByaXZhdGUgX3NwZWVkTWF4OiBudW1iZXI7XG4gIHByaXZhdGUgX2hlaWdodERpZmY6IG51bWJlcjtcbiAgcHJpdmF0ZSBfZGVidWdUaW1lcjogbnVtYmVyO1xuICBwcml2YXRlIF9uZXh0VXBkYXRlOiBudW1iZXI7XG4gIHByaXZhdGUgX3RpY2s6IG51bWJlcjtcblxuICBtZXNoOiBCQUJZTE9OLk1lc2g7XG5cbiAgY29uc3RydWN0b3Ioc2NlbmU6IEJBQllMT04uU2NlbmUsIHNjZW5lcnk6IFNjZW5lcnkpIHtcbiAgICB0aGlzLl9zY2VuZSA9IHNjZW5lO1xuICAgIHRoaXMuX3NjZW5lcnkgPSBzY2VuZXJ5O1xuICAgIHRoaXMuX2hlYWRpbmcgPSAwO1xuICAgIHRoaXMuX2hlYWRpbmdEaWZmID0gMC4wMDE7XG4gICAgdGhpcy5fc3BlZWQgPSAxMDtcbiAgICB0aGlzLl9zcGVlZE1heCA9IDEwO1xuICAgIHRoaXMuX2hlaWdodERpZmYgPSAwO1xuXG4gICAgdmFyIGdsID0gbmV3IEJBQllMT04uR2xvd0xheWVyKFwiZ2xvd1wiLCB0aGlzLl9zY2VuZSk7XG5cbiAgICBsZXQgcHlyYW1pZEEgPVxuICAgICAgQkFCWUxPTi5NZXNoQnVpbGRlci5DcmVhdGVQb2x5aGVkcm9uKFwicHlyYW1pZEFcIiwge3R5cGU6IDAsIHNpemU6IDF9LCB0aGlzLl9zY2VuZSk7XG4gICAgbGV0IHB5cmFtaWRCID1cbiAgICAgIEJBQllMT04uTWVzaEJ1aWxkZXIuQ3JlYXRlUG9seWhlZHJvbihcInB5cmFtaWRCXCIsIHt0eXBlOiAwLCBzaXplOiAxfSwgdGhpcy5fc2NlbmUpO1xuICAgIHB5cmFtaWRCLnJvdGF0ZShCQUJZTE9OLkF4aXMuWSwgTWF0aC5QSSk7XG5cbiAgICBsZXQgc3Rhck1hdGVyaWFsVyA9IG5ldyBCQUJZTE9OLlN0YW5kYXJkTWF0ZXJpYWwoXCJzdGFyTWF0ZXJpYWxXXCIsIHRoaXMuX3NjZW5lKTtcbiAgICBzdGFyTWF0ZXJpYWxXLmVtaXNzaXZlQ29sb3IgPSBuZXcgQkFCWUxPTi5Db2xvcjMoMSwgMSwgMSk7XG4gICAgbGV0IHN0YXJNYXRlcmlhbFkgPSBuZXcgQkFCWUxPTi5TdGFuZGFyZE1hdGVyaWFsKFwic3Rhck1hdGVyaWFsWVwiLCB0aGlzLl9zY2VuZSk7XG4gICAgc3Rhck1hdGVyaWFsWS5lbWlzc2l2ZUNvbG9yID0gbmV3IEJBQllMT04uQ29sb3IzKDAuNSwgMSwgMSk7XG5cbiAgICBweXJhbWlkQS5tYXRlcmlhbCA9IHN0YXJNYXRlcmlhbFc7XG4gICAgcHlyYW1pZEIubWF0ZXJpYWwgPSBzdGFyTWF0ZXJpYWxZO1xuXG4gICAgdGhpcy5tZXNoID0gQkFCWUxPTi5NZXNoLkNyZWF0ZUJveChcInN0YXJcIiwgMSwgdGhpcy5fc2NlbmUpO1xuICAgIHRoaXMubWVzaC5pc1Zpc2libGUgPSBmYWxzZTtcbiAgICBweXJhbWlkQS5wYXJlbnQgPSB0aGlzLm1lc2g7XG4gICAgcHlyYW1pZEIucGFyZW50ID0gdGhpcy5tZXNoO1xuXG4gICAgdGhpcy5fc2NlbmUucmVnaXN0ZXJCZWZvcmVSZW5kZXIoKCkgPT4ge1xuICAgICAgdGhpcy5yYW5kb21XYWxrKCk7XG4gICAgfSk7XG4gIH1cblxuICByYW5kb21XYWxrKCkgOiB2b2lkIHtcbiAgICBsZXQgdGltZSA9IE1hdGgucm91bmQobmV3IERhdGUoKS5nZXRUaW1lKCkgLyAxMDAwKTtcbiAgICBsZXQgZnBzID0gdGhpcy5fc2NlbmUuZ2V0RW5naW5lKCkuZ2V0RnBzKCk7XG5cbiAgICAvLyBMZXQgZnBzIHN0YWJpbGlzZSBhZnRlciBtaXNzaW5nIHNjcmVlbiB1cGRhdGVzIGR1ZSB0byBpbmFjdGl2ZSBicm93c2VyIHRhYi5cbiAgICBpZiAodGltZSAtIHRoaXMuX3RpY2sgPiAxKSB7XG4gICAgICB0aGlzLl9uZXh0VXBkYXRlID0gdGltZSArIDI7XG4gICAgfVxuICAgIGlmICh0aGlzLl90aWNrICE9PSB0aW1lKSB7XG4gICAgICB0aGlzLl90aWNrID0gdGltZTtcbiAgICB9XG5cbiAgICBpZiAoZnBzIDw9IDAgfHwgdGhpcy5fbmV4dFVwZGF0ZSA+IHRpbWUpIHtcbiAgICAgIGNvbnNvbGUubG9nKFwiTGltaXRpbmcgc3RhciBtb3ZlbWVudC5cIiwgdGhpcy5fbmV4dFVwZGF0ZSwgdGltZSk7XG4gICAgICBmcHMgPSA2MDtcbiAgICB9IGVsc2UgaWYgKGZwcyA+IDYwKSB7XG4gICAgICBmcHMgPSA2MDtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fbmV4dFVwZGF0ZSA9IHRpbWU7XG4gICAgfVxuXG4gICAgbGV0IGNlbGxIZWlnaHQgPVxuICAgICAgdGhpcy5fc2NlbmVyeS5nZXRIZWlnaHRXb3JsZCh7eDogdGhpcy5tZXNoLnBvc2l0aW9uLngsIHk6IHRoaXMubWVzaC5wb3NpdGlvbi56fSkgfHwgMDtcbiAgICB0aGlzLl9oZWlnaHREaWZmID0gKGNlbGxIZWlnaHQgLSB0aGlzLm1lc2gucG9zaXRpb24ueSkgLyAzICsgMTtcblxuICAgIGxldCBkaXN0YW5jZVRvTWFwQ2VudGVyID0gTWF0aC5hYnModGhpcy5tZXNoLnBvc2l0aW9uLngpICsgTWF0aC5hYnModGhpcy5tZXNoLnBvc2l0aW9uLnopO1xuICAgIGxldCBhbmdsZVRvTWFwQ2VudGVyID0gKFxuICAgICAgTWF0aC5hdGFuMih0aGlzLm1lc2gucG9zaXRpb24ueCwgdGhpcy5tZXNoLnBvc2l0aW9uLnopICsgTWF0aC5QSSkgJSAoMiAqIE1hdGguUEkpO1xuXG4gICAgbGV0IGFuZ2xlRGlmZiA9IGFuZ2xlVG9NYXBDZW50ZXIgLSB0aGlzLl9oZWFkaW5nO1xuICAgIGxldCBiaWFzVG9DZW50ZXIgPSAwO1xuICAgIGlmIChhbmdsZURpZmYgPD0gTWF0aC5QSSkge1xuICAgICAgYmlhc1RvQ2VudGVyID0gKGFuZ2xlRGlmZiA8IDApID8gLTAuMDAwMSA6IDAuMDAwMTtcbiAgICB9IGVsc2Uge1xuICAgICAgYmlhc1RvQ2VudGVyID0gKGFuZ2xlRGlmZiA+IDApID8gLTAuMDAwMSA6IDAuMDAwMTtcbiAgICB9XG4gICAgYmlhc1RvQ2VudGVyICo9ICg2MCAvIGZwcyk7XG4gICAgYmlhc1RvQ2VudGVyICo9IGRpc3RhbmNlVG9NYXBDZW50ZXIgLyAxMDtcblxuICAgIHRoaXMuX2hlYWRpbmdEaWZmIC89ICgxLjAxICogNjAgLyBmcHMpO1xuICAgIHRoaXMuX2hlYWRpbmdEaWZmICs9IGJpYXNUb0NlbnRlcjtcbiAgICB0aGlzLl9oZWFkaW5nRGlmZiArPSAoTWF0aC5yYW5kb20oKSAtIDAuNSkgLyBmcHM7XG4gICAgdGhpcy50dXJuKHRoaXMuX2hlYWRpbmdEaWZmKTtcbiAgICB0aGlzLm1vdmVGb3J3YXJkcyhmcHMpO1xuXG4gICAgaWYgKHRpbWUgJSA2MCA9PT0gMCAmJiB0aW1lICE9PSB0aGlzLl9kZWJ1Z1RpbWVyKSB7XG4gICAgICBjb25zb2xlLmxvZyh0aGlzLm1lc2gucG9zaXRpb24ueCwgdGhpcy5tZXNoLnBvc2l0aW9uLnksIHRoaXMubWVzaC5wb3NpdGlvbi56KTtcbiAgICAgIHRoaXMuX2RlYnVnVGltZXIgPSB0aW1lO1xuICAgIH1cbiAgfVxuXG4gIG1vdmVGb3J3YXJkcyhmcHM6IG51bWJlcikgOiB2b2lkIHtcbiAgICB0aGlzLm1lc2gucG9zaXRpb24ueCArPSB0aGlzLl9zcGVlZCAqIE1hdGguc2luKHRoaXMuX2hlYWRpbmcpIC8gZnBzO1xuICAgIHRoaXMubWVzaC5wb3NpdGlvbi56ICs9IHRoaXMuX3NwZWVkICogTWF0aC5jb3ModGhpcy5faGVhZGluZykgLyBmcHM7XG5cbiAgICB0aGlzLm1lc2gucG9zaXRpb24ueSArPSB0aGlzLl9zcGVlZCAqIHRoaXMuX2hlaWdodERpZmYgLyAoMiAqIGZwcyk7XG4gIH1cblxuICB0dXJuKGFuZ2xlOiBudW1iZXIpIDogdm9pZCB7XG4gICAgdGhpcy5faGVhZGluZyArPSBhbmdsZTtcbiAgICBpZiAodGhpcy5faGVhZGluZyA8IDApIHtcbiAgICAgIHRoaXMuX2hlYWRpbmcgKz0gMiAqIE1hdGguUEk7XG4gICAgfVxuICAgIGlmICh0aGlzLl9oZWFkaW5nID4gMiAqIE1hdGguUEkpIHtcbiAgICAgIHRoaXMuX2hlYWRpbmcgLT0gMiAqIE1hdGguUEk7XG4gICAgfVxuICB9XG5cbiAgbW9kaWZ5U3BlZWQoZGlmZjogbnVtYmVyKSA6IHZvaWQge1xuICAgIHRoaXMuX3NwZWVkICs9IGRpZmY7XG4gICAgaWYgKHRoaXMuX3NwZWVkIDwgMCkge1xuICAgICAgdGhpcy5fc3BlZWQgPSAwO1xuICAgIH1cbiAgICBpZiAodGhpcy5fc3BlZWQgPiB0aGlzLl9zcGVlZE1heCkge1xuICAgICAgdGhpcy5fc3BlZWQgPSB0aGlzLl9zcGVlZE1heDtcbiAgICB9XG4gIH1cbn1cblxuY2xhc3MgQ2hhcmFjdGVyIHtcbiAgcHJpdmF0ZSBfc2NlbmU6IEJBQllMT04uU2NlbmU7XG4gIHByaXZhdGUgX3NoYWRkb3dzOiBCQUJZTE9OLlNoYWRvd0dlbmVyYXRvcjtcbiAgcHJpdmF0ZSBfbWVzaDogQkFCWUxPTi5NZXNoO1xuICBwcml2YXRlIF9za2VsZXRvbjogQkFCWUxPTi5Ta2VsZXRvbjtcbiAgcHJpdmF0ZSBfYm9uZXM6IHtbaWQ6IHN0cmluZ10gOiBCQUJZTE9OLkJvbmV9O1xuICBwcml2YXRlIF9vbkxvYWRlZDogKCkgPT4gdm9pZDtcbiAgcHJpdmF0ZSBfbG9va0F0OiBCQUJZTE9OLlZlY3RvcjM7XG4gIHByaXZhdGUgX2xvb2tBdE5lY2s6IEJBQllMT04uVmVjdG9yMztcbiAgcHJpdmF0ZSBfbG9va0N0cmxIZWFkOiBCQUJZTE9OLkJvbmVMb29rQ29udHJvbGxlcjtcbiAgcHJpdmF0ZSBfbG9va0N0cmxOZWNrOiBCQUJZTE9OLkJvbmVMb29rQ29udHJvbGxlcjtcbiAgcHJpdmF0ZSBfYW5pbWF0aW9uczoge1tpZDogc3RyaW5nXSA6IEJBQllMT04uQW5pbWF0aW9uUmFuZ2V9O1xuICBwcml2YXRlIF9hbmltYXRpb25RdWV1ZTogQW5pbWF0ZVJlcXVlc3RbXTtcbiAgcHJpdmF0ZSBfYW5pbWF0aW9uQ3VycmVudDogQW5pbWF0ZVJlcXVlc3Q7XG4gIHByaXZhdGUgX2FuaW1hdGlvbkxhc3Q6IEFuaW1hdGVSZXF1ZXN0O1xuICBwcml2YXRlIF9hbmltYXRpb25PYnNlcnZhYmxlOiBCQUJZTE9OLk9ic2VydmVyPEJBQllMT04uU2NlbmU+O1xuXG4gIHBvc2l0aW9uOiBCQUJZTE9OLlZlY3RvcjM7XG4gIHJvdGF0aW9uOiBCQUJZTE9OLlZlY3RvcjM7XG5cbiAgY29uc3RydWN0b3Ioc2NlbmU6IEJBQllMT04uU2NlbmUsXG4gICAgICAgICAgICAgIHNoYWRkb3dzOiBCQUJZTE9OLlNoYWRvd0dlbmVyYXRvcixcbiAgICAgICAgICAgICAgZmlsZW5hbWU6IHN0cmluZyxcbiAgICAgICAgICAgICAgb25Mb2FkZWQ/OiAoKSA9PiB2b2lkKSB7XG4gICAgY29uc29sZS5sb2coXCJDcmVhdGluZyBDaGFyYWN0ZXIgZnJvbSBcIiArIGZpbGVuYW1lKTtcbiAgICB0aGlzLl9zY2VuZSA9IHNjZW5lO1xuICAgIHRoaXMuX3NoYWRkb3dzID0gc2hhZGRvd3M7XG4gICAgdGhpcy5fb25Mb2FkZWQgPSBvbkxvYWRlZDtcbiAgICB0aGlzLl9ib25lcyA9IHt9O1xuICAgIHRoaXMuX2xvb2tBdE5lY2sgPSBuZXcgQkFCWUxPTi5WZWN0b3IzKDAsIDAsIDApO1xuICAgIHRoaXMuX2FuaW1hdGlvbnMgPSB7fTtcbiAgICB0aGlzLl9hbmltYXRpb25RdWV1ZSA9IFtdO1xuICAgIEJBQllMT04uU2NlbmVMb2FkZXIuSW1wb3J0TWVzaChcIlwiLCBTQ0VORVBBVEgsIGZpbGVuYW1lLCB0aGlzLl9zY2VuZSwgdGhpcy5vblNjZW5lTG9hZC5iaW5kKHRoaXMpKTtcbiAgfVxuXG4gIG9uU2NlbmVMb2FkKG1lc2hlczogQkFCWUxPTi5NZXNoW10sIHBhcnRpY2xlU3lzdGVtczogW10sIHNrZWxldG9uczogQkFCWUxPTi5Ta2VsZXRvbltdKSA6IHZvaWQge1xuICAgIHRyeSB7XG4gICAgICBjb25zb2xlLmFzc2VydChtZXNoZXMubGVuZ3RoID09PSAxKTtcbiAgICAgIGNvbnNvbGUuYXNzZXJ0KHBhcnRpY2xlU3lzdGVtcy5sZW5ndGggPT09IDApO1xuICAgICAgY29uc29sZS5hc3NlcnQoc2tlbGV0b25zLmxlbmd0aCA9PT0gMSk7XG5cbiAgICAgIHRoaXMuX21lc2ggPSBtZXNoZXNbMF07XG4gICAgICB0aGlzLl9za2VsZXRvbiA9IHNrZWxldG9uc1swXTtcblxuICAgICAgLy8gdGhpcy5fbWVzaC5pc1Zpc2libGUgPSBmYWxzZTtcblxuICAgICAgdGhpcy5wb3NpdGlvbiA9IHRoaXMuX21lc2gucG9zaXRpb247XG4gICAgICB0aGlzLnJvdGF0aW9uID0gdGhpcy5fbWVzaC5yb3RhdGlvbjtcbiAgICAgIC8vdGhpcy5fbWVzaC5zY2FsaW5nID0gbmV3IEJBQllMT04uVmVjdG9yMyhTQ0FMRSwgU0NBTEUsIFNDQUxFKTtcbiAgICAgIC8vdGhpcy5fbWVzaC5yZWNlaXZlU2hhZG93cyA9IHRydWU7XG4gICAgICAvL3RoaXMuX21lc2guY29udmVydFRvRmxhdFNoYWRlZE1lc2goKTtcblxuICAgICAgdGhpcy5fbWVzaC5tYXRlcmlhbC56T2Zmc2V0ID0gLSAxMDA7XG5cbiAgICAgIGlmICh0aGlzLl9zaGFkZG93cykge1xuICAgICAgICB0aGlzLl9zaGFkZG93cy5nZXRTaGFkb3dNYXAoKS5yZW5kZXJMaXN0LnB1c2godGhpcy5fbWVzaCk7XG4gICAgICB9XG5cbiAgICAgICAgLypsZXQgc2tlbGV0b25WaWV3ZXIgPSBuZXcgQkFCWUxPTi5EZWJ1Zy5Ta2VsZXRvblZpZXdlcih0aGlzLl9za2VsZXRvbiwgdGhpcy5fbWVzaCwgdGhpcy5fc2NlbmUpO1xuICAgICAgc2tlbGV0b25WaWV3ZXIuaXNFbmFibGVkID0gdHJ1ZTsgLy8gRW5hYmxlIGl0XG4gICAgICBza2VsZXRvblZpZXdlci5jb2xvciA9IEJBQllMT04uQ29sb3IzLlJlZCgpOyAvLyBDaGFuZ2UgZGVmYXVsdCBjb2xvciBmcm9tIHdoaXRlIHRvIHJlZCovXG5cbiAgICAgIC8vIFBhcnNlIGFsbCBib25lcyBhbmQgc3RvcmUgYW55IHdlIG5lZWQgbGF0ZXIgZm9yIGZ1dHVyZSBhY2Nlc3MuXG4gICAgICBmb3IgKGxldCBpbmRleCA9IDA7IGluZGV4IDwgdGhpcy5fc2tlbGV0b24uYm9uZXMubGVuZ3RoOyBpbmRleCsrKSB7XG4gICAgICAgIGxldCBib25lID0gc2tlbGV0b25zWzBdLmJvbmVzW2luZGV4XTtcbiAgICAgICAgLy8gY29uc29sZS5sb2coYm9uZS51bmlxdWVJZCwgYm9uZS5pZCk7XG4gICAgICAgIHN3aXRjaCAoYm9uZS5pZCkge1xuICAgICAgICAgIGNhc2UgXCJzcGluZS5oZWFkXCI6XG4gICAgICAgICAgICB0aGlzLl9ib25lcy5oZWFkID0gYm9uZTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGNhc2UgXCJzcGluZS5uZWNrXCI6XG4gICAgICAgICAgICB0aGlzLl9ib25lcy5uZWNrID0gYm9uZTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGNhc2UgXCJzcGluZS51cHBlclwiOlxuICAgICAgICAgICAgdGhpcy5fYm9uZXMuc3BpbmV1cHBlciA9IGJvbmU7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBjYXNlIFwic3BpbmUucG9pbnRcIjpcbiAgICAgICAgICAgIHRoaXMuX2JvbmVzLmhlYWRQb2ludCA9IGJvbmU7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBBbmltYXRpb25zXG4gICAgICBmb3IgKGxldCBhID0gMDsgYSA8IHRoaXMuX3NrZWxldG9uLmdldEFuaW1hdGlvblJhbmdlcygpLmxlbmd0aDsgYSsrKSB7XG4gICAgICAgIGxldCBhbmltYXRpb24gPSB0aGlzLl9za2VsZXRvbi5nZXRBbmltYXRpb25SYW5nZXMoKVthXTtcbiAgICAgICAgLy9jb25zb2xlLmxvZyhhLCBhbmltYXRpb24ubmFtZSk7XG4gICAgICAgIHRoaXMuX2FuaW1hdGlvbnNbYW5pbWF0aW9uLm5hbWVdID0gdGhpcy5fc2tlbGV0b24uZ2V0QW5pbWF0aW9uUmFuZ2VzKClbYV07XG4gICAgICB9XG4gICAgICB0aGlzLl9hbmltYXRpb25RdWV1ZS5wdXNoKHtuYW1lOiBcIndhbGtcIiwgbG9vcDogdHJ1ZSwgcmV2ZXJzZWQ6IGZhbHNlfSk7XG5cbiAgICAgIHRoaXMuX2xvb2tDdHJsSGVhZCA9IG5ldyBCQUJZTE9OLkJvbmVMb29rQ29udHJvbGxlcihcbiAgICAgICAgdGhpcy5fbWVzaCxcbiAgICAgICAgdGhpcy5fYm9uZXMuaGVhZCxcbiAgICAgICAgdGhpcy5fbG9va0F0LFxuICAgICAgICB7YWRqdXN0UGl0Y2g6IE1hdGguUEkgLyAyfVxuICAgICAgKTtcbiAgICAgIHRoaXMuX2xvb2tDdHJsTmVjayA9IG5ldyBCQUJZTE9OLkJvbmVMb29rQ29udHJvbGxlcihcbiAgICAgICAgdGhpcy5fbWVzaCxcbiAgICAgICAgdGhpcy5fYm9uZXMubmVjayxcbiAgICAgICAgdGhpcy5fbG9va0F0TmVjayxcbiAgICAgICAge2FkanVzdFBpdGNoOiBNYXRoLlBJIC8gMn1cbiAgICAgICk7XG5cbiAgICAgIC8vIFBlcmlvZGljIHVwZGF0ZXMuXG4gICAgICB0aGlzLl9zY2VuZS5yZWdpc3RlckJlZm9yZVJlbmRlcigoKSA9PiB7XG4gICAgICAgIGlmICghIHRoaXMucG9zaXRpb24uZXF1YWxzKHRoaXMuX21lc2gucG9zaXRpb24pKSB7XG4gICAgICAgICAgdGhpcy5fbWVzaC5wb3NpdGlvbi54ID0gdGhpcy5wb3NpdGlvbi54O1xuICAgICAgICAgIHRoaXMuX21lc2gucG9zaXRpb24ueSA9IHRoaXMucG9zaXRpb24ueTtcbiAgICAgICAgICB0aGlzLl9tZXNoLnBvc2l0aW9uLnogPSB0aGlzLnBvc2l0aW9uLno7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCEgdGhpcy5yb3RhdGlvbi5lcXVhbHModGhpcy5fbWVzaC5yb3RhdGlvbikpIHtcbiAgICAgICAgICB0aGlzLl9tZXNoLnJvdGF0aW9uLnggPSB0aGlzLnJvdGF0aW9uLng7XG4gICAgICAgICAgdGhpcy5fbWVzaC5yb3RhdGlvbi55ID0gdGhpcy5yb3RhdGlvbi55O1xuICAgICAgICAgIHRoaXMuX21lc2gucm90YXRpb24ueiA9IHRoaXMucm90YXRpb24uejtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuX3BsYXlBbmltYXRpb24oKTtcbiAgICAgIH0pO1xuXG4gICAgICBpZiAodGhpcy5fb25Mb2FkZWQpIHtcbiAgICAgICAgdGhpcy5fb25Mb2FkZWQoKTtcbiAgICAgIH1cblxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAvLyBQcmV2ZW50IGVycm9yIG1lc3NhZ2VzIGluIHRoaXMgc2VjdGlvbiBnZXR0aW5nIHN3YWxsb3dlZCBieSBCYWJ5bG9uLlxuICAgICAgY29uc29sZS5lcnJvcihlcnJvcik7XG4gICAgfVxuICB9XG5cbiAgbG9va0F0KHRhcmdldDogQkFCWUxPTi5WZWN0b3IzKSA6IHZvaWQge1xuICAgIHRoaXMuX2xvb2tBdCA9IHRhcmdldDtcblxuICAgIHRoaXMuX3NjZW5lLnJlZ2lzdGVyQmVmb3JlUmVuZGVyKGZ1bmN0aW9uKCkge1xuICAgICAgLy8gVGhlIG5lY2sgc2hvdWxkIHBpbnQgaGFsZiB3YXkgYmV0d2VlbiBzdHJhaWdodCBmb3J3YXJkIGFuZCB0aGVcbiAgICAgIC8vIGRpcmVjdGlvbiB0aGUgaGVhZCBpcyBwb2ludGluZy5cbiAgICAgIGxldCBzcGluZVVwcGVyID0gdGhpcy5fYm9uZXMuc3BpbmV1cHBlcjtcblxuICAgICAgbGV0IHRhcmdldExvY2FsID0gc3BpbmVVcHBlci5nZXRMb2NhbFBvc2l0aW9uRnJvbUFic29sdXRlKHRhcmdldCwgdGhpcy5fbWVzaCk7XG4gICAgICBsZXQgdGFyZ2V0TG9jYWxYWSA9IG5ldyBCQUJZTE9OLlZlY3RvcjModGFyZ2V0TG9jYWwueCwgdGFyZ2V0TG9jYWwueSwgMCk7XG4gICAgICBsZXQgdGFyZ2V0TG9jYWxZWiA9IG5ldyBCQUJZTE9OLlZlY3RvcjMoMCwgdGFyZ2V0TG9jYWwueSwgdGFyZ2V0TG9jYWwueik7XG4gICAgICBsZXQgYWhlYWRMb2NhbCA9IG5ldyBCQUJZTE9OLlZlY3RvcjMoMCwgdGFyZ2V0TG9jYWwubGVuZ3RoKCksIDApOyAgLy8gKGwvciwgZi9iLCB1L2QpXG5cbiAgICAgIGxldCBhbmdsZVhZID0gQkFCWUxPTi5WZWN0b3IzLkdldEFuZ2xlQmV0d2VlblZlY3RvcnMoXG4gICAgICAgIHRhcmdldExvY2FsWFksIGFoZWFkTG9jYWwsIG5ldyBCQUJZTE9OLlZlY3RvcjMoMCwgMCwgMSkpO1xuICAgICAgbGV0IGFuZ2xlWVogPSBCQUJZTE9OLlZlY3RvcjMuR2V0QW5nbGVCZXR3ZWVuVmVjdG9ycyhcbiAgICAgICAgdGFyZ2V0TG9jYWxZWiwgYWhlYWRMb2NhbCwgbmV3IEJBQllMT04uVmVjdG9yMygtIDEsIDAsIDApKTtcblxuICAgICAgbGV0IGxvb2tBdE5lY2tMb2NhbCA9XG4gICAgICAgIG5ldyBCQUJZTE9OLlZlY3RvcjMoTWF0aC5zaW4oYW5nbGVYWSAvIDIpICogdGFyZ2V0TG9jYWxYWS5sZW5ndGgoKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAoTWF0aC5jb3MoYW5nbGVYWSAvIDIpICogdGFyZ2V0TG9jYWxYWS5sZW5ndGgoKSArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIE1hdGguY29zKGFuZ2xlWVogLyAyKSAqIHRhcmdldExvY2FsWVoubGVuZ3RoKCkpIC8gMixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBNYXRoLnNpbihhbmdsZVlaIC8gMikgKiB0YXJnZXRMb2NhbFlaLmxlbmd0aCgpKTtcbiAgICAgIHNwaW5lVXBwZXIuZ2V0QWJzb2x1dGVQb3NpdGlvbkZyb21Mb2NhbFRvUmVmKGxvb2tBdE5lY2tMb2NhbCwgdGhpcy5fbWVzaCwgdGhpcy5fbG9va0F0TmVjayk7XG5cbiAgICAgIGlmIChhbmdsZVhZID4gLU1hdGguUEkgLyAyICYmIGFuZ2xlWFkgPCBNYXRoLlBJIC8gMiAmJlxuICAgICAgICAgYW5nbGVZWiA+IC1NYXRoLlBJIC8gMiAmJiBhbmdsZVlaIDwgTWF0aC5QSSAvIDIpIHtcbiAgICAgICAgLy8gT25seSBsb29rIGF0IHRoaW5nIGlmIGl0J3Mgbm90IGJlaGluZCB1cy5cbiAgICAgICAgLy90aGlzLl9sb29rQ3RybE5lY2sudXBkYXRlKCk7XG4gICAgICAgIC8vdGhpcy5fbG9va0N0cmxIZWFkLnVwZGF0ZSgpO1xuICAgICAgICB0aGlzLl9ib25lcy5uZWNrLnJvdGF0ZShCQUJZTE9OLkF4aXMuWiwgLWFuZ2xlWFkgLyAyLCBCQUJZTE9OLlNwYWNlLkxPQ0FMKTtcbiAgICAgICAgdGhpcy5fYm9uZXMubmVjay5yb3RhdGUoQkFCWUxPTi5BeGlzLlgsIGFuZ2xlWVogLyAzLCBCQUJZTE9OLlNwYWNlLkxPQ0FMKTtcbiAgICAgICAgdGhpcy5fYm9uZXMubmVjay5yb3RhdGUoQkFCWUxPTi5BeGlzLlksIC1hbmdsZVlaICogYW5nbGVYWSAvICgyICogTWF0aC5QSSksIEJBQllMT04uU3BhY2UuTE9DQUwpO1xuXG4gICAgICAgIHRoaXMuX2JvbmVzLmhlYWQucm90YXRlKEJBQllMT04uQXhpcy5aLCAtYW5nbGVYWSAvIDIsIEJBQllMT04uU3BhY2UuTE9DQUwpO1xuICAgICAgICB0aGlzLl9ib25lcy5oZWFkLnJvdGF0ZShCQUJZTE9OLkF4aXMuWCwgYW5nbGVZWiAvIDMsIEJBQllMT04uU3BhY2UuTE9DQUwpO1xuICAgICAgICB0aGlzLl9ib25lcy5oZWFkLnJvdGF0ZShCQUJZTE9OLkF4aXMuWSwgLWFuZ2xlWVogKiBhbmdsZVhZIC8gKDIgKiBNYXRoLlBJKSwgQkFCWUxPTi5TcGFjZS5MT0NBTCk7XG4gICAgICB9XG4gICAgfS5iaW5kKHRoaXMpKTtcbiAgfVxuXG4gIC8qIEFkZCBhbmltYXRpb24gdG8gdGhlIGxpc3QgdG8gYmUgcGxheWVkLiAqL1xuICBxdWV1ZUFuaW1hdGlvbihhbmltYXRlUmVxdWVzdDogQW5pbWF0ZVJlcXVlc3QpIDogdm9pZCB7XG4gICAgdGhpcy5fYW5pbWF0aW9uUXVldWUucHVzaChhbmltYXRlUmVxdWVzdCk7XG4gIH1cblxuICAvKiBQdWxsIG5ldyBhbmltYXRpb25zIGZyb20gcXVldWUgYW5kIGNsZWFuIHVwIGZpbmlzaGVkIGFuaW1hdGlvbnMuXG4gICAqXG4gICAqIFdoZW4gX2FuaW1hdGlvbkN1cnJlbnQgaGFzIGVuZGVkLCBjaGVjayBfYW5pbWF0aW9uUXVldWUgZm9yIG5leHQgYW5pbWF0aW9uLlxuICAgKiBJZiBfYW5pbWF0aW9uTGFzdC5jbGVhbnVwIGlzIHNldCwgc3RvcCB0aGUgYW5pbWF0aW9uIGFuZCBkZWxldGUuXG4gICAqL1xuICBwcml2YXRlIF9wbGF5QW5pbWF0aW9uKCkgOiB2b2lkIHtcbiAgICBpZiAodGhpcy5fYW5pbWF0aW9uTGFzdCA9PT0gdW5kZWZpbmVkICYmIHRoaXMuX2FuaW1hdGlvblF1ZXVlLmxlbmd0aCA+IDApIHtcbiAgICAgIHRoaXMuX2FuaW1hdGlvbkxhc3QgPSB0aGlzLl9hbmltYXRpb25DdXJyZW50O1xuICAgICAgdGhpcy5fYW5pbWF0aW9uQ3VycmVudCA9IHRoaXMuX2FuaW1hdGlvblF1ZXVlLnNoaWZ0KCk7XG4gICAgICBjb25zb2xlLmxvZyhcIk5ldzogXCIgKyB0aGlzLl9hbmltYXRpb25DdXJyZW50Lm5hbWUpO1xuICAgICAgdGhpcy5fYW5pbWF0aW9uQ3VycmVudC5ydW5Db3VudCA9IDA7XG4gICAgfVxuICAgIHRoaXMuX3NlcnZpY2VBbmltYXRpb24odGhpcy5fYW5pbWF0aW9uQ3VycmVudCwgdHJ1ZSk7XG4gICAgdGhpcy5fc2VydmljZUFuaW1hdGlvbih0aGlzLl9hbmltYXRpb25MYXN0LCBmYWxzZSk7XG5cbiAgICBpZiAodGhpcy5fYW5pbWF0aW9uTGFzdCAmJiB0aGlzLl9hbmltYXRpb25MYXN0LmNsZWFudXApIHtcbiAgICAgIHRoaXMuX2FuaW1hdGlvbkxhc3QuYW5pbWF0aW9uLnN0b3AoKTtcbiAgICAgIHRoaXMuX2FuaW1hdGlvbkxhc3QuYW5pbWF0aW9uID0gdW5kZWZpbmVkO1xuICAgICAgdGhpcy5fYW5pbWF0aW9uTGFzdCA9IHVuZGVmaW5lZDtcbiAgICB9XG4gIH1cblxuICAvKiBVcGRhdGUgYW4gQW5pbWF0ZVJlcXVlc3QuXG4gICAqXG4gICAqIFRoaXMgd2lsbCBiZSBjYWxsZWQgcGVyaW9kaWNhbGx5IGZvciBhbnkgYWN0aXZlIEFuaW1hdGVSZXF1ZXN0LlxuICAgKiBJZiBpdCBpcyB0aGUgZmlyc3QgdGltZSB0aGlzIGlzIHJ1biBmb3IgYW4gQW5pbWF0ZVJlcXVlc3QgdGhlIGFuaW1hdGlvblxuICAgKiB3aWxsIGJlIHN0YXJ0ZWQgYW5kIGdpdmVuIGdyZWF0ZXIgd2VpZ2h0IGVhY2ggdGltZSB0aGlzIG1ldGhvZCBpcyBjYWxsZWRcbiAgICogdGhlcmVhZnRlci5cbiAgICogQXJnczpcbiAgICogICBhbmltYXRlUmVxdWVzdDogVGhlIEFuaW1hdGVSZXF1ZXN0IG9iamVjdCB0byBhY3QgdXBvbi5cbiAgICogICBjdXJyZW50OiBJZiB0cnVlLCB0aGUgYW5pbWF0aW9uIHdlaWdodCB3aWxsIGJlIGluY3JlYXNlZCB3aXRoIGVhY2ggY2FsbFxuICAgKiAgICAgKHRvIGEgbWF2aW11bSB2YWx1ZSBvZiAxKS5cbiAgICogICAgIElmIGZhbHNlLCB0aGUgYW5pbWF0aW9uIHdlaWdodCB3aWxsIGJlIGRlY3JlYXNlZCB3aXRoIGVhY2ggY2FsbCB1bnRpbFxuICAgKiAgICAgaXQgcmVhY2hlcyAwIGF0IHdoaWNoIHRpbWUgdGhlIGFuaW1hdGlvbiB3aWxsIGJlIHN0b3BwZWQgYW5kXG4gICAqICAgICBBbmltYXRlUmVxdWVzdC5jbGVhbnVwIHdpbGwgYmUgc2V0LlxuICAgKi9cbiAgcHJpdmF0ZSBfc2VydmljZUFuaW1hdGlvbihhbmltYXRlUmVxdWVzdDogQW5pbWF0ZVJlcXVlc3QsIGN1cnJlbnQ6IGJvb2xlYW4pIDogdm9pZCB7XG4gICAgaWYgKGFuaW1hdGVSZXF1ZXN0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBsZXQgd2VpZ2h0ID0gYW5pbWF0ZVJlcXVlc3QucnVuQ291bnQgPyBhbmltYXRlUmVxdWVzdC5hbmltYXRpb24ud2VpZ2h0IDogMDtcbiAgICBpZiAoY3VycmVudCAmJiB3ZWlnaHQgPCAxKSB7XG4gICAgICB3ZWlnaHQgKz0gQU5JTV9NRVJHRV9SQVRFO1xuICAgICAgd2VpZ2h0ID0gTWF0aC5taW4oMSwgd2VpZ2h0KTtcbiAgICB9IGVsc2UgaWYgKCFjdXJyZW50ICYmIHdlaWdodCA+IDApIHtcbiAgICAgIHdlaWdodCAtPSBBTklNX01FUkdFX1JBVEU7XG4gICAgICB3ZWlnaHQgPSBNYXRoLm1heCgwLCB3ZWlnaHQpO1xuICAgIH1cblxuICAgIGlmIChhbmltYXRlUmVxdWVzdC5hbmltYXRpb24pIHtcbiAgICAgIGFuaW1hdGVSZXF1ZXN0LmFuaW1hdGlvbi53ZWlnaHQgPSB3ZWlnaHQ7XG4gICAgfVxuXG4gICAgaWYgKHdlaWdodCA8PSAwKSB7XG4gICAgICAvLyBUaGlzIG9sZCBBbmltYXRlUmVxdWVzdCBoYXMgYmVlbiBmYWRlZCBvdXQgYW5kIG5lZWRzIHN0b3BwZWQgYW5kIHJlbW92ZWQuXG4gICAgICBhbmltYXRlUmVxdWVzdC5jbGVhbnVwID0gdHJ1ZTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAoYW5pbWF0ZVJlcXVlc3QuZGlydHkgPT09IGZhbHNlKSB7XG4gICAgICAvLyBOb3RoaW5nIG1vcmUgdG8gZG8uXG4gICAgICAvLyBBbmltYXRpb25zIHdoaWNoIGVuZCBzZXQgYW5pbWF0ZVJlcXVlc3QuZGlydHkgdG8gdHJ1ZSB3aGVuIHRoZXkgbmVlZFxuICAgICAgLy8gdGhpcyBtZXRob2QgdG8gY29udGludWUgcGFzdCB0aGlzIHBvaW50LlxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIGNvbnNvbGUubG9nKGFuaW1hdGVSZXF1ZXN0Lm5hbWUsIHdlaWdodCwgY3VycmVudCk7XG5cbiAgICBpZiAoYW5pbWF0ZVJlcXVlc3QucnVuQ291bnQgJiYgIWFuaW1hdGVSZXF1ZXN0Lmxvb3AgJiYgYW5pbWF0ZVJlcXVlc3QucmV2ZXJzZWQpIHtcbiAgICAgIC8vIEZyZWV6ZSBmcmFtZSBhdCBmaXJzdCBmcmFtZSBpbiBzZXF1ZW5jZS5cbiAgICAgIGFuaW1hdGVSZXF1ZXN0LmFuaW1hdGlvbi5zdG9wKCk7XG4gICAgICBhbmltYXRlUmVxdWVzdC5hbmltYXRpb24gPSB0aGlzLl9zY2VuZS5iZWdpbldlaWdodGVkQW5pbWF0aW9uKFxuICAgICAgICB0aGlzLl9za2VsZXRvbixcbiAgICAgICAgdGhpcy5fYW5pbWF0aW9uc1thbmltYXRlUmVxdWVzdC5uYW1lXS5mcm9tICsgMixcbiAgICAgICAgdGhpcy5fYW5pbWF0aW9uc1thbmltYXRlUmVxdWVzdC5uYW1lXS5mcm9tICsgMixcbiAgICAgICAgd2VpZ2h0LFxuICAgICAgICBmYWxzZSxcbiAgICAgICAgMC4wMSxcbiAgICAgICAgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgYW5pbWF0ZVJlcXVlc3QuZGlydHkgPSB0cnVlO1xuICAgICAgICB9LmJpbmQodGhpcylcbiAgICAgICk7XG4gICAgfSBlbHNlIGlmIChhbmltYXRlUmVxdWVzdC5ydW5Db3VudCAmJiAhYW5pbWF0ZVJlcXVlc3QubG9vcCkge1xuICAgICAgLy8gRnJlZXplIGZyYW1lIGF0IGxhc3QgZnJhbWUgaW4gc2VxdWVuY2UuXG4gICAgICBhbmltYXRlUmVxdWVzdC5hbmltYXRpb24uc3RvcCgpO1xuICAgICAgYW5pbWF0ZVJlcXVlc3QuYW5pbWF0aW9uID0gdGhpcy5fc2NlbmUuYmVnaW5XZWlnaHRlZEFuaW1hdGlvbihcbiAgICAgICAgdGhpcy5fc2tlbGV0b24sXG4gICAgICAgIHRoaXMuX2FuaW1hdGlvbnNbYW5pbWF0ZVJlcXVlc3QubmFtZV0udG8sXG4gICAgICAgIHRoaXMuX2FuaW1hdGlvbnNbYW5pbWF0ZVJlcXVlc3QubmFtZV0udG8sXG4gICAgICAgIHdlaWdodCxcbiAgICAgICAgZmFsc2UsXG4gICAgICAgIDAuMDEsXG4gICAgICAgIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGFuaW1hdGVSZXF1ZXN0LmRpcnR5ID0gdHJ1ZTtcbiAgICAgICAgfS5iaW5kKHRoaXMpXG4gICAgICApO1xuICAgIH0gZWxzZSBpZiAoYW5pbWF0ZVJlcXVlc3QucmV2ZXJzZWQpIHtcbiAgICAgIC8vIFBsYXkgYW4gYW5pbWF0aW9uIGluIHJldmVyc2UuXG4gICAgICBhbmltYXRlUmVxdWVzdC5hbmltYXRpb24gPSB0aGlzLl9zY2VuZS5iZWdpbldlaWdodGVkQW5pbWF0aW9uKFxuICAgICAgICB0aGlzLl9za2VsZXRvbixcbiAgICAgICAgdGhpcy5fYW5pbWF0aW9uc1thbmltYXRlUmVxdWVzdC5uYW1lXS50byxcbiAgICAgICAgdGhpcy5fYW5pbWF0aW9uc1thbmltYXRlUmVxdWVzdC5uYW1lXS5mcm9tICsgMixcbiAgICAgICAgd2VpZ2h0LFxuICAgICAgICBmYWxzZSxcbiAgICAgICAgMSxcbiAgICAgICAgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgYW5pbWF0ZVJlcXVlc3QuZGlydHkgPSB0cnVlO1xuICAgICAgICB9LmJpbmQodGhpcylcbiAgICAgICk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFBsYXkgYW4gYW5pbWF0aW9uLlxuICAgICAgYW5pbWF0ZVJlcXVlc3QuYW5pbWF0aW9uID0gdGhpcy5fc2NlbmUuYmVnaW5XZWlnaHRlZEFuaW1hdGlvbihcbiAgICAgICAgdGhpcy5fc2tlbGV0b24sXG4gICAgICAgIHRoaXMuX2FuaW1hdGlvbnNbYW5pbWF0ZVJlcXVlc3QubmFtZV0uZnJvbSArIDIsXG4gICAgICAgIHRoaXMuX2FuaW1hdGlvbnNbYW5pbWF0ZVJlcXVlc3QubmFtZV0udG8sXG4gICAgICAgIHdlaWdodCxcbiAgICAgICAgZmFsc2UsXG4gICAgICAgIDEsXG4gICAgICAgIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGFuaW1hdGVSZXF1ZXN0LmRpcnR5ID0gdHJ1ZTtcbiAgICAgICAgfS5iaW5kKHRoaXMpXG4gICAgICApO1xuICAgIH1cblxuICAgIGFuaW1hdGVSZXF1ZXN0LmRpcnR5ID0gZmFsc2U7XG4gICAgYW5pbWF0ZVJlcXVlc3QucnVuQ291bnQrKztcbiAgfVxufVxuXG5jbGFzcyBTY2VuZXJ5Q2VsbCBpbXBsZW1lbnRzIENvb3JkIHtcbiAgeDogbnVtYmVyO1xuICB5OiBudW1iZXI7XG4gIHJlY3Vyc2lvbjogbnVtYmVyO1xuICB2ZWdpdGF0aW9uOiBudW1iZXI7XG4gIG1heEhlaWdodDogbnVtYmVyO1xuICBtaW5IZWlnaHQ6IG51bWJlcjtcbiAgcGF0aFNjb3JlOiBudW1iZXI7XG5cbiAgY29uc3RydWN0b3IoY29vcmQ6IENvb3JkLCB2ZWdpdGF0aW9uOiBudW1iZXIpIHtcbiAgICB0aGlzLnggPSBjb29yZC54O1xuICAgIHRoaXMueSA9IGNvb3JkLnk7XG4gICAgdGhpcy5yZWN1cnNpb24gPSBjb29yZC5yZWN1cnNpb247XG4gICAgdGhpcy52ZWdpdGF0aW9uID0gdmVnaXRhdGlvbjtcbiAgfVxuXG4gIHBhcmVudENvb3JkaW5hdGVzKGRlcHRoOiBudW1iZXIpIDogQ29vcmQge1xuICAgIGxldCBwWCA9IDA7XG4gICAgbGV0IHBZID0gMDtcbiAgICBmb3IgKGxldCBiaXQgPSBkZXB0aCAtIDE7IGJpdCA+PSBkZXB0aCAtIHRoaXMucmVjdXJzaW9uICsgMTsgYml0LS0pIHtcbiAgICAgIGxldCBtYXNrID0gMSA8PCBiaXQ7XG4gICAgICBpZiAobWFzayAmIHRoaXMueCkge1xuICAgICAgICBwWCB8PSBtYXNrO1xuICAgICAgfVxuICAgICAgaWYgKG1hc2sgJiB0aGlzLnkpIHtcbiAgICAgICAgcFkgfD0gbWFzaztcbiAgICAgIH1cbiAgICAgIC8vY29uc29sZS5sb2coYml0LCBtYXNrLCBwWCwgcFkpO1xuICAgIH1cblxuICAgIHJldHVybiB7eDogcFgsIHk6IHBZLCByZWN1cnNpb246IHRoaXMucmVjdXJzaW9uIC0gMX07XG4gIH1cbn1cblxuY2xhc3MgU2NlbmVyeSB7XG4gIHByaXZhdGUgX3NjZW5lOiBCQUJZTE9OLlNjZW5lO1xuICBwcml2YXRlIF9zaGFkZG93czogQkFCWUxPTi5TaGFkb3dHZW5lcmF0b3I7XG4gIHByaXZhdGUgX2dyb3VuZDogQkFCWUxPTi5NZXNoO1xuICBwcml2YXRlIF9tYXBTaXplOiBudW1iZXI7XG4gIHByaXZhdGUgX21heFJlY3Vyc2lvbjogbnVtYmVyO1xuICBwcml2YXRlIF90cmVlUmVjdXJzaW9uOiBudW1iZXI7XG4gIHByaXZhdGUgX2NlbGxzOiBNeU1hcDxDb29yZCwgU2NlbmVyeUNlbGw+O1xuICBwcml2YXRlIF90cmVlVHlwZXM6IEJBQllMT04uTWVzaFtdO1xuICBwcml2YXRlIF9zaHJ1YlR5cGVzOiBCQUJZTE9OLk1lc2hbXTtcbiAgcHJpdmF0ZSBfZ3JvdW5kQ292ZXJUeXBlczogQkFCWUxPTi5TdGFuZGFyZE1hdGVyaWFsW107XG4gIHByaXZhdGUgX2dyb3VuZENvdmVyOiB7W2tleTogc3RyaW5nXTogYm9vbGVhbn07XG4gIHByaXZhdGUgX3RyZWVTcGVjaWVzOiBudW1iZXI7XG4gIHByaXZhdGUgcmVhZG9ubHkgX21hcFNwYWNpbmc6IG51bWJlciA9IDE7XG4gIHByaXZhdGUgcmVhZG9ubHkgX3RyZWVTY2FsZTogbnVtYmVyID0gMjAwO1xuICBwcml2YXRlIHJlYWRvbmx5IF90cmVlU2VlZFZhbHVlOiBudW1iZXIgPSA3NTtcbiAgcHJpdmF0ZSByZWFkb25seSBfaGVhZHJvb206IG51bWJlciA9IDI7XG5cbiAgY29uc3RydWN0b3Ioc2NlbmU6IEJBQllMT04uU2NlbmUsXG4gICAgICAgICAgICAgIHNoYWRkb3dzOiBCQUJZTE9OLlNoYWRvd0dlbmVyYXRvcixcbiAgICAgICAgICAgICAgZ3JvdW5kOiBCQUJZTE9OLk1lc2gsXG4gICAgICAgICAgICAgIHNpemU6IG51bWJlcikge1xuICAgIGNvbnNvbGUubG9nKFwiTWVzaCBjb3VudCBiZWZvcmUgY3JlYXRpbmcgc2NlbmVyeTogJWNcIiArXG4gICAgICAgICAgICAgICAgc2NlbmUubWVzaGVzLmxlbmd0aC50b1N0cmluZygpLFxuICAgICAgICAgICAgICAgIFwiYmFja2dyb3VuZDogb3JhbmdlOyBjb2xvcjogd2hpdGVcIik7XG4gICAgdGhpcy5fc2NlbmUgPSBzY2VuZTtcbiAgICB0aGlzLl9zaGFkZG93cyA9IHNoYWRkb3dzO1xuICAgIHRoaXMuX2dyb3VuZCA9IGdyb3VuZDtcbiAgICB0aGlzLl9ncm91bmRDb3ZlciA9IHt9O1xuICAgIHRoaXMuX21hcFNpemUgPSBzaXplO1xuICAgIHRoaXMuX21heFJlY3Vyc2lvbiA9IE1hdGguZmxvb3IoTWF0aC5sb2codGhpcy5fbWFwU2l6ZSkgLyBNYXRoLmxvZygyKSk7XG4gICAgdGhpcy5fdHJlZVJlY3Vyc2lvbiA9IHRoaXMuX21heFJlY3Vyc2lvbiAtIDM7XG5cbiAgICBjb25zb2xlLmFzc2VydChNYXRoLnBvdygyLCB0aGlzLl9tYXhSZWN1cnNpb24pID09PSB0aGlzLl9tYXBTaXplICYmXG4gICAgICAgICAgICAgICAgICAgQm9vbGVhbihcIk1hcCBzaXplIGlzIG5vdCBhIHBvd2VyIG9mIDIuXCIpKTtcblxuICAgIHRoaXMuX2NlbGxzID0gbmV3IE15TWFwPENvb3JkLCBTY2VuZXJ5Q2VsbD4oZ2V0WCwgZ2V0WSwgZ2V0UmVjdXJzaW9uKTtcblxuICAgIGZvciAobGV0IHJlY3Vyc2lvbiA9IDA7IHJlY3Vyc2lvbiA8PSB0aGlzLl9tYXhSZWN1cnNpb247IHJlY3Vyc2lvbisrKSB7XG4gICAgICBsZXQgdGlsZVNpemUgPSBNYXRoLnBvdygyLCB0aGlzLl9tYXhSZWN1cnNpb24gLSByZWN1cnNpb24pO1xuICAgICAgLy8gY29uc29sZS5sb2codGlsZVNpemUsIHJlY3Vyc2lvbik7XG4gICAgICBmb3IgKGxldCB4ID0gMDsgeCA8IHRoaXMuX21hcFNpemU7IHggKz0gdGlsZVNpemUpIHtcbiAgICAgICAgZm9yIChsZXQgeSA9IDA7IHkgPCB0aGlzLl9tYXBTaXplOyB5ICs9IHRpbGVTaXplKSB7XG4gICAgICAgICAgaWYgKHRoaXMuZ2V0Q2VsbCh7eCwgeSwgcmVjdXJzaW9ufSkgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgbGV0IHBhcmVudENlbGwgPSB0aGlzLmdldENlbGxQYXJlbnQoe3gsIHksIHJlY3Vyc2lvbn0pO1xuICAgICAgICAgICAgaWYgKHBhcmVudENlbGwgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICB0aGlzLnNldENlbGwoe3gsIHksIHJlY3Vyc2lvbn0sIHRoaXMuX3RyZWVTZWVkVmFsdWUpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChyZWN1cnNpb24gPT09IHRoaXMuX3RyZWVSZWN1cnNpb24gJiZcbiAgICAgICAgICAgICAgICAgICAgICB4IDw9IHRoaXMuX21hcFNpemUgLyAyICYmIHggPj0gdGhpcy5fbWFwU2l6ZSAvIDIgLSB0aWxlU2l6ZSAmJlxuICAgICAgICAgICAgICAgICAgICAgIHkgPD0gdGhpcy5fbWFwU2l6ZSAvIDIgJiYgeSA+PSB0aGlzLl9tYXBTaXplIC8gMiAtIHRpbGVTaXplKSB7XG4gICAgICAgICAgICAgIC8vIENlbnRlciBvZiBtYXAgc2hvdWxkIGFsd2F5cyBiZSBlbXB0eS5cbiAgICAgICAgICAgICAgdGhpcy5zZXRDZWxsKHt4LCB5LCByZWN1cnNpb259LCAwKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocmVjdXJzaW9uID09PSB0aGlzLl90cmVlUmVjdXJzaW9uICYmXG4gICAgICAgICAgICAgICAgICAgICAgKHggPCA0ICogdGlsZVNpemUgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgeSA8IDQgKiB0aWxlU2l6ZSB8fFxuICAgICAgICAgICAgICAgICAgICAgICB4ID49IHRoaXMuX21hcFNpemUgLSA0ICogdGlsZVNpemUgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgeSA+PSB0aGlzLl9tYXBTaXplIC0gNCAqIHRpbGVTaXplKSkge1xuICAgICAgICAgICAgICAvLyBEZW5zZSB2ZWdldGF0aW9uIHJvdW5kIGVkZ2UuXG4gICAgICAgICAgICAgIHRoaXMuc2V0Q2VsbCh7eCwgeSwgcmVjdXJzaW9ufSwgTWF0aC5yYW5kb20oKSAqIHRoaXMuX3RyZWVTZWVkVmFsdWUgKiAyKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocmVjdXJzaW9uID4gdGhpcy5fdHJlZVJlY3Vyc2lvbikge1xuICAgICAgICAgICAgICB0aGlzLnNldENlbGwoe3gsIHksIHJlY3Vyc2lvbn0sIDApO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgbGV0IHNlZWQgPSBcIlwiICsgcGFyZW50Q2VsbC54ICsgXCJfXCIgKyBwYXJlbnRDZWxsLnk7XG4gICAgICAgICAgICAgIGxldCBjaGlsZE1vZCA9IFtcbiAgICAgICAgICAgICAgICBzZWVkZWRSYW5kb20oNTAwLCAxMDAwLCBzZWVkKSxcbiAgICAgICAgICAgICAgICBzZWVkZWRSYW5kb20oNTAwLCAxMDAwLCBzZWVkICsgXCJfMVwiKSxcbiAgICAgICAgICAgICAgICBzZWVkZWRSYW5kb20oNTAwLCAxMDAwLCBzZWVkICsgXCJfMlwiKSxcbiAgICAgICAgICAgICAgICBzZWVkZWRSYW5kb20oNTAwLCAxMDAwLCBzZWVkICsgXCJfM1wiKV07XG4gICAgICAgICAgICAgIGxldCBjaGlsZE1vZFRvdGFsID0gY2hpbGRNb2QucmVkdWNlKCh0b3RhbCwgbnVtKSA9PiB7IHJldHVybiB0b3RhbCArIG51bTsgfSk7XG4gICAgICAgICAgICAgIGNoaWxkTW9kLmZvckVhY2goKHZlZ2l0YXRpb24sIGluZGV4LCBhcnJheSkgPT4geyBhcnJheVtpbmRleF0gLz0gY2hpbGRNb2RUb3RhbDsgfSk7XG4gICAgICAgICAgICAgIGxldCBjaGlsZEluZGV4ID0gKCh4IC0gcGFyZW50Q2VsbC54KSArIDIgKiAoeSAtIHBhcmVudENlbGwueSkpIC8gdGlsZVNpemU7XG5cbiAgICAgICAgICAgICAgLy90aGlzLnNldENlbGwoe3gsIHksIHJlY3Vyc2lvbn0sXG4gICAgICAgICAgICAgICAgLy9wYXJlbnRDZWxsLnZlZ2l0YXRpb24gKiAoMC41ICsgTWF0aC5yYW5kb20oKSkpO1xuICAgICAgICAgICAgICB0aGlzLnNldENlbGwoe3gsIHksIHJlY3Vyc2lvbn0sXG4gICAgICAgICAgICAgICAgcGFyZW50Q2VsbC52ZWdpdGF0aW9uICogY2hpbGRNb2RbY2hpbGRJbmRleF0gKiA0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgY29uc29sZS5sb2coXCJDZWxsIGNvdW50OiBcIiwgdGhpcy5fY2VsbHMubGVuZ3RoKTtcblxuICAgIC8qZm9yIChsZXQgeCA9IDA7IHggPCB0aGlzLl9tYXBTaXplOyB4KyspIHtcbiAgICAgIGxldCBsaW5lID0gXCJcIjtcbiAgICAgIGZvciAobGV0IHkgPSAwOyB5IDwgdGhpcy5fbWFwU2l6ZTsgeSsrKSB7XG4gICAgICAgIGxpbmUgKz0gXCIgXCIgKyBNYXRoLnJvdW5kKHRoaXMuZ2V0Q2VsbCh7eCwgeSwgcmVjdXJzaW9uOiB0aGlzLl9tYXhSZWN1cnNpb259KS52ZWdpdGF0aW9uKTtcbiAgICAgIH1cbiAgICAgIGNvbnNvbGUubG9nKGxpbmUpO1xuICAgIH0qL1xuXG4gICAgdGhpcy5fcGxhbnRUcmVlcygpO1xuXG4gICAgLy90aGlzLl9zaGFkZG93cy5nZXRTaGFkb3dNYXAoKS5yZW5kZXJMaXN0LnB1c2godGhpcy5fdHJlZXMpO1xuICB9XG5cbiAgcHJpdmF0ZSBfZmluZENsb3Nlc3RTcGFjZShjb29yZDogQ29vcmQsIGhlaWdodDogbnVtYmVyKTogQ29vcmQge1xuICAgIGxldCBuZWlnaGJvdXJzOiBQcmlvcml0eVF1ZXVlPENvb3JkPiA9IG5ldyBQcmlvcml0eVF1ZXVlPENvb3JkPihnZXRYLCBnZXRZKTtcbiAgICBsZXQgdmlzaXRlZDoge1trZXk6IHN0cmluZ106IGJvb2xlYW59ID0ge307XG4gICAgbmVpZ2hib3Vycy5wdXNoKGNvb3JkLCAwKTtcblxuICAgIHdoaWxlIChuZWlnaGJvdXJzLmxlbmd0aCkge1xuICAgICAgbGV0IHdvcmtpbmcgPSBuZWlnaGJvdXJzLnBvcExvdygpO1xuICAgICAgdmlzaXRlZFtjb29yZFRvS2V5KHdvcmtpbmcpXSA9IHRydWU7XG4gICAgICBpZiAodGhpcy5nZXRDZWxsKHdvcmtpbmcpLm1pbkhlaWdodCA9PT0gdW5kZWZpbmVkIHx8XG4gICAgICAgICB0aGlzLmdldENlbGwod29ya2luZykubWluSGVpZ2h0ID49IGhlaWdodCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcImluOiBcIiwgY29vcmRUb0tleShjb29yZCksIFwiXFx0b3V0OiBcIiwgY29vcmRUb0tleSh3b3JraW5nKSk7XG4gICAgICAgIHJldHVybiB3b3JraW5nO1xuICAgICAgfVxuXG4gICAgICBpZiAod29ya2luZy54ID4gMCkge1xuICAgICAgICBsZXQgbm9kZSA9IHtcInhcIjogd29ya2luZy54IC0gMSwgXCJ5XCI6IHdvcmtpbmcueSwgXCJyZWN1cnNpb25cIjogdGhpcy5fbWF4UmVjdXJzaW9ufTtcbiAgICAgICAgaWYgKCF2aXNpdGVkW2Nvb3JkVG9LZXkobm9kZSldKSB7XG4gICAgICAgICAgbmVpZ2hib3Vycy5wdXNoKG5vZGUsIGRpc3RCZXR3ZWVuKHdvcmtpbmcsIGNvb3JkKSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmICh3b3JraW5nLnggPCB0aGlzLl9tYXBTaXplIC0gMSkge1xuICAgICAgICBsZXQgbm9kZSA9IHtcInhcIjogd29ya2luZy54ICsgMSwgXCJ5XCI6IHdvcmtpbmcueSwgXCJyZWN1cnNpb25cIjogdGhpcy5fbWF4UmVjdXJzaW9ufTtcbiAgICAgICAgaWYgKCF2aXNpdGVkW2Nvb3JkVG9LZXkobm9kZSldKSB7XG4gICAgICAgICAgbmVpZ2hib3Vycy5wdXNoKG5vZGUsIGRpc3RCZXR3ZWVuKHdvcmtpbmcsIGNvb3JkKSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmICh3b3JraW5nLnkgPiAwKSB7XG4gICAgICAgIGxldCBub2RlID0ge1wieFwiOiB3b3JraW5nLngsIFwieVwiOiB3b3JraW5nLnkgLSAxLCBcInJlY3Vyc2lvblwiOiB0aGlzLl9tYXhSZWN1cnNpb259O1xuICAgICAgICBpZiAoIXZpc2l0ZWRbY29vcmRUb0tleShub2RlKV0pIHtcbiAgICAgICAgICBuZWlnaGJvdXJzLnB1c2gobm9kZSwgZGlzdEJldHdlZW4od29ya2luZywgY29vcmQpKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKHdvcmtpbmcueSA8IHRoaXMuX21hcFNpemUgLSAxKSB7XG4gICAgICAgIGxldCBub2RlID0ge1wieFwiOiB3b3JraW5nLngsIFwieVwiOiB3b3JraW5nLnkgKyAxLCBcInJlY3Vyc2lvblwiOiB0aGlzLl9tYXhSZWN1cnNpb259O1xuICAgICAgICBpZiAoIXZpc2l0ZWRbY29vcmRUb0tleShub2RlKV0pIHtcbiAgICAgICAgICBuZWlnaGJvdXJzLnB1c2gobm9kZSwgZGlzdEJldHdlZW4od29ya2luZywgY29vcmQpKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBjb25zb2xlLmxvZyh2aXNpdGVkLmxlbmd0aCk7XG4gICAgY29uc29sZS5sb2coXCJpbjogXCIsIGNvb3JkVG9LZXkoY29vcmQpLCBcIlxcdG91dDogXCIsIHVuZGVmaW5lZCk7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuXG4gIGNhbGN1bGF0ZVBhdGgoc3RhcnQ6IENvb3JkLCBkZXN0aW5hdGlvbjogQ29vcmQpIDogYm9vbGVhbiB7XG4gICAgY29uc29sZS50aW1lKFwiY2FsY3VsYXRlUGF0aFwiKTtcblxuICAgIGxldCByZWFjaGVkRGVzdGluYXRpb24gPSBmYWxzZTtcbiAgICBzdGFydC5yZWN1cnNpb24gPSB0aGlzLl9tYXhSZWN1cnNpb247XG4gICAgZGVzdGluYXRpb24ucmVjdXJzaW9uID0gdGhpcy5fbWF4UmVjdXJzaW9uO1xuXG4gICAgbGV0IHN0YXJ0QWRqdXN0ZWQgPSB0aGlzLmdldENlbGwoXG4gICAgICB0aGlzLl9maW5kQ2xvc2VzdFNwYWNlKHN0YXJ0LCB0aGlzLl9oZWFkcm9vbSkpO1xuICAgIGxldCBkZXN0aW5hdGlvbkFkanVzdGVkID0gdGhpcy5nZXRDZWxsKFxuICAgICAgdGhpcy5fZmluZENsb3Nlc3RTcGFjZShkZXN0aW5hdGlvbiwgdGhpcy5faGVhZHJvb20pKTtcblxuICAgIGRlc3RpbmF0aW9uQWRqdXN0ZWQucGF0aFNjb3JlID0gMDtcblxuICAgIGxldCBuZWlnaGJvdXJzOiBQcmlvcml0eVF1ZXVlPFNjZW5lcnlDZWxsPiA9XG4gICAgICBuZXcgUHJpb3JpdHlRdWV1ZTxTY2VuZXJ5Q2VsbD4oZ2V0WCwgZ2V0WSk7XG4gICAgbmVpZ2hib3Vycy5wdXNoKGRlc3RpbmF0aW9uQWRqdXN0ZWQsIDApO1xuXG4gICAgd2hpbGUgKG5laWdoYm91cnMubGVuZ3RoKSB7XG4gICAgICBsZXQgd29ya2luZzogU2NlbmVyeUNlbGwgPSBuZWlnaGJvdXJzLnBvcExvdygpO1xuXG4gICAgICBpZiAod29ya2luZy54ID09PSBzdGFydEFkanVzdGVkLnggJiYgd29ya2luZy55ID09PSBzdGFydEFkanVzdGVkLnkpIHtcbiAgICAgICAgcmVhY2hlZERlc3RpbmF0aW9uID0gdHJ1ZTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG5cbiAgICAgIGxldCBhZGphY2VudDogU2NlbmVyeUNlbGxbXSA9IG5ldyBBcnJheSg0KTtcbiAgICAgIGlmICh3b3JraW5nLnggPiAwKSB7XG4gICAgICAgIGFkamFjZW50WzBdID0gdGhpcy5nZXRDZWxsKFxuICAgICAgICAgIHtcInhcIjogd29ya2luZy54IC0gMSwgXCJ5XCI6IHdvcmtpbmcueSwgXCJyZWN1cnNpb25cIjogdGhpcy5fbWF4UmVjdXJzaW9ufSk7XG4gICAgICB9XG4gICAgICBpZiAod29ya2luZy54IDwgdGhpcy5fbWFwU2l6ZSAtIDEpIHtcbiAgICAgICAgYWRqYWNlbnRbMV0gPSB0aGlzLmdldENlbGwoXG4gICAgICAgICAge1wieFwiOiB3b3JraW5nLnggKyAxLCBcInlcIjogd29ya2luZy55LCBcInJlY3Vyc2lvblwiOiB0aGlzLl9tYXhSZWN1cnNpb259KTtcbiAgICAgIH1cbiAgICAgIGlmICh3b3JraW5nLnkgPiAwKSB7XG4gICAgICAgIGFkamFjZW50WzJdID0gdGhpcy5nZXRDZWxsKFxuICAgICAgICAgIHtcInhcIjogd29ya2luZy54LCBcInlcIjogd29ya2luZy55IC0gMSwgXCJyZWN1cnNpb25cIjogdGhpcy5fbWF4UmVjdXJzaW9ufSk7XG4gICAgICB9XG4gICAgICBpZiAod29ya2luZy55IDwgdGhpcy5fbWFwU2l6ZSAtIDEpIHtcbiAgICAgICAgYWRqYWNlbnRbM10gPSB0aGlzLmdldENlbGwoXG4gICAgICAgICAge1wieFwiOiB3b3JraW5nLngsIFwieVwiOiB3b3JraW5nLnkgKyAxLCBcInJlY3Vyc2lvblwiOiB0aGlzLl9tYXhSZWN1cnNpb259KTtcbiAgICAgIH1cbiAgICAgIGFkamFjZW50LmZvckVhY2goKGEpID0+IHtcbiAgICAgICAgaWYgKGEgIT09IHVuZGVmaW5lZCAmJlxuICAgICAgICAgICAoYS5taW5IZWlnaHQgPiB0aGlzLl9oZWFkcm9vbSB8fCBhLm1pbkhlaWdodCA9PT0gdW5kZWZpbmVkKSkge1xuICAgICAgICAgIGlmIChhLnBhdGhTY29yZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBhLnBhdGhTY29yZSA9IHdvcmtpbmcucGF0aFNjb3JlICsgMTtcbiAgICAgICAgICAgIG5laWdoYm91cnMucHVzaChhLCBhLnBhdGhTY29yZSArIGRpc3RCZXR3ZWVuKGEsIHN0YXJ0QWRqdXN0ZWQpKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYS5wYXRoU2NvcmUgPSBNYXRoLm1pbihhLnBhdGhTY29yZSwgd29ya2luZy5wYXRoU2NvcmUgKyAxKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qZm9yIChsZXQgeSA9IDA7IHkgPCB0aGlzLl9tYXBTaXplOyB5KyspIHtcbiAgICAgIGxldCBsaW5lID0gXCJcIjtcbiAgICAgIGZvciAobGV0IHggPSAwOyB4IDwgdGhpcy5fbWFwU2l6ZTsgeCsrKSB7XG4gICAgICAgIGxldCBub2RlID0gdGhpcy5nZXRDZWxsKHt4LCB5LCBcInJlY3Vyc2lvblwiOiB0aGlzLl9tYXhSZWN1cnNpb259KTtcbiAgICAgICAgbGV0IHZhbCA9IFwiXCIgKyBub2RlLnBhdGhTY29yZTtcbiAgICAgICAgaWYgKHZhbCA9PT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAgIHZhbCA9IFwiIFwiO1xuICAgICAgICAgIGlmICh0aGlzLmdldENlbGwobm9kZSkubWluSGVpZ2h0IDw9IHRoaXMuX2hlYWRyb29tKSB7XG4gICAgICAgICAgICB2YWwgPSBcIiNcIjtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdmFsID0gXCIuXCI7XG4gICAgICAgICAgbGV0IHBhdGhOb2RlID0gQkFCWUxPTi5NZXNoQnVpbGRlci5DcmVhdGVTcGhlcmUoXCJwYXRoX1wiICsgeCArIFwiX1wiICsgeSwge30sIHRoaXMuX3NjZW5lKTtcbiAgICAgICAgICBwYXRoTm9kZS5wb3NpdGlvbi54ID0gdGhpcy5tYXBUb1dvcmxkKG5vZGUpLng7XG4gICAgICAgICAgcGF0aE5vZGUucG9zaXRpb24ueSA9IDA7XG4gICAgICAgICAgcGF0aE5vZGUucG9zaXRpb24ueiA9IHRoaXMubWFwVG9Xb3JsZChub2RlKS55O1xuICAgICAgICB9XG4gICAgICAgIGlmICh4ID09PSBzdGFydC54ICYmIHkgPT09IHN0YXJ0LnkpIHsgdmFsID0gXCIqXCI7IH1cbiAgICAgICAgaWYgKHggPT09IHN0YXJ0QWRqdXN0ZWQueCAmJiB5ID09PSBzdGFydEFkanVzdGVkLnkpIHsgdmFsID0gXCIoKilcIjsgfVxuICAgICAgICBpZiAoeSA8IDUwICYmIHggPCAxNTApIHtcbiAgICAgICAgICBsaW5lICs9IHZhbDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKHkgPCA1MCkge1xuICAgICAgICBjb25zb2xlLmxvZyhsaW5lKTtcbiAgICAgIH1cbiAgICB9Ki9cbiAgICBjb25zb2xlLnRpbWVFbmQoXCJjYWxjdWxhdGVQYXRoXCIpO1xuICAgIGNvbnNvbGUubG9nKFwiU3VjZXNzZnVsbDogXCIsIHJlYWNoZWREZXN0aW5hdGlvbik7XG4gICAgcmV0dXJuIHJlYWNoZWREZXN0aW5hdGlvbjtcbiAgfVxuXG4gIHByaXZhdGUgX3BsYW50VHJlZXMoKSA6IHZvaWQge1xuICAgIGNvbnNvbGUubG9nKFwiUGxhbnRpbmcgdHJlZXMuXCIpO1xuICAgIHRoaXMuX3RyZWVUeXBlcyA9IFtdO1xuICAgIHRoaXMuX3RyZWVTcGVjaWVzID0gMDtcbiAgICAvLyBFbnN1cmUgdGhlcmUgYXJlIGFsd2F5cyAvc29tZS8gb2YgZWFjaCB0eXBlIG9mIHRyZWUuXG4gICAgdGhpcy5fdHJlZVR5cGVzLnB1c2godGhpcy5fY3JlYXRlVHJlZVBpbmUoKSk7XG4gICAgdGhpcy5fdHJlZVR5cGVzLnB1c2godGhpcy5fY3JlYXRlVHJlZURlY2lkdW91cygpKTtcbiAgICAvLyBCdXQgbW9zdCBzaG91bGQgYmUgcmFuZG9tLlxuICAgIHRoaXMuX3RyZWVUeXBlcy5wdXNoKHRoaXMuX2NyZWF0ZVRyZWUoKSk7XG4gICAgdGhpcy5fdHJlZVR5cGVzLnB1c2godGhpcy5fY3JlYXRlVHJlZSgpKTtcbiAgICB0aGlzLl90cmVlVHlwZXMucHVzaCh0aGlzLl9jcmVhdGVUcmVlKCkpO1xuICAgIHRoaXMuX3RyZWVUeXBlcy5wdXNoKHRoaXMuX2NyZWF0ZVRyZWUoKSk7XG4gICAgdGhpcy5fdHJlZVR5cGVzLnB1c2godGhpcy5fY3JlYXRlVHJlZSgpKTtcbiAgICB0aGlzLl90cmVlVHlwZXMucHVzaCh0aGlzLl9jcmVhdGVUcmVlKCkpO1xuICAgIHRoaXMuX3RyZWVUeXBlcy5wdXNoKHRoaXMuX2NyZWF0ZVRyZWUoKSk7XG4gICAgdGhpcy5fdHJlZVR5cGVzLnB1c2godGhpcy5fY3JlYXRlVHJlZSgpKTtcbiAgICB0aGlzLl90cmVlVHlwZXMucHVzaCh0aGlzLl9jcmVhdGVUcmVlKCkpO1xuICAgIHRoaXMuX3RyZWVUeXBlcy5wdXNoKHRoaXMuX2NyZWF0ZVRyZWUoKSk7XG5cbiAgICB0aGlzLl9zaHJ1YlR5cGVzID0gW107XG4gICAgdGhpcy5fc2hydWJUeXBlcy5wdXNoKHRoaXMuX2NyZWF0ZVNocnViKHRydWUpKTtcbiAgICB0aGlzLl9zaHJ1YlR5cGVzLnB1c2godGhpcy5fY3JlYXRlU2hydWIoKSk7XG4gICAgdGhpcy5fc2hydWJUeXBlcy5wdXNoKHRoaXMuX2NyZWF0ZVNocnViKCkpO1xuICAgIHRoaXMuX3NocnViVHlwZXMucHVzaCh0aGlzLl9jcmVhdGVTaHJ1YigpKTtcbiAgICB0aGlzLl9zaHJ1YlR5cGVzLnB1c2godGhpcy5fY3JlYXRlU2hydWIoKSk7XG4gICAgdGhpcy5fc2hydWJUeXBlcy5wdXNoKHRoaXMuX2NyZWF0ZVNocnViKCkpO1xuICAgIHRoaXMuX3NocnViVHlwZXMucHVzaCh0aGlzLl9jcmVhdGVTaHJ1YigpKTtcbiAgICB0aGlzLl9zaHJ1YlR5cGVzLnB1c2godGhpcy5fY3JlYXRlU2hydWIoKSk7XG4gICAgdGhpcy5fc2hydWJUeXBlcy5wdXNoKHRoaXMuX2NyZWF0ZVNocnViKCkpO1xuICAgIHRoaXMuX3NocnViVHlwZXMucHVzaCh0aGlzLl9jcmVhdGVTaHJ1YigpKTtcblxuICAgIHRoaXMuX2dyb3VuZENvdmVyVHlwZXMgPSBbXTtcbiAgICB0aGlzLl9ncm91bmRDb3ZlclR5cGVzLnB1c2godGhpcy5fY3JlYXRlR3JvdW5kQ292ZXIoKSk7XG4gICAgdGhpcy5fZ3JvdW5kQ292ZXJUeXBlcy5wdXNoKHRoaXMuX2NyZWF0ZUdyb3VuZENvdmVyKCkpO1xuICAgIHRoaXMuX2dyb3VuZENvdmVyVHlwZXMucHVzaCh0aGlzLl9jcmVhdGVHcm91bmRDb3ZlcigpKTtcbiAgICB0aGlzLl9ncm91bmRDb3ZlclR5cGVzLnB1c2godGhpcy5fY3JlYXRlR3JvdW5kQ292ZXIoKSk7XG4gICAgdGhpcy5fZ3JvdW5kQ292ZXJUeXBlcy5wdXNoKHRoaXMuX2NyZWF0ZUdyb3VuZENvdmVyKCkpO1xuICAgIHRoaXMuX2dyb3VuZENvdmVyVHlwZXMucHVzaCh0aGlzLl9jcmVhdGVHcm91bmRDb3ZlcigpKTtcbiAgICB0aGlzLl9ncm91bmRDb3ZlclR5cGVzLnB1c2godGhpcy5fY3JlYXRlR3JvdW5kQ292ZXIoKSk7XG4gICAgdGhpcy5fZ3JvdW5kQ292ZXJUeXBlcy5wdXNoKHRoaXMuX2NyZWF0ZUdyb3VuZENvdmVyKCkpO1xuXG4gICAgbGV0IHRyZWVzID0gW107XG4gICAgbGV0IHRpbGVTaXplID0gTWF0aC5wb3coMiwgdGhpcy5fbWF4UmVjdXJzaW9uIC0gdGhpcy5fdHJlZVJlY3Vyc2lvbik7XG4gICAgZm9yIChsZXQgeCA9IDA7IHggPCB0aGlzLl9tYXBTaXplOyB4ICs9IHRpbGVTaXplKSB7XG4gICAgICBmb3IgKGxldCB5ID0gMDsgeSA8IHRoaXMuX21hcFNpemU7IHkgKz0gdGlsZVNpemUpIHtcbiAgICAgICAgbGV0IGNlbGwgPSB0aGlzLmdldENlbGwoe3gsIHksIHJlY3Vyc2lvbjogdGhpcy5fdHJlZVJlY3Vyc2lvbn0pO1xuICAgICAgICBsZXQgc2NhbGUgPSBjZWxsLnZlZ2l0YXRpb24gLyB0aGlzLl90cmVlU2NhbGU7XG4gICAgICAgIGxldCB0cmVlOiBCQUJZTE9OLk1lc2g7XG4gICAgICAgIGlmIChjZWxsLnZlZ2l0YXRpb24gPiA4MCkge1xuICAgICAgICAgIGxldCB0cmVlVHlwZUluZGV4ID0gTWF0aC5yb3VuZChNYXRoLnJhbmRvbSgpICogKHRoaXMuX3RyZWVUeXBlcy5sZW5ndGggLSAxKSk7XG4gICAgICAgICAgLy9jb25zb2xlLmxvZyh0cmVlVHlwZUluZGV4LCB0aGlzLl90cmVlVHlwZXMubGVuZ3RoKTtcbiAgICAgICAgICB0cmVlID0gdGhpcy5fdHJlZVR5cGVzW3RyZWVUeXBlSW5kZXhdLmNsb25lKFxuICAgICAgICAgICAgdGhpcy5fdHJlZVR5cGVzW3RyZWVUeXBlSW5kZXhdLm5hbWUgKyBcIl9cIiArIHggKyBcIl9cIiArIHkpO1xuICAgICAgICB9IGVsc2UgaWYgKGNlbGwudmVnaXRhdGlvbiA+IDUwKSB7XG4gICAgICAgICAgbGV0IHNocnViVHlwZXMgPSB0aGlzLl9zaHJ1YlR5cGVzLmxlbmd0aDtcbiAgICAgICAgICBsZXQgc2hydWJUeXBlSW5kZXggPSBNYXRoLnJvdW5kKE1hdGgucmFuZG9tKCkgKiAodGhpcy5fc2hydWJUeXBlcy5sZW5ndGggLSAxKSk7XG4gICAgICAgICAgdHJlZSA9IHRoaXMuX3NocnViVHlwZXNbc2hydWJUeXBlSW5kZXhdLmNsb25lKFxuICAgICAgICAgICAgdGhpcy5fc2hydWJUeXBlc1tzaHJ1YlR5cGVJbmRleF0ubmFtZSArIFwiX1wiICsgeCArIFwiX1wiICsgeSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRyZWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGxldCBqaXR0ZXJYID0gTWF0aC5yb3VuZChNYXRoLnJhbmRvbSgpICogOCAtIDQpO1xuICAgICAgICAgIGxldCBqaXR0ZXJZID0gTWF0aC5yb3VuZChNYXRoLnJhbmRvbSgpICogOCAtIDQpO1xuICAgICAgICAgIHRyZWUucG9zaXRpb24ueCA9IChcbiAgICAgICAgICAgICh4ICsgaml0dGVyWCkgLSB0aGlzLl9tYXBTaXplIC8gMikgKiB0aGlzLl9tYXBTcGFjaW5nO1xuICAgICAgICAgIHRyZWUucG9zaXRpb24ueSA9IDA7XG4gICAgICAgICAgdHJlZS5wb3NpdGlvbi56ID0gKFxuICAgICAgICAgICAgKHkgKyBqaXR0ZXJZKSAtIHRoaXMuX21hcFNpemUgLyAyKSAqIHRoaXMuX21hcFNwYWNpbmc7XG4gICAgICAgICAgdHJlZS5zY2FsaW5nID0gbmV3IEJBQllMT04uVmVjdG9yMyhzY2FsZSwgc2NhbGUsIHNjYWxlKTtcbiAgICAgICAgICB0cmVlcy5wdXNoKHRyZWUpO1xuXG4gICAgICAgICAgbGV0IGxlYXZlcyA9IHRyZWUuZ2V0Q2hpbGRNZXNoZXModHJ1ZSwgKG1lc2gpID0+IHtcbiAgICAgICAgICAgIHJldHVybiBtZXNoLm5hbWUuc3BsaXQoXCIuXCIpWzFdID09PSBcImxlYXZlc1wiO1xuICAgICAgICAgICAgfSlbMF0uZ2V0Qm91bmRpbmdJbmZvKCkuYm91bmRpbmdCb3g7XG4gICAgICAgICAgbGV0IGxlYXZlc1RvcCA9IGxlYXZlcy5tYXhpbXVtV29ybGQueSAqIHNjYWxlO1xuICAgICAgICAgIGxldCBsZWF2ZXNCb3R0b20gPSBsZWF2ZXMubWluaW11bVdvcmxkLnkgKiBzY2FsZTtcbiAgICAgICAgICBsZXQgeE1pbiA9IChsZWF2ZXMubWluaW11bVdvcmxkLnggLyB0aGlzLl9tYXBTcGFjaW5nKSAqIHNjYWxlO1xuICAgICAgICAgIGxldCB4TWF4ID0gKGxlYXZlcy5tYXhpbXVtV29ybGQueCAvIHRoaXMuX21hcFNwYWNpbmcpICogc2NhbGU7XG4gICAgICAgICAgbGV0IHlNaW4gPSAobGVhdmVzLm1pbmltdW1Xb3JsZC56IC8gdGhpcy5fbWFwU3BhY2luZykgKiBzY2FsZTtcbiAgICAgICAgICBsZXQgeU1heCA9IChsZWF2ZXMubWF4aW11bVdvcmxkLnogLyB0aGlzLl9tYXBTcGFjaW5nKSAqIHNjYWxlO1xuICAgICAgICAgIC8vZm9yIChsZXQgeHggPSBNYXRoLmNlaWwoeE1pbiArIGppdHRlclgpOyB4eCA8PSBNYXRoLmZsb29yKHhNYXggKyBqaXR0ZXJYKTsgeHgrKykge1xuICAgICAgICAgIGZvciAobGV0IHh4ID0gTWF0aC5mbG9vcih4TWluICsgaml0dGVyWCk7IHh4IDw9IE1hdGguY2VpbCh4TWF4ICsgaml0dGVyWCk7IHh4KyspIHtcbiAgICAgICAgICAgIC8vZm9yIChsZXQgeXkgPSBNYXRoLmNlaWwoeU1pbiArIGppdHRlclkpOyB5eSA8PSBNYXRoLmZsb29yKHlNYXggKyBqaXR0ZXJZKTsgeXkrKykge1xuICAgICAgICAgICAgZm9yIChsZXQgeXkgPSBNYXRoLmZsb29yKHlNaW4gKyBqaXR0ZXJZKTsgeXkgPD0gTWF0aC5jZWlsKHlNYXggKyBqaXR0ZXJZKTsgeXkrKykge1xuICAgICAgICAgICAgICBsZXQgYyA9IHRoaXMuZ2V0Q2VsbCh7eDogeHggKyB4LCB5OiB5eSArIHksIHJlY3Vyc2lvbjogdGhpcy5fbWF4UmVjdXJzaW9ufSk7XG4gICAgICAgICAgICAgIGlmIChjICYmIChjLm1heEhlaWdodCA9PT0gdW5kZWZpbmVkIHx8IGMubWF4SGVpZ2h0IDwgbGVhdmVzVG9wKSkge1xuICAgICAgICAgICAgICAgIGMubWF4SGVpZ2h0ID0gbGVhdmVzVG9wO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGlmIChjICYmIChjLm1pbkhlaWdodCA+IGxlYXZlc0JvdHRvbSB8fCBjLm1pbkhlaWdodCA9PT0gdW5kZWZpbmVkKSkge1xuICAgICAgICAgICAgICAgIGMubWluSGVpZ2h0ID0gbGVhdmVzQm90dG9tO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGxldCBjID0gdGhpcy5nZXRDZWxsKHt4LCB5LCByZWN1cnNpb246IHRoaXMuX21heFJlY3Vyc2lvbn0pO1xuICAgICAgICAgIGlmIChjICYmIChjLm1pbkhlaWdodCA9PT0gdW5kZWZpbmVkIHx8IGMubWluSGVpZ2h0ID4gbGVhdmVzQm90dG9tKSkge1xuICAgICAgICAgICAgYy5taW5IZWlnaHQgPSBsZWF2ZXNCb3R0b207XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgbGV0IHRydW5rID0gdHJlZS5nZXRDaGlsZE1lc2hlcyh0cnVlLCAobWVzaCkgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIG1lc2gubmFtZS5zcGxpdChcIi5cIilbMV0gPT09IFwidHJ1bmtcIjtcbiAgICAgICAgICB9KVswXTtcbiAgICAgICAgICBpZiAodHJ1bmspIHtcbiAgICAgICAgICAgIGxldCB0cnVua0JCID0gdHJ1bmsuZ2V0Qm91bmRpbmdJbmZvKCkuYm91bmRpbmdCb3g7XG4gICAgICAgICAgICBsZXQgeE1pblQgPSBNYXRoLnJvdW5kKHRydW5rQkIubWluaW11bVdvcmxkLnggKiBzY2FsZSAvIHRoaXMuX21hcFNwYWNpbmcpO1xuICAgICAgICAgICAgbGV0IHhNYXhUID0gTWF0aC5yb3VuZCh0cnVua0JCLm1heGltdW1Xb3JsZC54ICogc2NhbGUgLyB0aGlzLl9tYXBTcGFjaW5nKTtcbiAgICAgICAgICAgIGxldCB5TWluVCA9IE1hdGgucm91bmQodHJ1bmtCQi5taW5pbXVtV29ybGQueiAqIHNjYWxlIC8gdGhpcy5fbWFwU3BhY2luZyk7XG4gICAgICAgICAgICBsZXQgeU1heFQgPSBNYXRoLnJvdW5kKHRydW5rQkIubWF4aW11bVdvcmxkLnogKiBzY2FsZSAvIHRoaXMuX21hcFNwYWNpbmcpO1xuICAgICAgICAgICAgZm9yIChsZXQgeHggPSBNYXRoLmNlaWwoeE1pblQgKyBqaXR0ZXJYKTsgeHggPD0gTWF0aC5mbG9vcih4TWF4VCArIGppdHRlclgpOyB4eCsrKSB7XG4gICAgICAgICAgICAgIGZvciAobGV0IHl5ID0gTWF0aC5jZWlsKHlNaW5UICsgaml0dGVyWSk7IHl5IDw9IE1hdGguZmxvb3IoeU1heFQgKyBqaXR0ZXJZKTsgeXkrKykge1xuICAgICAgICAgICAgICAgIGxldCBjID0gdGhpcy5nZXRDZWxsKHt4OiB4eCArIHgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHk6IHl5ICsgeSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVjdXJzaW9uOiB0aGlzLl9tYXhSZWN1cnNpb259KTtcbiAgICAgICAgICAgICAgICBpZiAoYykge1xuICAgICAgICAgICAgICAgICAgYy5taW5IZWlnaHQgPSAwO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIGNvbnNvbGUubG9nKHhNaW4sIHhNYXgsIHlNaW4sIHlNYXgpO1xuICAgICAgICAgIC8qbGV0IHRlc3RUcmVldG9wID0gQkFCWUxPTi5NZXNoQnVpbGRlci5DcmVhdGVCb3goXCJ0ZXN0XCIsXG4gICAgICAgICAgICB7XCJ3aWR0aFwiOiAoeE1heCAtIHhNaW4pICogdGhpcy5fbWFwU3BhY2luZyxcbiAgICAgICAgICAgICBcImhlaWdodFwiOiBsZWF2ZXNUb3AgLSBsZWF2ZXNCb3R0b20sXG4gICAgICAgICAgICAgXCJkZXB0aFwiOiAoeU1heCAtIHlNaW4pICogdGhpcy5fbWFwU3BhY2luZ30sXG4gICAgICAgICAgICB0aGlzLl9zY2VuZSk7XG4gICAgICAgICAgdmFyIG1hdGVyaWFsID0gbmV3IEJBQllMT04uU3RhbmRhcmRNYXRlcmlhbChcIm15TWF0ZXJpYWxcIiwgdGhpcy5fc2NlbmUpO1xuICAgICAgICAgIG1hdGVyaWFsLmRpZmZ1c2VDb2xvciA9IG5ldyBCQUJZTE9OLkNvbG9yMygxLCAwLCAwKTtcbiAgICAgICAgICAvL21hdGVyaWFsLndpcmVmcmFtZSA9IHRydWU7XG4gICAgICAgICAgbWF0ZXJpYWwuYWxwaGEgPSAwLjU7XG4gICAgICAgICAgdGVzdFRyZWV0b3AubWF0ZXJpYWwgPSBtYXRlcmlhbDtcbiAgICAgICAgICB0ZXN0VHJlZXRvcC5wb3NpdGlvbi54ID0gKHggKyBqaXR0ZXJYIC0gdGhpcy5fbWFwU2l6ZSAvIDIpICogdGhpcy5fbWFwU3BhY2luZztcbiAgICAgICAgICB0ZXN0VHJlZXRvcC5wb3NpdGlvbi55ID0gKGxlYXZlc1RvcCArIGxlYXZlc0JvdHRvbSkgLyAyO1xuICAgICAgICAgIHRlc3RUcmVldG9wLnBvc2l0aW9uLnogPSAoeSArIGppdHRlclkgLSB0aGlzLl9tYXBTaXplIC8gMikgKiB0aGlzLl9tYXBTcGFjaW5nOyovXG5cbiAgICAgICAgICB0aGlzLl9hcHBseUdyb3VuZENvdmVyKCh4IC0gdGhpcy5fbWFwU2l6ZSAvIDIpICogdGhpcy5fbWFwU3BhY2luZyxcbiAgICAgICAgICAgICh5IC0gdGhpcy5fbWFwU2l6ZSAvIDIpICogdGhpcy5fbWFwU3BhY2luZyk7XG5cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBjb25zb2xlLmxvZyhcIkRvbmUgcGxhbnRpbmdcIik7XG5cbiAgICAvKmZvciAobGV0IHggPSAwOyB4IDwgdGhpcy5fbWFwU2l6ZTsgeCsrKSB7XG4gICAgICBmb3IgKGxldCB5ID0gMDsgeSA8IHRoaXMuX21hcFNpemU7IHkrKykge1xuICAgICAgICBsZXQgY2VsbCA9IHRoaXMuZ2V0Q2VsbCh7eCwgeSwgcmVjdXJzaW9uOiB0aGlzLl9tYXhSZWN1cnNpb259KTtcbiAgICAgICAgaWYgKGNlbGwubWluSGVpZ2h0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAvL2xldCBsZWF2ZXNUb3AgPSBjZWxsLm1heEhlaWdodDtcbiAgICAgICAgICBsZXQgbGVhdmVzVG9wID0gY2VsbC5taW5IZWlnaHQ7XG4gICAgICAgICAgbGV0IHRlc3RUcmVldG9wID0gQkFCWUxPTi5NZXNoQnVpbGRlci5DcmVhdGVQbGFuZShcbiAgICAgICAgICAgIFwidGVzdFwiICsgeCArIFwiX1wiICsgeSArIFwiIFwiICsgdGhpcy5fbWF4UmVjdXJzaW9uLFxuICAgICAgICAgICAge3NpemU6IDEgKiB0aGlzLl9tYXBTcGFjaW5nLCBzaWRlT3JpZW50YXRpb246IEJBQllMT04uTWVzaC5ET1VCTEVTSURFfSxcbiAgICAgICAgICAgIHRoaXMuX3NjZW5lKTtcbiAgICAgICAgICB0ZXN0VHJlZXRvcC5yb3RhdGlvbi54ID0gTWF0aC5QSSAvIDI7XG4gICAgICAgICAgdGVzdFRyZWV0b3AucG9zaXRpb24ueCA9ICh4IC0gdGhpcy5fbWFwU2l6ZSAvIDIpICogdGhpcy5fbWFwU3BhY2luZztcbiAgICAgICAgICB0ZXN0VHJlZXRvcC5wb3NpdGlvbi55ID0gbGVhdmVzVG9wO1xuICAgICAgICAgIHRlc3RUcmVldG9wLnBvc2l0aW9uLnogPSAoeSAtIHRoaXMuX21hcFNpemUgLyAyKSAqIHRoaXMuX21hcFNwYWNpbmc7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9Ki9cblxuICAgIC8vIERvbid0IG5lZWQgdGhlIHByb3RvdHlwZXMgYW55IG1vcmUgc28gZGVsZXRlIHRoZW0uXG4gICAgdGhpcy5fdHJlZVR5cGVzLmZvckVhY2goKG5vZGUpID0+IHsgbm9kZS5kaXNwb3NlKCk7IH0pO1xuICAgIHRoaXMuX3NocnViVHlwZXMuZm9yRWFjaCgobm9kZSkgPT4geyBub2RlLmRpc3Bvc2UoKTsgfSk7XG5cbiAgICBjb25zb2xlLmxvZyhcIkNvbnNvbGlkYXRpbmcgdHJlZXMuXCIpO1xuICAgIHRoaXMuX2NvbnNvbGlkYXRlVHJlZXModHJlZXMpO1xuICB9XG5cbiAgd29ybGRUb01hcChjb29yZDogQ29vcmQpIDogQ29vcmQge1xuICAgIGxldCB4ID0gTWF0aC5yb3VuZChjb29yZC54IC8gdGhpcy5fbWFwU3BhY2luZyArIHRoaXMuX21hcFNpemUgLyAyKTtcbiAgICBsZXQgeSA9IE1hdGgucm91bmQoY29vcmQueSAvIHRoaXMuX21hcFNwYWNpbmcgKyB0aGlzLl9tYXBTaXplIC8gMik7XG4gICAgbGV0IHJlY3Vyc2lvbiA9IGNvb3JkLnJlY3Vyc2lvbjtcbiAgICBpZiAocmVjdXJzaW9uID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJlY3Vyc2lvbiA9IHRoaXMuX21heFJlY3Vyc2lvbjtcbiAgICB9XG4gICAgcmV0dXJuIHt4LCB5LCByZWN1cnNpb259O1xuICB9XG5cbiAgbWFwVG9Xb3JsZChjb29yZDogQ29vcmQpIDogQ29vcmQge1xuICAgIGxldCB4ID0gTWF0aC5yb3VuZChjb29yZC54ICogdGhpcy5fbWFwU3BhY2luZyAtIHRoaXMuX21hcFNpemUgLyAyKTtcbiAgICBsZXQgeSA9IE1hdGgucm91bmQoY29vcmQueSAqIHRoaXMuX21hcFNwYWNpbmcgLSB0aGlzLl9tYXBTaXplIC8gMik7XG4gICAgbGV0IHJlY3Vyc2lvbiA9IGNvb3JkLnJlY3Vyc2lvbjtcbiAgICBpZiAocmVjdXJzaW9uID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJlY3Vyc2lvbiA9IHRoaXMuX21heFJlY3Vyc2lvbjtcbiAgICB9XG4gICAgcmV0dXJuIHt4LCB5LCByZWN1cnNpb259O1xuICB9XG5cbiAgc2V0Q2VsbChjb29yZDogQ29vcmQsIHZlZ2l0YXRpb246IG51bWJlcikgOiB2b2lkIHtcbiAgICBsZXQgY2VsbCA9IG5ldyBTY2VuZXJ5Q2VsbChjb29yZCwgdmVnaXRhdGlvbik7XG4gICAgdGhpcy5fY2VsbHMucHV0KGNlbGwsIGNlbGwpO1xuICB9XG5cbiAgZ2V0Q2VsbChjb29yZDogQ29vcmQpIDogU2NlbmVyeUNlbGwge1xuICAgIGlmIChjb29yZC5yZWN1cnNpb24gPT09IC0gMSkge1xuICAgICAgcmV0dXJuIHRoaXMuX2NlbGxzLmdldCh7XCJ4XCI6IDAsIFwieVwiOiAwLCBcInJlY3Vyc2lvblwiOiAwfSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9jZWxscy5nZXQoY29vcmQpO1xuICB9XG5cbiAgZ2V0SGVpZ2h0V29ybGQoY29vcmQ6IENvb3JkKSA6IG51bWJlciB7XG4gICAgbGV0IGNlbGwgPSB0aGlzLmdldENlbGxXb3JsZChjb29yZCk7XG4gICAgaWYgKCFjZWxsKSB7XG4gICAgICByZXR1cm4gMDtcbiAgICB9XG4gICAgcmV0dXJuIGNlbGwubWF4SGVpZ2h0O1xuICB9XG5cbiAgZ2V0Q2VsbFdvcmxkKGNvb3JkOiBDb29yZCkgOiBTY2VuZXJ5Q2VsbCB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0Q2VsbCh0aGlzLndvcmxkVG9NYXAoY29vcmQpKTtcbiAgfVxuXG4gIGdldENlbGxQYXJlbnQoY29vcmQ6IENvb3JkKSA6IFNjZW5lcnlDZWxsIHtcbiAgICBsZXQgY2VsbCA9IHRoaXMuZ2V0Q2VsbChjb29yZCk7XG4gICAgaWYgKGNlbGwgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIHRoaXMuZ2V0Q2VsbChuZXcgU2NlbmVyeUNlbGwoY29vcmQsIC0gMSkucGFyZW50Q29vcmRpbmF0ZXModGhpcy5fbWF4UmVjdXJzaW9uKSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmdldENlbGwoY2VsbC5wYXJlbnRDb29yZGluYXRlcyh0aGlzLl9tYXhSZWN1cnNpb24pKTtcbiAgfVxuXG4gIHByaXZhdGUgX2NvbnNvbGlkYXRlVHJlZXModHJlZXM6IEJBQllMT04uTWVzaFtdKSA6IHZvaWQge1xuICAgIGNvbnNvbGUubG9nKFwiTWVzaCBjb3VudCBiZWZvcmUgX2NvbnNvbGlkYXRlVHJlZXM6ICVjXCIgK1xuICAgICAgICAgICAgICAgIHRoaXMuX3NjZW5lLm1lc2hlcy5sZW5ndGgudG9TdHJpbmcoKSxcbiAgICAgICAgICAgICAgICBcImJhY2tncm91bmQ6IG9yYW5nZTsgY29sb3I6IHdoaXRlXCIpO1xuXG4gICAgbGV0IGNvdW50U3RhcnQgPSAwO1xuICAgIGxldCBjb3VudEZpbmFsID0gMDtcblxuICAgIGxldCB0cmVlRm9saWFnZUJ1Y2tldCA9IG5ldyBBcnJheSh0aGlzLl90cmVlU3BlY2llcykuZmlsbCh1bmRlZmluZWQpO1xuICAgIGxldCB0cmVlVHJ1bmtCdWNrZXQgPSBuZXcgQXJyYXkodGhpcy5fdHJlZVNwZWNpZXMpLmZpbGwodW5kZWZpbmVkKTtcbiAgICB0cmVlcy5mb3JFYWNoKCh0cmVlKSA9PiB7XG4gICAgICAvLyBDb2xsZWN0IHRoZSBkaWZmZXJlbnQgdHJlZSBzcGVjaWVzIHRvZ2V0aGVyIGluIDIgY29sbGVjdGlvbnM6XG4gICAgICAvLyB0cnVua3MgYW5kIGxlYXZlcy5cbiAgICAgIGxldCB0cmVlSW5kZXggPSBwYXJzZUludCh0cmVlLm5hbWUuc3BsaXQoXCJfXCIpWzFdLCAxMCk7XG4gICAgICBpZiAodHJlZUZvbGlhZ2VCdWNrZXRbdHJlZUluZGV4XSA9PT0gdW5kZWZpbmVkIHx8IHRyZWVUcnVua0J1Y2tldCA9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdHJlZUZvbGlhZ2VCdWNrZXRbdHJlZUluZGV4XSA9IFtdO1xuICAgICAgICB0cmVlVHJ1bmtCdWNrZXRbdHJlZUluZGV4XSA9IFtdO1xuICAgICAgfVxuICAgICAgdHJlZS5nZXRDaGlsZE1lc2hlcyh0cnVlKS5mb3JFYWNoKChub2RlKSA9PiB7XG4gICAgICAgIGxldCBub2RlTmFtZSA9IG5vZGUubmFtZS5zcGxpdChcIi5cIilbMV07XG4gICAgICAgIGlmIChub2RlTmFtZSA9PT0gXCJsZWF2ZXNcIikge1xuICAgICAgICAgIGxldCBwb3MgPSBub2RlLmdldEFic29sdXRlUG9zaXRpb24oKTtcbiAgICAgICAgICBub2RlLnNldFBhcmVudChudWxsKTtcbiAgICAgICAgICBub2RlLnNldEFic29sdXRlUG9zaXRpb24ocG9zKTtcbiAgICAgICAgICB0cmVlRm9saWFnZUJ1Y2tldFt0cmVlSW5kZXhdLnB1c2gobm9kZSk7XG4gICAgICAgIH0gZWxzZSBpZiAobm9kZU5hbWUgPT09IFwidHJ1bmtcIikge1xuICAgICAgICAgIGxldCBwb3MgPSBub2RlLmdldEFic29sdXRlUG9zaXRpb24oKTtcbiAgICAgICAgICBub2RlLnNldFBhcmVudChudWxsKTtcbiAgICAgICAgICBub2RlLnNldEFic29sdXRlUG9zaXRpb24ocG9zKTtcbiAgICAgICAgICB0cmVlVHJ1bmtCdWNrZXRbdHJlZUluZGV4XS5wdXNoKG5vZGUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNvbnNvbGUubG9nKG5vZGVOYW1lKTtcbiAgICAgICAgICBjb25zb2xlLmFzc2VydChmYWxzZSAmJiBcIlVua25vd24gdHJlZSBjb21wb25lbnRcIik7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgLy8gV2UgaGF2ZSB0aGUgY29tcG9uZW50IHBhcnRzIHNvIGRvbid0IG5lZWQgdGhlIG9yaWdpbmFsIHRyZWUgYW55bW9yZS5cbiAgICAgIHRyZWUuZGlzcG9zZSgpO1xuICAgIH0pO1xuXG4gICAgLy8gQ29tYmluZSBhbGwgdHJ1bmtzIG9mIHRoZSBzYW1lIHNwZWNpZXMgdG9nZXRoZXIuXG4gICAgdHJlZVRydW5rQnVja2V0LmZvckVhY2goKGJ1Y2tldCkgPT4ge1xuICAgICAgaWYgKGJ1Y2tldCAmJiBidWNrZXQubGVuZ3RoKSB7XG4gICAgICAgIGNvdW50U3RhcnQgKz0gYnVja2V0Lmxlbmd0aDtcbiAgICAgICAgY291bnRGaW5hbCsrO1xuICAgICAgICBsZXQgdCA9IEJBQllMT04uTWVzaC5NZXJnZU1lc2hlcyhidWNrZXQsIHRydWUsIHRydWUsIG51bGwsIHRydWUpO1xuICAgICAgICAvLyB0aGlzLl9zaGFkZG93cy5nZXRTaGFkb3dNYXAoKS5yZW5kZXJMaXN0LnB1c2godCk7XG4gICAgICB9XG4gICAgfSwgdGhpcyk7XG4gICAgLy8gQ29tYmluZSBhbGwgbGVhdmVzIG9mIHRoZSBzYW1lIHNwZWNpZXMgdG9nZXRoZXIuXG4gICAgdHJlZUZvbGlhZ2VCdWNrZXQuZm9yRWFjaCgoYnVja2V0KSA9PiB7XG4gICAgICBpZiAoYnVja2V0ICYmIGJ1Y2tldC5sZW5ndGgpIHtcbiAgICAgICAgY291bnRTdGFydCArPSBidWNrZXQubGVuZ3RoO1xuICAgICAgICBjb3VudEZpbmFsKys7XG4gICAgICAgIGxldCB0ID0gQkFCWUxPTi5NZXNoLk1lcmdlTWVzaGVzKGJ1Y2tldCwgdHJ1ZSwgdHJ1ZSwgbnVsbCwgdHJ1ZSk7XG4gICAgICAgIC8vIHRoaXMuX3NoYWRkb3dzLmdldFNoYWRvd01hcCgpLnJlbmRlckxpc3QucHVzaCh0KTtcbiAgICAgIH1cbiAgICB9LCB0aGlzKTtcblxuICAgIGNvbnNvbGUubG9nKFwiVHJlZSBjb21wb25lbnQgY291bnQgYmVmb3JlIF9jb25zb2xpZGF0ZVRyZWVzOiAlY1wiICtcbiAgICAgICAgICAgICAgICBjb3VudFN0YXJ0LnRvU3RyaW5nKCksXG4gICAgICAgICAgICAgICAgXCJiYWNrZ3JvdW5kOiBvcmFuZ2U7IGNvbG9yOiB3aGl0ZVwiKTtcbiAgICBjb25zb2xlLmxvZyhcIk1lc2ggY291bnQgYWZ0ZXIgX2NvbnNvbGlkYXRlVHJlZXM6ICVjXCIgK1xuICAgICAgICAgICAgICAgIHRoaXMuX3NjZW5lLm1lc2hlcy5sZW5ndGgudG9TdHJpbmcoKSxcbiAgICAgICAgICAgICAgICBcImJhY2tncm91bmQ6IG9yYW5nZTsgY29sb3I6IHdoaXRlXCIpO1xuICAgIGNvbnNvbGUubG9nKFwiVHJlZSBjb21wb25lbnQgY291bnQgYWZ0ZXIgX2NvbnNvbGlkYXRlVHJlZXM6ICVjXCIgK1xuICAgICAgICAgICAgICAgIGNvdW50RmluYWwudG9TdHJpbmcoKSxcbiAgICAgICAgICAgICAgICBcImJhY2tncm91bmQ6IG9yYW5nZTsgY29sb3I6IHdoaXRlXCIpO1xuICB9XG5cbiAgX2NyZWF0ZVRyZWUoKSA6IEJBQllMT04uTWVzaCB7XG4gICAgaWYgKE1hdGgucmFuZG9tKCkgPiAwLjIpIHtcbiAgICAgIHJldHVybiB0aGlzLl9jcmVhdGVUcmVlRGVjaWR1b3VzKCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9jcmVhdGVUcmVlUGluZSgpO1xuICB9XG5cbiAgX2NyZWF0ZVRyZWVQaW5lKCkgOiBCQUJZTE9OLk1lc2gge1xuICAgIGxldCBjYW5vcGllcyA9IE1hdGgucm91bmQoTWF0aC5yYW5kb20oKSAqIDMpICsgNDtcbiAgICBsZXQgaGVpZ2h0ID0gTWF0aC5yb3VuZChNYXRoLnJhbmRvbSgpICogMjApICsgMjA7XG4gICAgbGV0IHdpZHRoID0gNTtcbiAgICBsZXQgdHJ1bmtNYXRlcmlhbCA9IG5ldyBCQUJZTE9OLlN0YW5kYXJkTWF0ZXJpYWwoXCJ0cnVua1wiLCB0aGlzLl9zY2VuZSk7XG4gICAgdHJ1bmtNYXRlcmlhbC5kaWZmdXNlQ29sb3IgPSBuZXcgQkFCWUxPTi5Db2xvcjMoMC4zICsgTWF0aC5yYW5kb20oKSAqIDAuMixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAwLjIgKyBNYXRoLnJhbmRvbSgpICogMC4yLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDAuMiArIE1hdGgucmFuZG9tKCkgKiAwLjEpO1xuICAgIHRydW5rTWF0ZXJpYWwuc3BlY3VsYXJDb2xvciA9IEJBQllMT04uQ29sb3IzLkJsYWNrKCk7XG4gICAgbGV0IGxlYWZNYXRlcmlhbCA9IG5ldyBCQUJZTE9OLlN0YW5kYXJkTWF0ZXJpYWwoXCJsZWFmXCIsIHRoaXMuX3NjZW5lKTtcbiAgICBsZWFmTWF0ZXJpYWwuZGlmZnVzZUNvbG9yID0gbmV3IEJBQllMT04uQ29sb3IzKDAuNCArIE1hdGgucmFuZG9tKCkgKiAwLjIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAwLjUgKyBNYXRoLnJhbmRvbSgpICogMC40LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgMC4yICsgTWF0aC5yYW5kb20oKSAqIDAuMik7XG4gICAgbGVhZk1hdGVyaWFsLnNwZWN1bGFyQ29sb3IgPSBCQUJZTE9OLkNvbG9yMy5SZWQoKTtcblxuICAgIGxldCB0cmVlID0gUGluZUdlbmVyYXRvcihcbiAgICAgIGNhbm9waWVzLCBoZWlnaHQsIHdpZHRoLCB0cnVua01hdGVyaWFsLCBsZWFmTWF0ZXJpYWwsIHRoaXMuX3NjZW5lKTtcbiAgICB0cmVlLnNldEVuYWJsZWQoZmFsc2UpO1xuICAgIHRyZWUubmFtZSArPSBcIl9cIiArIHRoaXMuX3RyZWVTcGVjaWVzO1xuICAgIHRoaXMuX3RyZWVTcGVjaWVzKys7XG4gICAgcmV0dXJuIHRyZWU7XG4gIH1cblxuICBfY3JlYXRlVHJlZURlY2lkdW91cygpIDogQkFCWUxPTi5NZXNoIHtcbiAgICBsZXQgc2l6ZUJyYW5jaCA9IDE1ICsgTWF0aC5yYW5kb20oKSAqIDU7XG4gICAgbGV0IHNpemVUcnVuayA9IDEwICsgTWF0aC5yYW5kb20oKSAqIDU7XG4gICAgbGV0IHJhZGl1cyA9IDEgKyBNYXRoLnJhbmRvbSgpICogNDtcbiAgICBsZXQgdHJ1bmtNYXRlcmlhbCA9IG5ldyBCQUJZTE9OLlN0YW5kYXJkTWF0ZXJpYWwoXCJ0cnVua1wiLCB0aGlzLl9zY2VuZSk7XG4gICAgdHJ1bmtNYXRlcmlhbC5kaWZmdXNlQ29sb3IgPSBuZXcgQkFCWUxPTi5Db2xvcjMoMC4zICsgTWF0aC5yYW5kb20oKSAqIDAuMyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAwLjIgKyBNYXRoLnJhbmRvbSgpICogMC4zLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDAuMiArIE1hdGgucmFuZG9tKCkgKiAwLjIpO1xuICAgIHRydW5rTWF0ZXJpYWwuc3BlY3VsYXJDb2xvciA9IEJBQllMT04uQ29sb3IzLkJsYWNrKCk7XG4gICAgbGV0IGxlYWZNYXRlcmlhbCA9IG5ldyBCQUJZTE9OLlN0YW5kYXJkTWF0ZXJpYWwoXCJsZWFmXCIsIHRoaXMuX3NjZW5lKTtcbiAgICBsZWFmTWF0ZXJpYWwuZGlmZnVzZUNvbG9yID0gbmV3IEJBQllMT04uQ29sb3IzKDAuNCArIE1hdGgucmFuZG9tKCkgKiAwLjIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAwLjUgKyBNYXRoLnJhbmRvbSgpICogMC40LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgMC4yICsgTWF0aC5yYW5kb20oKSAqIDAuMik7XG4gICAgbGVhZk1hdGVyaWFsLnNwZWN1bGFyQ29sb3IgPSBCQUJZTE9OLkNvbG9yMy5SZWQoKTtcbiAgICBsZXQgdHJlZSA9IFF1aWNrVHJlZUdlbmVyYXRvcihcbiAgICAgIHNpemVCcmFuY2gsIHNpemVUcnVuaywgcmFkaXVzLCB0cnVua01hdGVyaWFsLCBsZWFmTWF0ZXJpYWwsIHRoaXMuX3NjZW5lKTtcbiAgICB0cmVlLnNldEVuYWJsZWQoZmFsc2UpO1xuICAgIHRyZWUubmFtZSArPSBcIl9cIiArIHRoaXMuX3RyZWVTcGVjaWVzO1xuICAgIHRoaXMuX3RyZWVTcGVjaWVzKys7XG4gICAgcmV0dXJuIHRyZWU7XG4gIH1cblxuICBfY3JlYXRlU2hydWIoZm9yY2VTYXBsaW5nPzogYm9vbGVhbikgOiBCQUJZTE9OLk1lc2gge1xuICAgIGlmIChNYXRoLnJhbmRvbSgpIDwgMC4xIHx8IGZvcmNlU2FwbGluZykge1xuICAgICAgbGV0IHNhcGxpbmcgPSB0aGlzLl9jcmVhdGVUcmVlKCk7XG4gICAgICBzYXBsaW5nLnNjYWxpbmcueCAqPSAwLjI7XG4gICAgICBzYXBsaW5nLnNjYWxpbmcueSAqPSAwLjI7XG4gICAgICBzYXBsaW5nLnNjYWxpbmcueiAqPSAwLjI7XG4gICAgICByZXR1cm4gc2FwbGluZztcbiAgICB9XG4gICAgbGV0IHNpemVCcmFuY2ggPSAxMCArIE1hdGgucmFuZG9tKCkgKiAyMDtcbiAgICBsZXQgbGVhZk1hdGVyaWFsID0gbmV3IEJBQllMT04uU3RhbmRhcmRNYXRlcmlhbChcImxlYWZcIiwgdGhpcy5fc2NlbmUpO1xuICAgIGxlYWZNYXRlcmlhbC5kaWZmdXNlQ29sb3IgPSBuZXcgQkFCWUxPTi5Db2xvcjMoMC40ICsgTWF0aC5yYW5kb20oKSAqIDAuMixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDAuNSArIE1hdGgucmFuZG9tKCkgKiAwLjQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAwLjIgKyBNYXRoLnJhbmRvbSgpICogMC4yKTtcbiAgICBsZWFmTWF0ZXJpYWwuc3BlY3VsYXJDb2xvciA9IEJBQllMT04uQ29sb3IzLkdyYXkoKTtcbiAgICBsZXQgdHJlZSA9IFF1aWNrU2hydWIoc2l6ZUJyYW5jaCwgbGVhZk1hdGVyaWFsLCB0aGlzLl9zY2VuZSk7XG4gICAgdHJlZS5zZXRFbmFibGVkKGZhbHNlKTtcbiAgICB0cmVlLm5hbWUgKz0gXCJfXCIgKyB0aGlzLl90cmVlU3BlY2llcztcbiAgICB0aGlzLl90cmVlU3BlY2llcysrO1xuICAgIHJldHVybiB0cmVlO1xuICB9XG5cbiAgX2NyZWF0ZUdyb3VuZENvdmVyKCkgOiBCQUJZTE9OLlN0YW5kYXJkTWF0ZXJpYWwge1xuICAgIGxldCBmbG93ZXJzID0gW1xuICAgICAgXCJncmVlbmVyeTEucG5nXCIsXG4gICAgICBcImdyZWVuZXJ5Mi5wbmdcIixcbiAgICAgIFwiZ3JlZW5lcnkzLnBuZ1wiLFxuICAgICAgXCJncmVlbmVyeTQucG5nXCIsXG4gICAgICBcImdyZWVuZXJ5NS5wbmdcIixcbiAgICAgIFwiZ3JlZW5lcnk2LnBuZ1wiLFxuICAgICAgXCJncmVlbmVyeTcucG5nXCIsXG4gICAgICBcImdyZWVuZXJ5OC5wbmdcIixcbiAgICBdO1xuICAgIGxldCBpbWFnZSA9IHRoaXMuX2dyb3VuZENvdmVyVHlwZXMubGVuZ3RoO1xuXG4gICAgbGV0IGRlY2FsTWF0ZXJpYWwgPSBuZXcgQkFCWUxPTi5TdGFuZGFyZE1hdGVyaWFsKGZsb3dlcnNbaW1hZ2VdLCB0aGlzLl9zY2VuZSk7XG4gICAgZGVjYWxNYXRlcmlhbC5kaWZmdXNlVGV4dHVyZSA9IG5ldyBCQUJZTE9OLlRleHR1cmUoXG4gICAgICBcInRleHR1cmVzL2dyb3VuZGNvdmVyL1wiICsgZmxvd2Vyc1tpbWFnZV0sIHRoaXMuX3NjZW5lKTtcbiAgICBkZWNhbE1hdGVyaWFsLmRpZmZ1c2VUZXh0dXJlLmhhc0FscGhhID0gdHJ1ZTtcbiAgICBkZWNhbE1hdGVyaWFsLnpPZmZzZXQgPSAtTWF0aC5yb3VuZCh0aGlzLl9ncm91bmRDb3ZlclR5cGVzLmxlbmd0aCAvIDIgKyAxKTtcbiAgICBkZWNhbE1hdGVyaWFsLnNwZWN1bGFyQ29sb3IgPSBuZXcgQkFCWUxPTi5Db2xvcjMoMCwgMCwgMCk7XG4gICAgICBkZWNhbE1hdGVyaWFsLmRpc2FibGVEZXB0aFdyaXRlID0gZmFsc2U7XG4gICAgICBkZWNhbE1hdGVyaWFsLmZvcmNlRGVwdGhXcml0ZSA9IHRydWU7XG5cbiAgICByZXR1cm4gZGVjYWxNYXRlcmlhbDtcbiAgfVxuXG4gIF9hcHBseUdyb3VuZENvdmVyKHg6IG51bWJlciwgeTogbnVtYmVyKSA6IHZvaWQge1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgTWF0aC5yYW5kb20oKSAqIDM7IGkrKykge1xuICAgICAgbGV0IGRlY2FsU2NhbGUgPSAyMCArIE1hdGgucmFuZG9tKCkgKiA0MDtcbiAgICAgIGxldCBkZWNhbFNpemUgPSBCQUJZTE9OLlZlY3RvcjMuT25lKCkuc2NhbGUoZGVjYWxTY2FsZSk7XG4gICAgICBsZXQgZGVjYWxSb3RhdGUgPSBNYXRoLlBJICogMiAqIE1hdGgucmFuZG9tKCk7XG4gICAgICBsZXQgbmV3RGVjYWwgPSBCQUJZTE9OLk1lc2hCdWlsZGVyLkNyZWF0ZURlY2FsKFxuICAgICAgICBcImdyb3VuZENvdmVyX1wiICsgeCArIFwiX1wiICsgeSxcbiAgICAgICAgdGhpcy5fZ3JvdW5kLFxuICAgICAgICB7XG4gICAgICAgICAgcG9zaXRpb246IG5ldyBCQUJZTE9OLlZlY3RvcjMoeCwgMCwgeSksXG4gICAgICAgICBub3JtYWw6IG5ldyBCQUJZTE9OLlZlY3RvcjMoMCwgMSwgMCksXG4gICAgICAgICBzaXplOiBkZWNhbFNpemUsXG4gICAgICAgICBhbmdsZTogZGVjYWxSb3RhdGVcbiAgICAgICAgfSk7XG5cbiAgICAgIGxldCBtYXRlcmlhbEluZGV4ID0gTWF0aC5yb3VuZChNYXRoLnJhbmRvbSgpICogKHRoaXMuX2dyb3VuZENvdmVyVHlwZXMubGVuZ3RoIC0gMSkpO1xuICAgICAgbGV0IHByb3Bvc2VkTWF0ZXJpYWwgPSB0aGlzLl9ncm91bmRDb3ZlclR5cGVzW21hdGVyaWFsSW5kZXhdO1xuICAgICAgbGV0IGRlY2FsSGVpZ2h0ID0gcHJvcG9zZWRNYXRlcmlhbC56T2Zmc2V0O1xuXG4gICAgICAvLyBDaGVjayB0aGUgcHJvcG9zZWQgbWF0ZXJpYWwgZG9lcyBub3QgY2xhc2ggd2l0aCBhbiBvdmVybGFwcGluZyBtYXRlcmlhbFxuICAgICAgLy8gYXQgdGhlIHNhbWUgek9mZnNldC5cbiAgICAgIGxldCBub0NvbmZsaWN0ID0gdHJ1ZTtcbiAgICAgIGZvciAobGV0IGRlY2FsQ292ZXJYID0geCAtIE1hdGgucm91bmQoZGVjYWxTY2FsZSAvIDIpO1xuICAgICAgICAgIGRlY2FsQ292ZXJYIDwgeCArIE1hdGgucm91bmQoZGVjYWxTY2FsZSAvIDIpICYmIG5vQ29uZmxpY3Q7XG4gICAgICAgICAgZGVjYWxDb3ZlclgrKykge1xuICAgICAgICBmb3IgKGxldCBkZWNhbENvdmVyWSA9IHkgLSBNYXRoLnJvdW5kKGRlY2FsU2NhbGUgLyAyKTtcbiAgICAgICAgICAgIGRlY2FsQ292ZXJZIDwgeSArIE1hdGgucm91bmQoZGVjYWxTY2FsZSAvIDIpO1xuICAgICAgICAgICAgZGVjYWxDb3ZlclkrKykge1xuICAgICAgICAgIGxldCBrZXkgPSBcIlwiICsgZGVjYWxDb3ZlclggKyBcIl9cIiArIGRlY2FsQ292ZXJZICsgXCJfXCIgKyBkZWNhbEhlaWdodDtcbiAgICAgICAgICBpZiAodGhpcy5fZ3JvdW5kQ292ZXJba2V5XSkge1xuICAgICAgICAgICAgLy8gQWxyZWFkeSBleGlzdHMuXG4gICAgICAgICAgICBub0NvbmZsaWN0ID0gZmFsc2U7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKG5vQ29uZmxpY3QpIHtcbiAgICAgICAgbmV3RGVjYWwubWF0ZXJpYWwgPSBwcm9wb3NlZE1hdGVyaWFsO1xuICAgICAgICAvLyBTZXQgYSByZWNvcmQgb2Ygd2hlcmUgdGhpcyBkZWNhbCBjb3ZlcnMgYW5kIGF0IHdoYXQgek9mZnNldC5cbiAgICAgICAgZm9yIChsZXQgZGVjYWxDb3ZlclggPSB4IC0gTWF0aC5yb3VuZChkZWNhbFNjYWxlIC8gMik7XG4gICAgICAgICAgICBkZWNhbENvdmVyWCA8IHggKyBNYXRoLnJvdW5kKGRlY2FsU2NhbGUgLyAyKSAmJiBub0NvbmZsaWN0O1xuICAgICAgICAgICAgZGVjYWxDb3ZlclgrKykge1xuICAgICAgICAgIGZvciAobGV0IGRlY2FsQ292ZXJZID0geSAtIE1hdGgucm91bmQoZGVjYWxTY2FsZSAvIDIpO1xuICAgICAgICAgICAgICBkZWNhbENvdmVyWSA8IHkgKyBNYXRoLnJvdW5kKGRlY2FsU2NhbGUgLyAyKTtcbiAgICAgICAgICAgICAgZGVjYWxDb3ZlclkrKykge1xuICAgICAgICAgICAgbGV0IGtleSA9IFwiXCIgKyBkZWNhbENvdmVyWCArIFwiX1wiICsgZGVjYWxDb3ZlclkgKyBcIl9cIiArIGRlY2FsSGVpZ2h0O1xuICAgICAgICAgICAgdGhpcy5fZ3JvdW5kQ292ZXJba2V5XSA9IHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBuZXdEZWNhbC5kaXNwb3NlKCk7XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbmludGVyZmFjZSBDYW1lcmFEZXNjcmlwdGlvbiB7XG4gIG5hbWU6IHN0cmluZztcbiAgY2FtZXJhOiBCQUJZTE9OLkNhbWVyYTtcbn1cblxuY2xhc3MgQ2FtZXJhIHtcbiAgcHJpdmF0ZSBfY2FudmFzOiBIVE1MQ2FudmFzRWxlbWVudDtcbiAgcHJpdmF0ZSBfc2NlbmU6IEJBQllMT04uU2NlbmU7XG4gIHByaXZhdGUgX2NhbWVyYUFyYzogQkFCWUxPTi5BcmNSb3RhdGVDYW1lcmE7XG4gIHByaXZhdGUgX2NhbWVyYVVuaXZlcnNhbDogQkFCWUxPTi5Vbml2ZXJzYWxDYW1lcmE7XG4gIHByaXZhdGUgX2NhbWVyYUZvbGxvdzogQkFCWUxPTi5Gb2xsb3dDYW1lcmE7XG4gIC8vcHJpdmF0ZSBfc2VsZWN0ZWRBY3RvcjogMDtcbiAgcHJpdmF0ZSBfdGFyZ2V0OiBCQUJZTE9OLk1lc2g7XG5cbiAgcmVhZG9ubHkgY2FtZXJhczogQ2FtZXJhRGVzY3JpcHRpb25bXTtcblxuICBjb25zdHJ1Y3RvcihjYW52YXM6IEhUTUxDYW52YXNFbGVtZW50LCBzY2VuZTogQkFCWUxPTi5TY2VuZSwgYWN0b3JzOiBDaGFyYWN0ZXJbXSkge1xuICAgIHRoaXMuX2NhbnZhcyA9IGNhbnZhcztcbiAgICB0aGlzLl9zY2VuZSA9IHNjZW5lO1xuICAgIHRoaXMuY2FtZXJhcyA9IFtdO1xuXG4gICAgdGhpcy5fdGFyZ2V0ID0gQkFCWUxPTi5NZXNoQnVpbGRlci5DcmVhdGVTcGhlcmUoXG4gICAgICBcInRhcmdldENhbWVyYVwiLCB7ZGlhbWV0ZXJYOiAwLjEsIGRpYW1ldGVyWTogMC4xLCBkaWFtZXRlclo6IDAuMX0sIHRoaXMuX3NjZW5lKTtcbiAgICB0aGlzLl90YXJnZXQucG9zaXRpb24gPSBuZXcgQkFCWUxPTi5WZWN0b3IzKDEwMCwgNDAsIDEwMCk7XG5cbiAgICB0aGlzLl9jYW1lcmFBcmMgPSBuZXcgQkFCWUxPTi5BcmNSb3RhdGVDYW1lcmEoXG4gICAgICBcIkFyY1JvdGF0ZUNhbWVyYVwiLCAwLCAwLCAyLCBuZXcgQkFCWUxPTi5WZWN0b3IzKDAsIDMwLCAwKSwgdGhpcy5fc2NlbmUpO1xuICAgIHRoaXMuX2NhbWVyYUFyYy5zZXRQb3NpdGlvbihuZXcgQkFCWUxPTi5WZWN0b3IzKDUsIDE3LCAzMCkpO1xuICAgIHRoaXMuX2NhbWVyYUFyYy5taW5aID0gMC41O1xuICAgIHRoaXMuX2NhbWVyYUFyYy5tYXhaID0gODAwO1xuICAgIHRoaXMuX2NhbWVyYUFyYy5sb3dlckJldGFMaW1pdCA9IDAuMTtcbiAgICB0aGlzLl9jYW1lcmFBcmMudXBwZXJCZXRhTGltaXQgPSAoTWF0aC5QSSAvIDIpIC0gMC4xO1xuICAgIHRoaXMuX2NhbWVyYUFyYy5sb3dlclJhZGl1c0xpbWl0ID0gMjtcbiAgICB0aGlzLl9jYW1lcmFBcmMuYXR0YWNoQ29udHJvbCh0aGlzLl9jYW52YXMsIHRydWUsIGZhbHNlKTtcbiAgICB0aGlzLl9jYW1lcmFBcmMuc2V0VGFyZ2V0KHRoaXMuX3RhcmdldC5wb3NpdGlvbik7XG4gICAgdGhpcy5fc2NlbmUuYWN0aXZlQ2FtZXJhID0gdGhpcy5fY2FtZXJhQXJjO1xuICAgIHRoaXMuY2FtZXJhcy5wdXNoKHtcIm5hbWVcIjogXCJBcmNSb3RhdGVcIiwgXCJjYW1lcmFcIjogdGhpcy5fY2FtZXJhQXJjfSk7XG5cbiAgICB0aGlzLl9jYW1lcmFVbml2ZXJzYWwgPSBuZXcgQkFCWUxPTi5Vbml2ZXJzYWxDYW1lcmEoXG4gICAgICBcIlVuaXZlcnNhbENhbWVyYVwiLCBuZXcgQkFCWUxPTi5WZWN0b3IzKDAsIDAsIC0gMTApLCB0aGlzLl9zY2VuZSk7XG4gICAgdGhpcy5fY2FtZXJhVW5pdmVyc2FsLnNldFRhcmdldCh0aGlzLl90YXJnZXQucG9zaXRpb24pO1xuICAgIHRoaXMuY2FtZXJhcy5wdXNoKHtcIm5hbWVcIjogXCJVbml2ZXJzYWxcIiwgXCJjYW1lcmFcIjogdGhpcy5fY2FtZXJhVW5pdmVyc2FsfSk7XG5cbiAgICB0aGlzLl9jYW1lcmFGb2xsb3cgPSBuZXcgQkFCWUxPTi5Gb2xsb3dDYW1lcmEoXG4gICAgICBcIkZvbGxvd0NhbWVyYVwiLCBuZXcgQkFCWUxPTi5WZWN0b3IzKDAsIDEsIC0gMTApLCB0aGlzLl9zY2VuZSk7XG4gICAgdGhpcy5fY2FtZXJhRm9sbG93LnJhZGl1cyA9IDEwO1xuICAgIHRoaXMuX2NhbWVyYUZvbGxvdy5oZWlnaHRPZmZzZXQgPSAxO1xuICAgIHRoaXMuX2NhbWVyYUZvbGxvdy5yb3RhdGlvbk9mZnNldCA9IDE4MCAvIDQ7XG4gICAgdGhpcy5fY2FtZXJhRm9sbG93LmNhbWVyYUFjY2VsZXJhdGlvbiA9IDAuMDI7XG4gICAgdGhpcy5fY2FtZXJhRm9sbG93Lm1heENhbWVyYVNwZWVkID0gMjA7XG4gICAgdGhpcy5fY2FtZXJhRm9sbG93LmF0dGFjaENvbnRyb2wodGhpcy5fY2FudmFzLCB0cnVlKTtcbiAgICB0aGlzLl9jYW1lcmFGb2xsb3cubG9ja2VkVGFyZ2V0ID0gdGhpcy5fdGFyZ2V0O1xuICAgIC8vdGhpcy5fY2FtZXJhRm9sbG93Lmxvd2VyUmFkaXVzTGltaXQgPSAzO1xuICAgIC8vdGhpcy5fY2FtZXJhRm9sbG93Lmxvd2VySGVpZ2h0T2Zmc2V0TGltaXQgPSAxO1xuICAgIHRoaXMuY2FtZXJhcy5wdXNoKHtcIm5hbWVcIjogXCJGb2xsb3dcIiwgXCJjYW1lcmFcIjogdGhpcy5fY2FtZXJhRm9sbG93fSk7XG5cbiAgICB0aGlzLl9zY2VuZS5vbkJlZm9yZVJlbmRlck9ic2VydmFibGUuYWRkKCgpID0+IHtcbiAgICAgIGlmICh0aGlzLl9jYW1lcmFBcmMuZ2V0VGFyZ2V0KCkgIT0gdGhpcy5fdGFyZ2V0LnBvc2l0aW9uKSB7XG4gICAgICAgIHRoaXMuX2NhbWVyYUFyYy5zZXRUYXJnZXQodGhpcy5fdGFyZ2V0LnBvc2l0aW9uKTtcbiAgICAgIH1cbiAgICAgIC8vdGhpcy5fY2FtZXJhQXJjLnJlYnVpbGRBbmdsZXNBbmRSYWRpdXMoKTtcbiAgICB9KTtcbiAgfVxuXG4gIHNldFRhcmdldCh0YXJnZXRQb3NpdGlvbjogQkFCWUxPTi5WZWN0b3IzKSB7XG4gICAgLy90aGlzLl9jYW1lcmFBcmMuc2V0VGFyZ2V0KHRhcmdldFBvc2l0aW9uKTtcbiAgICAvL3RoaXMuX2NhbWVyYVVuaXZlcnNhbC5zZXRUYXJnZXQodGFyZ2V0UG9zaXRpb24pO1xuXG4gICAgbGV0IGFuaW1hdGlvbiA9IG5ldyBCQUJZTE9OLkFuaW1hdGlvbihcbiAgICAgIFwiY2FtZXJhVGFyZ2V0RWFzZVwiLFxuICAgICAgXCJwb3NpdGlvblwiLFxuICAgICAgMzAsXG4gICAgICBCQUJZTE9OLkFuaW1hdGlvbi5BTklNQVRJT05UWVBFX1ZFQ1RPUjMsXG4gICAgICBCQUJZTE9OLkFuaW1hdGlvbi5BTklNQVRJT05MT09QTU9ERV9DWUNMRSk7XG5cbiAgICAvLyBBbmltYXRpb24ga2V5c1xuICAgIHZhciBrZXlzID0gW107XG4gICAga2V5cy5wdXNoKHsgZnJhbWU6IDAsIHZhbHVlOiB0aGlzLl90YXJnZXQucG9zaXRpb24gfSk7XG4gICAga2V5cy5wdXNoKHsgZnJhbWU6IDEyMCwgdmFsdWU6IHRhcmdldFBvc2l0aW9uIH0pO1xuICAgIGFuaW1hdGlvbi5zZXRLZXlzKGtleXMpO1xuXG4gICAgdmFyIGVhc2luZ0Z1bmN0aW9uID0gbmV3IEJBQllMT04uQ2lyY2xlRWFzZSgpO1xuICAgIGVhc2luZ0Z1bmN0aW9uLnNldEVhc2luZ01vZGUoQkFCWUxPTi5FYXNpbmdGdW5jdGlvbi5FQVNJTkdNT0RFX0VBU0VJTk9VVCk7XG4gICAgYW5pbWF0aW9uLnNldEVhc2luZ0Z1bmN0aW9uKGVhc2luZ0Z1bmN0aW9uKTtcbiAgICB0aGlzLl90YXJnZXQuYW5pbWF0aW9ucy5wdXNoKGFuaW1hdGlvbik7XG4gICAgdGhpcy5fc2NlbmUuYmVnaW5BbmltYXRpb24odGhpcy5fdGFyZ2V0LCAwLCAxMjAsIGZhbHNlKTtcblxuICB9XG5cbiAgc2V0RW5hYmxlZChjYW1lcmE6IENhbWVyYURlc2NyaXB0aW9uKTogdm9pZCB7XG4gICAgY29uc29sZS5sb2coY2FtZXJhLCB0aGlzLl9zY2VuZS5hY3RpdmVDYW1lcmEubmFtZSk7XG4gICAgaWYgKHRoaXMuX3NjZW5lLmFjdGl2ZUNhbWVyYS5uYW1lID09IFwiVW5pdmVyc2FsQ2FtZXJhXCIpIHtcbiAgICAgIC8vIE1vdmUgdGhlIGNhbWVyYSB0YXJnZXQgaW4gZnJvbnQgb2Ygb2xkIGNhbWVyYSB0byBhbGxvdyBmb3IgYW5pbWF0aW9uIHRvXG4gICAgICAvLyBuZXcgY2FtZXJhIG9yaWVudGF0aW9uLlxuICAgICAgbGV0IGRpc3RhbmNlID0gQkFCWUxPTi5WZWN0b3IzLkRpc3RhbmNlKFxuICAgICAgICB0aGlzLl9jYW1lcmFVbml2ZXJzYWwucG9zaXRpb24sIHRoaXMuX2NhbWVyYUFyYy50YXJnZXQpO1xuICAgICAgdGhpcy5fdGFyZ2V0LnBvc2l0aW9uID0gdGhpcy5fY2FtZXJhVW5pdmVyc2FsLmdldEZyb250UG9zaXRpb24oZGlzdGFuY2UpO1xuICAgICAgdGhpcy5zZXRUYXJnZXQobmV3IEJBQllMT04uVmVjdG9yMygwLCAwLCAwKSk7XG4gICAgfVxuICAgIHRoaXMuX2NhbWVyYUFyYy5kZXRhY2hDb250cm9sKHRoaXMuX2NhbnZhcyk7XG4gICAgdGhpcy5fY2FtZXJhVW5pdmVyc2FsLmRldGFjaENvbnRyb2wodGhpcy5fY2FudmFzKTtcbiAgICB0aGlzLl9jYW1lcmFGb2xsb3cuZGV0YWNoQ29udHJvbCh0aGlzLl9jYW52YXMpO1xuXG4gICAgLy8gU2V0IHRoZSBuZXcgY2FtZXJhLlxuICAgIGlmIChjYW1lcmEubmFtZSA9PT0gXCJBcmNSb3RhdGVcIikge1xuICAgICAgdGhpcy5fY2FtZXJhQXJjLnNldFBvc2l0aW9uKHRoaXMuX3NjZW5lLmFjdGl2ZUNhbWVyYS5wb3NpdGlvbik7XG4gICAgICB0aGlzLl9jYW1lcmFBcmMucmVidWlsZEFuZ2xlc0FuZFJhZGl1cygpO1xuICAgICAgdGhpcy5fY2FtZXJhQXJjLmF0dGFjaENvbnRyb2wodGhpcy5fY2FudmFzLCB0cnVlLCBmYWxzZSk7XG4gICAgICB0aGlzLl9zY2VuZS5hY3RpdmVDYW1lcmEgPSB0aGlzLl9jYW1lcmFBcmM7XG4gICAgfSBlbHNlIGlmIChjYW1lcmEubmFtZSA9PT0gXCJVbml2ZXJzYWxcIikge1xuICAgICAgdGhpcy5fY2FtZXJhVW5pdmVyc2FsLmF0dGFjaENvbnRyb2wodGhpcy5fY2FudmFzLCB0cnVlKTtcbiAgICAgIHRoaXMuX2NhbWVyYVVuaXZlcnNhbC5wb3NpdGlvbiA9IHRoaXMuX3NjZW5lLmFjdGl2ZUNhbWVyYS5wb3NpdGlvbjtcbiAgICAgIHRoaXMuX2NhbWVyYVVuaXZlcnNhbC5zZXRUYXJnZXQodGhpcy5fdGFyZ2V0LnBvc2l0aW9uKTtcbiAgICAgIHRoaXMuX3NjZW5lLmFjdGl2ZUNhbWVyYSA9IHRoaXMuX2NhbWVyYVVuaXZlcnNhbDtcbiAgICB9IGVsc2UgaWYgKGNhbWVyYS5uYW1lID09PSBcIkZvbGxvd1wiKSB7XG4gICAgICB0aGlzLl9jYW1lcmFGb2xsb3cucG9zaXRpb24gPSB0aGlzLl9zY2VuZS5hY3RpdmVDYW1lcmEucG9zaXRpb247XG4gICAgICB0aGlzLl9zY2VuZS5hY3RpdmVDYW1lcmEgPSB0aGlzLl9jYW1lcmFGb2xsb3c7XG5cbiAgICAgIHRoaXMuX2NhbWVyYUZvbGxvdy5pbnB1dHMuYXR0YWNoSW5wdXQoXG4gICAgICAgIHRoaXMuX2NhbWVyYUZvbGxvdy5pbnB1dHMuYXR0YWNoZWQuRm9sbG93Q2FtZXJhQ29udHJvbHMpO1xuICAgICAgdGhpcy5fY2FtZXJhRm9sbG93LmF0dGFjaENvbnRyb2wodGhpcy5fY2FudmFzLCB0cnVlKTtcbiAgICAgIGNvbnNvbGUubG9nKHRoaXMuX2NhbWVyYUZvbGxvdy5pbnB1dHMpO1xuICAgIH1cbiAgfVxufVxuXG5jbGFzcyBHYW1lIHtcbiAgcHJpdmF0ZSBfY2FudmFzOiBIVE1MQ2FudmFzRWxlbWVudDtcbiAgcHJpdmF0ZSBfZW5naW5lOiBCQUJZTE9OLkVuZ2luZTtcbiAgcHJpdmF0ZSBfc2NlbmU6IEJBQllMT04uU2NlbmU7XG4gIHByaXZhdGUgX2xpZ2h0OiBCQUJZTE9OLkRpcmVjdGlvbmFsTGlnaHQ7XG4gIHByaXZhdGUgX3NreWJveDogQkFCWUxPTi5NZXNoO1xuICBwcml2YXRlIF9hY3RvcnM6IENoYXJhY3RlcltdO1xuICBwcml2YXRlIF9jYW1lcmE6IENhbWVyYTtcblxuICBjb25zdHJ1Y3RvcihjYW52YXNFbGVtZW50IDogc3RyaW5nKSB7XG4gICAgLy8gQ3JlYXRlIGNhbnZhcyBhbmQgZW5naW5lLlxuICAgIHRoaXMuX2NhbnZhcyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGNhbnZhc0VsZW1lbnQpIGFzIEhUTUxDYW52YXNFbGVtZW50O1xuICAgIHRoaXMuX2VuZ2luZSA9IG5ldyBCQUJZTE9OLkVuZ2luZSh0aGlzLl9jYW52YXMsIHRydWUpO1xuICAgIHRoaXMuX2FjdG9ycyA9IFtdO1xuICB9XG5cbiAgY3JlYXRlU2NlbmUoKSA6IHZvaWQge1xuICAgIEJBQllMT04uU2NlbmVMb2FkZXIuQ2xlYW5Cb25lTWF0cml4V2VpZ2h0cyA9IHRydWU7XG4gICAgdGhpcy5fc2NlbmUgPSBuZXcgQkFCWUxPTi5TY2VuZSh0aGlzLl9lbmdpbmUpO1xuICAgIHRoaXMuX3NjZW5lLmFtYmllbnRDb2xvciA9IG5ldyBCQUJZTE9OLkNvbG9yMygwLjMsIDAuMywgMC4zKTtcblxuICAgIC8vIEZvZ1xuICAgIHRoaXMuX3NjZW5lLmZvZ01vZGUgPSBCQUJZTE9OLlNjZW5lLkZPR01PREVfRVhQMjtcbiAgICB0aGlzLl9zY2VuZS5mb2dDb2xvciA9IG5ldyBCQUJZTE9OLkNvbG9yMygwLjIsIDAuMiwgMC4yKTtcbiAgICB0aGlzLl9zY2VuZS5mb2dEZW5zaXR5ID0gMC4wMDM7XG5cbiAgICAvLyBTa3lib3hcbiAgICB0aGlzLl9za3lib3ggPSBCQUJZTE9OLk1lc2guQ3JlYXRlQm94KFwic2t5Qm94XCIsIDEwMDAuMCwgdGhpcy5fc2NlbmUpO1xuICAgIHRoaXMuX3NreWJveC5zY2FsaW5nLnkgPSAwLjEyNTtcbiAgICB2YXIgc2t5Ym94TWF0ZXJpYWwgPSBuZXcgQkFCWUxPTi5TdGFuZGFyZE1hdGVyaWFsKFwic2t5Qm94XCIsIHRoaXMuX3NjZW5lKTtcbiAgICBza3lib3hNYXRlcmlhbC5yZWZsZWN0aW9uVGV4dHVyZSA9IG5ldyBCQUJZTE9OLkN1YmVUZXh0dXJlKFwidGV4dHVyZXMvc2t5Ym94XCIsIHRoaXMuX3NjZW5lKTtcbiAgICBza3lib3hNYXRlcmlhbC5yZWZsZWN0aW9uVGV4dHVyZS5jb29yZGluYXRlc01vZGUgPSBCQUJZTE9OLlRleHR1cmUuU0tZQk9YX01PREU7XG4gICAgc2t5Ym94TWF0ZXJpYWwuZGlmZnVzZUNvbG9yID0gbmV3IEJBQllMT04uQ29sb3IzKDAsIDAsIDApO1xuICAgIHNreWJveE1hdGVyaWFsLnNwZWN1bGFyQ29sb3IgPSBuZXcgQkFCWUxPTi5Db2xvcjMoMCwgMCwgMCk7XG4gICAgc2t5Ym94TWF0ZXJpYWwuZGlzYWJsZUxpZ2h0aW5nID0gdHJ1ZTtcbiAgICBza3lib3hNYXRlcmlhbC5iYWNrRmFjZUN1bGxpbmcgPSBmYWxzZTtcbiAgICB0aGlzLl9za3lib3gubWF0ZXJpYWwgPSBza3lib3hNYXRlcmlhbDtcbiAgICB0aGlzLl9za3lib3guc2V0RW5hYmxlZChmYWxzZSk7XG5cbiAgICAvLyBMaWdodGluZ1xuICAgIHRoaXMuX2xpZ2h0ID0gbmV3IEJBQllMT04uRGlyZWN0aW9uYWxMaWdodChcbiAgICAgIFwiZGlyMDFcIiwgbmV3IEJBQllMT04uVmVjdG9yMygwLCAtMC41LCAtIDEuMCksIHRoaXMuX3NjZW5lKTtcbiAgICB0aGlzLl9saWdodC5wb3NpdGlvbiA9IG5ldyBCQUJZTE9OLlZlY3RvcjMoMjAsIDE1MCwgNzApO1xuICAgIGxldCBzdW4gPSBCQUJZTE9OLk1lc2hCdWlsZGVyLkNyZWF0ZVNwaGVyZShcInN1blwiLCB7fSwgdGhpcy5fc2NlbmUpO1xuICAgIHN1bi5wb3NpdGlvbiA9IHRoaXMuX2xpZ2h0LnBvc2l0aW9uO1xuXG4gICAgLy8gQ2FtZXJhXG4gICAgdGhpcy5fY2FtZXJhID0gbmV3IENhbWVyYSh0aGlzLl9jYW52YXMsIHRoaXMuX3NjZW5lLCB0aGlzLl9hY3RvcnMpO1xuXG4gICAgLy8gR3JvdW5kXG4gICAgbGV0IGdyb3VuZCA9IEJBQllMT04uTWVzaC5DcmVhdGVHcm91bmQoXCJncm91bmRcIiwgMTAwMCwgMTAwMCwgMSwgdGhpcy5fc2NlbmUsIGZhbHNlKTtcbiAgICBsZXQgZ3JvdW5kTWF0ZXJpYWwgPSBuZXcgQkFCWUxPTi5TdGFuZGFyZE1hdGVyaWFsKFwiZ3JvdW5kXCIsIHRoaXMuX3NjZW5lKTtcbiAgICBncm91bmRNYXRlcmlhbC5kaWZmdXNlVGV4dHVyZSA9IG5ldyBCQUJZTE9OLlRleHR1cmUoXCJ0ZXh0dXJlcy9ncmFzcy5wbmdcIiwgdGhpcy5fc2NlbmUpO1xuICAgICg8QkFCWUxPTi5UZXh0dXJlPmdyb3VuZE1hdGVyaWFsLmRpZmZ1c2VUZXh0dXJlKS51U2NhbGUgPSA2NDtcbiAgICAoPEJBQllMT04uVGV4dHVyZT5ncm91bmRNYXRlcmlhbC5kaWZmdXNlVGV4dHVyZSkudlNjYWxlID0gNjQ7XG4gICAgZ3JvdW5kTWF0ZXJpYWwuZGlmZnVzZUNvbG9yID0gbmV3IEJBQllMT04uQ29sb3IzKDAuNCwgMC40LCAwLjQpO1xuICAgIGdyb3VuZE1hdGVyaWFsLnNwZWN1bGFyQ29sb3IgPSBuZXcgQkFCWUxPTi5Db2xvcjMoMCwgMCwgMCk7XG4gICAgZ3JvdW5kLm1hdGVyaWFsID0gZ3JvdW5kTWF0ZXJpYWw7XG4gICAgZ3JvdW5kLnJlY2VpdmVTaGFkb3dzID0gdHJ1ZTtcblxuICAgIC8vIFNoYWRvd3NcbiAgICBsZXQgc2hhZG93R2VuZXJhdG9yID0gbmV3IEJBQllMT04uU2hhZG93R2VuZXJhdG9yKDEwMjQsIHRoaXMuX2xpZ2h0KTtcblxuICAgIC8vIFNjZW5lcnlcbiAgICBsZXQgc2NlbmVyeSA9IG5ldyBTY2VuZXJ5KHRoaXMuX3NjZW5lLCBzaGFkb3dHZW5lcmF0b3IsIGdyb3VuZCwgMjU2KTtcbiAgICBzY2VuZXJ5LmNhbGN1bGF0ZVBhdGgoe1wieFwiOiAyNTUsIFwieVwiOiAyNTV9LCB7XCJ4XCI6IDAsIFwieVwiOiAwfSk7XG5cbiAgICB0aGlzLl9zY2VuZS5vblBvaW50ZXJEb3duID0gZnVuY3Rpb24oZXZ0LCBwaWNrUmVzdWx0KSB7XG4gICAgICAgIC8vIGlmIHRoZSBjbGljayBoaXRzIHRoZSBncm91bmQgb2JqZWN0LCB3ZSBjaGFuZ2UgdGhlIGltcGFjdCBwb3NpdGlvblxuICAgICAgICBpZiAocGlja1Jlc3VsdC5oaXQpIHtcbiAgICAgICAgICAgIHRhcmdldEhlYWQucG9zaXRpb24ueCA9IHBpY2tSZXN1bHQucGlja2VkUG9pbnQueDtcbiAgICAgICAgICAgIHRhcmdldEhlYWQucG9zaXRpb24ueSA9IHBpY2tSZXN1bHQucGlja2VkUG9pbnQueTtcbiAgICAgICAgICAgIHRhcmdldEhlYWQucG9zaXRpb24ueiA9IHBpY2tSZXN1bHQucGlja2VkUG9pbnQuejtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvLyBNZXNoZXNcbiAgICAvLyBXb3JsZCBwb3NpdGlvbnM6IChsL3IsIHUvZCwgZi9iKVxuICAgIC8vIGxldCBkZWJ1Z0Jhc2UgPSBCQUJZTE9OLk1lc2hCdWlsZGVyLkNyZWF0ZUJveChcImRlYnVnQmFzZVwiLCB7aGVpZ2h0OiAwLjAxLCB3aWR0aDogMC41LCBkZXB0aDogMX0sIHRoaXMuX3NjZW5lKTtcbiAgICAvLyBkZWJ1Z0Jhc2UucmVjZWl2ZVNoYWRvd3MgPSB0cnVlO1xuXG4gICAgLy8gTW92aW5nIGJhbGwgZm9yIHRoZSBmb3ggdG8gd2F0Y2guXG4gICAgbGV0IHRhcmdldEhlYWQgPSBCQUJZTE9OLk1lc2hCdWlsZGVyLkNyZWF0ZVNwaGVyZShcbiAgICAgIFwidGFyZ2V0SGVhZFwiLCB7ZGlhbWV0ZXJYOiAwLjAxLCBkaWFtZXRlclk6IDAuMDEsIGRpYW1ldGVyWjogMC4wMX0sIHRoaXMuX3NjZW5lKTtcbiAgICB0YXJnZXRIZWFkLnBvc2l0aW9uID0gdGhpcy5fbGlnaHQucG9zaXRpb24uY2xvbmUoKTtcbiAgICBzaGFkb3dHZW5lcmF0b3IuZ2V0U2hhZG93TWFwKCkucmVuZGVyTGlzdC5wdXNoKHRhcmdldEhlYWQpO1xuICAgIC8vIEZveFxuICAgIGxldCBmb3ggPSBuZXcgQ2hhcmFjdGVyKHRoaXMuX3NjZW5lLCBzaGFkb3dHZW5lcmF0b3IsIEZPWCwgKCkgPT4ge1xuICAgICAgY29uc29sZS5sb2coXCJmb3ggbG9hZGVkXCIpO1xuICAgICAgdGhpcy5fY2FtZXJhLnNldFRhcmdldChmb3gucG9zaXRpb24pO1xuICAgICAgZm94Lmxvb2tBdCh0YXJnZXRIZWFkLnBvc2l0aW9uKTtcbiAgICAgIGZveC5yb3RhdGlvbi55ID0gTWF0aC5QSTtcbiAgICB9KTtcbiAgICB0aGlzLl9hY3RvcnMucHVzaChmb3gpO1xuICAgIC8vIFN0YXJcbiAgICBsZXQgc3RhciA9IG5ldyBTdGFyKHRoaXMuX3NjZW5lLCBzY2VuZXJ5KTtcbiAgICBzdGFyLm1lc2gucG9zaXRpb24gPSBuZXcgQkFCWUxPTi5WZWN0b3IzKDAsIDUsIDApO1xuXG4gICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgIGNvbnNvbGUubG9nKFwiQWRkIGFuaW1hdGlvbnMuXCIpO1xuICAgICAgLy90aGlzLl9hbmltYXRpb25RdWV1ZS5wdXNoKHtuYW1lOiBcInN0YXRpb25hcnlcIiwgbG9vcDogZmFsc2UsIHJldmVyc2VkOiBmYWxzZX0pO1xuICAgICAgZm94LnF1ZXVlQW5pbWF0aW9uKHtuYW1lOiBcImNyb3VjaFwiLCBsb29wOiBmYWxzZSwgcmV2ZXJzZWQ6IGZhbHNlfSk7XG4gICAgICBmb3gucXVldWVBbmltYXRpb24oe25hbWU6IFwiY3JvdWNoXCIsIGxvb3A6IGZhbHNlLCByZXZlcnNlZDogdHJ1ZX0pO1xuICAgICAgLy90aGlzLl9hbmltYXRpb25RdWV1ZS5wdXNoKHtuYW1lOiBcInN0YXRpb25hcnlcIiwgbG9vcDogdHJ1ZSwgcmV2ZXJzZWQ6IGZhbHNlfSk7XG4gICAgfS5iaW5kKHRoaXMpLCAxMDAwMCk7XG5cbiAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgY29uc29sZS5sb2coXCJBZGQgY3JvdWNoIGFuaW1hdGlvbi5cIik7XG4gICAgICBmb3gucXVldWVBbmltYXRpb24oe25hbWU6IFwiY3JvdWNoXCIsIGxvb3A6IGZhbHNlLCByZXZlcnNlZDogZmFsc2V9KTtcbiAgICAgIGZveC5xdWV1ZUFuaW1hdGlvbih7bmFtZTogXCJjcm91Y2hcIiwgbG9vcDogZmFsc2UsIHJldmVyc2VkOiB0cnVlfSk7XG4gICAgfS5iaW5kKHRoaXMpLCAyMDAwMCk7XG5cbiAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgY29uc29sZS5sb2coXCJBZGQgd2FsayBhbmltYXRpb24uXCIpO1xuICAgICAgZm94LnF1ZXVlQW5pbWF0aW9uKHtuYW1lOiBcIndhbGtcIiwgbG9vcDogdHJ1ZSwgcmV2ZXJzZWQ6IGZhbHNlfSk7XG4gICAgfS5iaW5kKHRoaXMpLCAzMDAwMCk7XG5cbiAgICB0aGlzLmNvbnRyb2xQYW5uZWwoKTtcbiAgICBjb25zb2xlLmxvZyhcIlRvdGFsIG1lc2hlcyBpbiBzY2VuZTogJWNcIiArXG4gICAgICAgICAgICAgICAgdGhpcy5fc2NlbmUubWVzaGVzLmxlbmd0aC50b1N0cmluZygpLFxuICAgICAgICAgICAgICAgIFwiYmFja2dyb3VuZDogb3JhbmdlOyBjb2xvcjogd2hpdGVcIik7XG4gIH1cblxuICBkb1JlbmRlcigpIDogdm9pZCB7XG4gICAgLy8gUnVuIHRoZSByZW5kZXIgbG9vcC5cbiAgICB0aGlzLl9lbmdpbmUucnVuUmVuZGVyTG9vcCgoKSA9PiB7XG4gICAgICB0aGlzLl9zY2VuZS5yZW5kZXIoKTtcbiAgICAgIGxldCBmcHNMYWJlbCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiZnBzTGFiZWxcIik7XG4gICAgICBmcHNMYWJlbC5pbm5lckhUTUwgPSB0aGlzLl9lbmdpbmUuZ2V0RnBzKCkudG9GaXhlZCgpICsgXCIgZnBzXCI7XG4gICAgfSk7XG5cbiAgICAvLyBUaGUgY2FudmFzL3dpbmRvdyByZXNpemUgZXZlbnQgaGFuZGxlci5cbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncmVzaXplJywgKCkgPT4ge1xuICAgICAgdGhpcy5fZW5naW5lLnJlc2l6ZSgpO1xuICAgIH0pO1xuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwib3JpZW50YXRpb25jaGFuZ2VcIiwgKCkgPT4ge1xuICAgICAgdGhpcy5fZW5naW5lLnJlc2l6ZSgpO1xuICAgIH0pO1xuICB9XG5cbiAgY29udHJvbFBhbm5lbCgpIDogdm9pZCB7XG4gICAgbGV0IGFkdmFuY2VkVGV4dHVyZSA9IEJBQllMT04uR1VJLkFkdmFuY2VkRHluYW1pY1RleHR1cmUuQ3JlYXRlRnVsbHNjcmVlblVJKFwiVUlcIik7XG5cbiAgICBsZXQgZ3JpZCA9IG5ldyBCQUJZTE9OLkdVSS5HcmlkKCk7XG4gICAgZ3JpZC5hZGRDb2x1bW5EZWZpbml0aW9uKDEwLCB0cnVlKTtcbiAgICBncmlkLmFkZENvbHVtbkRlZmluaXRpb24oMjAwLCB0cnVlKTtcbiAgICBncmlkLmFkZFJvd0RlZmluaXRpb24oMjAsIHRydWUpO1xuICAgIGdyaWQuYWRkUm93RGVmaW5pdGlvbigyMCwgdHJ1ZSk7XG4gICAgdGhpcy5fY2FtZXJhLmNhbWVyYXMuZm9yRWFjaCgoY2FtZXJhKSA9PiB7XG4gICAgICBncmlkLmFkZFJvd0RlZmluaXRpb24oMjAsIHRydWUpO1xuICAgIH0pO1xuICAgIGFkdmFuY2VkVGV4dHVyZS5hZGRDb250cm9sKGdyaWQpO1xuICAgIGxldCBncmlkY291bnQgPSAwO1xuXG4gICAgbGV0IHBhbmVsID0gbmV3IEJBQllMT04uR1VJLlN0YWNrUGFuZWwoKTtcbiAgICBwYW5lbC53aWR0aCA9IFwiMjIwcHhcIjtcbiAgICBwYW5lbC5mb250U2l6ZSA9IFwiMTRweFwiO1xuICAgIHBhbmVsLmhvcml6b250YWxBbGlnbm1lbnQgPSBCQUJZTE9OLkdVSS5Db250cm9sLkhPUklaT05UQUxfQUxJR05NRU5UX1JJR0hUO1xuICAgIHBhbmVsLnZlcnRpY2FsQWxpZ25tZW50ID0gQkFCWUxPTi5HVUkuQ29udHJvbC5WRVJUSUNBTF9BTElHTk1FTlRfQ0VOVEVSO1xuXG4gICAgbGV0IGNoZWNrYm94ID0gbmV3IEJBQllMT04uR1VJLkNoZWNrYm94KCk7XG4gICAgY2hlY2tib3gud2lkdGggPSBcIjIwcHhcIjtcbiAgICBjaGVja2JveC5oZWlnaHQgPSBcIjIwcHhcIjtcbiAgICBjaGVja2JveC5pc0NoZWNrZWQgPSBmYWxzZTtcbiAgICBjaGVja2JveC5jb2xvciA9IFwiZ3JlZW5cIjtcbiAgICBjaGVja2JveC5vbklzQ2hlY2tlZENoYW5nZWRPYnNlcnZhYmxlLmFkZCgodmFsdWUpID0+IHtcbiAgICAgIGNvbnNvbGUubG9nKFwiJWMgU2t5Qm94OlwiLCBcImJhY2tncm91bmQ6IGJsdWU7IGNvbG9yOiB3aGl0ZVwiLCB2YWx1ZSk7XG4gICAgICB0aGlzLl9za3lib3guc2V0RW5hYmxlZCh2YWx1ZSk7XG4gICAgfSk7XG4gICAgZ3JpZC5hZGRDb250cm9sKGNoZWNrYm94LCBncmlkY291bnQsIDApO1xuXG4gICAgbGV0IGhlYWRlciA9IEJBQllMT04uR1VJLkNvbnRyb2wuQWRkSGVhZGVyKFxuICAgICAgY2hlY2tib3gsIFwiU2t5Qm94XCIsIFwiMTgwcHhcIiwgeyBpc0hvcml6b250YWw6IHRydWUsIGNvbnRyb2xGaXJzdDogdHJ1ZX0pO1xuICAgIGhlYWRlci5jb2xvciA9IFwid2hpdGVcIjtcbiAgICBoZWFkZXIuaGVpZ2h0ID0gXCIyMHB4XCI7XG4gICAgaGVhZGVyLmhvcml6b250YWxBbGlnbm1lbnQgPSBCQUJZTE9OLkdVSS5Db250cm9sLkhPUklaT05UQUxfQUxJR05NRU5UX0xFRlQ7XG4gICAgZ3JpZC5hZGRDb250cm9sKGhlYWRlciwgZ3JpZGNvdW50KyssIDEpO1xuXG4gICAgbGV0IGNoZWNrYm94MiA9IG5ldyBCQUJZTE9OLkdVSS5DaGVja2JveCgpO1xuICAgIGNoZWNrYm94Mi53aWR0aCA9IFwiMjBweFwiO1xuICAgIGNoZWNrYm94Mi5oZWlnaHQgPSBcIjIwcHhcIjtcbiAgICBjaGVja2JveDIuaXNDaGVja2VkID0gdHJ1ZTtcbiAgICBjaGVja2JveDIuY29sb3IgPSBcImdyZWVuXCI7XG4gICAgY2hlY2tib3gyLm9uSXNDaGVja2VkQ2hhbmdlZE9ic2VydmFibGUuYWRkKCh2YWx1ZSkgPT4ge1xuICAgICAgY29uc29sZS5sb2coXCIlYyBGb2c6XCIsIFwiYmFja2dyb3VuZDogYmx1ZTsgY29sb3I6IHdoaXRlXCIsIHZhbHVlKTtcbiAgICAgIGlmICh2YWx1ZSkge1xuICAgICAgICB0aGlzLl9zY2VuZS5mb2dNb2RlID0gQkFCWUxPTi5TY2VuZS5GT0dNT0RFX0VYUDI7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvL3RoaXMuX3NjZW5lLmZvZ01vZGUgPSBCQUJZTE9OLlNjZW5lLkZPR01PREVfTElORUFSO1xuICAgICAgICAvL3RoaXMuX3NjZW5lLmZvZ1N0YXJ0ID0gMTAwLjA7XG4gICAgICAgIC8vdGhpcy5fc2NlbmUuZm9nRW5kID0gMjAwLjA7XG4gICAgICAgIHRoaXMuX3NjZW5lLmZvZ01vZGUgPSBCQUJZTE9OLlNjZW5lLkZPR01PREVfTk9ORTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICBncmlkLmFkZENvbnRyb2woY2hlY2tib3gyLCBncmlkY291bnQsIDApO1xuXG4gICAgbGV0IGhlYWRlcjIgPSBCQUJZTE9OLkdVSS5Db250cm9sLkFkZEhlYWRlcihcbiAgICAgIGNoZWNrYm94MiwgXCJGb2dcIiwgXCIxODBweFwiLCB7IGlzSG9yaXpvbnRhbDogdHJ1ZSwgY29udHJvbEZpcnN0OiB0cnVlfSk7XG4gICAgaGVhZGVyMi5jb2xvciA9IFwid2hpdGVcIjtcbiAgICBoZWFkZXIyLmhlaWdodCA9IFwiMjBweFwiO1xuICAgIGhlYWRlcjIuaG9yaXpvbnRhbEFsaWdubWVudCA9IEJBQllMT04uR1VJLkNvbnRyb2wuSE9SSVpPTlRBTF9BTElHTk1FTlRfTEVGVDtcbiAgICBncmlkLmFkZENvbnRyb2woaGVhZGVyMiwgZ3JpZGNvdW50KyssIDEpO1xuXG4gICAgdGhpcy5fY2FtZXJhLmNhbWVyYXMuZm9yRWFjaCgoY2FtZXJhKSA9PiB7XG4gICAgICBsZXQgcmFkaW8gPSBuZXcgQkFCWUxPTi5HVUkuUmFkaW9CdXR0b24oKTtcbiAgICAgIHJhZGlvLndpZHRoID0gXCIyMHB4XCI7XG4gICAgICByYWRpby5oZWlnaHQgPSBcIjIwcHhcIjtcbiAgICAgIHJhZGlvLmNvbG9yID0gXCJncmVlblwiO1xuICAgICAgcmFkaW8uaXNDaGVja2VkID0gKGNhbWVyYS5uYW1lID09PSBcIkFyY1JvdGF0ZVwiKTtcbiAgICAgIHJhZGlvLm9uSXNDaGVja2VkQ2hhbmdlZE9ic2VydmFibGUuYWRkKChzdGF0ZSkgPT4ge1xuICAgICAgICBjb25zb2xlLmxvZyhjYW1lcmEubmFtZSwgc3RhdGUpO1xuICAgICAgICBpZiAoc3RhdGUpIHtcbiAgICAgICAgICB0aGlzLl9jYW1lcmEuc2V0RW5hYmxlZChjYW1lcmEpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIGdyaWQuYWRkQ29udHJvbChyYWRpbywgZ3JpZGNvdW50LCAwKTtcblxuICAgICAgbGV0IHJhZGlvSGVhZCA9IEJBQllMT04uR1VJLkNvbnRyb2wuQWRkSGVhZGVyKFxuICAgICAgICByYWRpbywgXCJDYW1lcmE6IFwiICsgY2FtZXJhLm5hbWUsIFwiMTgwcHhcIiwgeyBpc0hvcml6b250YWw6IHRydWUsIGNvbnRyb2xGaXJzdDogdHJ1ZX0pO1xuICAgICAgcmFkaW9IZWFkLmNvbG9yID0gXCJ3aGl0ZVwiO1xuICAgICAgcmFkaW9IZWFkLmhlaWdodCA9IFwiMjBweFwiO1xuICAgICAgcmFkaW9IZWFkLmhvcml6b250YWxBbGlnbm1lbnQgPSBCQUJZTE9OLkdVSS5Db250cm9sLkhPUklaT05UQUxfQUxJR05NRU5UX0xFRlQ7XG4gICAgICBncmlkLmFkZENvbnRyb2wocmFkaW9IZWFkLCBncmlkY291bnQrKywgMSk7XG4gICAgfSwgdGhpcyk7XG4gIH1cbn1cblxud2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ0RPTUNvbnRlbnRMb2FkZWQnLCAoKSA9PiB7XG4gIC8vIENyZWF0ZSB0aGUgZ2FtZSB1c2luZyB0aGUgJ3JlbmRlckNhbnZhcycuXG4gIGxldCBnYW1lID0gbmV3IEdhbWUoJ3JlbmRlckNhbnZhcycpO1xuXG4gIC8vIENyZWF0ZSB0aGUgc2NlbmUuXG4gIGdhbWUuY3JlYXRlU2NlbmUoKTtcblxuICAvLyBTdGFydCByZW5kZXIgbG9vcC5cbiAgZ2FtZS5kb1JlbmRlcigpO1xufSk7XG4iLCIvL2Nhbm9waWVzIG51bWJlciBvZiBsZWFmIHNlY3Rpb25zLCBoZWlnaHQgb2YgdHJlZSwgbWF0ZXJpYWxzXG4vLyBodHRwczovL3d3dy5iYWJ5bG9uanMtcGxheWdyb3VuZC5jb20vI0xHM0dTIzkzXG4vLyBodHRwczovL2dpdGh1Yi5jb20vQmFieWxvbkpTL0V4dGVuc2lvbnMvdHJlZS9tYXN0ZXIvVHJlZUdlbmVyYXRvcnMvU2ltcGxlUGluZUdlbmVyYXRvclxuZnVuY3Rpb24gUGluZUdlbmVyYXRvcihjYW5vcGllczogbnVtYmVyLCBoZWlnaHQ6IG51bWJlciwgd2lkdGg6IG51bWJlcixcbiAgICAgICAgICAgICAgICAgICAgICAgdHJ1bmtNYXRlcmlhbDogQkFCWUxPTi5TdGFuZGFyZE1hdGVyaWFsLFxuICAgICAgICAgICAgICAgICAgICAgICBsZWFmTWF0ZXJpYWw6IEJBQllMT04uU3RhbmRhcmRNYXRlcmlhbCxcbiAgICAgICAgICAgICAgICAgICAgICAgc2NlbmU6IEJBQllMT04uU2NlbmUpIDogQkFCWUxPTi5NZXNoXG57XG4gIGxldCBuYkwgPSBjYW5vcGllcyArIDE7XG4gIGxldCB0cnVua0xlbiA9IGhlaWdodCAvIG5iTDtcbiAgbGV0IGN1cnZlUG9pbnRzID0gZnVuY3Rpb24obCwgdCkge1xuICAgIGxldCBwYXRoID0gW107XG4gICAgbGV0IHN0ZXAgPSBsIC8gdDtcbiAgICBmb3IgKGxldCBpID0gdHJ1bmtMZW47IGkgPCBsICsgdHJ1bmtMZW47IGkgKz0gc3RlcCkge1xuICAgICAgcGF0aC5wdXNoKG5ldyBCQUJZTE9OLlZlY3RvcjMoMCwgaSwgMCkpO1xuICAgICAgcGF0aC5wdXNoKG5ldyBCQUJZTE9OLlZlY3RvcjMoMCwgaSwgMCkpO1xuICAgIH1cbiAgICByZXR1cm4gcGF0aDtcbiAgfTtcblxuICBsZXQgY3VydmUgPSBjdXJ2ZVBvaW50cyhoZWlnaHQsIG5iTCk7XG5cbiAgbGV0IHJhZGl1c0Z1bmN0aW9uID0gZnVuY3Rpb24oaSwgZGlzdGFuY2UpIHtcbiAgICBsZXQgZmFjdCA9IDE7XG4gICAgaWYgKGkgJSAyID09IDApIHsgZmFjdCA9IC41OyB9XG4gICAgbGV0IHJhZGl1cyA9ICBNYXRoLm1heCgwLCAobmJMICogMiAtIGkgLSAxKSAqIGZhY3QpO1xuICAgIHJldHVybiByYWRpdXM7XG4gIH07XG5cbiAgbGV0IGxlYXZlcyA9IEJBQllMT04uTWVzaC5DcmVhdGVUdWJlKFxuICAgIFwibGVhdmVzXCIsIGN1cnZlLCAwLCAxMCwgcmFkaXVzRnVuY3Rpb24sIEJBQllMT04uTWVzaC5DQVBfQUxMLCBzY2VuZSk7XG4gIGxlYXZlcy5zY2FsaW5nLnggPSB3aWR0aCAvIDEwO1xuICBsZWF2ZXMuc2NhbGluZy56ID0gd2lkdGggLyAxMDtcblxuICBsZXQgdHJ1bmsgPSBCQUJZTE9OLk1lc2guQ3JlYXRlQ3lsaW5kZXIoXG4gICAgXCJ0cnVua1wiLCBoZWlnaHQgLyBuYkwsIG5iTCAqIDEuNSAtIG5iTCAvIDIgLSAxLCBuYkwgKiAxLjUgLSBuYkwgLyAyIC0gMSwgMTIsIDEsIHNjZW5lKTtcbiAgdHJ1bmsucG9zaXRpb24ueSA9IHRydW5rTGVuIC8gMjtcbiAgdHJ1bmsuc2NhbGluZy54ID0gd2lkdGggLyAxMDtcbiAgdHJ1bmsuc2NhbGluZy56ID0gd2lkdGggLyAxMDtcblxuICBsZWF2ZXMubWF0ZXJpYWwgPSBsZWFmTWF0ZXJpYWw7XG4gIHRydW5rLm1hdGVyaWFsID0gdHJ1bmtNYXRlcmlhbDtcblxuICBsZXQgdHJlZSA9IEJBQllMT04uTWVzaC5DcmVhdGVCb3goXCJwaW5lXCIsIDEsIHNjZW5lKTtcbiAgdHJlZS5pc1Zpc2libGUgPSBmYWxzZTtcbiAgbGVhdmVzLnBhcmVudCA9IHRyZWU7XG4gIHRydW5rLnBhcmVudCA9IHRyZWU7XG4gIHJldHVybiB0cmVlO1xufVxuXG5mdW5jdGlvbiBRdWlja1RyZWVHZW5lcmF0b3Ioc2l6ZUJyYW5jaDogbnVtYmVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNpemVUcnVuazogbnVtYmVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJhZGl1czogbnVtYmVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRydW5rTWF0ZXJpYWw6IEJBQllMT04uU3RhbmRhcmRNYXRlcmlhbCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZWFmTWF0ZXJpYWw6IEJBQllMT04uU3RhbmRhcmRNYXRlcmlhbCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzY2VuZTogQkFCWUxPTi5TY2VuZSkgOiBCQUJZTE9OLk1lc2gge1xuICAgIGxldCBsZWF2ZXMgPSBuZXcgQkFCWUxPTi5NZXNoKFwibGVhdmVzXCIsIHNjZW5lKTtcblxuICAgIGxldCB2ZXJ0ZXhEYXRhID0gQkFCWUxPTi5WZXJ0ZXhEYXRhLkNyZWF0ZVNwaGVyZSh7c2VnbWVudHM6IDIsIGRpYW1ldGVyOiBzaXplQnJhbmNofSk7XG5cbiAgICB2ZXJ0ZXhEYXRhLmFwcGx5VG9NZXNoKGxlYXZlcywgZmFsc2UpO1xuXG4gICAgbGV0IHBvc2l0aW9ucyA9IGxlYXZlcy5nZXRWZXJ0aWNlc0RhdGEoQkFCWUxPTi5WZXJ0ZXhCdWZmZXIuUG9zaXRpb25LaW5kKTtcbiAgICBsZXQgaW5kaWNlcyA9IGxlYXZlcy5nZXRJbmRpY2VzKCk7XG4gICAgbGV0IG51bWJlck9mUG9pbnRzID0gcG9zaXRpb25zLmxlbmd0aCAvIDM7XG5cbiAgICBsZXQgbWFwID0gW107XG5cbiAgICBsZXQgdjMgPSBCQUJZTE9OLlZlY3RvcjM7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBudW1iZXJPZlBvaW50czsgaSsrKSB7XG4gICAgICAgIGxldCBwID0gbmV3IHYzKHBvc2l0aW9uc1tpICogM10sIHBvc2l0aW9uc1tpICogMyArIDFdLCBwb3NpdGlvbnNbaSAqIDMgKyAyXSk7XG5cbiAgICAgICAgbGV0IGZvdW5kID0gZmFsc2U7XG4gICAgICAgIGZvciAobGV0IGluZGV4ID0gMDsgaW5kZXggPCBtYXAubGVuZ3RoICYmICFmb3VuZDsgaW5kZXgrKykge1xuICAgICAgICAgICAgbGV0IGFycmF5ID0gbWFwW2luZGV4XTtcbiAgICAgICAgICAgIGxldCBwMCA9IGFycmF5WzBdO1xuICAgICAgICAgICAgaWYgKHAwLmVxdWFscyAocCkgfHwgKHAwLnN1YnRyYWN0KHApKS5sZW5ndGhTcXVhcmVkKCkgPCAwLjAxKSB7XG4gICAgICAgICAgICAgICAgYXJyYXkucHVzaChpICogMyk7XG4gICAgICAgICAgICAgICAgZm91bmQgPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmICghZm91bmQpIHtcbiAgICAgICAgICAgIGxldCBhcnJheSA9IFtdO1xuICAgICAgICAgICAgYXJyYXkucHVzaChwLCBpICogMyk7XG4gICAgICAgICAgICBtYXAucHVzaChhcnJheSk7XG4gICAgICAgIH1cblxuICAgIH1cbiAgICBsZXQgcmFuZG9tTnVtYmVyID0gZnVuY3Rpb24obWluLCBtYXgpIHtcbiAgICAgICAgaWYgKG1pbiA9PSBtYXgpIHtcbiAgICAgICAgICAgIHJldHVybiAobWluKTtcbiAgICAgICAgfVxuICAgICAgICBsZXQgcmFuZG9tID0gTWF0aC5yYW5kb20oKTtcbiAgICAgICAgcmV0dXJuICgocmFuZG9tICogKG1heCAtIG1pbikpICsgbWluKTtcbiAgICB9O1xuXG4gICAgbWFwLmZvckVhY2goZnVuY3Rpb24oYXJyYXkpIHtcbiAgICAgICAgbGV0IGluZGV4LCBtaW4gPSAtc2l6ZUJyYW5jaCAvIDEwLCBtYXggPSBzaXplQnJhbmNoIC8gMTA7XG4gICAgICAgIGxldCByeCA9IHJhbmRvbU51bWJlcihtaW4sIG1heCk7XG4gICAgICAgIGxldCByeSA9IHJhbmRvbU51bWJlcihtaW4sIG1heCk7XG4gICAgICAgIGxldCByeiA9IHJhbmRvbU51bWJlcihtaW4sIG1heCk7XG5cbiAgICAgICAgZm9yIChpbmRleCA9IDE7IGluZGV4IDwgYXJyYXkubGVuZ3RoOyBpbmRleCsrKSB7XG4gICAgICAgICAgICBsZXQgaSA9IGFycmF5W2luZGV4XTtcbiAgICAgICAgICAgIHBvc2l0aW9uc1tpXSArPSByeDtcbiAgICAgICAgICAgIHBvc2l0aW9uc1tpICsgMV0gKz0gcnk7XG4gICAgICAgICAgICBwb3NpdGlvbnNbaSArIDJdICs9IHJ6O1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICBsZWF2ZXMuc2V0VmVydGljZXNEYXRhKEJBQllMT04uVmVydGV4QnVmZmVyLlBvc2l0aW9uS2luZCwgcG9zaXRpb25zKTtcbiAgICBsZXQgbm9ybWFscyA9IFtdO1xuICAgIEJBQllMT04uVmVydGV4RGF0YS5Db21wdXRlTm9ybWFscyhwb3NpdGlvbnMsIGluZGljZXMsIG5vcm1hbHMpO1xuICAgIGxlYXZlcy5zZXRWZXJ0aWNlc0RhdGEoQkFCWUxPTi5WZXJ0ZXhCdWZmZXIuTm9ybWFsS2luZCwgbm9ybWFscyk7XG4gICAgbGVhdmVzLmNvbnZlcnRUb0ZsYXRTaGFkZWRNZXNoKCk7XG5cbiAgICBsZWF2ZXMubWF0ZXJpYWwgPSBsZWFmTWF0ZXJpYWw7XG4gICAgbGVhdmVzLnBvc2l0aW9uLnkgPSBzaXplVHJ1bmsgKyBzaXplQnJhbmNoIC8gMiAtIDI7XG5cbiAgICBsZXQgdHJ1bmsgPSBCQUJZTE9OLk1lc2guQ3JlYXRlQ3lsaW5kZXIoXG4gICAgICBcInRydW5rXCIsIHNpemVUcnVuaywgcmFkaXVzIC0gMiA8IDEgPyAxIDogcmFkaXVzIC0gMiwgcmFkaXVzLCAxMCwgMiwgc2NlbmUpO1xuXG4gICAgdHJ1bmsucG9zaXRpb24ueSA9IHNpemVUcnVuayAvIDI7XG5cbiAgICB0cnVuay5tYXRlcmlhbCA9IHRydW5rTWF0ZXJpYWw7XG4gICAgdHJ1bmsuY29udmVydFRvRmxhdFNoYWRlZE1lc2goKTtcblxuICAgIGxldCB0cmVlID0gQkFCWUxPTi5NZXNoLkNyZWF0ZUJveChcInRyZWVcIiwgMSwgc2NlbmUpO1xuICAgIHRyZWUuaXNWaXNpYmxlID0gZmFsc2U7XG4gICAgbGVhdmVzLnBhcmVudCA9IHRyZWU7XG4gICAgdHJ1bmsucGFyZW50ID0gdHJlZTtcbiAgICByZXR1cm4gdHJlZTtcbn1cblxuZnVuY3Rpb24gUXVpY2tTaHJ1YihzaXplQnJhbmNoOiBudW1iZXIsXG4gICAgICAgICAgICAgICAgICAgIGxlYWZNYXRlcmlhbDogQkFCWUxPTi5TdGFuZGFyZE1hdGVyaWFsLFxuICAgICAgICAgICAgICAgICAgICBzY2VuZTogQkFCWUxPTi5TY2VuZSkgOiBCQUJZTE9OLk1lc2gge1xuICAgIGxldCB0cmVlID0gbmV3IEJBQllMT04uTWVzaChcInNocnViXCIsIHNjZW5lKTtcbiAgICB0cmVlLmlzVmlzaWJsZSA9IGZhbHNlO1xuXG4gICAgbGV0IGxlYXZlcyA9IG5ldyBCQUJZTE9OLk1lc2goXCJsZWF2ZXNcIiwgc2NlbmUpO1xuXG4gICAgbGV0IHZlcnRleERhdGEgPSBCQUJZTE9OLlZlcnRleERhdGEuQ3JlYXRlU3BoZXJlKHtzZWdtZW50czogMiwgZGlhbWV0ZXI6IHNpemVCcmFuY2h9KTtcblxuICAgIHZlcnRleERhdGEuYXBwbHlUb01lc2gobGVhdmVzLCBmYWxzZSk7XG5cbiAgICBsZXQgcG9zaXRpb25zID0gbGVhdmVzLmdldFZlcnRpY2VzRGF0YShCQUJZTE9OLlZlcnRleEJ1ZmZlci5Qb3NpdGlvbktpbmQpO1xuICAgIGxldCBpbmRpY2VzID0gbGVhdmVzLmdldEluZGljZXMoKTtcbiAgICBsZXQgbnVtYmVyT2ZQb2ludHMgPSBwb3NpdGlvbnMubGVuZ3RoIC8gMztcblxuICAgIGxldCBtYXAgPSBbXTtcblxuICAgIGxldCB2MyA9IEJBQllMT04uVmVjdG9yMztcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IG51bWJlck9mUG9pbnRzOyBpKyspIHtcbiAgICAgICAgbGV0IHAgPSBuZXcgdjMocG9zaXRpb25zW2kgKiAzXSwgcG9zaXRpb25zW2kgKiAzICsgMV0sIHBvc2l0aW9uc1tpICogMyArIDJdKTtcblxuICAgICAgICBsZXQgZm91bmQgPSBmYWxzZTtcbiAgICAgICAgZm9yIChsZXQgaW5kZXggPSAwOyBpbmRleCA8IG1hcC5sZW5ndGggJiYgIWZvdW5kOyBpbmRleCsrKSB7XG4gICAgICAgICAgICBsZXQgYXJyYXkgPSBtYXBbaW5kZXhdO1xuICAgICAgICAgICAgbGV0IHAwID0gYXJyYXlbMF07XG4gICAgICAgICAgICBpZiAocDAuZXF1YWxzKHApIHx8IChwMC5zdWJ0cmFjdChwKSkubGVuZ3RoU3F1YXJlZCgpIDwgMC4wMSkge1xuICAgICAgICAgICAgICAgIGFycmF5LnB1c2goaSAqIDMpO1xuICAgICAgICAgICAgICAgIGZvdW5kID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoIWZvdW5kKSB7XG4gICAgICAgICAgICBsZXQgYXJyYXkgPSBbXTtcbiAgICAgICAgICAgIGFycmF5LnB1c2gocCwgaSAqIDMpO1xuICAgICAgICAgICAgbWFwLnB1c2goYXJyYXkpO1xuICAgICAgICB9XG4gICAgfVxuICAgIGxldCByYW5kb21OdW1iZXIgPSBmdW5jdGlvbihtaW4sIG1heCkge1xuICAgICAgICBpZiAobWluID09IG1heCkge1xuICAgICAgICAgICAgcmV0dXJuIChtaW4pO1xuICAgICAgICB9XG4gICAgICAgIGxldCByYW5kb20gPSBNYXRoLnJhbmRvbSgpO1xuICAgICAgICByZXR1cm4gKChyYW5kb20gKiAobWF4IC0gbWluKSkgKyBtaW4pO1xuICAgIH07XG5cbiAgICBtYXAuZm9yRWFjaChmdW5jdGlvbihhcnJheSkge1xuICAgICAgbGV0IGluZGV4LCBtaW4gPSAtc2l6ZUJyYW5jaCAvIDUsIG1heCA9IHNpemVCcmFuY2ggLyA1O1xuICAgICAgbGV0IHJ4ID0gcmFuZG9tTnVtYmVyKG1pbiwgbWF4KTtcbiAgICAgIGxldCByeSA9IHJhbmRvbU51bWJlcihtaW4sIG1heCk7XG4gICAgICBsZXQgcnogPSByYW5kb21OdW1iZXIobWluLCBtYXgpO1xuXG4gICAgICBmb3IgKGluZGV4ID0gMTsgaW5kZXggPCBhcnJheS5sZW5ndGg7IGluZGV4KyspIHtcbiAgICAgICAgbGV0IGkgPSBhcnJheVtpbmRleF07XG4gICAgICAgIHBvc2l0aW9uc1tpXSArPSByeDtcbiAgICAgICAgcG9zaXRpb25zW2kgKyAyXSArPSByejtcbiAgICAgICAgaWYgKHBvc2l0aW9uc1tpICsgMV0gPCAwKSB7XG4gICAgICAgICAgcG9zaXRpb25zW2kgKyAxXSA9IC1zaXplQnJhbmNoIC8gMjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBwb3NpdGlvbnNbaSArIDFdICs9IHJ5O1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBsZWF2ZXMuc2V0VmVydGljZXNEYXRhKEJBQllMT04uVmVydGV4QnVmZmVyLlBvc2l0aW9uS2luZCwgcG9zaXRpb25zKTtcbiAgICBsZXQgbm9ybWFscyA9IFtdO1xuICAgIEJBQllMT04uVmVydGV4RGF0YS5Db21wdXRlTm9ybWFscyhwb3NpdGlvbnMsIGluZGljZXMsIG5vcm1hbHMpO1xuICAgIGxlYXZlcy5zZXRWZXJ0aWNlc0RhdGEoQkFCWUxPTi5WZXJ0ZXhCdWZmZXIuTm9ybWFsS2luZCwgbm9ybWFscyk7XG4gICAgbGVhdmVzLmNvbnZlcnRUb0ZsYXRTaGFkZWRNZXNoKCk7XG5cbiAgICBsZWF2ZXMubWF0ZXJpYWwgPSBsZWFmTWF0ZXJpYWw7XG4gICAgbGVhdmVzLnNjYWxpbmcueSA9IHJhbmRvbU51bWJlcigwLjIsIDEpO1xuICAgIGxlYXZlcy5wb3NpdGlvbi55ID0gMC4xICsgbGVhdmVzLnNjYWxpbmcueSAqIHNpemVCcmFuY2ggLyAyO1xuXG4gICAgbGVhdmVzLnBhcmVudCA9IHRyZWU7XG4gICAgcmV0dXJuIHRyZWU7XG59XG4iLCJjbGFzcyBCaWdBcnJheSBleHRlbmRzIEFycmF5IHtcbiAgbGVuZ3RoUG9wdWxhdGVkOiBudW1iZXIgPSAwO1xufVxuXG5jbGFzcyBUcml2aWFsU3RhY2s8VHZhbHVlPiB7XG4gIHByaXZhdGUgX2NvbnRhaW5lcjogQXJyYXk8VHZhbHVlPjtcbiAgbGVuZ3RoOiBudW1iZXI7XG5cbiAgY29uc3RydWN0b3IoKSB7XG4gICAgdGhpcy5sZW5ndGggPSAwO1xuICAgIHRoaXMuX2NvbnRhaW5lciA9IFtdO1xuICB9XG5cbiAgcG9wKCk6IFR2YWx1ZSB7XG4gICAgbGV0IHZhbHVlID0gdGhpcy5fY29udGFpbmVyLnBvcCgpO1xuICAgIHRoaXMubGVuZ3RoID0gdGhpcy5fY29udGFpbmVyLmxlbmd0aDtcbiAgICByZXR1cm4gdmFsdWU7XG4gIH1cblxuICBwdXNoKG5ld1ZhbHVlOiBUdmFsdWUpOiB2b2lkIHtcbiAgICB0aGlzLl9jb250YWluZXIucHVzaChuZXdWYWx1ZSk7XG4gICAgdGhpcy5sZW5ndGggPSB0aGlzLl9jb250YWluZXIubGVuZ3RoO1xuICB9XG59XG5cbmNsYXNzIFRyaXZpYWxRdWV1ZTxUdmFsdWU+IHtcbiAgcHJpdmF0ZSBfY29udGFpbmVyOiBBcnJheTxUdmFsdWU+O1xuICBsZW5ndGg6IG51bWJlcjtcblxuICBjb25zdHJ1Y3RvcigpIHtcbiAgICB0aGlzLmxlbmd0aCA9IDA7XG4gICAgdGhpcy5fY29udGFpbmVyID0gW107XG4gIH1cblxuICBwb3AoKTogVHZhbHVlIHtcbiAgICBsZXQgdmFsdWUgPSB0aGlzLl9jb250YWluZXIucG9wKCk7XG4gICAgdGhpcy5sZW5ndGggPSB0aGlzLl9jb250YWluZXIubGVuZ3RoO1xuICAgIHJldHVybiB2YWx1ZTtcbiAgfVxuXG4gIHB1c2gobmV3VmFsdWU6IFR2YWx1ZSk6IHZvaWQge1xuICAgIHRoaXMuX2NvbnRhaW5lci51bnNoaWZ0KG5ld1ZhbHVlKTtcbiAgICB0aGlzLmxlbmd0aCA9IHRoaXMuX2NvbnRhaW5lci5sZW5ndGg7XG4gIH1cbn1cblxuY2xhc3MgTXlTdGFjazxUdmFsdWU+IHtcbiAgcHJpdmF0ZSBfY29udGFpbmVyOiBCaWdBcnJheTtcbiAgcHJpdmF0ZSBfc2l6ZTogbnVtYmVyO1xuICBsZW5ndGg6IG51bWJlcjtcblxuICBjb25zdHJ1Y3RvcihzaXplPzogbnVtYmVyKSB7XG4gICAgc2l6ZSA9IHNpemUgfHwgMTA7XG4gICAgdGhpcy5sZW5ndGggPSAwO1xuICAgIHRoaXMuX2NvbnRhaW5lciA9IG5ldyBCaWdBcnJheShzaXplKTtcbiAgICB0aGlzLl9zaXplID0gc2l6ZTtcbiAgfVxuXG4gIHBvcCgpOiBUdmFsdWUge1xuICAgIGlmICh0aGlzLl9jb250YWluZXIubGVuZ3RoUG9wdWxhdGVkID09PSAwKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuX2NvbnRhaW5lci5sZW5ndGhQb3B1bGF0ZWQtLTtcbiAgICB0aGlzLmxlbmd0aCA9IHRoaXMuX2NvbnRhaW5lci5sZW5ndGhQb3B1bGF0ZWQ7XG4gICAgbGV0IHZhbHVlID0gdGhpcy5fY29udGFpbmVyW3RoaXMuX2NvbnRhaW5lci5sZW5ndGhQb3B1bGF0ZWRdO1xuICAgIC8vZGVsZXRlIHRoaXMuX2NvbnRhaW5lclt0aGlzLl9jb250YWluZXIubGVuZ3RoUG9wdWxhdGVkXTtcbiAgICB0aGlzLl9jb250YWluZXJbdGhpcy5fY29udGFpbmVyLmxlbmd0aFBvcHVsYXRlZF0gPSBudWxsO1xuICAgIHJldHVybiB2YWx1ZTtcbiAgfVxuXG4gIHB1c2gobmV3VmFsdWU6IFR2YWx1ZSk6IHZvaWQge1xuICAgIGlmICh0aGlzLl9jb250YWluZXIubGVuZ3RoUG9wdWxhdGVkID09PSB0aGlzLl9jb250YWluZXIubGVuZ3RoKSB7XG4gICAgICB0aGlzLl9jb250YWluZXIubGVuZ3RoICs9IHRoaXMuX3NpemU7XG4gICAgfVxuICAgIHRoaXMuX2NvbnRhaW5lclt0aGlzLl9jb250YWluZXIubGVuZ3RoUG9wdWxhdGVkXSA9IG5ld1ZhbHVlO1xuICAgIHRoaXMuX2NvbnRhaW5lci5sZW5ndGhQb3B1bGF0ZWQrKztcbiAgICB0aGlzLmxlbmd0aCA9IHRoaXMuX2NvbnRhaW5lci5sZW5ndGhQb3B1bGF0ZWQ7XG4gIH1cbn1cblxuY2xhc3MgTXlRdWV1ZU5vZGU8VHZhbHVlPiB7XG4gIHZhbHVlOiBUdmFsdWU7XG4gIG5leHQ6IE15UXVldWVOb2RlPFR2YWx1ZT47XG5cbiAgY29uc3RydWN0b3IodmFsdWU6IFR2YWx1ZSkge1xuICAgIHRoaXMudmFsdWUgPSB2YWx1ZTtcbiAgfVxufVxuXG5jbGFzcyBNeVF1ZXVlPFR2YWx1ZT4ge1xuICAvL3ByaXZhdGUgX2NvbnRhaW5lcjogQmlnQXJyYXk7XG4gIC8vcHJpdmF0ZSBfc2l6ZTogbnVtYmVyO1xuICBwcml2YXRlIF9oZWFkOiBNeVF1ZXVlTm9kZTxUdmFsdWU+O1xuICBwcml2YXRlIF90YWlsOiBNeVF1ZXVlTm9kZTxUdmFsdWU+O1xuICBsZW5ndGg6IG51bWJlcjtcblxuICBjb25zdHJ1Y3RvcihzaXplPzogbnVtYmVyKSB7XG4gICAgc2l6ZSA9IHNpemUgfHwgMTA7XG4gICAgdGhpcy5sZW5ndGggPSAwO1xuICAgIC8vdGhpcy5fY29udGFpbmVyID0gbmV3IEJpZ0FycmF5KHNpemUpO1xuICAgIC8vdGhpcy5fc2l6ZSA9IHNpemU7XG4gIH1cblxuICBwb3AoKTogVHZhbHVlIHtcbiAgICBpZiAodGhpcy5faGVhZCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBsZXQgcmV0dXJuTm9kZSA9IHRoaXMuX2hlYWQ7XG4gICAgdGhpcy5faGVhZCA9IHRoaXMuX2hlYWQubmV4dDtcbiAgICB0aGlzLmxlbmd0aC0tO1xuXG4gICAgcmV0dXJuIHJldHVybk5vZGUudmFsdWU7XG4gIH1cblxuICBwdXNoKG5ld1ZhbHVlOiBUdmFsdWUpOiB2b2lkIHtcbiAgICBsZXQgbm9kZSA9IG5ldyBNeVF1ZXVlTm9kZTxUdmFsdWU+KG5ld1ZhbHVlKTtcblxuICAgIGlmICh0aGlzLl9oZWFkID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMuX2hlYWQgPSB0aGlzLl90YWlsID0gbm9kZTtcbiAgICAgIHRoaXMubGVuZ3RoID0gMTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLl90YWlsLm5leHQgPSBub2RlO1xuICAgIHRoaXMuX3RhaWwgPSBub2RlO1xuICAgIHRoaXMubGVuZ3RoKys7XG4gIH1cbn1cblxuY2xhc3MgTXlNYXA8VGtleSwgVHZhbHVlPiB7XG4gIHByaXZhdGUgX2NvbnRhaW5lcjtcbiAgcHJpdmF0ZSBfZ2V0UHJvcGVydGllczogKChub2RlKSA9PiBudW1iZXIpW107XG4gIGxlbmd0aDogbnVtYmVyO1xuXG4gIGNvbnN0cnVjdG9yKC4uLmdldFByb3BlcnRpZXM6ICgobm9kZSkgPT4gbnVtYmVyKVtdKSB7XG4gICAgdGhpcy5sZW5ndGggPSAwO1xuICAgIHRoaXMuX2NvbnRhaW5lciA9IG5ldyBCaWdBcnJheSgxMCk7XG4gICAgdGhpcy5fZ2V0UHJvcGVydGllcyA9IGdldFByb3BlcnRpZXM7XG4gIH1cblxuICBnZXQoa2V5OiBUa2V5KTogVHZhbHVlIHtcbiAgICBsZXQgc3ViQ29udGFpbmVyID0gdGhpcy5fY29udGFpbmVyO1xuICAgIHRoaXMuX2dldFByb3BlcnRpZXMuZm9yRWFjaCgoZ2V0UHJvcGVydHkpID0+IHtcbiAgICAgIGlmIChzdWJDb250YWluZXIgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBsZXQgc3ViS2V5OiBudW1iZXIgPSBnZXRQcm9wZXJ0eShrZXkpO1xuICAgICAgICBzdWJDb250YWluZXIgPSBzdWJDb250YWluZXJbc3ViS2V5XTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gc3ViQ29udGFpbmVyO1xuICB9XG5cbiAgcG9wKCkgOiBUdmFsdWUge1xuICAgIGxldCBhZGRyZXNzOiBudW1iZXJbXSA9IHRoaXMuX3BvcFJlY3Vyc2UodGhpcy5fY29udGFpbmVyKTtcblxuICAgIGxldCByZXR1cm5WYWw6IFR2YWx1ZTtcbiAgICBsZXQgc3ViQ29udGFpbmVyID0gdGhpcy5fY29udGFpbmVyO1xuICAgIGFkZHJlc3MuZm9yRWFjaCgoc3ViS2V5LCBpbmRleCwgYXJyYXkpID0+IHtcbiAgICAgIGlmIChpbmRleCA8IGFycmF5Lmxlbmd0aCAtIDEpIHtcbiAgICAgICAgc3ViQ29udGFpbmVyID0gc3ViQ29udGFpbmVyW3N1YktleV07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm5WYWwgPSBzdWJDb250YWluZXJbc3ViQ29udGFpbmVyLmxlbmd0aFBvcHVsYXRlZCAtIDFdO1xuICAgICAgICAvL2RlbGV0ZSBzdWJDb250YWluZXJbc3ViQ29udGFpbmVyLmxlbmd0aFBvcHVsYXRlZCAtIDFdO1xuICAgICAgICBzdWJDb250YWluZXJbc3ViQ29udGFpbmVyLmxlbmd0aFBvcHVsYXRlZCAtIDFdID0gbnVsbDtcbiAgICAgICAgaWYgKHJldHVyblZhbCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgc3ViQ29udGFpbmVyLmxlbmd0aFBvcHVsYXRlZC0tO1xuICAgICAgICAgIHRoaXMubGVuZ3RoLS07XG4gICAgICAgIH1cbiAgICAgICAgd2hpbGUgKHN1YkNvbnRhaW5lci5sZW5ndGhQb3B1bGF0ZWQgPiAwICYmXG4gICAgICAgICAgICAgICBzdWJDb250YWluZXJbc3ViQ29udGFpbmVyLmxlbmd0aFBvcHVsYXRlZCAtIDFdID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAvLyBXaGlsZSB0aGlzIGlzIGV4cGVuc2l2ZSwgaXQgd2lsbCBvbmx5IGhhcHBlbiBmb3IgY2FzZXMgd2hlblxuICAgICAgICAgIC8vIHRoZXJlIGFyZSBlbXB0eSBzcGFjZXMgdG8gdGhlIFwibGVmdFwiIG9mIHRoZSBwb3AtZWQgdmFsdWUuXG4gICAgICAgICAgc3ViQ29udGFpbmVyLmxlbmd0aFBvcHVsYXRlZC0tO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHJldHVyblZhbDtcbiAgfVxuXG4gIHByaXZhdGUgX3BvcFJlY3Vyc2UockNvbnRhaW5lcjogW10pOiBudW1iZXJbXSB7XG4gICAgbGV0IHJldHVyblZhbDogbnVtYmVyW10gPSBbXTtcbiAgICByQ29udGFpbmVyLmZvckVhY2goKG5vZGUsIGluZGV4LCBhcnJheSkgPT4ge1xuICAgICAgaWYgKHJldHVyblZhbC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkoYXJyYXlbaW5kZXhdKSkge1xuICAgICAgICAgIGlmICgoPEJpZ0FycmF5PihhcnJheVtpbmRleF0pKS5sZW5ndGhQb3B1bGF0ZWQgPiAwKSB7XG4gICAgICAgICAgICByZXR1cm5WYWwgPSBbaW5kZXhdLmNvbmNhdCh0aGlzLl9wb3BSZWN1cnNlKGFycmF5W2luZGV4XSkpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm5WYWwgPSBbaW5kZXhdO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHJldHVyblZhbDtcbiAgfVxuXG4gIHB1dChrZXk6IFRrZXksIHZhbHVlOiBUdmFsdWUpOiB2b2lkIHtcbiAgICBsZXQgc3ViQ29udGFpbmVyID0gdGhpcy5fY29udGFpbmVyO1xuICAgIHRoaXMuX2dldFByb3BlcnRpZXMuZm9yRWFjaCgoZ2V0UHJvcGVydHksIGluZGV4LCBhcnJheSkgPT4ge1xuICAgICAgbGV0IHN1YktleTogbnVtYmVyID0gZ2V0UHJvcGVydHkoa2V5KTtcbiAgICAgIGNvbnNvbGUuYXNzZXJ0KHN1YktleSAhPT0gdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgICAgICAgKFwiUHJvYmxlbSBydW5uaW5nIFwiICsgZ2V0UHJvcGVydHkubmFtZSArIFwiIG9uIFwiICsga2V5KSk7XG4gICAgICBpZiAoaW5kZXggPCBhcnJheS5sZW5ndGggLSAxKSB7XG4gICAgICAgIHdoaWxlIChzdWJDb250YWluZXIubGVuZ3RoUG9wdWxhdGVkIC0gMSA8IHN1YktleSkge1xuICAgICAgICAgIC8vc3ViQ29udGFpbmVyLnB1c2gobmV3IEJpZ0FycmF5KDEwKSk7XG4gICAgICAgICAgc3ViQ29udGFpbmVyW3N1YkNvbnRhaW5lci5sZW5ndGhQb3B1bGF0ZWRdID0gbmV3IEJpZ0FycmF5KDEwKTtcbiAgICAgICAgICBzdWJDb250YWluZXIubGVuZ3RoUG9wdWxhdGVkKys7XG4gICAgICAgIH1cbiAgICAgICAgc3ViQ29udGFpbmVyID0gc3ViQ29udGFpbmVyW3N1YktleV07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAoc3ViQ29udGFpbmVyW3N1YktleV0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIHN1YkNvbnRhaW5lcltzdWJLZXldID0gdmFsdWU7XG4gICAgICAgICAgc3ViQ29udGFpbmVyLmxlbmd0aFBvcHVsYXRlZCA9IE1hdGgubWF4KHN1YktleSArIDEsIHN1YkNvbnRhaW5lci5sZW5ndGhQb3B1bGF0ZWQpO1xuICAgICAgICAgIHRoaXMubGVuZ3RoKys7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIGRlbChrZXk6IFRrZXkpOiBUdmFsdWUge1xuICAgIGxldCByZXR1cm5WYWw6IFR2YWx1ZTtcblxuICAgIGxldCBzdWJDb250YWluZXIgPSB0aGlzLl9jb250YWluZXI7XG4gICAgdGhpcy5fZ2V0UHJvcGVydGllcy5mb3JFYWNoKChnZXRQcm9wZXJ0eSwgaW5kZXgsIGFycmF5KSA9PiB7XG4gICAgICBsZXQgc3ViS2V5OiBudW1iZXIgPSBnZXRQcm9wZXJ0eShrZXkpO1xuICAgICAgY29uc29sZS5hc3NlcnQoc3ViS2V5ICE9PSB1bmRlZmluZWQpO1xuICAgICAgaWYgKGluZGV4IDwgYXJyYXkubGVuZ3RoIC0gMSkge1xuICAgICAgICBsZXQgc3ViS2V5OiBudW1iZXIgPSBnZXRQcm9wZXJ0eShrZXkpO1xuICAgICAgICBzdWJDb250YWluZXIgPSBzdWJDb250YWluZXJbc3ViS2V5XTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVyblZhbCA9IHN1YkNvbnRhaW5lcltzdWJLZXldO1xuICAgICAgICAvL2RlbGV0ZSBzdWJDb250YWluZXJbc3ViS2V5XTtcbiAgICAgICAgc3ViQ29udGFpbmVyW3N1YktleV0gPSBudWxsO1xuICAgICAgICBpZiAocmV0dXJuVmFsICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBzdWJDb250YWluZXIubGVuZ3RoUG9wdWxhdGVkLS07XG4gICAgICAgICAgdGhpcy5sZW5ndGgtLTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHJldHVyblZhbDtcbiAgfVxufVxuXG5jbGFzcyBQcmlvcml0eVF1ZXVlPFQ+IHtcbiAgcHJpdmF0ZSBfY29udGFpbmVyOiBNeVN0YWNrPFQ+W107XG4gIHByaXZhdGUgX2dldFByb3BlcnRpZXM6ICgobm9kZSkgPT4gbnVtYmVyKVtdO1xuICBsZW5ndGg6IG51bWJlcjtcblxuICBjb25zdHJ1Y3RvciguLi5nZXRQcm9wZXJ0aWVzOiAoKG5vZGUpID0+IG51bWJlcilbXSkge1xuICAgIHRoaXMuX2dldFByb3BlcnRpZXMgPSBnZXRQcm9wZXJ0aWVzO1xuICAgIHRoaXMuX2NvbnRhaW5lciA9IFtdO1xuICAgIHRoaXMubGVuZ3RoID0gMDtcbiAgfVxuXG4gIC8qIFBvcCBpdGVtIGZyb20gaGlnaGVzdCBwcmlvcml0eSBzdWItcXVldWUuICovXG4gIHBvcCgpOiBUIHtcbiAgICBsZXQgaXRlbTogVDtcblxuICAgIHRoaXMuX2NvbnRhaW5lci5mb3JFYWNoKChuLCBpbmRleCwgYXJyYXkpID0+IHtcbiAgICAgIGxldCByZXZlcnNlSW5kZXggPSB0aGlzLl9jb250YWluZXIubGVuZ3RoIC0gaW5kZXggLSAxO1xuXG4gICAgICBpZiAoaXRlbSA9PT0gdW5kZWZpbmVkICYmIGFycmF5W3JldmVyc2VJbmRleF0ubGVuZ3RoKSB7XG4gICAgICAgIGl0ZW0gPSBhcnJheVtyZXZlcnNlSW5kZXhdLnBvcCgpO1xuICAgICAgICBjb25zb2xlLmFzc2VydChpdGVtICE9PSB1bmRlZmluZWQpO1xuICAgICAgICB0aGlzLmxlbmd0aC0tO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBpdGVtO1xuICB9XG5cbiAgLyogUG9wIGl0ZW0gZnJvbSBsb3dlc3QgcHJpb3JpdHkgc3ViLXF1ZXVlLiAqL1xuICBwb3BMb3coKTogVCB7XG4gICAgbGV0IGl0ZW06IFQ7XG5cbiAgICB0aGlzLl9jb250YWluZXIuZm9yRWFjaCgobiwgaW5kZXgsIGFycmF5KSA9PiB7XG4gICAgICBpZiAoaXRlbSA9PT0gdW5kZWZpbmVkICYmIGFycmF5W2luZGV4XS5sZW5ndGgpIHtcbiAgICAgICAgaXRlbSA9IGFycmF5W2luZGV4XS5wb3AoKTtcbiAgICAgICAgY29uc29sZS5hc3NlcnQoaXRlbSAhPT0gdW5kZWZpbmVkKTtcbiAgICAgICAgdGhpcy5sZW5ndGgtLTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gaXRlbTtcbiAgfVxuXG4gIC8qIEFkZCBpdGVtIGF0IHNwZWNpZmllZCBwcmlvcml0eS4gKi9cbiAgcHVzaChpdGVtOiBULCBwcmlvcml0eTogbnVtYmVyKTogdm9pZCB7XG4gICAgY29uc29sZS5hc3NlcnQoaXRlbSAhPT0gdW5kZWZpbmVkKTtcbiAgICBjb25zb2xlLmFzc2VydChwcmlvcml0eSA9PT0gTWF0aC5yb3VuZChwcmlvcml0eSksXG4gICAgICAgICAgICAgICAgICAgXCJQcmlvcml0eSBtdXN0IGJlIGFuIGludGlnZXIuXCIpO1xuXG4gICAgd2hpbGUgKHRoaXMuX2NvbnRhaW5lci5sZW5ndGggPCBwcmlvcml0eSArIDEpIHtcbiAgICAgIC8vIEFkZCBuZXcgcHJpb3JpdHkgc3ViLWNvbnRhaW5lci5cbiAgICAgIGxldCBjb250YWluZXIgPSBuZXcgTXlTdGFjazxUPigpO1xuICAgICAgdGhpcy5fY29udGFpbmVyLnB1c2goY29udGFpbmVyKTtcbiAgICB9XG4gICAgdGhpcy5fY29udGFpbmVyW3ByaW9yaXR5XS5wdXNoKGl0ZW0pO1xuICAgIHRoaXMubGVuZ3RoKys7XG4gIH1cbn1cblxuY2xhc3MgVGVzdE15U3RhY2sge1xuICBwcml2YXRlIF9jb250YWluZXI6IE15U3RhY2s8bnVtYmVyPjtcblxuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBsZXQgdGVzdHMgPSBbdGhpcy50ZXN0X3B1c2gsIHRoaXMudGVzdF9wb3BdO1xuICAgIHRlc3RzLmZvckVhY2goKHRlc3QpID0+IHtcbiAgICAgIHRoaXMuX2luaXQoKTtcbiAgICAgIHRlc3QuYmluZCh0aGlzKSgpO1xuICAgIH0sIHRoaXMpO1xuICB9XG5cbiAgcHJpdmF0ZSBfaW5pdCgpOiB2b2lkIHtcbiAgICB0aGlzLl9jb250YWluZXIgPSBuZXcgTXlTdGFjaygpO1xuICB9XG5cbiAgdGVzdF9wdXNoKCkge1xuICAgIGNvbnNvbGUubG9nKFwidGVzdF9wdXNoXCIpO1xuXG4gICAgY29uc29sZS5hc3NlcnQodGhpcy5fY29udGFpbmVyLmxlbmd0aCA9PT0gMCk7XG4gICAgdGhpcy5fY29udGFpbmVyLnB1c2goMSk7XG4gICAgY29uc29sZS5hc3NlcnQodGhpcy5fY29udGFpbmVyLmxlbmd0aCA9PT0gMSk7XG4gICAgdGhpcy5fY29udGFpbmVyLnB1c2goMik7XG4gICAgY29uc29sZS5hc3NlcnQodGhpcy5fY29udGFpbmVyLmxlbmd0aCA9PT0gMik7XG4gICAgdGhpcy5fY29udGFpbmVyLnB1c2goMyk7XG4gICAgY29uc29sZS5hc3NlcnQodGhpcy5fY29udGFpbmVyLmxlbmd0aCA9PT0gMyk7XG4gIH1cblxuICB0ZXN0X3BvcCgpIHtcbiAgICBjb25zb2xlLmxvZyhcInRlc3RfcG9wXCIpO1xuXG4gICAgY29uc29sZS5hc3NlcnQodGhpcy5fY29udGFpbmVyLmxlbmd0aCA9PT0gMCk7XG4gICAgdGhpcy5fY29udGFpbmVyLnB1c2goMSk7XG4gICAgdGhpcy5fY29udGFpbmVyLnB1c2goMik7XG4gICAgdGhpcy5fY29udGFpbmVyLnB1c2goMyk7XG4gICAgdGhpcy5fY29udGFpbmVyLnB1c2goNCk7XG4gICAgY29uc29sZS5hc3NlcnQodGhpcy5fY29udGFpbmVyLmxlbmd0aCA9PT0gNCk7XG5cbiAgICBsZXQgdmFsOiBudW1iZXIgPSB0aGlzLl9jb250YWluZXIucG9wKCk7XG4gICAgY29uc29sZS5hc3NlcnQodmFsID09PSA0KTtcbiAgICBjb25zb2xlLmFzc2VydCh0aGlzLl9jb250YWluZXIubGVuZ3RoID09PSAzKTtcblxuICAgIHZhbCA9IHRoaXMuX2NvbnRhaW5lci5wb3AoKTtcbiAgICB2YWwgPSB0aGlzLl9jb250YWluZXIucG9wKCk7XG4gICAgdmFsID0gdGhpcy5fY29udGFpbmVyLnBvcCgpO1xuICAgIGNvbnNvbGUuYXNzZXJ0KHZhbCA9PT0gMSk7XG4gICAgY29uc29sZS5hc3NlcnQodGhpcy5fY29udGFpbmVyLmxlbmd0aCA9PT0gMCk7XG5cbiAgICB2YWwgPSB0aGlzLl9jb250YWluZXIucG9wKCk7XG4gICAgY29uc29sZS5hc3NlcnQodmFsID09PSB1bmRlZmluZWQpO1xuICAgIGNvbnNvbGUuYXNzZXJ0KHRoaXMuX2NvbnRhaW5lci5sZW5ndGggPT09IDApO1xuICB9XG59XG5cbmNsYXNzIFRlc3RNeVF1ZXVlIHtcbiAgcHJpdmF0ZSBfY29udGFpbmVyOiBNeVF1ZXVlPG51bWJlcj47XG5cbiAgY29uc3RydWN0b3IoKSB7XG4gICAgbGV0IHRlc3RzID0gW3RoaXMudGVzdF9wdXNoLCB0aGlzLnRlc3RfcG9wXTtcbiAgICB0ZXN0cy5mb3JFYWNoKCh0ZXN0KSA9PiB7XG4gICAgICB0aGlzLl9pbml0KCk7XG4gICAgICB0ZXN0LmJpbmQodGhpcykoKTtcbiAgICB9LCB0aGlzKTtcbiAgfVxuXG4gIHByaXZhdGUgX2luaXQoKTogdm9pZCB7XG4gICAgdGhpcy5fY29udGFpbmVyID0gbmV3IE15UXVldWUoKTtcbiAgfVxuXG4gIHRlc3RfcHVzaCgpIHtcbiAgICBjb25zb2xlLmxvZyhcInRlc3RfcHVzaFwiKTtcblxuICAgIGNvbnNvbGUuYXNzZXJ0KHRoaXMuX2NvbnRhaW5lci5sZW5ndGggPT09IDApO1xuICAgIHRoaXMuX2NvbnRhaW5lci5wdXNoKDEpO1xuICAgIGNvbnNvbGUuYXNzZXJ0KHRoaXMuX2NvbnRhaW5lci5sZW5ndGggPT09IDEpO1xuICAgIHRoaXMuX2NvbnRhaW5lci5wdXNoKDIpO1xuICAgIGNvbnNvbGUuYXNzZXJ0KHRoaXMuX2NvbnRhaW5lci5sZW5ndGggPT09IDIpO1xuICAgIHRoaXMuX2NvbnRhaW5lci5wdXNoKDMpO1xuICAgIGNvbnNvbGUuYXNzZXJ0KHRoaXMuX2NvbnRhaW5lci5sZW5ndGggPT09IDMpO1xuICB9XG5cbiAgdGVzdF9wb3AoKSB7XG4gICAgY29uc29sZS5sb2coXCJ0ZXN0X3BvcFwiKTtcblxuICAgIGNvbnNvbGUuYXNzZXJ0KHRoaXMuX2NvbnRhaW5lci5sZW5ndGggPT09IDApO1xuICAgIHRoaXMuX2NvbnRhaW5lci5wdXNoKDEpO1xuICAgIHRoaXMuX2NvbnRhaW5lci5wdXNoKDIpO1xuICAgIHRoaXMuX2NvbnRhaW5lci5wdXNoKDMpO1xuICAgIHRoaXMuX2NvbnRhaW5lci5wdXNoKDQpO1xuICAgIGNvbnNvbGUuYXNzZXJ0KHRoaXMuX2NvbnRhaW5lci5sZW5ndGggPT09IDQpO1xuXG4gICAgbGV0IHZhbDogbnVtYmVyID0gdGhpcy5fY29udGFpbmVyLnBvcCgpO1xuICAgIGNvbnNvbGUuYXNzZXJ0KHZhbCA9PT0gMSk7XG4gICAgY29uc29sZS5hc3NlcnQodGhpcy5fY29udGFpbmVyLmxlbmd0aCA9PT0gMyk7XG5cbiAgICB2YWwgPSB0aGlzLl9jb250YWluZXIucG9wKCk7XG4gICAgdmFsID0gdGhpcy5fY29udGFpbmVyLnBvcCgpO1xuICAgIHZhbCA9IHRoaXMuX2NvbnRhaW5lci5wb3AoKTtcbiAgICBjb25zb2xlLmFzc2VydCh2YWwgPT09IDQpO1xuICAgIGNvbnNvbGUuYXNzZXJ0KHRoaXMuX2NvbnRhaW5lci5sZW5ndGggPT09IDApO1xuXG4gICAgdmFsID0gdGhpcy5fY29udGFpbmVyLnBvcCgpO1xuICAgIGNvbnNvbGUuYXNzZXJ0KHZhbCA9PT0gdW5kZWZpbmVkKTtcbiAgICBjb25zb2xlLmFzc2VydCh0aGlzLl9jb250YWluZXIubGVuZ3RoID09PSAwKTtcbiAgfVxufVxuXG5jbGFzcyBUZXN0TXlNYXAge1xuICBwcml2YXRlIF9jb250YWluZXI6IE15TWFwPHt9LCBudW1iZXI+O1xuXG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIGxldCB0ZXN0cyA9IFt0aGlzLnRlc3RfcHV0LCB0aGlzLnRlc3RfZ2V0LCB0aGlzLnRlc3RfZGVsLCB0aGlzLnRlc3RfcG9wXTtcbiAgICB0ZXN0cy5mb3JFYWNoKCh0ZXN0KSA9PiB7XG4gICAgICB0aGlzLl9pbml0KCk7XG4gICAgICB0ZXN0LmJpbmQodGhpcykoKTtcbiAgICB9LCB0aGlzKTtcbiAgfVxuXG4gIHByaXZhdGUgX2luaXQoKTogdm9pZCB7XG4gICAgZnVuY3Rpb24gZ2V0WChub2RlOiB7XCJ4XCIsIFwieVwifSk6IG51bWJlciB7XG4gICAgICByZXR1cm4gbm9kZS54O1xuICAgIH1cbiAgICBmdW5jdGlvbiBnZXRZKG5vZGU6IHtcInhcIiwgXCJ5XCJ9KTogbnVtYmVyIHtcbiAgICAgIHJldHVybiBub2RlLnk7XG4gICAgfVxuICAgIHRoaXMuX2NvbnRhaW5lciA9IG5ldyBNeU1hcChnZXRYLCBnZXRZKTtcbiAgfVxuXG4gIHRlc3RfcHV0KCkge1xuICAgIGNvbnNvbGUubG9nKFwidGVzdF9wdXRcIik7XG5cbiAgICBjb25zb2xlLmFzc2VydCh0aGlzLl9jb250YWluZXIubGVuZ3RoID09PSAwKTtcbiAgICB0aGlzLl9jb250YWluZXIucHV0KHtcInhcIjogMSwgXCJ5XCI6IDJ9LCAzKTtcbiAgICBjb25zb2xlLmFzc2VydCh0aGlzLl9jb250YWluZXIubGVuZ3RoID09PSAxKTtcbiAgICB0aGlzLl9jb250YWluZXIucHV0KHtcInhcIjogMSwgXCJ5XCI6IDJ9LCAzKTtcbiAgICB0aGlzLl9jb250YWluZXIucHV0KHtcInhcIjogMSwgXCJ5XCI6IDJ9LCA0KTtcbiAgICBjb25zb2xlLmFzc2VydCh0aGlzLl9jb250YWluZXIubGVuZ3RoID09PSAxKTtcbiAgICB0aGlzLl9jb250YWluZXIucHV0KHtcInhcIjogMSwgXCJ5XCI6IDF9LCA1KTtcbiAgICBjb25zb2xlLmFzc2VydCh0aGlzLl9jb250YWluZXIubGVuZ3RoID09PSAyKTtcbiAgICB0aGlzLl9jb250YWluZXIucHV0KHtcInhcIjogMSwgXCJ5XCI6IDN9LCA2KTtcbiAgICBjb25zb2xlLmFzc2VydCh0aGlzLl9jb250YWluZXIubGVuZ3RoID09PSAzKTtcbiAgICB0aGlzLl9jb250YWluZXIucHV0KHtcInhcIjogMCwgXCJ5XCI6IDN9LCA3KTtcbiAgICBjb25zb2xlLmFzc2VydCh0aGlzLl9jb250YWluZXIubGVuZ3RoID09PSA0KTtcbiAgICB0aGlzLl9jb250YWluZXIucHV0KHtcInhcIjogMiwgXCJ5XCI6IDN9LCA4KTtcbiAgICBjb25zb2xlLmFzc2VydCh0aGlzLl9jb250YWluZXIubGVuZ3RoID09PSA1KTtcbiAgICB0aGlzLl9jb250YWluZXIucHV0KHtcInhcIjogMCwgXCJ5XCI6IDB9LCA5KTtcbiAgICBjb25zb2xlLmFzc2VydCh0aGlzLl9jb250YWluZXIubGVuZ3RoID09PSA2KTtcbiAgfVxuXG4gIHRlc3RfZ2V0KCkge1xuICAgIGNvbnNvbGUubG9nKFwidGVzdF9nZXRcIik7XG5cbiAgICBjb25zb2xlLmFzc2VydCh0aGlzLl9jb250YWluZXIubGVuZ3RoID09PSAwKTtcbiAgICB0aGlzLl9jb250YWluZXIucHV0KHtcInhcIjogMCwgXCJ5XCI6IDJ9LCAxKTtcbiAgICB0aGlzLl9jb250YWluZXIucHV0KHtcInhcIjogMSwgXCJ5XCI6IDJ9LCAyKTtcbiAgICB0aGlzLl9jb250YWluZXIucHV0KHtcInhcIjogMiwgXCJ5XCI6IDJ9LCAzKTtcbiAgICB0aGlzLl9jb250YWluZXIucHV0KHtcInhcIjogMywgXCJ5XCI6IDB9LCA0KTtcbiAgICB0aGlzLl9jb250YWluZXIucHV0KHtcInhcIjogMywgXCJ5XCI6IDF9LCA1KTtcbiAgICB0aGlzLl9jb250YWluZXIucHV0KHtcInhcIjogMywgXCJ5XCI6IDJ9LCA2KTtcbiAgICBjb25zb2xlLmFzc2VydCh0aGlzLl9jb250YWluZXIubGVuZ3RoID09PSA2KTtcblxuICAgIGNvbnNvbGUuYXNzZXJ0KHRoaXMuX2NvbnRhaW5lci5nZXQoe1wieFwiOiAwLCBcInlcIjogMn0pID09PSAxKTtcbiAgICBjb25zb2xlLmFzc2VydCh0aGlzLl9jb250YWluZXIuZ2V0KHtcInhcIjogMSwgXCJ5XCI6IDJ9KSA9PT0gMik7XG4gICAgY29uc29sZS5hc3NlcnQodGhpcy5fY29udGFpbmVyLmdldCh7XCJ4XCI6IDIsIFwieVwiOiAyfSkgPT09IDMpO1xuICAgIGNvbnNvbGUuYXNzZXJ0KHRoaXMuX2NvbnRhaW5lci5nZXQoe1wieFwiOiAzLCBcInlcIjogMH0pID09PSA0KTtcbiAgICBjb25zb2xlLmFzc2VydCh0aGlzLl9jb250YWluZXIuZ2V0KHtcInhcIjogMywgXCJ5XCI6IDF9KSA9PT0gNSk7XG4gICAgY29uc29sZS5hc3NlcnQodGhpcy5fY29udGFpbmVyLmdldCh7XCJ4XCI6IDMsIFwieVwiOiAyfSkgPT09IDYpO1xuICAgIGNvbnNvbGUuYXNzZXJ0KHRoaXMuX2NvbnRhaW5lci5nZXQoe1wieFwiOiAzLCBcInlcIjogM30pID09PSB1bmRlZmluZWQpO1xuICB9XG5cbiAgdGVzdF9kZWwoKSB7XG4gICAgY29uc29sZS5sb2coXCJ0ZXN0X2RlbFwiKTtcblxuICAgIGNvbnNvbGUuYXNzZXJ0KHRoaXMuX2NvbnRhaW5lci5sZW5ndGggPT09IDApO1xuICAgIHRoaXMuX2NvbnRhaW5lci5wdXQoe1wieFwiOiAwLCBcInlcIjogMn0sIDEpO1xuICAgIHRoaXMuX2NvbnRhaW5lci5wdXQoe1wieFwiOiAxLCBcInlcIjogMn0sIDIpO1xuICAgIHRoaXMuX2NvbnRhaW5lci5wdXQoe1wieFwiOiAyLCBcInlcIjogMn0sIDMpO1xuICAgIHRoaXMuX2NvbnRhaW5lci5wdXQoe1wieFwiOiAzLCBcInlcIjogMH0sIDQpO1xuICAgIHRoaXMuX2NvbnRhaW5lci5wdXQoe1wieFwiOiAzLCBcInlcIjogMX0sIDUpO1xuICAgIHRoaXMuX2NvbnRhaW5lci5wdXQoe1wieFwiOiAzLCBcInlcIjogMn0sIDYpO1xuICAgIGNvbnNvbGUuYXNzZXJ0KHRoaXMuX2NvbnRhaW5lci5sZW5ndGggPT09IDYpO1xuXG4gICAgY29uc29sZS5hc3NlcnQodGhpcy5fY29udGFpbmVyLmRlbCh7XCJ4XCI6IDAsIFwieVwiOiAyfSkgPT09IDEpO1xuICAgIGNvbnNvbGUuYXNzZXJ0KHRoaXMuX2NvbnRhaW5lci5sZW5ndGggPT09IDUpO1xuICAgIGNvbnNvbGUuYXNzZXJ0KHRoaXMuX2NvbnRhaW5lci5kZWwoe1wieFwiOiAwLCBcInlcIjogMn0pID09PSB1bmRlZmluZWQpO1xuICAgIGNvbnNvbGUuYXNzZXJ0KHRoaXMuX2NvbnRhaW5lci5sZW5ndGggPT09IDUpO1xuICAgIGNvbnNvbGUuYXNzZXJ0KHRoaXMuX2NvbnRhaW5lci5kZWwoe1wieFwiOiAxLCBcInlcIjogMn0pID09PSAyKTtcbiAgICBjb25zb2xlLmFzc2VydCh0aGlzLl9jb250YWluZXIuZGVsKHtcInhcIjogMSwgXCJ5XCI6IDJ9KSA9PT0gdW5kZWZpbmVkKTtcbiAgICBjb25zb2xlLmFzc2VydCh0aGlzLl9jb250YWluZXIuZGVsKHtcInhcIjogMiwgXCJ5XCI6IDJ9KSA9PT0gMyk7XG4gICAgY29uc29sZS5hc3NlcnQodGhpcy5fY29udGFpbmVyLmRlbCh7XCJ4XCI6IDMsIFwieVwiOiAwfSkgPT09IDQpO1xuICAgIGNvbnNvbGUuYXNzZXJ0KHRoaXMuX2NvbnRhaW5lci5kZWwoe1wieFwiOiAzLCBcInlcIjogMX0pID09PSA1KTtcbiAgICBjb25zb2xlLmFzc2VydCh0aGlzLl9jb250YWluZXIuZGVsKHtcInhcIjogMywgXCJ5XCI6IDJ9KSA9PT0gNik7XG4gICAgY29uc29sZS5hc3NlcnQodGhpcy5fY29udGFpbmVyLmRlbCh7XCJ4XCI6IDMsIFwieVwiOiAzfSkgPT09IHVuZGVmaW5lZCk7XG4gICAgY29uc29sZS5hc3NlcnQodGhpcy5fY29udGFpbmVyLmxlbmd0aCA9PT0gMCk7XG4gIH1cblxuICB0ZXN0X3BvcCgpIHtcbiAgICBjb25zb2xlLmxvZyhcInRlc3RfcG9wXCIpO1xuXG4gICAgY29uc29sZS5hc3NlcnQodGhpcy5fY29udGFpbmVyLmxlbmd0aCA9PT0gMCk7XG4gICAgdGhpcy5fY29udGFpbmVyLnB1dCh7XCJ4XCI6IDAsIFwieVwiOiAyfSwgMSk7XG4gICAgdGhpcy5fY29udGFpbmVyLnB1dCh7XCJ4XCI6IDEsIFwieVwiOiAyfSwgMik7XG4gICAgdGhpcy5fY29udGFpbmVyLnB1dCh7XCJ4XCI6IDQsIFwieVwiOiAxfSwgNSk7XG4gICAgdGhpcy5fY29udGFpbmVyLnB1dCh7XCJ4XCI6IDIsIFwieVwiOiAyfSwgMyk7XG4gICAgdGhpcy5fY29udGFpbmVyLnB1dCh7XCJ4XCI6IDQsIFwieVwiOiAwfSwgNCk7XG4gICAgdGhpcy5fY29udGFpbmVyLnB1dCh7XCJ4XCI6IDQsIFwieVwiOiAyfSwgNik7XG4gICAgY29uc29sZS5hc3NlcnQodGhpcy5fY29udGFpbmVyLmxlbmd0aCA9PT0gNik7XG5cbiAgICBsZXQgdmFsOiBudW1iZXIgPSB0aGlzLl9jb250YWluZXIucG9wKCk7XG4gICAgY29uc29sZS5hc3NlcnQodmFsID49IDEgJiYgdmFsIDw9IDYpO1xuICAgIGNvbnNvbGUuYXNzZXJ0KHRoaXMuX2NvbnRhaW5lci5sZW5ndGggPT09IDUpO1xuXG4gICAgdmFsID0gdGhpcy5fY29udGFpbmVyLnBvcCgpO1xuICAgIGNvbnNvbGUuYXNzZXJ0KHZhbCA+PSAxICYmIHZhbCA8PSA2KTtcbiAgICBjb25zb2xlLmFzc2VydCh0aGlzLl9jb250YWluZXIubGVuZ3RoID09PSA0KTtcblxuICAgIHZhbCA9IHRoaXMuX2NvbnRhaW5lci5wb3AoKTtcbiAgICBjb25zb2xlLmFzc2VydCh2YWwgPj0gMSAmJiB2YWwgPD0gNik7XG4gICAgY29uc29sZS5hc3NlcnQodGhpcy5fY29udGFpbmVyLmxlbmd0aCA9PT0gMyk7XG5cbiAgICB2YWwgPSB0aGlzLl9jb250YWluZXIucG9wKCk7XG4gICAgY29uc29sZS5hc3NlcnQodmFsID49IDEgJiYgdmFsIDw9IDYpO1xuICAgIGNvbnNvbGUuYXNzZXJ0KHRoaXMuX2NvbnRhaW5lci5sZW5ndGggPT09IDIpO1xuXG4gICAgdmFsID0gdGhpcy5fY29udGFpbmVyLnBvcCgpO1xuICAgIGNvbnNvbGUuYXNzZXJ0KHZhbCA+PSAxICYmIHZhbCA8PSA2KTtcbiAgICBjb25zb2xlLmFzc2VydCh0aGlzLl9jb250YWluZXIubGVuZ3RoID09PSAxKTtcblxuICAgIHZhbCA9IHRoaXMuX2NvbnRhaW5lci5wb3AoKTtcbiAgICBjb25zb2xlLmFzc2VydCh2YWwgPj0gMSAmJiB2YWwgPD0gNik7XG4gICAgY29uc29sZS5hc3NlcnQodGhpcy5fY29udGFpbmVyLmxlbmd0aCA9PT0gMCk7XG5cbiAgICB2YWwgPSB0aGlzLl9jb250YWluZXIucG9wKCk7XG4gICAgY29uc29sZS5hc3NlcnQodmFsID09PSB1bmRlZmluZWQpO1xuICAgIGNvbnNvbGUuYXNzZXJ0KHRoaXMuX2NvbnRhaW5lci5sZW5ndGggPT09IDApO1xuICB9XG59XG5cbmNsYXNzIFRlc3RQcmlvcml0eVF1ZXVlIHtcbiAgcHJpdmF0ZSBfcHE6IFByaW9yaXR5UXVldWU8e30+O1xuXG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIGxldCB0ZXN0cyA9IFt0aGlzLnRlc3RfcHVzaCwgdGhpcy50ZXN0X3BvcCwgdGhpcy50ZXN0X3BvcExvd107XG4gICAgdGVzdHMuZm9yRWFjaCgodGVzdCkgPT4ge1xuICAgICAgdGhpcy5faW5pdCgpO1xuICAgICAgdGVzdC5iaW5kKHRoaXMpKCk7XG4gICAgfSwgdGhpcyk7XG4gIH1cblxuICBwcml2YXRlIF9pbml0KCk6IHZvaWQge1xuICAgIGZ1bmN0aW9uIGdldFgobm9kZToge1wieFwiLCBcInlcIn0pOiBudW1iZXIge1xuICAgICAgcmV0dXJuIG5vZGUueDtcbiAgICB9XG4gICAgZnVuY3Rpb24gZ2V0WShub2RlOiB7XCJ4XCIsIFwieVwifSk6IG51bWJlciB7XG4gICAgICByZXR1cm4gbm9kZS55O1xuICAgIH1cbiAgICB0aGlzLl9wcSA9IG5ldyBQcmlvcml0eVF1ZXVlKGdldFgsIGdldFkpO1xuICB9XG5cbiAgdGVzdF9wdXNoKCkge1xuICAgIGNvbnNvbGUubG9nKFwidGVzdF9wdXNoXCIpO1xuXG4gICAgY29uc29sZS5hc3NlcnQodGhpcy5fcHEubGVuZ3RoID09PSAwKTtcbiAgICB0aGlzLl9wcS5wdXNoKHtcInhcIjogMSwgXCJ5XCI6IDF9LCAxKTtcbiAgICBjb25zb2xlLmFzc2VydCh0aGlzLl9wcS5sZW5ndGggPT09IDEpO1xuICAgIHRoaXMuX3BxLnB1c2goe1wieFwiOiAwLCBcInlcIjogMX0sIDEpO1xuICAgIHRoaXMuX3BxLnB1c2goe1wieFwiOiAyLCBcInlcIjogMX0sIDEpO1xuICAgIHRoaXMuX3BxLnB1c2goe1wieFwiOiAxLCBcInlcIjogMH0sIDEpO1xuICAgIGNvbnNvbGUuYXNzZXJ0KHRoaXMuX3BxLmxlbmd0aCA9PT0gNCk7XG4gIH1cblxuICB0ZXN0X3BvcCgpIHtcbiAgICBjb25zb2xlLmxvZyhcInRlc3RfcG9wXCIpO1xuICAgIHRoaXMuX3BxLnB1c2goe1wieFwiOiAxLCBcInlcIjogMH0sIDEpO1xuICAgIHRoaXMuX3BxLnB1c2goe1wieFwiOiAxLCBcInlcIjogMX0sIDEpO1xuICAgIHRoaXMuX3BxLnB1c2goe1wieFwiOiAzLCBcInlcIjogMH0sIDIpO1xuICAgIHRoaXMuX3BxLnB1c2goe1wieFwiOiAzLCBcInlcIjogMX0sIDIpO1xuICAgIHRoaXMuX3BxLnB1c2goe1wieFwiOiAwLCBcInlcIjogMH0sIDEpO1xuICAgIHRoaXMuX3BxLnB1c2goe1wieFwiOiAwLCBcInlcIjogMn0sIDEpO1xuXG4gICAgLy8gUG9wIGhpZ2hlciBwcmlvcml0eSBmaXJzdC5cbiAgICBsZXQgaXRlbTAgPSB0aGlzLl9wcS5wb3AoKTtcbiAgICBsZXQgaXRlbTEgPSB0aGlzLl9wcS5wb3AoKTtcbiAgICBjb25zb2xlLmFzc2VydChpdGVtMFtcInhcIl0gPT09IDMgJiYgaXRlbTFbXCJ4XCJdID09PSAzKTtcbiAgICBjb25zb2xlLmFzc2VydChpdGVtMFtcInlcIl0gPT09IDAgfHwgaXRlbTFbXCJ5XCJdID09PSAwKTtcbiAgICBjb25zb2xlLmFzc2VydChpdGVtMFtcInlcIl0gPT09IDEgfHwgaXRlbTFbXCJ5XCJdID09PSAxKTtcbiAgICBjb25zb2xlLmFzc2VydCh0aGlzLl9wcS5sZW5ndGggPT09IDQpO1xuXG4gICAgLy8gUG9wIGxvd2VyIHByaW9yaXR5IG5leHQuXG4gICAgbGV0IGl0ZW0yID0gdGhpcy5fcHEucG9wKCk7XG4gICAgbGV0IGl0ZW0zID0gdGhpcy5fcHEucG9wKCk7XG4gICAgbGV0IGl0ZW00ID0gdGhpcy5fcHEucG9wKCk7XG4gICAgbGV0IGl0ZW01ID0gdGhpcy5fcHEucG9wKCk7XG4gICAgY29uc29sZS5hc3NlcnQoaXRlbTJbXCJ4XCJdIDwgMyk7XG4gICAgY29uc29sZS5hc3NlcnQoaXRlbTNbXCJ4XCJdIDwgMyk7XG4gICAgY29uc29sZS5hc3NlcnQoaXRlbTRbXCJ4XCJdIDwgMyk7XG4gICAgY29uc29sZS5hc3NlcnQoaXRlbTVbXCJ4XCJdIDwgMyk7XG4gICAgY29uc29sZS5hc3NlcnQodGhpcy5fcHEubGVuZ3RoID09PSAwKTtcblxuICAgIC8vIE5vbmUgbGVmdCB0byBwb3AuXG4gICAgbGV0IGl0ZW02ID0gdGhpcy5fcHEucG9wKCk7XG4gICAgY29uc29sZS5hc3NlcnQoaXRlbTYgPT09IHVuZGVmaW5lZCk7XG4gIH1cblxuICB0ZXN0X3BvcExvdygpIHtcbiAgICBjb25zb2xlLmxvZyhcInRlc3RfcG9wTG93XCIpO1xuICAgIHRoaXMuX3BxLnB1c2goe1wieFwiOiAyLCBcInlcIjogMH0sIDIpO1xuICAgIHRoaXMuX3BxLnB1c2goe1wieFwiOiAyLCBcInlcIjogMX0sIDIpO1xuICAgIHRoaXMuX3BxLnB1c2goe1wieFwiOiAxLCBcInlcIjogMH0sIDEpO1xuICAgIHRoaXMuX3BxLnB1c2goe1wieFwiOiAxLCBcInlcIjogMX0sIDEpO1xuICAgIHRoaXMuX3BxLnB1c2goe1wieFwiOiAzLCBcInlcIjogMH0sIDIpO1xuICAgIHRoaXMuX3BxLnB1c2goe1wieFwiOiAzLCBcInlcIjogMn0sIDIpO1xuXG4gICAgbGV0IGl0ZW0wID0gdGhpcy5fcHEucG9wTG93KCk7XG4gICAgbGV0IGl0ZW0xID0gdGhpcy5fcHEucG9wTG93KCk7XG4gICAgY29uc29sZS5hc3NlcnQoaXRlbTBbXCJ4XCJdID09PSAxICYmIGl0ZW0xW1wieFwiXSA9PT0gMSk7XG4gICAgY29uc29sZS5hc3NlcnQoaXRlbTBbXCJ5XCJdID09PSAwIHx8IGl0ZW0xW1wieVwiXSA9PT0gMCk7XG4gICAgY29uc29sZS5hc3NlcnQoaXRlbTBbXCJ5XCJdID09PSAxIHx8IGl0ZW0xW1wieVwiXSA9PT0gMSk7XG4gICAgY29uc29sZS5hc3NlcnQodGhpcy5fcHEubGVuZ3RoID09PSA0KTtcblxuICAgIGxldCBpdGVtMiA9IHRoaXMuX3BxLnBvcExvdygpO1xuICAgIGxldCBpdGVtMyA9IHRoaXMuX3BxLnBvcExvdygpO1xuICAgIGxldCBpdGVtNCA9IHRoaXMuX3BxLnBvcExvdygpO1xuICAgIGxldCBpdGVtNSA9IHRoaXMuX3BxLnBvcExvdygpO1xuICAgIGNvbnNvbGUuYXNzZXJ0KGl0ZW0yW1wieFwiXSA+IDEpO1xuICAgIGNvbnNvbGUuYXNzZXJ0KGl0ZW0zW1wieFwiXSA+IDEpO1xuICAgIGNvbnNvbGUuYXNzZXJ0KGl0ZW00W1wieFwiXSA+IDEpO1xuICAgIGNvbnNvbGUuYXNzZXJ0KGl0ZW01W1wieFwiXSA+IDEpO1xuICAgIGNvbnNvbGUuYXNzZXJ0KHRoaXMuX3BxLmxlbmd0aCA9PT0gMCk7XG5cbiAgICAvLyBOb25lIGxlZnQgdG8gcG9wLlxuICAgIGxldCBpdGVtNiA9IHRoaXMuX3BxLnBvcCgpO1xuICAgIGNvbnNvbGUuYXNzZXJ0KGl0ZW02ID09PSB1bmRlZmluZWQpO1xuICB9XG59XG5cbmNsYXNzIFByb2ZpbGVDb250YWluZXJzIHtcbiAgcHJpdmF0ZSBfY29udGFpbmVyO1xuXG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIGxldCB0ZXN0cyA9IFt0aGlzLnRlc3RUcml2aWFsU3RhY2ssIHRoaXMudGVzdFRyaXZpYWxRdWV1ZSwgdGhpcy50ZXN0U3RhY2ssIHRoaXMudGVzdFF1ZXVlXTtcbiAgICB0ZXN0cy5mb3JFYWNoKCh0ZXN0KSA9PiB7XG4gICAgICB0aGlzLl9pbml0KCk7XG4gICAgICB0ZXN0LmJpbmQodGhpcykoKTtcbiAgICB9LCB0aGlzKTtcbiAgfVxuXG4gIHByaXZhdGUgX2luaXQoKTogdm9pZCB7XG4gIH1cblxuICBtYW55UHVzaChjb250YWluZXIpOiB2b2lkIHtcbiAgICBjb25zb2xlLmFzc2VydChjb250YWluZXIubGVuZ3RoID09PSAwKTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IDEwMDAwMDsgaSsrKSB7XG4gICAgICBjb250YWluZXIucHVzaChpKTtcbiAgICB9XG4gICAgY29uc29sZS5hc3NlcnQoY29udGFpbmVyLmxlbmd0aCA9PT0gMTAwMDAwKTtcbiAgfVxuXG4gIG1hbnlQdXNoUG9wKGNvbnRhaW5lcik6IHZvaWQge1xuICAgIGNvbnNvbGUuYXNzZXJ0KGNvbnRhaW5lci5sZW5ndGggPT09IDApO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgMTAwMDAwOyBpKyspIHtcbiAgICAgIGNvbnRhaW5lci5wdXNoKGkpO1xuICAgIH1cbiAgICBjb25zb2xlLmFzc2VydChjb250YWluZXIubGVuZ3RoID09PSAxMDAwMDApO1xuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCAxMDAwMDAgLSAxOyBpKyspIHtcbiAgICAgIGNvbnRhaW5lci5wb3AoKTtcbiAgICB9XG4gICAgY29uc29sZS5hc3NlcnQoY29udGFpbmVyLmxlbmd0aCA9PT0gMSk7XG4gICAgbGV0IHZhbCA9IGNvbnRhaW5lci5wb3AoKTtcbiAgICBjb25zb2xlLmFzc2VydChjb250YWluZXIubGVuZ3RoID09PSAwKTtcbiAgICBjb25zb2xlLmFzc2VydCh2YWwgPT09IDAgfHwgdmFsID09PSAxMDAwMDAgLSAxKTtcbiAgfVxuXG4gIHRlc3RUcml2aWFsU3RhY2soKTogdm9pZCB7XG4gICAgY29uc29sZS5sb2coXCJ0ZXN0VHJpdmlhbFN0YWNrXCIpO1xuXG4gICAgbGV0IGNvbnRhaW5lciA9IG5ldyBUcml2aWFsU3RhY2soKTtcbiAgICBjb25zb2xlLnRpbWUoXCJtYW55UHVzaFwiKTtcbiAgICB0aGlzLm1hbnlQdXNoKGNvbnRhaW5lcik7XG4gICAgY29uc29sZS50aW1lRW5kKFwibWFueVB1c2hcIik7XG5cbiAgICBjb250YWluZXIgPSBuZXcgVHJpdmlhbFN0YWNrKCk7XG4gICAgY29uc29sZS50aW1lKFwibWFueVB1c2hQb3BcIik7XG4gICAgdGhpcy5tYW55UHVzaFBvcChjb250YWluZXIpO1xuICAgIGNvbnNvbGUudGltZUVuZChcIm1hbnlQdXNoUG9wXCIpO1xuICB9XG5cbiAgdGVzdFRyaXZpYWxRdWV1ZSgpOiB2b2lkIHtcbiAgICBjb25zb2xlLmxvZyhcInRlc3RUcml2aWFsUXVldWVcIik7XG5cbiAgICBsZXQgY29udGFpbmVyID0gbmV3IFRyaXZpYWxRdWV1ZSgpO1xuICAgIGNvbnNvbGUudGltZShcIm1hbnlQdXNoXCIpO1xuICAgIHRoaXMubWFueVB1c2goY29udGFpbmVyKTtcbiAgICBjb25zb2xlLnRpbWVFbmQoXCJtYW55UHVzaFwiKTtcblxuICAgIGNvbnRhaW5lciA9IG5ldyBUcml2aWFsUXVldWUoKTtcbiAgICBjb25zb2xlLnRpbWUoXCJtYW55UHVzaFBvcFwiKTtcbiAgICB0aGlzLm1hbnlQdXNoUG9wKGNvbnRhaW5lcik7XG4gICAgY29uc29sZS50aW1lRW5kKFwibWFueVB1c2hQb3BcIik7XG4gIH1cblxuICB0ZXN0U3RhY2soKTogdm9pZCB7XG4gICAgY29uc29sZS5sb2coXCJ0ZXN0U3RhY2tcIik7XG5cbiAgICBsZXQgY29udGFpbmVyID0gbmV3IE15U3RhY2soMTAwMDAwMCk7XG4gICAgY29uc29sZS50aW1lKFwibWFueVB1c2hcIik7XG4gICAgdGhpcy5tYW55UHVzaChjb250YWluZXIpO1xuICAgIGNvbnNvbGUudGltZUVuZChcIm1hbnlQdXNoXCIpO1xuXG4gICAgY29udGFpbmVyID0gbmV3IE15U3RhY2soMTAwMDAwMCk7XG4gICAgY29uc29sZS50aW1lKFwibWFueVB1c2hQb3BcIik7XG4gICAgdGhpcy5tYW55UHVzaFBvcChjb250YWluZXIpO1xuICAgIGNvbnNvbGUudGltZUVuZChcIm1hbnlQdXNoUG9wXCIpO1xuICB9XG5cbiAgdGVzdFF1ZXVlKCk6IHZvaWQge1xuICAgIGNvbnNvbGUubG9nKFwidGVzdFF1ZXVlXCIpO1xuXG4gICAgbGV0IGNvbnRhaW5lciA9IG5ldyBNeVF1ZXVlKCk7XG4gICAgY29uc29sZS50aW1lKFwibWFueVB1c2hcIik7XG4gICAgdGhpcy5tYW55UHVzaChjb250YWluZXIpO1xuICAgIGNvbnNvbGUudGltZUVuZChcIm1hbnlQdXNoXCIpO1xuXG4gICAgY29udGFpbmVyID0gbmV3IE15UXVldWUoKTtcbiAgICBjb25zb2xlLnRpbWUoXCJtYW55UHVzaFBvcFwiKTtcbiAgICB0aGlzLm1hbnlQdXNoUG9wKGNvbnRhaW5lcik7XG4gICAgY29uc29sZS50aW1lRW5kKFwibWFueVB1c2hQb3BcIik7XG4gIH1cblxufVxuIl19
