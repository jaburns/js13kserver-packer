let gfx_loadBufferObjects = (verts, tris, norms) => {
    let result = {t:tris.length};

    result.v = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, v);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);

    result.i = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, i);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, tris, gl.STATIC_DRAW);

    if (norms) {
        result.n = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, n);
        gl.bufferData(gl.ARRAY_BUFFER, norms, gl.STATIC_DRAW);
    }

    return result;
};

let gfx_flatShadeAndloadBufferObjects = (verts, tris) => {
    let newVerts = [];
    let newTris = [];
    let normals = [];
    let i = 0;

    tris.forEach((t,i) => {
        newVerts=newVerts.concat(verts[3*t],verts[3*t+1],verts[3*t+2]);
        newTris.push(i);
    });

    for (; i < newVerts.length; i += 9) {
        let a = [newVerts[i+0], newVerts[i+1], newVerts[i+2]];
        let b = [newVerts[i+3], newVerts[i+4], newVerts[i+5]];
        let c = [newVerts[i+6], newVerts[i+7], newVerts[i+8]];

        let ab = vec3_minus(b, a);
        let ac = vec3_minus(c, a);
        let normal = vec3_normalize(vec3_cross(ab, ac));

        normals = normals.concat([
            normal[0],normal[1],normal[2],
            normal[0],normal[1],normal[2],
            normal[0],normal[1],normal[2]
        ]);
    }
    
    return gfx_loadBufferObjects(
        new Float32Array(verts), 
        new Uint16Array(tris),
        new Float32Array(norms)
    );
};

let gfx_loadBufferObjectsFromModelFile = (arrayBuffer, mode16) => {
    let bytes = new Uint8Array(arrayBuffer);
    let scaleX = bytes[0] / 256 * 8;
    let scaleY = bytes[1] / 256 * 8;
    let scaleZ = bytes[2] / 256 * 8;
    let originX = bytes[3] / 256 * scaleX;
    let originY = bytes[4] / 256 * scaleY;
    let originZ = bytes[5] / 256 * scaleZ;
    let numVerts = bytes[6] + 256*bytes[7];
    let triOffset = 8 + 3*numVerts;

    let verts = [];
    let vertSub = bytes.subarray(8, triOffset);
    for (let i = 0; i < vertSub.length; i += 3) {
        verts.push(vertSub[i  ] / 256 * scaleX - originX);
        verts.push(vertSub[i+1] / 256 * scaleY - originY);
        verts.push(vertSub[i+2] / 256 * scaleZ - originZ);
    }
    
    let tris = new Uint16Array(mode16 ? bytes.buffer.slice(triOffset) : bytes.subarray(triOffset));

    return gfx_flatShadeAndloadBufferObjects(new Float32Array(verts), tris);
};

let gfx_loadModel = s =>
    fetch(s)
        .then(response => response.arrayBuffer())
        .then(buffer => gfx_loadBufferObjectsFromModelFile(buffer, s.endsWith('16')));
