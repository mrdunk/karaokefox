QuickShrub = function(sizeBranch, leafMaterial, scene) {

    var tree = new BABYLON.Mesh("shrub", scene);
    tree.isVisible = false;
    
    var leaves = new BABYLON.Mesh("leaves", scene);
    
    var vertexData = BABYLON.VertexData.CreateSphere({segments:2, diameter:sizeBranch});
    
    vertexData.applyToMesh(leaves, false);

    var positions = leaves.getVerticesData(BABYLON.VertexBuffer.PositionKind);
    var indices = leaves.getIndices();
    var numberOfPoints = positions.length/3;

    var map = [];

    var v3 = BABYLON.Vector3;
    for (var i=0; i < numberOfPoints; i++) {
        var p = new v3(positions[i*3], positions[i*3+1], positions[i*3+2]);

        var found = false;
        for (var index=0; index < map.length && !found; index++) {
            var array = map[index];
            var p0 = array[0];
            if (p0.equals (p) || (p0.subtract(p)).lengthSquared() < 0.01){
                array.push(i*3);
                found = true;
            }
        }
        if (!found) {
            var array = [];
            array.push(p, i*3);
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

    map.forEach(function(array) {
      var index, min = -sizeBranch/5, max = sizeBranch/5;
      var rx = randomNumber(min,max);
      var ry = randomNumber(min,max);
      var rz = randomNumber(min,max);

      for (index = 1; index<array.length; index++) {
        var i = array[index];
        positions[i] += rx;
        positions[i+2] += rz;
        if(positions[i+1] < 0) {
          positions[i+1] = -sizeBranch/2;
        } else {
          positions[i+1] += ry;
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
    leaves.position.y = leaves.scaling.y * sizeBranch/2 ;
    
    leaves.parent = tree;
    return tree;
};
