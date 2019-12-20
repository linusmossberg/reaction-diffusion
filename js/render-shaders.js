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

  void main() 
  {
    vec2 components = texture2D(reaction_diffusion, texcoord).xy;
    float v = pow(components.r, 2.0);
    gl_FragColor = vec4(v, v, v, 1.0);
  }

`;