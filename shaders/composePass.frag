//__include fxaa.glsl

uniform vec2 u_resolution;
uniform sampler2D u_tex;
uniform sampler2D u_bloom;

varying vec2 v_uv;

void main()
{
    gl_FragColor = fxaa(u_tex, v_uv * u_resolution, u_resolution);
    gl_FragColor.r += 1.5*texture2D(u_bloom, v_uv).r;
}
