uniform sampler2D u_tex;
uniform sampler2D u_old;
uniform sampler2D u_depth;
uniform mat4 u_reproject;

varying vec2 v_uv;

void main()
{
    float depth = texture2D(u_depth,v_uv).r;
    vec4 rp = u_reproject*vec4(v_uv*2.-1.,depth,1.);
    vec2 uv_off = rp.xy/rp.w*0.5+0.5;

    gl_FragColor = vec4(texture2D(u_tex, v_uv).rgb*0.1+texture2D(u_old,uv_off).rgb*0.9,1);
}
