//__include simplexNoise.glsl

varying vec2 v_uv;

void main()
{
    gl_FragColor = vec4( vec3(1,.8,.4) * .5+.5*snoise(vec3(5.*v_uv, 1)) , 1 );
}
