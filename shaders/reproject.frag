uniform sampler2D u_tex;
uniform sampler2D u_old;
uniform sampler2D u_depth;

varying vec2 v_uv;

void main()
{
    gl_FragColor = vec4(texture2D(u_tex, v_uv).rgb*0.1+texture2D(u_old,v_uv).rgb*0.9,1);
}
