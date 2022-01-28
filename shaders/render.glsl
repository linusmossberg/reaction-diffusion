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

  #define edge0 0.15
  #define edge1 0.19
  #define ambient 0.1

  #define H(x, y) texture2D(reaction_diffusion, (frag2sim * gl_FragCoord.xy + vec2(x, y)) / simulation_resolution).g

  void main() 
  {
    vec3 normal = normalize(vec3(H(-1, 0) - H(1, 0), H(0, -1) - H(0, 1), 2.0 / bump));

    float h = H(0, 0);

    vec3 pos = vec3(frag2sim * gl_FragCoord.xy, h * bump);
    vec3 light_dir = normalize(light_pos - pos);

    // Transition between background and foreground (substance)
    float foregroundness = smoothstep(edge0, edge1, h);

    vec3 diffuse_color = mix(background_color, substance_color, foregroundness);

    float cos_theta = dot(normal, light_dir);

    if(cos_theta < 0.0)
    {
      gl_FragColor = vec4(ambient * diffuse_color, 1);
    }
    else
    {
      // View direction is always (0,0,1) due to orthographic projection
      float reflect_z = max(2.0 * cos_theta * normal.z - light_dir.z, 0.0);
      vec3 specular = pow(reflect_z, shininess) * foregroundness * specular_color;
      gl_FragColor = vec4((ambient + cos_theta) * diffuse_color + specular, 1);
    }
  }

`;