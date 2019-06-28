//__include fxaa.glsl

uniform vec2 u_resolution;
uniform sampler2D u_tex;

varying vec2 v_uv;

void main()
{
    vec2 uv = v_uv;
    
    uv.x += .01 * sin(uv.y*20.);
    uv.y += .01 * sin(uv.x*20.);
    
    gl_FragColor = fxaa(u_tex, uv * u_resolution, u_resolution);
}
