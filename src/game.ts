///<reference path="3rdParty/babylon.d.ts" />

let SCENEPATH = "scenes/";
let FOX = "fox.babylon";
//let FOX = "fox.stl";
// let FOX = "skull.babylon";

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
    let that = this;
    BABYLON.SceneLoader.ImportMesh("", SCENEPATH, FOX, this._scene, function(meshes, particleSystems, skeletons) {
      var fox = meshes[0];
      fox.scaling = new BABYLON.Vector3(100, 100, 100);
      fox.rotation.y = Math.PI;

      for (var index = 0; index < meshes.length; index++) {
        shadowGenerator.getShadowMap().renderList.push(meshes[index]);
      }

      that._camera.target = fox.position;

      let interval = setInterval(async () => {
        let anim = that._scene.beginAnimation(skeletons[0], 1, 30, false, 0.5);
        await anim.waitAsync();
        anim = that._scene.beginAnimation(skeletons[0], 30, 1, false, 1);
        await anim.waitAsync();
        anim = that._scene.beginAnimation(skeletons[0], 32, 61, false, 0.5);
        await anim.waitAsync();
        anim = that._scene.beginAnimation(skeletons[0], 61, 32, false, 1.5);

        /*let anim1 = that._scene.beginWeightedAnimation(skeletons[0], 1, 30, 0.5, false, 0.5);
        let anim2 = that._scene.beginWeightedAnimation(skeletons[0], 32, 61, 0.5, false, 0.5);
        await anim1.waitAsync();
        await anim2.waitAsync();
        that._scene.beginWeightedAnimation(skeletons[0], 61, 32, 0.5, false, 0.5);
        that._scene.beginWeightedAnimation(skeletons[0], 30, 1, 0.5, false, 0.5);*/

        console.log("done");
      }, 3000);
    });

    /*BABYLON.SceneLoader.ImportMesh("", SCENEPATH, FOX, this._scene, function (newMeshes) {
      // Set the target of the camera to the first imported mesh
      newMeshes[0].scaling = new BABYLON.Vector3(100, 100, 100);
      newMeshes[0].material.backFaceCulling = true;
      this._camera.target = newMeshes[0];
    });*/
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
