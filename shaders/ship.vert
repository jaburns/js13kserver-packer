
uniform mat4 u_mvp;

attribute vec3 a_position;
attribute vec3 a_normal;

varying vec3 v_color;
varying vec3 v_position;

void main()
{
    gl_Position = u_mvp * vec4(a_position, 1);

    bool positive = a_normal.x + a_normal.y + a_normal.z > 0.;
    v_color = positive ? a_normal : 1. + a_normal;
    v_position = a_position;
}