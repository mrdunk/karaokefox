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

  // debug
  ahead: BABYLON.Vector3;

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
    this.ahead = new BABYLON.Vector3(0, 0, 0);
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

      if(this._shaddows) {
        this._shaddows.getShadowMap().renderList.push(this._mesh);
      }

      let skeletonViewer = new BABYLON.Debug.SkeletonViewer(this._skeleton, this._mesh, this._scene);
      skeletonViewer.isEnabled = true; // Enable it
      skeletonViewer.color = BABYLON.Color3.Red(); // Change default color from white to red

      for(let index = 0; index < this._skeleton.bones.length; index++) {
        let bone = skeletons[0].bones[index];
        // console.log(bone.uniqueId, bone.id);
        switch(bone.id) {
          case "spine.head":
            this._bones.head = bone;
            break;
          case "spine.neck":
            this._bones["neck"] = bone;
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
        {adjustPitch:Math.PI*.5}
      );
      /*this._lookCtrlNeck = new BABYLON.BoneLookController(
        this._mesh,
        this._bones.neck,
        this._lookAtNeck,
        {adjustPitch:Math.PI*.5}
      );*/
    } catch(error) {
      // Prevent error messages in this section getting swallowed by Babylon.
      console.error(error);
    }
  }

  lookAt(target: BABYLON.Vector3) : void {
    this._lookAt = target;
    
    //var localPos1 = new BABYLON.Vector3(0, 10, 20);;

    this._scene.registerBeforeRender(function () {
      // TODO Can we optimise here? We probably copy more often than required.
      let neck = this._bones.neck;

      //let neckPosWorld = neck.getPosition(BABYLON.Space.WORLD, this._mesh);
      //let neckPosWorld = neck.getAbsolutePosition(this._mesh);
      //let targetDistance = BABYLON.Vector3.Distance(neckPosWorld, this._lookAt);
      //let neckPosLocal = neck.getLocalPositionFromAbsolute(neckPosWorld, this.mesh);
      let neckPosLocal = new BABYLON.Vector3(0, 44, 23);
      //this.ahead = neck.getAbsolutePositionFromLocal(new BABYLON.Vector3(neckPosLocal.x, neckPosLocal.y - targetDistance, neckPosLocal.z), this.mesh);
      //this.ahead = neck.getAbsolutePositionFromLocal(new BABYLON.Vector3(neckPosLocal.x, 100, neckPosLocal.z), this.mesh);
      neck.getAbsolutePositionFromLocalToRef(neckPosLocal, this._mesh, this.ahead);
      //this.ahead = this._skeleton.bones[0].getAbsolutePositionFromLocal(localPos1, this._mesh);
      //console.log(neckPosWorld, ahead, targetDistance);
      console.log(this.ahead);

      //this._lookAtNeck.x = (this.ahead.x + this._lookAt.x) / 2;
      //this._lookAtNeck.y = (this.ahead.y + this._lookAt.y) / 2;
      //this._lookAtNeck.z = (this.ahead.z + this._lookAt.z) / 2;
      //this._lookCtrlNeck.update();

      this._lookCtrlHead.update();
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
    this._scene = new BABYLON.Scene(this._engine);
    this._scene.ambientColor = new BABYLON.Color3(0.3, 0.3, 0.3);

    this._light = new BABYLON.DirectionalLight("dir01", new BABYLON.Vector3(0, -0.5, -1.0), this._scene);
    this._light.position = new BABYLON.Vector3(20, 150, 70);

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
    let debugBase = BABYLON.MeshBuilder.CreateBox("debugBase", {height: 5, width: 50, depth: 100}, this._scene);
    // Moving ball for the fox to watch.
    let targetHead = BABYLON.MeshBuilder.CreateSphere("targetHead", {}, this._scene);
    let targetNeck = BABYLON.MeshBuilder.CreateSphere("targetNeck", {diameterX: 10, diameterY: 10, diameterZ: 10}, this._scene);
    
    let fox = new Character(this._scene, shadowGenerator, FOX, () => {
      console.log("fox loaded");
      this._camera.target = fox.position;
      fox.lookAt(targetHead.position);
      fox.rotation.y = Math.PI;
    });

    let t1 = 0;
    let t2 = 0;
    let t3 = 1;
    let interval = setInterval( () => {
      t1 += .02;
      t2 += .03;
      t3 += .001;

      targetHead.position.x = 20 * Math.sin(t1);
      targetHead.position.y = 44 + 20 * Math.sin(t2);
      targetHead.position.z = 50;

      if(fox.ahead) {
        targetNeck.position.x = fox.ahead.x;
        targetNeck.position.y = fox.ahead.y;
        targetNeck.position.z = fox.ahead.z;
      }

      if(fox.rotation) {
        fox.rotation.y = Math.PI * t3;
      }
    }, 50);
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
