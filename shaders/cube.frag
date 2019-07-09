varying vec3 v_color;
varying vec3 v_normal;
varying vec3 v_position;

void main()
{
    vec3 color = v_color;

//  if (!(color.r > .9 && color.g < .1 && color.b < .1))
//  {
        float brightness = clamp(10. - dot(v_position, v_position), 0., 1.);
//      float angle = clamp(dot(normalize(v_position), normalize(v_normal)), 0., 1.);
//
//      color *= .3 + .5*brightness;
//  }

    color = vec3(brightness);

    gl_FragColor = vec4(color, 1);
}