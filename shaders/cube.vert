attribute vec3 a_position;
attribute vec3 a_normal;

uniform mat4 u_mvp;

varying vec3 v_color;

void main()
{
    gl_Position = u_mvp * vec4(a_position, 1);

    bool positive = a_normal.x + a_normal.y + a_normal.z > 0.;
    v_color = positive ? a_normal : 1. + a_normal;

    if (!(v_color.r > .9 && v_color.g < .1 && v_color.b < .1)) {
        v_color *= .3 + .5*clamp(dot(mat3(u_mvp)*a_normal, vec3(0,1,0)),0.,1.);
    }
}