/**
 * Vector/matrix functions pulled and modified from gl-matrix library
 * https://github.com/toji/gl-matrix
 */

let vec3_minus = (a, b) =>// a.map((x,i)=>x-b[i]);
                         [a[0]-b[0],a[1]-b[1],a[2]-b[2]];
                        // This might be smaller since it looks like multiply

let vec3_cross = (a, b) => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0]
];

let vec3_normalize = a => {
    let len = a[0]*a[0] + a[1]*a[1] + a[2]*a[2];
    return a.map(x=>x/len);
};

let quat_setAxisAngle = (axis, rad) => {
    rad *= .5;
    let s = Math.sin(rad);
    return [s * axis[0], s * axis[1], s * axis[2], Math.cos(rad)];
};

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

let mat4_multiply = (a, b) => [
    b[0]*a[0] + b[1]*a[4] + b[2]*a[8] + b[3]*a[12],
    b[0]*a[1] + b[1]*a[5] + b[2]*a[9] + b[3]*a[13],
    b[0]*a[2] + b[1]*a[6] + b[2]*a[10] + b[3]*a[14],
    b[0]*a[3] + b[1]*a[7] + b[2]*a[11] + b[3]*a[15],
        b[4]*a[0] + b[5]*a[4] + b[6]*a[8] + b[7]*a[12],
        b[4]*a[1] + b[5]*a[5] + b[6]*a[9] + b[7]*a[13],
        b[4]*a[2] + b[5]*a[6] + b[6]*a[10] + b[7]*a[14],
        b[4]*a[3] + b[5]*a[7] + b[6]*a[11] + b[7]*a[15],
    b[8]*a[0] + b[9]*a[4] + b[10]*a[8] + b[11]*a[12],
    b[8]*a[1] + b[9]*a[5] + b[10]*a[9] + b[11]*a[13],
    b[8]*a[2] + b[9]*a[6] + b[10]*a[10] + b[11]*a[14],
    b[8]*a[3] + b[9]*a[7] + b[10]*a[11] + b[11]*a[15],
        b[12]*a[0] + b[13]*a[4] + b[14]*a[8] + b[15]*a[12],
        b[12]*a[1] + b[13]*a[5] + b[14]*a[9] + b[15]*a[13],
        b[12]*a[2] + b[13]*a[6] + b[14]*a[10] + b[15]*a[14],
        b[12]*a[3] + b[13]*a[7] + b[14]*a[11] + b[15]*a[15]
];

let mat4_fromRotationTranslationScale = (q, v, s) => {
    let x = q[0], y = q[1], z = q[2], w = q[3];
    let x2 = x + x;
    let y2 = y + y;
    let z2 = z + z;

    return [
        (1 - (y*y2 + z*z2)) * s[0],
        (x*y2 + w*z2) * s[0],
        (x*z2 - w*y2) * s[0],
        0,
            (x*y2 - w*z2) * s[1],
            (1 - (x*x2 + z*z2)) * s[1],
            (y*z2 + w*x2) * s[1],
            0,
        (x*z2 + w*y2) * s[2],
        (y*z2 - w*x2) * s[2],
        (1 - (x*x2 + y*y2)) * s[2],
        0,
            v[0],
            v[1],
            v[2],
            1
    ];
}

//__inline
let Transform_create = () => ({ p: [0,0,0], r: [0,0,0,1], s: [1,1,1] });

//__inline
let Transform_toMatrix = self => mat4_fromRotationTranslationScale(self.r, self.p, self.s);