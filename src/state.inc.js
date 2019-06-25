
let lerp = (a, b, t) => a + (b-a)*t;

let state_lerp = (a, b, t) =>
    b.map((p, i) => (i <= a.length) ? {
            x: lerp(a[i].x, p.x, t),
            y: lerp(a[i].y, p.y, t)
        } : {x:NaN,y:NaN});