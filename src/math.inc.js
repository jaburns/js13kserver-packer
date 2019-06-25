/**
 * Vector/matrix functions pulled and modified from gl-matrix library
 * https://github.com/toji/gl-matrix
 */

let quat_setAxisAngle = (axis, rad) => {
    rad *= .5;
    let s = Math.sin(rad);
    return [s * axis[0], s * axis[1], s * axis[2], Math.cos(rad)];
};

/*

// Assumes out is either identity matrix or has only been written to by this function.
let mat4_perspective = (aspect, near, far) => {
//  let f = 1.0 / Math.tan(fovy / 2), nf;
    let f = 1, nf;  // Hard-coded FOV to PI / 2 here.

    let out = [
        1,
        0,
        0,
        0,
        0,
        1,
        0,
        0,
        0,
        0,
        1,
        0,
        0,
        0,
        0,1];
    out[0] = f / aspect;
    out[5] = f;
    out[11] = -1;
    if (far != null && far !== Infinity) {
        nf = 1 / (near - far);
        out[10] = (far + near) * nf;
        out[14] = (2 * far * near) * nf;
    } else {
        out[10] = -1;
        out[14] = -2 * near;
    }
    return out;
};
*/

// Assumes out is either identity matrix or has only been written to by this function.
let mat4_perspective = (aspect, near, far) => {
//  let f = 1.0 / Math.tan(fovy / 2), nf = 1 / (near - far)
    let f = 1, nf = 1 / (near - far);  // Hard-coded FOV to PI / 2 here.

    return [
        f / aspect, 0, 0, 0,
        0, f, 0, 0,
        0, 0, (far + near) * nf, -1,
        0, 0, (2 * far * near) * nf, 1
    ];
};

let mat4_multiply = (a, b) => {
    let a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
    let a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
    let a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
    let a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

    let out = []; // TODO inline everything in to one big return;

    // Cache only the current line of the second matrix
    let b0  = b[0], b1 = b[1], b2 = b[2], b3 = b[3];
    out[0] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
    out[1] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
    out[2] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
    out[3] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

    b0 = b[4]; b1 = b[5]; b2 = b[6]; b3 = b[7];
    out[4] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
    out[5] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
    out[6] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
    out[7] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

    b0 = b[8]; b1 = b[9]; b2 = b[10]; b3 = b[11];
    out[8] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
    out[9] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
    out[10] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
    out[11] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

    b0 = b[12]; b1 = b[13]; b2 = b[14]; b3 = b[15];
    out[12] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
    out[13] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
    out[14] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
    out[15] = b0*a03 + b1*a13 + b2*a23 + b3*a33;
    return out;
};

let mat4_fromRotationTranslationScale = (q, v, s) => {
    // Quaternion math
    let x = q[0], y = q[1], z = q[2], w = q[3];
    let x2 = x + x;
    let y2 = y + y;
    let z2 = z + z;

    let xx = x * x2;
    let xy = x * y2;
    let xz = x * z2;
    let yy = y * y2;
    let yz = y * z2;
    let zz = z * z2;
    let wx = w * x2;
    let wy = w * y2;
    let wz = w * z2;
    let sx = s[0];
    let sy = s[1];
    let sz = s[2];

    return [
    (1 - (yy + zz)) * sx
    ,(xy + wz) * sx
    ,(xz - wy) * sx
    ,0
    ,(xy - wz) * sy
    ,(1 - (xx + zz)) * sy
    ,(yz + wx) * sy
    ,0
    ,(xz + wy) * sz
    ,(yz - wx) * sz
    , (1 - (xx + yy)) * sz
    , 0
    , v[0]
    , v[1]
    , v[2]
    , 1];
}

/**
 * Other Stuff
 */

let Transform_create = () =>
    ({ p: [0,0,0], r: [0,0,0,1], s: [1,1,1] });

let Transform_toMatrix = self => 
    mat4_fromRotationTranslationScale(self.r, self.p, self.s);