uniform mat4 u_mvp;

varying vec3 v_color;

#ifdef VERTEX

    attribute vec3 i_position;

    void main()
    {
        gl_Position = u_mvp * vec4(i_position, 1);
        v_color = i_position;
    }

#endif
#ifdef FRAGMENT

    void main()
    {
        gl_FragColor = vec4(v_color, 1);
    }

#endif
