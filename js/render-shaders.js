var render_vertex = `

  varying vec2 texcoord;

  void main() 
  {
    texcoord = position.xy + vec2(0.5,0.5);

    vec4 modelViewPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * modelViewPosition;
  }

`;

var render_fragment = `

  uniform sampler2D reaction_diffusion;
  varying vec2 texcoord;

  const vec3 color0 = vec3(215., 25., 28.) / 255.;
  const vec3 color1 = vec3(253.,174., 97.) / 255.;
  const vec3 color2 = vec3(255.,255.,191.) / 255.;
  const vec3 color3 = vec3(171.,217.,233.) / 255.;
  const vec3 color4 = vec3( 44.,123.,182.) / 255.;

  const vec3 r = vec3(.3, .4, .5);

  vec3 transfer(float v)
  { 
    if(v < r[0])
    {
      return mix(color0, color1, v / r[0]);
    }
    if(v < r[1])
    {
      return mix(color1, color2, (v - r[0]) / (r[1] - r[0]));
    }
    if(v < r[2])
    {
      return mix(color2, color3, (v - r[1]) / (r[2] - r[1]));
    }
    return mix(color3, color4, (v - r[2]) / (1. - r[2]));
  }

  void main() 
  {
    vec2 components = texture2D(reaction_diffusion, texcoord).xy;
    float v = components.g;
    gl_FragColor = vec4(transfer(v), 1.0);
  }

`;