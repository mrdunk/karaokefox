///<reference path="3rdParty/babylon.d.ts" />
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var SCENEPATH = "scenes/";
var FOX = "fox.babylon";
//let FOX = "fox.stl";
// let FOX = "skull.babylon";
var Game = /** @class */ (function () {
    function Game(canvasElement) {
        // Create canvas and engine.
        this._canvas = document.getElementById(canvasElement);
        this._engine = new BABYLON.Engine(this._canvas, true);
    }
    Game.prototype.createScene = function () {
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
        var ground = BABYLON.Mesh.CreateGround("ground", 1000, 1000, 1, this._scene, false);
        var groundMaterial = new BABYLON.StandardMaterial("ground", this._scene);
        groundMaterial.diffuseColor = new BABYLON.Color3(0.2, 0.2, 0.2);
        groundMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
        ground.material = groundMaterial;
        ground.receiveShadows = true;
        // Shadows
        var shadowGenerator = new BABYLON.ShadowGenerator(1024, this._light);
        // Meshes
        var that = this;
        BABYLON.SceneLoader.ImportMesh("", SCENEPATH, FOX, this._scene, function (meshes, particleSystems, skeletons) {
            var _this = this;
            var fox = meshes[0];
            fox.scaling = new BABYLON.Vector3(100, 100, 100);
            fox.rotation.y = Math.PI;
            for (var index = 0; index < meshes.length; index++) {
                shadowGenerator.getShadowMap().renderList.push(meshes[index]);
            }
            that._camera.target = fox.position;
            var interval = setInterval(function () { return __awaiter(_this, void 0, void 0, function () {
                var anim;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            anim = that._scene.beginAnimation(skeletons[0], 1, 30, false, 0.5);
                            return [4 /*yield*/, anim.waitAsync()];
                        case 1:
                            _a.sent();
                            anim = that._scene.beginAnimation(skeletons[0], 30, 1, false, 1);
                            return [4 /*yield*/, anim.waitAsync()];
                        case 2:
                            _a.sent();
                            anim = that._scene.beginAnimation(skeletons[0], 32, 61, false, 0.5);
                            return [4 /*yield*/, anim.waitAsync()];
                        case 3:
                            _a.sent();
                            anim = that._scene.beginAnimation(skeletons[0], 61, 32, false, 1.5);
                            /*let anim1 = that._scene.beginWeightedAnimation(skeletons[0], 1, 30, 0.5, false, 0.5);
                            let anim2 = that._scene.beginWeightedAnimation(skeletons[0], 32, 61, 0.5, false, 0.5);
                            await anim1.waitAsync();
                            await anim2.waitAsync();
                            that._scene.beginWeightedAnimation(skeletons[0], 61, 32, 0.5, false, 0.5);
                            that._scene.beginWeightedAnimation(skeletons[0], 30, 1, 0.5, false, 0.5);*/
                            console.log("done");
                            return [2 /*return*/];
                    }
                });
            }); }, 3000);
        });
        /*BABYLON.SceneLoader.ImportMesh("", SCENEPATH, FOX, this._scene, function (newMeshes) {
          // Set the target of the camera to the first imported mesh
          newMeshes[0].scaling = new BABYLON.Vector3(100, 100, 100);
          newMeshes[0].material.backFaceCulling = true;
          this._camera.target = newMeshes[0];
        });*/
    };
    Game.prototype.doRender = function () {
        var _this = this;
        // Run the render loop.
        this._engine.runRenderLoop(function () {
            _this._scene.render();
        });
        // The canvas/window resize event handler.
        window.addEventListener('resize', function () {
            _this._engine.resize();
        });
    };
    return Game;
}());
window.addEventListener('DOMContentLoaded', function () {
    // Create the game using the 'renderCanvas'.
    var game = new Game('renderCanvas');
    // Create the scene.
    game.createScene();
    // Start render loop.
    game.doRender();
});
//# sourceMappingURL=game.js.map