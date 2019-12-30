var render_vertex = `

  varying vec2 texcoord;

  void main() 
  {
    texcoord = uv;

    vec4 modelViewPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * modelViewPosition;
  }

`;

var render_fragment = `

  uniform sampler2D reaction_diffusion;
  uniform sampler2D color_map;
  varying vec2 texcoord;

  void main() 
  {
    float v = texture2D(reaction_diffusion, texcoord).g;
    v *= 2.1;
    v = pow(v, 2.0);
    gl_FragColor = texture2D(color_map, vec2(v, 0.));
  }

`;