uniform mat4 u_mvp;

attribute vec3 a_position;

varying vec4 v_color;

void main()
{
    gl_Position = u_mvp * vec4(a_position, 1);
    v_color = a_position;
}