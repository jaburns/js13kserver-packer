//__include simplexNoise.glsl

varying vec3 v_color;
varying vec3 v_position;

void main()
{
    float noise = .8+.2*simplexNoise(v_position * 10.);
    gl_FragColor = vec4(v_color * noise, 1);
}