

let model_buildBuffers = m8 => {
    let bytes = new Uint8Array(m8);
    let scaleX = bytes[0] / 256 * 8;
    let scaleY = bytes[1] / 256 * 8;
    let scaleZ = bytes[2] / 256 * 8;
    let originX = bytes[3] / 256 * scaleX;
    let originY = bytes[4] / 256 * scaleY;
    let originZ = bytes[5] / 256 * scaleZ;
    let numVerts = bytes[6];

    let verts = [];
    let vertSub = bytes.subarray(7, 7 + numVerts*3);
    for (let i = 0; i < vertSub.length; i += 3) {
        verts.push(vertSub[i  ] / 256 * scaleX - originX);
        verts.push(vertSub[i+1] / 256 * scaleY - originY);
        verts.push(vertSub[i+2] / 256 * scaleZ - originZ);
    }

    let tris = bytes.subarray(7 + numVerts*3);

    let v = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, v);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);

    let i = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, i);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(tris), gl.STATIC_DRAW);

    return {v,i,t:tris.length};
};



let model_import = s =>
    fetch(s)
        .then(response => response.arrayBuffer())
        .then(buffer => model_buildBuffers(buffer));
