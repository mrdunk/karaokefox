class TreeFactory {
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

//# sourceMappingURL=plantGenerator.js.map
