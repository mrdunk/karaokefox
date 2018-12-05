//canopies number of leaf sections, height of tree, materials
// https://www.babylonjs-playground.com/#LG3GS#93
// https://github.com/BabylonJS/Extensions/tree/master/TreeGenerators/SimplePineGenerator
var simplePineGenerator = function(canopies, height, width, trunkMaterial, leafMaterial, scene) {
	var nbL = canopies + 1;
  let trunkLen = height / nbL;
	var curvePoints = function(l, t) {
		var path = [];
		var step = l / t;
		for (var i = trunkLen; i < l + trunkLen; i += step ) {
			path.push(new BABYLON.Vector3(0, i, 0));
			path.push(new BABYLON.Vector3(0, i, 0 ));
		}
		return path;
	};

	var curve = curvePoints(height, nbL);

	var radiusFunction = function (i, distance) {
		var fact = 1;
		if (i % 2 == 0) { fact = .5; }
		var radius =  Math.max(0, (nbL * 2 - i - 1) * fact);
		return radius;
	};  

	var leaves = BABYLON.Mesh.CreateTube("tube", curve, 0, 10, radiusFunction, BABYLON.Mesh.CAP_ALL, scene);
  leaves.scaling.x = width / 10;
  leaves.scaling.z = width / 10;

  var trunk = BABYLON.Mesh.CreateCylinder("trunk", height/nbL, nbL*1.5 - nbL/2 - 1, nbL*1.5 - nbL/2 - 1, 12, 1, scene);
  trunk.position.y = trunkLen / 2;
  trunk.scaling.x = width / 10;
  trunk.scaling.z = width / 10;

  leaves.material = leafMaterial;
  trunk.material = trunkMaterial; 
  
  var tree = new BABYLON.Mesh.CreateBox("pine",1,scene);
  tree.isVisible = false;
  leaves.parent = tree;
  trunk.parent = tree; 
  return tree; 
}
