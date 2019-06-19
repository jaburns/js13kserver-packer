#ifdef VERTEX

    attribute vec2 i_position;

    void main()
    {
        gl_Position = vec4(i_position, 0, 1);
    }

#endif
#ifdef FRAGMENT

    void main()
    {
        gl_FragColor = vec4(1, 1, 1, 1);
    }

#endif