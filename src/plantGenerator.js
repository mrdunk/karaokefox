//canopies number of leaf sections, height of tree, materials
// https://www.babylonjs-playground.com/#LG3GS#93
// https://github.com/BabylonJS/Extensions/tree/master/TreeGenerators/SimplePineGenerator
function PineGenerator(canopies, height, width, trunkMaterial, leafMaterial, scene) {
    var nbL = canopies + 1;
    var trunkLen = height / nbL;
    var curvePoints = function (l, t) {
        var path = [];
        var step = l / t;
        for (var i = trunkLen; i < l + trunkLen; i += step) {
            path.push(new BABYLON.Vector3(0, i, 0));
            path.push(new BABYLON.Vector3(0, i, 0));
        }
        return path;
    };
    var curve = curvePoints(height, nbL);
    var radiusFunction = function (i, distance) {
        var fact = 1;
        if (i % 2 == 0) {
            fact = .5;
        }
        var radius = Math.max(0, (nbL * 2 - i - 1) * fact);
        return radius;
    };
    var leaves = BABYLON.Mesh.CreateTube("leaves", curve, 0, 10, radiusFunction, BABYLON.Mesh.CAP_ALL, scene);
    leaves.scaling.x = width / 10;
    leaves.scaling.z = width / 10;
    var trunk = BABYLON.Mesh.CreateCylinder("trunk", height / nbL, nbL * 1.5 - nbL / 2 - 1, nbL * 1.5 - nbL / 2 - 1, 12, 1, scene);
    trunk.position.y = trunkLen / 2;
    trunk.scaling.x = width / 10;
    trunk.scaling.z = width / 10;
    leaves.material = leafMaterial;
    trunk.material = trunkMaterial;
    var tree = BABYLON.Mesh.CreateBox("pine", 1, scene);
    tree.isVisible = false;
    leaves.parent = tree;
    trunk.parent = tree;
    return tree;
}
function QuickTreeGenerator(sizeBranch, sizeTrunk, radius, trunkMaterial, leafMaterial, scene) {
    var leaves = new BABYLON.Mesh("leaves", scene);
    var vertexData = BABYLON.VertexData.CreateSphere({ segments: 2, diameter: sizeBranch });
    vertexData.applyToMesh(leaves, false);
    var positions = leaves.getVerticesData(BABYLON.VertexBuffer.PositionKind);
    var indices = leaves.getIndices();
    var numberOfPoints = positions.length / 3;
    var map = [];
    var v3 = BABYLON.Vector3;
    for (var i = 0; i < numberOfPoints; i++) {
        var p = new v3(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
        var found = false;
        for (var index = 0; index < map.length && !found; index++) {
            var array = map[index];
            var p0 = array[0];
            if (p0.equals(p) || (p0.subtract(p)).lengthSquared() < 0.01) {
                array.push(i * 3);
                found = true;
            }
        }
        if (!found) {
            var array = [];
            array.push(p, i * 3);
            map.push(array);
        }
    }
    var randomNumber = function (min, max) {
        if (min == max) {
            return (min);
        }
        var random = Math.random();
        return ((random * (max - min)) + min);
    };
    map.forEach(function (array) {
        var index, min = -sizeBranch / 10, max = sizeBranch / 10;
        var rx = randomNumber(min, max);
        var ry = randomNumber(min, max);
        var rz = randomNumber(min, max);
        for (index = 1; index < array.length; index++) {
            var i = array[index];
            positions[i] += rx;
            positions[i + 1] += ry;
            positions[i + 2] += rz;
        }
    });
    leaves.setVerticesData(BABYLON.VertexBuffer.PositionKind, positions);
    var normals = [];
    BABYLON.VertexData.ComputeNormals(positions, indices, normals);
    leaves.setVerticesData(BABYLON.VertexBuffer.NormalKind, normals);
    leaves.convertToFlatShadedMesh();
    leaves.material = leafMaterial;
    leaves.position.y = sizeTrunk + sizeBranch / 2 - 2;
    var trunk = BABYLON.Mesh.CreateCylinder("trunk", sizeTrunk, radius - 2 < 1 ? 1 : radius - 2, radius, 10, 2, scene);
    trunk.position.y = sizeTrunk / 2;
    trunk.material = trunkMaterial;
    trunk.convertToFlatShadedMesh();
    var tree = BABYLON.Mesh.CreateBox("tree", 1, scene);
    tree.isVisible = false;
    leaves.parent = tree;
    trunk.parent = tree;
    return tree;
}
;
function QuickShrub(sizeBranch, leafMaterial, scene) {
    var tree = new BABYLON.Mesh("shrub", scene);
    tree.isVisible = false;
    var leaves = new BABYLON.Mesh("leaves", scene);
    var vertexData = BABYLON.VertexData.CreateSphere({ segments: 2, diameter: sizeBranch });
    vertexData.applyToMesh(leaves, false);
    var positions = leaves.getVerticesData(BABYLON.VertexBuffer.PositionKind);
    var indices = leaves.getIndices();
    var numberOfPoints = positions.length / 3;
    var map = [];
    var v3 = BABYLON.Vector3;
    for (var i = 0; i < numberOfPoints; i++) {
        var p = new v3(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
        var found = false;
        for (var index = 0; index < map.length && !found; index++) {
            var array = map[index];
            var p0 = array[0];
            if (p0.equals(p) || (p0.subtract(p)).lengthSquared() < 0.01) {
                array.push(i * 3);
                found = true;
            }
        }
        if (!found) {
            var array = [];
            array.push(p, i * 3);
            map.push(array);
        }
    }
    var randomNumber = function (min, max) {
        if (min == max) {
            return (min);
        }
        var random = Math.random();
        return ((random * (max - min)) + min);
    };
    map.forEach(function (array) {
        var index, min = -sizeBranch / 5, max = sizeBranch / 5;
        var rx = randomNumber(min, max);
        var ry = randomNumber(min, max);
        var rz = randomNumber(min, max);
        for (index = 1; index < array.length; index++) {
            var i = array[index];
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
    var normals = [];
    BABYLON.VertexData.ComputeNormals(positions, indices, normals);
    leaves.setVerticesData(BABYLON.VertexBuffer.NormalKind, normals);
    leaves.convertToFlatShadedMesh();
    leaves.material = leafMaterial;
    leaves.scaling.y = randomNumber(0.1, 1);
    leaves.position.y = leaves.scaling.y * sizeBranch / 2;
    leaves.parent = tree;
    return tree;
}
;
//# sourceMappingURL=plantGenerator.js.map