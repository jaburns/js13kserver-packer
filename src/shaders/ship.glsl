uniform mat4 u_mvp;

#ifdef VERTEX

    attribute vec2 i_position;

    void main()
    {
        gl_Position = u_mvp * vec4(i_position, 0, 1);
    }

#endif
#ifdef FRAGMENT

    void main()
    {
        gl_FragColor = vec4(0.4, 0.4, 0.4, 1);
    }

#endif
