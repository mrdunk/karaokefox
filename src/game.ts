///<reference path="3rdParty/babylon.gui.module.d.ts" />
///<reference path="plantGenerator.ts" />

let SCENEPATH = "scenes/";
let FOX = "fox.babylon";
let SCALE = 100;
let ANIM_MERGE_RATE = 0.05;
let SCENERY_RECURSION = 8;

interface AnimateRequest {
  name: string;
  loop: boolean;
  reversed: boolean;
  dirty?: boolean;
  runCount?: number;
  animation?: BABYLON.Animatable;
  cleanup?: boolean;
}

interface Coord {
  x: number;
  y: number;
  recursion: number;
}

class Star {
  private _scene: BABYLON.Scene;
  
  mesh: BABYLON.Mesh;

  constructor(scene: BABYLON.Scene) {
    this._scene = scene;
    var gl = new BABYLON.GlowLayer("glow", this._scene);

    let starMaterialW = new BABYLON.StandardMaterial("starMaterialW", this._scene);
    starMaterialW.emissiveColor = new BABYLON.Color3(1, 1, 1);
    let starMaterialR = new BABYLON.StandardMaterial("starMaterialR", this._scene);
    starMaterialR.emissiveColor = new BABYLON.Color3(1, 0.7, 0.7);
    let starMaterialG = new BABYLON.StandardMaterial("starMaterialG", this._scene);
    starMaterialG.emissiveColor = new BABYLON.Color3(0.7, 1, 0.7);
    let starMaterialB = new BABYLON.StandardMaterial("starMaterialB", this._scene);
    starMaterialB.emissiveColor = new BABYLON.Color3(0.7, 0.7, 1);

    let boxA = BABYLON.MeshBuilder.CreateBox("boxA", {}, this._scene);
    let boxB = BABYLON.MeshBuilder.CreateBox("boxB", {}, this._scene);
    let boxC = BABYLON.MeshBuilder.CreateBox("boxC", {}, this._scene);
    let boxD = BABYLON.MeshBuilder.CreateBox("boxD", {}, this._scene);
    boxB.rotate(BABYLON.Axis.X, Math.PI / 4);
    boxC.rotate(BABYLON.Axis.Y, Math.PI / 4);
    boxD.rotate(BABYLON.Axis.Z, Math.PI / 4);
    boxA.material = starMaterialW;
    boxB.material = starMaterialR;
    boxC.material = starMaterialG;
    boxD.material = starMaterialB;

    this.mesh = BABYLON.Mesh.CreateBox("star", 1, this._scene);
    this.mesh.isVisible = false;
    boxA.parent = this.mesh;
    boxB.parent = this.mesh;
    boxC.parent = this.mesh;
    boxD.parent = this.mesh;

    this.mesh.scaling.x = 0.5;
    this.mesh.scaling.y = 0.5;
    this.mesh.scaling.z = 0.5;
  }
}

class Character {
  private _scene: BABYLON.Scene;
  private _shaddows: BABYLON.ShadowGenerator;
  private _mesh: BABYLON.Mesh;
  private _skeleton: BABYLON.Skeleton;
  private _bones: {[id: string] : BABYLON.Bone};
  private _onLoaded: () => void;
  private _lookAt: BABYLON.Vector3;
  private _lookAtNeck: BABYLON.Vector3;
  private _lookCtrlHead: BABYLON.BoneLookController;
  private _lookCtrlNeck: BABYLON.BoneLookController;
  private _animations: {[id: string] : BABYLON.AnimationRange};
  private _animationQueue: AnimateRequest[];
  private _animationCurrent: AnimateRequest;
  private _animationLast: AnimateRequest;
  private _animationObservable: BABYLON.Observer<BABYLON.Scene>;

  position: BABYLON.Vector3;
  rotation: BABYLON.Vector3;

  constructor(scene: BABYLON.Scene,
              shaddows: BABYLON.ShadowGenerator,
              filename: string,
              onLoaded?: () => void) {
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

  onSceneLoad(meshes: BABYLON.Mesh[], particleSystems: [], skeletons: BABYLON.Skeleton[]) : void {
    try{
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

      if(this._shaddows) {
        this._shaddows.getShadowMap().renderList.push(this._mesh);
      }

        /*let skeletonViewer = new BABYLON.Debug.SkeletonViewer(this._skeleton, this._mesh, this._scene);
      skeletonViewer.isEnabled = true; // Enable it
      skeletonViewer.color = BABYLON.Color3.Red(); // Change default color from white to red*/

      // Parse all bones and store any we need later for future access.
      for(let index = 0; index < this._skeleton.bones.length; index++) {
        let bone = skeletons[0].bones[index];
        // console.log(bone.uniqueId, bone.id);
        switch(bone.id) {
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
      for(let a = 0; a < this._skeleton.getAnimationRanges().length; a++) {
        let animation = this._skeleton.getAnimationRanges()[a];
        //console.log(a, animation.name);
        this._animations[animation.name] = this._skeleton.getAnimationRanges()[a];
      }
      this._animationQueue.push({name: "walk", loop: true, reversed: false});

      this._lookCtrlHead = new BABYLON.BoneLookController(
        this._mesh,
        this._bones.head,
        this._lookAt,
        {adjustPitch: Math.PI / 2}
      );
      this._lookCtrlNeck = new BABYLON.BoneLookController(
        this._mesh,
        this._bones.neck,
        this._lookAtNeck,
        {adjustPitch: Math.PI / 2}
      );

      // Periodic updates.
      this._scene.registerBeforeRender(function () {
        if(! this.position.equals(this._mesh.position)) {
          this._mesh.position.x = this.position.x;
          this._mesh.position.y = this.position.y;
          this._mesh.position.z = this.position.z;
        }
        if(! this.rotation.equals(this._mesh.rotation)) {
          this._mesh.rotation.x = this.rotation.x;
          this._mesh.rotation.y = this.rotation.y;
          this._mesh.rotation.z = this.rotation.z;
        }

        this._playAnimation();
      }.bind(this));

      if(this._onLoaded) {
        this._onLoaded();
      }

    } catch(error) {
      // Prevent error messages in this section getting swallowed by Babylon.
      console.error(error);
    }
  }

  lookAt(target: BABYLON.Vector3) : void {
    this._lookAt = target;
    
    this._scene.registerBeforeRender(function () {
      // The neck should pint half way between straight forward and the
      // direction the head is pointing.
      let spineUpper = this._bones.spineupper;

      let targetLocal = spineUpper.getLocalPositionFromAbsolute(target, this._mesh);
      let targetLocalXY = new BABYLON.Vector3(targetLocal.x, targetLocal.y, 0);
      let targetLocalYZ = new BABYLON.Vector3(0, targetLocal.y, targetLocal.z);
      let aheadLocal = new BABYLON.Vector3(0, targetLocal.length(), 0);  // (l/r, f/b, u/d)

      let angleXY = BABYLON.Vector3.GetAngleBetweenVectors(targetLocalXY, aheadLocal, new BABYLON.Vector3(0, 0, 1));
      let angleYZ = BABYLON.Vector3.GetAngleBetweenVectors(targetLocalYZ, aheadLocal, new BABYLON.Vector3(-1, 0, 0));
      
      let lookAtNeckLocal =
        new BABYLON.Vector3(Math.sin(angleXY /2) * targetLocalXY.length(),
                            (Math.cos(angleXY /2) * targetLocalXY.length() +
                             Math.cos(angleYZ /2) * targetLocalYZ.length()) / 2,
                            Math.sin(angleYZ /2) * targetLocalYZ.length());
      spineUpper.getAbsolutePositionFromLocalToRef(lookAtNeckLocal, this._mesh, this._lookAtNeck);

      if(angleXY > -Math.PI / 2 && angleXY < Math.PI / 2 &&
         angleYZ > -Math.PI / 2 && angleYZ < Math.PI / 2) {
        // Only look at thing if it's not behind us.
        //this._lookCtrlNeck.update();
        //this._lookCtrlHead.update();
        this._bones.neck.rotate(BABYLON.Axis.Z, -angleXY / 2, BABYLON.Space.LOCAL);
        this._bones.neck.rotate(BABYLON.Axis.X, angleYZ / 2, BABYLON.Space.LOCAL);
        this._bones.neck.rotate(BABYLON.Axis.Y, -angleYZ * angleXY / (2 * Math.PI), BABYLON.Space.LOCAL);

        this._bones.head.rotate(BABYLON.Axis.Z, -angleXY / 2, BABYLON.Space.LOCAL);
        this._bones.head.rotate(BABYLON.Axis.X, angleYZ / 2, BABYLON.Space.LOCAL);
        this._bones.head.rotate(BABYLON.Axis.Y, -angleYZ * angleXY / (2 * Math.PI), BABYLON.Space.LOCAL);
      }
    }.bind(this));
  }

  /* Add animation to the list to be played. */
  queueAnimation(animateRequest: AnimateRequest) : void {
    this._animationQueue.push(animateRequest);
  }

  /* Pull new animations from queue and clean up finished animations.
   *
   * When _animationCurrent has ended, check _animationQueue for next animation.
   * If _animationLast.cleanup is set, stop the animation and delete.
   */
  private _playAnimation() : void {
    if(this._animationLast === undefined && this._animationQueue.length > 0) {
      this._animationLast = this._animationCurrent;
      this._animationCurrent = this._animationQueue.shift();
      console.log("New: " + this._animationCurrent.name);
      this._animationCurrent.runCount = 0;
    }
    this._serviceAnimation(this._animationCurrent, true);
    this._serviceAnimation(this._animationLast, false);

    if(this._animationLast && this._animationLast.cleanup) {
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
  private _serviceAnimation(animateRequest: AnimateRequest, current: boolean) : void {
    if(animateRequest === undefined) {
      return;
    }

    let weight = animateRequest.runCount ? animateRequest.animation.weight : 0;
    if(current && weight < 1) {
      weight += ANIM_MERGE_RATE;
      weight = Math.min(1, weight);
    } else if(!current && weight > 0) {
      weight -= ANIM_MERGE_RATE;
      weight = Math.max(0, weight);
    }

    if(animateRequest.animation) {
      animateRequest.animation.weight = weight;
    }

    if(weight <= 0) {
      // This old AnimateRequest has been faded out and needs stopped and removed.
      animateRequest.cleanup = true;
      return;
    }

    if(animateRequest.dirty === false) {
      // Nothing more to do.
      // Animations which end set animateRequest.dirty to true when they need
      // this method to continue past this point.
      return;
    }

    console.log(animateRequest.name, weight, current);


    if(animateRequest.runCount && !animateRequest.loop && animateRequest.reversed) {
      // Freeze frame at first frame in sequence.
      animateRequest.animation.stop();
      animateRequest.animation = this._scene.beginWeightedAnimation(
        this._skeleton,
        this._animations[animateRequest.name].from +2,
        this._animations[animateRequest.name].from +2,
        weight,
        false,
        0.01,
        function() {
          animateRequest.dirty = true;
        }.bind(this)
      );
    } else if(animateRequest.runCount && !animateRequest.loop) {
      // Freeze frame at last frame in sequence.
      animateRequest.animation.stop();
      animateRequest.animation = this._scene.beginWeightedAnimation(
        this._skeleton,
        this._animations[animateRequest.name].to,
        this._animations[animateRequest.name].to,
        weight,
        false,
        0.01,
        function() {
          animateRequest.dirty = true;
        }.bind(this)
      );
    } else if(animateRequest.reversed) {
      // Play an animation in reverse.
      animateRequest.animation = this._scene.beginWeightedAnimation(
        this._skeleton,
        this._animations[animateRequest.name].to,
        this._animations[animateRequest.name].from +2,
        weight,
        false,
        1,
        function() {
          animateRequest.dirty = true;
        }.bind(this)
      );
    } else {
      // Play an animation.
      animateRequest.animation = this._scene.beginWeightedAnimation(
        this._skeleton,
        this._animations[animateRequest.name].from +2,
        this._animations[animateRequest.name].to,
        weight,
        false,
        1,
        function() {
          animateRequest.dirty = true;
        }.bind(this)
      );
    }

    animateRequest.dirty = false;
    animateRequest.runCount++;
  }
}

class SceneryCell {
  coord: Coord;
  recursion: number;
  value: number;
  
  constructor(coord: Coord, value: number) {
    this.coord = coord;
    this.value = value;
  }

  parentCoordinates(depth: number) : Coord {
    let pX = 0;
    let pY = 0;
    for(let bit = depth -1; bit >= depth - this.coord.recursion +1; bit--) {
      let mask = 1 << bit;
      if(mask & this.coord.x) {
        pX |= mask;
      }
      if(mask & this.coord.y) {
        pY |= mask;
      }
      //console.log(bit, mask, pX, pY);
    }

    return {x: pX, y: pY, recursion: this.coord.recursion -1};
  }
}

class Scenery {
  private _scene: BABYLON.Scene;
  private _shaddows: BABYLON.ShadowGenerator;
  private _sideLen: number;
  private _sideMagnitude: number;
  private _cells: {[id: string] : SceneryCell};
  private _treeTypes: BABYLON.Mesh[];
  private _shrubTypes: BABYLON.Mesh[];
  private _treeSpecies: number;

  constructor(scene: BABYLON.Scene,
              shaddows: BABYLON.ShadowGenerator,
              size: number) {
    console.log("Mesh count before creating scenery: %c" +
                scene.meshes.length.toString(),
                "background: orange; color: white");
    this._scene = scene;
    this._shaddows = shaddows;

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

    this._sideLen = size;
    this._sideMagnitude = Math.floor(Math.log(size) / Math.log(2));
    console.assert(Math.pow(2, this._sideMagnitude) === this._sideLen &&
                   Boolean("size not a power of 2."));

    this._cells = {};

    for(let p = this._sideMagnitude; p >= 0; p--) {
      let segmentSize = Math.pow(2, p);
      let recursion = this._sideMagnitude - p;
      // console.log(p, segmentSize, recursion);
      for(let x = 0; x < this._sideLen; x += segmentSize) {
        for(let y = 0; y < this._sideLen; y += segmentSize) {
          if(this.getCell({x, y, recursion}) === undefined) {
            let parentCell = this.getCellParent({x, y, recursion});
            if(parentCell === undefined) {
              this.setCell({x, y, recursion}, 100);
            } else if(segmentSize === 1 &&
                      x <= this._sideLen / 2 && x >= this._sideLen / 2 - segmentSize &&
                      y <= this._sideLen / 2 && y >= this._sideLen / 2 - segmentSize) {
              // Center of map should always be empty.
              this.setCell({x, y, recursion}, 0);
            } else if(segmentSize === 1 &&
                      (x < 4 * segmentSize ||
                       y < 4 * segmentSize ||
                       x >= this._sideLen - 4 * segmentSize ||
                       y >= this._sideLen - 4 * segmentSize)) {
              // Dense vegetation round edge.
              this.setCell({x, y, recursion}, Math.random() * 200 + 50);
            } else {
              this.setCell({x, y, recursion},
                           parentCell.value * (0.5 + Math.random()));
            }
          }
        }
      }
    }
    
    /*for(let x = 0; x < this._sideLen; x++) {
      let line = "";
      for(let y = 0; y < this._sideLen; y++) {
        line += " " + Math.round(this.getCell({x, y, recursion: 5}).value);
      }
      console.log(line);
    }*/
    
    let treeSpacing = 5;
    let treeScale = 400;
    let trees = [];
    for(let x = 0; x < this._sideLen; x++) {
      for(let y = 0; y < this._sideLen; y++) {
        let cell = this.getCell({x, y, recursion: this._sideMagnitude});
        if(cell.value > 100) {
          let treeTypes = this._treeTypes.length;
          let tree = this._treeTypes[(x + y) % treeTypes].clone(
            this._treeTypes[(x + y) % treeTypes].name + "_" + x + "_" + y);
          //let tree = this._treeTypes[y % treeTypes].createInstance(
          //  this._treeTypes[y % treeTypes].name + "_" + x + "_" + y);
          tree.position.x = (x - this._sideLen / 2 + Math.random()) * treeSpacing;
          tree.position.y = 0;
          tree.position.z = (y - this._sideLen / 2 + Math.random()) * treeSpacing;
          let scale = cell.value / treeScale;
          tree.scaling = new BABYLON.Vector3(scale, scale, scale);
          trees.push(tree);
          //this._shaddows.getShadowMap().renderList.push(tree);
        } else if(cell.value > 50) {
          let shrubTypes = this._shrubTypes.length;
          let shrub = this._shrubTypes[(y + x) % shrubTypes].clone(
            this._shrubTypes[(y + x) % shrubTypes].name + "_" + x + "_" + y);
          shrub.position.x = (x - this._sideLen / 2 + Math.random()) * treeSpacing;
          shrub.position.y = 0;
          shrub.position.z = (y - this._sideLen / 2 + Math.random()) * treeSpacing;
          let scale = cell.value / treeScale;
          //shrub.scaling = new BABYLON.Vector3(scale, scale, scale);
          shrub.scaling.x *= scale;
          shrub.scaling.y *= scale;
          shrub.scaling.z *= scale;
          trees.push(shrub);
        }
      }
    }
    // Don't need the prototypes any more so delete them.
    this._treeTypes.forEach((node) => { node.dispose(); });
    this._shrubTypes.forEach((node) => { node.dispose(); });

    this._consolidateTrees(trees);

    //this._trees = BABYLON.Mesh.MergeMeshes(trees, true, true, null, true);
    //this._shaddows.getShadowMap().renderList.push(this._trees);
  }

  setCell(coord: Coord, value: number) : void {
    this._cells["" + coord.x + "," + coord.y + "|" + coord.recursion] =
      new SceneryCell(coord, value);
  }

  getCell(coord: Coord) : SceneryCell {
    //console.log("getCell", coord);
    if(coord.recursion === -1) {
      return this._cells["0,0|0"];
    }
    return this._cells["" + coord.x + "," + coord.y + "|" + coord.recursion];
  }

  getCellParent(coord: Coord) : SceneryCell {
    let cell = this.getCell(coord);
    if(cell === undefined) {
      return this.getCell(new SceneryCell(coord, -1).parentCoordinates(this._sideMagnitude));
    }
    return this.getCell(cell.parentCoordinates(this._sideMagnitude));
  }

  _consolidateTrees(trees: BABYLON.Mesh[]) : void {
    console.log("Mesh count before _consolidateTrees: %c" +
                this._scene.meshes.length.toString(),
                "background: orange; color: white");

    let countStart = 0;
    let countFinal = 0;

    let treeFoliageBucket = new Array(this._treeSpecies).fill(undefined);
    let treeTrunkBucket = new Array(this._treeSpecies).fill(undefined);
    trees.forEach((tree) => {
      // Collect the different tree species together in 2 collections:
      // trunks and leaves.
      let treeIndex = parseInt(tree.name.split("_")[1], 10);
      if(treeFoliageBucket[treeIndex] === undefined || treeTrunkBucket == undefined) {
        treeFoliageBucket[treeIndex] = [];
        treeTrunkBucket[treeIndex] = [];
      }
      tree.getChildMeshes(true).forEach((node) => {
        let nodeName = node.name.split(".")[1];
        if(nodeName === "leaves") {
          let pos = node.getAbsolutePosition();
          node.setParent(null);
          node.setAbsolutePosition(pos);
          treeFoliageBucket[treeIndex].push(node);
        } else if(nodeName === "trunk") {
          let pos = node.getAbsolutePosition();
          node.setParent(null);
          node.setAbsolutePosition(pos);
          treeTrunkBucket[treeIndex].push(node);
        } else {
          console.log(nodeName);
          console.assert(false && "Unknown tree component");
        }
      });
      // We have the component parts so don't need the original tree anymore.
      tree.dispose();
    });

    // Combine all trunks of the same species together.
    treeTrunkBucket.forEach((bucket) => {
      if(bucket.length) {
        countStart += bucket.length;
        countFinal++;
        let t = BABYLON.Mesh.MergeMeshes(bucket, true, true, null, true);
        // this._shaddows.getShadowMap().renderList.push(t);
      }
    }, this);
    // Combine all leaves of the same species together.
    treeFoliageBucket.forEach((bucket) => {
      if(bucket.length) {
        countStart += bucket.length;
        countFinal++;
        let t = BABYLON.Mesh.MergeMeshes(bucket, true, true, null, true);
        // this._shaddows.getShadowMap().renderList.push(t);
      }
    }, this);


    console.log("Tree component count before _consolidateTrees: %c" +
                countStart.toString(),
                "background: orange; color: white");
    console.log("Mesh count after _consolidateTrees: %c" +
                this._scene.meshes.length.toString(),
                "background: orange; color: white");
    console.log("Tree component count after _consolidateTrees: %c" +
                countFinal.toString(),
                "background: orange; color: white");
  }

  _createTree() : BABYLON.Mesh {
    if(Math.random() > 0.2) {
      return this._createTreeDeciduous();
    }
    return this._createTreePine();
  }

  _createTreePine() : BABYLON.Mesh {
    let canopies = Math.round(Math.random() * 3) + 4;
    let height = Math.round(Math.random() * 20) + 20;
    let width = 5;
    let trunkMaterial = new BABYLON.StandardMaterial("trunk", this._scene);
    trunkMaterial.diffuseColor = new BABYLON.Color3(0.3 + Math.random() * 0.2,
                                                    0.2 + Math.random() * 0.2,
                                                    0.2 + Math.random() * 0.1);
    trunkMaterial.specularColor = BABYLON.Color3.Black();
    let leafMaterial = new BABYLON.StandardMaterial("leaf", this._scene);
    leafMaterial.diffuseColor = new BABYLON.Color3(0.4 + Math.random() * 0.2,
                                                   0.5 + Math.random() * 0.4,
                                                   0.2 + Math.random() * 0.2);
    leafMaterial.specularColor = BABYLON.Color3.Red();

    let tree = PineGenerator(
      canopies, height, width, trunkMaterial, leafMaterial, this._scene);
    tree.setEnabled(false);
    tree.name += "_" + this._treeSpecies;
    this._treeSpecies++;
    return tree;
  }

  _createTreeDeciduous() : BABYLON.Mesh {
    let sizeBranch = 15 + Math.random() * 5;
    let sizeTrunk = 10 + Math.random() * 5;
    let radius = 1 + Math.random() * 4;
    let trunkMaterial = new BABYLON.StandardMaterial("trunk", this._scene);
    trunkMaterial.diffuseColor = new BABYLON.Color3(0.3 + Math.random() * 0.3,
                                                    0.2 + Math.random() * 0.3,
                                                    0.2 + Math.random() * 0.2);
    trunkMaterial.specularColor = BABYLON.Color3.Black();
    let leafMaterial = new BABYLON.StandardMaterial("leaf", this._scene);
    leafMaterial.diffuseColor = new BABYLON.Color3(0.4 + Math.random() * 0.2,
                                                   0.5 + Math.random() * 0.4,
                                                   0.2 + Math.random() * 0.2);
    leafMaterial.specularColor = BABYLON.Color3.Red();
    let tree = QuickTreeGenerator(
      sizeBranch, sizeTrunk, radius, trunkMaterial, leafMaterial, this._scene)
    tree.setEnabled(false);
    tree.name += "_" + this._treeSpecies;
    this._treeSpecies++;
    return tree;
  }

  _createShrub(forceSapling?: boolean) : BABYLON.Mesh {
    if(Math.random() < 0.1 || forceSapling) {
      let sapling = this._createTree();
      sapling.scaling.x *= 0.2;
      sapling.scaling.y *= 0.2;
      sapling.scaling.z *= 0.2;
      return sapling;
    }
    let sizeBranch = 10 + Math.random() * 20;
    let leafMaterial = new BABYLON.StandardMaterial("leaf", this._scene);
    leafMaterial.diffuseColor = new BABYLON.Color3(0.4 + Math.random() * 0.2,
                                                   0.5 + Math.random() * 0.4,
                                                   0.2 + Math.random() * 0.2);
    leafMaterial.specularColor = BABYLON.Color3.Gray();
    let tree = QuickShrub( sizeBranch, leafMaterial, this._scene)
    tree.setEnabled(false);
    tree.name += "_" + this._treeSpecies;
    this._treeSpecies++;
    return tree;
  }
}

interface CameraDescription {
  name: string;
  camera: BABYLON.Camera;
}

class Camera {
  private _canvas: HTMLCanvasElement;
  private _scene: BABYLON.Scene;
  private _cameraArc: BABYLON.ArcRotateCamera;
  private _cameraUniversal: BABYLON.UniversalCamera;
  //private _selectedActor: 0;
  private _target: BABYLON.Mesh;
  
  readonly cameras: CameraDescription[];

  constructor(canvas: HTMLCanvasElement, scene: BABYLON.Scene, actors: Character[]) {
    this._canvas = canvas;
    this._scene = scene;
    this.cameras = [];
    
    this._target = BABYLON.MeshBuilder.CreateSphere(
      "targetCamera", {diameterX: 0.1, diameterY: 0.1, diameterZ: 0.1}, this._scene);
    this._target.position = new BABYLON.Vector3(100, 40, 100);

    this._cameraArc = new BABYLON.ArcRotateCamera(
      "Camera", 0, 0, 2, new BABYLON.Vector3(0, 30, 0), this._scene);
    this._cameraArc.setPosition(new BABYLON.Vector3(5, 17, 30));
    this._cameraArc.minZ = 0.1;
    this._cameraArc.maxZ = 1000;
    this._cameraArc.upperBetaLimit = (Math.PI / 2) - 0.1;
    this._cameraArc.lowerRadiusLimit = 2;
    this._cameraArc.attachControl(this._canvas, true, false);
    this._cameraArc.setTarget(this._target.position);
    this._scene.activeCamera = this._cameraArc;
    this.cameras.push({"name": "ArcRotate", "camera": this._cameraArc});

    this._cameraUniversal = new BABYLON.UniversalCamera(
      "UniversalCamera", new BABYLON.Vector3(0, 0, -10), this._scene);
    this._cameraUniversal.setTarget(this._target.position);
    this.cameras.push({"name": "Univarsal", "camera": this._cameraUniversal});
    
    this._scene.onBeforeRenderObservable.add(() => {
      if(this._cameraArc.getTarget() != this._target.position) {
        this._cameraArc.setTarget(this._target.position);
      }
      //this._cameraArc.rebuildAnglesAndRadius();
    });
  }

  setTarget(targetPosition: BABYLON.Vector3) {
    //this._cameraArc.setTarget(targetPosition);
    //this._cameraUniversal.setTarget(targetPosition);
    console.log(targetPosition, this._target.position);

    let animation = new BABYLON.Animation(
      "cameraTargetEase",
      "position",
      30,
      BABYLON.Animation.ANIMATIONTYPE_VECTOR3,
      BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE);
		
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

  setEnabled(camera: CameraDescription): void {
    console.log(camera);
    if(camera.name === "ArcRotate") {
      this._cameraArc.setPosition(this._cameraUniversal.position);
      this._cameraArc.rebuildAnglesAndRadius();
      this._cameraUniversal.detachControl(this._canvas);
      this._cameraArc.attachControl(this._canvas, true, false);
      this._scene.activeCamera = this._cameraArc;
    } else {
      this._cameraArc.detachControl(this._canvas);
      this._cameraUniversal.attachControl(this._canvas, true);
      this._cameraUniversal.position = this._cameraArc.position;
      this._cameraUniversal.setTarget(this._cameraArc.getTarget());
      this._scene.activeCamera = this._cameraUniversal;
    }
  }
}

class Game {
  private _canvas: HTMLCanvasElement;
  private _engine: BABYLON.Engine;
  private _scene: BABYLON.Scene;
  private _light: BABYLON.DirectionalLight;
  private _skybox: BABYLON.Mesh;
  private _actors: Character[];
  private _camera: Camera;

  constructor(canvasElement : string) {
    // Create canvas and engine.
    this._canvas = document.getElementById(canvasElement) as HTMLCanvasElement;
    this._engine = new BABYLON.Engine(this._canvas, true);
    this._actors = [];
  }

  createScene() : void {
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

		// Lighting
    this._light = new BABYLON.DirectionalLight(
      "dir01", new BABYLON.Vector3(0, -0.5, -1.0), this._scene);
    this._light.position = new BABYLON.Vector3(20, 150, 70);
    let sun = BABYLON.MeshBuilder.CreateSphere("sun", {}, this._scene);
    sun.position = this._light.position;

    // Camera
    this._camera = new Camera(this._canvas, this._scene, this._actors);

    // Ground
    let ground = BABYLON.Mesh.CreateGround("ground", 1000, 1000, 1, this._scene, false);
    let groundMaterial = new BABYLON.StandardMaterial("ground", this._scene);
    groundMaterial.diffuseTexture = new BABYLON.Texture("textures/grass.png", this._scene);
    (<BABYLON.Texture>groundMaterial.diffuseTexture).uScale = 64;
    (<BABYLON.Texture>groundMaterial.diffuseTexture).vScale = 64;
    groundMaterial.diffuseColor = new BABYLON.Color3(0.4, 0.4, 0.4);
    groundMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
    ground.material = groundMaterial;
    ground.receiveShadows = true;

    // Shadows
    let shadowGenerator = new BABYLON.ShadowGenerator(1024, this._light);

    // Meshes
    // World positions: (l/r, u/d, f/b)
    // let debugBase = BABYLON.MeshBuilder.CreateBox("debugBase", {height: 0.01, width: 0.5, depth: 1}, this._scene);
    // debugBase.receiveShadows = true;

    // Moving ball for the fox to watch.
    let targetHead = BABYLON.MeshBuilder.CreateSphere(
      "targetHead", {diameterX: 0.01, diameterY: 0.01, diameterZ: 0.01}, this._scene);
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
    let star = new Star(this._scene);
    star.mesh.position = new BABYLON.Vector3(0, 2, 0);

    let scenery = new Scenery(this._scene, shadowGenerator, 32);
    this._scene.onPointerDown = function (evt, pickResult) {
        // if the click hits the ground object, we change the impact position
        if (pickResult.hit) {
            targetHead.position.x = pickResult.pickedPoint.x;
            targetHead.position.y = pickResult.pickedPoint.y;
            targetHead.position.z = pickResult.pickedPoint.z;
        }
    };
    
    setTimeout(function() {
      console.log("Add animations.");
      //this._animationQueue.push({name: "stationary", loop: false, reversed: false});
      fox.queueAnimation({name: "crouch", loop: false, reversed: false});
      fox.queueAnimation({name: "crouch", loop: false, reversed: true});
      //this._animationQueue.push({name: "stationary", loop: true, reversed: false});
    }.bind(this), 10000);

    setTimeout(function() {
      console.log("Add crouch animation.");
      fox.queueAnimation({name: "crouch", loop: false, reversed: false});
      fox.queueAnimation({name: "crouch", loop: false, reversed: true});
    }.bind(this), 20000);

    setTimeout(function() {
      console.log("Add walk animation.");
      fox.queueAnimation({name: "walk", loop: true, reversed: false});
    }.bind(this), 30000);
    
    this.controlPannel();
    console.log(this._scene.meshes.length);
  }

  doRender() : void {
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
  }

  controlPannel() : void {
    let advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI")

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
    checkbox.isChecked = true;
    checkbox.color = "green";
    checkbox.onIsCheckedChangedObservable.add((value) => {
			console.log("%c SkyBox:", "background: blue; color: white", value);
      this._skybox.setEnabled(value);
    });
    grid.addControl(checkbox, gridcount, 0);
    
    let header = BABYLON.GUI.Control.AddHeader(
      checkbox, "SkyBox", "180px", { isHorizontal: true, controlFirst: true});
    header.color = "white";
    header.height = "20px";
    header.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT
    grid.addControl(header, gridcount++, 1);
    
    let checkbox2 = new BABYLON.GUI.Checkbox();
    checkbox2.width = "20px";
    checkbox2.height = "20px";
    checkbox2.isChecked = true;
    checkbox2.color = "green";
    checkbox2.onIsCheckedChangedObservable.add((value) => {
			console.log("%c Fog:", "background: blue; color: white", value);
      if(value) {
        this._scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
      } else {
        //this._scene.fogMode = BABYLON.Scene.FOGMODE_LINEAR;
        //this._scene.fogStart = 100.0;
        //this._scene.fogEnd = 200.0;
        this._scene.fogMode = BABYLON.Scene.FOGMODE_NONE;
      }
    });
    grid.addControl(checkbox2, gridcount, 0);

    let header2 = BABYLON.GUI.Control.AddHeader(
      checkbox2, "Fog", "180px", { isHorizontal: true, controlFirst: true});
    header2.color = "white";
    header2.height = "20px";
    header2.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT
    grid.addControl(header2, gridcount++, 1);

    this._camera.cameras.forEach((camera) => {
      let radio = new BABYLON.GUI.RadioButton();
      radio.width = "20px";
      radio.height = "20px";
      radio.color = "green";
      radio.isChecked = (camera.name === "ArcRotate");
      radio.onIsCheckedChangedObservable.add((state) => {
        console.log(camera.name, state);
        if(state) {
          this._camera.setEnabled(camera);
        }
      });
      grid.addControl(radio, gridcount, 0);

      let radioHead = BABYLON.GUI.Control.AddHeader(
        radio, "Camera: " + camera.name, "180px", { isHorizontal: true, controlFirst: true});
      radioHead.color = "white";
      radioHead.height = "20px";
      radioHead.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT
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
