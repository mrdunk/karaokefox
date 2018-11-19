///<reference path="3rdParty/babylon.d.ts" />

let SCENEPATH = "scenes/";
let FOX = "fox.babylon";
//let FOX = "fox.stl";
// let FOX = "skull.babylon";
let SCALE = 100;


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
      this._mesh.scaling = new BABYLON.Vector3(SCALE, SCALE, SCALE);
      //this._mesh.receiveShadows = true;
      //this._mesh.convertToFlatShadedMesh();

      if(this._shaddows) {
        this._shaddows.getShadowMap().renderList.push(this._mesh);
      }

      let skeletonViewer = new BABYLON.Debug.SkeletonViewer(this._skeleton, this._mesh, this._scene);
      skeletonViewer.isEnabled = true; // Enable it
      skeletonViewer.color = BABYLON.Color3.Red(); // Change default color from white to red

      for(let index = 0; index < this._skeleton.bones.length; index++) {
        let bone = skeletons[0].bones[index];
        console.log(bone.uniqueId, bone.id);
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
        }
      }

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
      }.bind(this));

      //this._scene.beginAnimation(this._skeleton, 1, 30, true);

      if(this._onLoaded) {
        this._onLoaded();
      }

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
      
      var lookAtNeckLocal =
        new BABYLON.Vector3(Math.sin(angleXY /2) * targetLocalXY.length(),
                            (Math.cos(angleXY /2) * targetLocalXY.length() +
                             Math.cos(angleYZ /2) * targetLocalYZ.length()) / 2,
                            Math.sin(angleYZ /2) * targetLocalYZ.length());
      spineUpper.getAbsolutePositionFromLocalToRef(lookAtNeckLocal, this._mesh, this._lookAtNeck);

      if(angleXY > -Math.PI / 2 && angleXY < Math.PI / 2 && angleYZ > -Math.PI / 2 && angleYZ < Math.PI / 2) {
        // Only look at thing if it's not behind us.
        this._lookCtrlNeck.update();
        this._lookCtrlHead.update();
      }
    }.bind(this));
  }
}

class Game {
  private _canvas: HTMLCanvasElement;
  private _engine: BABYLON.Engine;
  private _scene: BABYLON.Scene;
  private _camera: BABYLON.ArcRotateCamera;
  private _light: BABYLON.DirectionalLight;

  constructor(canvasElement : string) {
    // Create canvas and engine.
    this._canvas = document.getElementById(canvasElement) as HTMLCanvasElement;
    this._engine = new BABYLON.Engine(this._canvas, true);
  }

  createScene() : void {
    BABYLON.SceneLoader.CleanBoneMatrixWeights = true;
    this._scene = new BABYLON.Scene(this._engine);
    this._scene.ambientColor = new BABYLON.Color3(0.3, 0.3, 0.3);

    this._light = new BABYLON.DirectionalLight(
      "dir01", new BABYLON.Vector3(0, -0.5, -1.0), this._scene);
    this._light.position = new BABYLON.Vector3(20, 150, 70);
    let sun = BABYLON.MeshBuilder.CreateSphere("sun", {}, this._scene);
    sun.position = this._light.position;

    this._camera = new BABYLON.ArcRotateCamera("Camera", 0, 0, 10, new BABYLON.Vector3(0, 30, 0), this._scene);
    this._camera.setPosition(new BABYLON.Vector3(20, 70, 120));
    this._camera.minZ = 10;
    this._camera.maxZ = 1000;
    this._camera.attachControl(this._canvas, true);

    // Ground
    let ground = BABYLON.Mesh.CreateGround("ground", 1000, 1000, 1, this._scene, false);
    let groundMaterial = new BABYLON.StandardMaterial("ground", this._scene);
    groundMaterial.diffuseColor = new BABYLON.Color3(0.2, 0.2, 0.2);
    groundMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
    ground.material = groundMaterial;
    ground.receiveShadows = true;

    // Shadows
    let shadowGenerator = new BABYLON.ShadowGenerator(1024, this._light);

    // Meshes
    // World positions: (l/r, u/d, f/b)
    let debugBase = BABYLON.MeshBuilder.CreateBox("debugBase", {height: 1, width: 50, depth: 100}, this._scene);
    debugBase.receiveShadows = true;
    // Moving ball for the fox to watch.
    let targetHead = BABYLON.MeshBuilder.CreateSphere("targetHead", {}, this._scene);
    targetHead.position = this._camera.position.clone();
    shadowGenerator.getShadowMap().renderList.push(targetHead);
    
    let fox = new Character(this._scene, shadowGenerator, FOX, () => {
      console.log("fox loaded");
      this._camera.target = fox.position;
      fox.lookAt(targetHead.position);
      fox.rotation.y = Math.PI;
    });

    /*let t1 = 0;
    let t2 = 0;
    let t3 = 1;
    let t4 = 0;
    let interval = setInterval( () => {
      t1 += .02;
      t2 += .03;
      t3 += .001;
      t4 += .02;

      targetHead.position.x = 20 * Math.sin(t1);
      targetHead.position.y = 44 + 20 * Math.sin(t2);
      targetHead.position.z = 50;

      if(fox.rotation) {
        fox.rotation.y = Math.PI * t3;
      }
      if(fox.position) {
        fox.position.x = 20 * Math.sin(t4);
        fox.position.z = 20 * Math.cos(t4);
      }
    }, 50);*/

    this._scene.onPointerDown = function (evt, pickResult) {
        // if the click hits the ground object, we change the impact position
        if (pickResult.hit) {
            targetHead.position.x = pickResult.pickedPoint.x;
            targetHead.position.y = pickResult.pickedPoint.y;
            targetHead.position.z = pickResult.pickedPoint.z;
        }
    };
  }

  doRender() : void {
    // Run the render loop.
    this._engine.runRenderLoop(() => {
      this._scene.render();
    });

    // The canvas/window resize event handler.
    window.addEventListener('resize', () => {
      this._engine.resize();
    });
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
