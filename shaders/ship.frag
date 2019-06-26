//__include utils.inc

varying vec3 v_color;

void main()
{
    gl_FragColor = vec4(doMath(v_color), 1);
}