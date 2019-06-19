#define FRAGMENT

precision highp float;

uniform sampler2D u_tex;
uniform vec2 u_resolution;

varying vec2 v_uv;

#ifdef VERTEX

    attribute vec2 i_position;

    void main()
    {
        gl_Position = vec4(i_position, 0, 1);
        v_uv = i_position.xy*0.5 + 0.5;
    }

#endif
#ifdef FRAGMENT

    vec2 sampleTap(vec4 tap, vec2 dir)
    {
        dir /= u_resolution;
        vec4 outTap = texture2D(u_tex, v_uv + dir);
        return (outTap - tap).r * dir;
    }

    void main()
    {
        vec4 tap = texture2D(u_tex, v_uv);

        vec2 dir = normalize(
              sampleTap(tap, vec2( 1.5, 0.))
            + sampleTap(tap, vec2(-1.5, 0.))
            + sampleTap(tap, vec2(0., -1.5))
            + sampleTap(tap, vec2(0.,  1.5))
            + sampleTap(tap, vec2( 1.5,  1.5))
            + sampleTap(tap, vec2( 1.5, -1.5))
            + sampleTap(tap, vec2(-1.5, -1.5))
            + sampleTap(tap, vec2(-1.5,  1.5))
        );

        gl_FragColor = vec4(dir*0.5+0.5, 1, 1);
    }

#endif