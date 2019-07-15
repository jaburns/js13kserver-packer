attribute vec2 a_position;

varying vec3 v_pos;

void main()
{

    gl_Position = vec4(a_position, 0, 1);
    v_pos = vec3(a_position.xy,1);
}