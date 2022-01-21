/****************************************************
These are the vertex and fragment shaders used to render
the substance state texture reaction_diffusion that 
the Reaction-Diffusion simulation results in. The vertex
shader is just a minimal pass-through shader, while the
fragment shader computes normals from the gradient of the
reaction_diffusion texture and uses these to produce
Phong-illuminated results.
****************************************************/

let render_vertex = `
  void main() 
  {
    gl_Position = vec4(position, 1.0);
  }

`;

let render_fragment = `

  uniform sampler2D reaction_diffusion;
  uniform vec3 light_pos;

  uniform vec3 substance_color;
  uniform vec3 background_color;
  uniform vec3 specular_color;

  uniform float shininess;

  uniform float bump;

  const float edge0 = 0.150;
  const float edge1 = 0.190;
  const vec3 ambient = vec3(0.1);

  #define H(x, y) texture2D(reaction_diffusion, (frag2sim * gl_FragCoord.xy + vec2(x, y)) / simulation_resolution).g

  void main() 
  {
    vec3 normal = normalize(vec3(H(-1, 0) - H(1, 0), H(0, -1) - H(0, 1), 2.0 / bump));

    float h = H(0, 0);

    vec3 pos = vec3(frag2sim * gl_FragCoord.xy, h * bump);
    vec3 light_dir = normalize(light_pos - pos);

    float cos_theta = dot(normal, light_dir);

    // Transition between background and foreground (substance)
    float foregroundness = smoothstep(edge0, edge1, h);
    
      // Only interested in light reflected in z-directon since view direction always is [0,0,-1]
    float reflect_z = light_dir.z - 2.0 * cos_theta * normal.z;
    vec3 specular = pow(max(-reflect_z, 0.0), shininess) * foregroundness * specular_color;
    
    vec3 diffuse = max(cos_theta, 0.0) * mix(background_color, substance_color, foregroundness);

    gl_FragColor = vec4(ambient + diffuse + specular, 1);
  }

`;