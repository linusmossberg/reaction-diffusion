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

  varying vec2 texcoord;

  void main() 
  {
    texcoord = uv;

    vec4 modelViewPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * modelViewPosition;
  }

`;

let render_fragment = `

  uniform sampler2D reaction_diffusion;
  uniform vec3 light_pos;

  uniform vec3 substance_color;
  uniform vec3 background_color;
  uniform vec3 specular_color;

  uniform float shininess;

  // Defines the finite differences step size.
  // smaller values => larger gradient => more bump
  uniform float step;

  const float edge0 = 0.150;
  const float edge1 = 0.190;
  const vec3 ambient = vec3(0.1);

  varying vec2 texcoord;

  float height(float x_offset, float y_offset)
  {
    return texture2D(reaction_diffusion, texcoord + vec2(x_offset, y_offset) / resolution).g;
  }

  vec3 normal()
  {
    float
                            h10 = height(0.0, 1.0),
    h01 = height(-1.0, 0.0),                       h21 = height(1.0, 0.0),
                            h12 = height(0.0,-1.0);

    return normalize(cross(vec3(step, 0.0, h21 - h01),
                           vec3(0.0, step, h10 - h12)));
  }

  void main() 
  {
    vec3 normal = normal();

    vec3 texel_pos = vec3(texcoord * resolution, 0.0);
    vec3 light_dir = normalize(light_pos - texel_pos);

    float cos_theta = dot(normal, light_dir);

    vec3 diffuse_color = background_color;

    float h = height(0.0, 0.0);

    vec3 specular = vec3(0.0);
    
    if(h > edge0)
    {
      // Only interested in light reflected in z-directon since view direction always is [0,0,-1]
      float reflect_z = light_dir.z - 2.0 * cos_theta * normal.z;
      vec3 specular1 = pow(max(-reflect_z, 0.0), shininess) * specular_color;
      if(h < edge1)
      {
        diffuse_color = mix(diffuse_color, substance_color, smoothstep(edge0, edge1, h));
        specular = mix(specular, specular1, smoothstep(edge0, edge1, h));
      }
      else
      {
        diffuse_color = substance_color;
        specular = specular1;
      }
    }
    
    vec3 diffuse = max(cos_theta, 0.0) * diffuse_color;

    gl_FragColor = vec4((ambient + diffuse + specular), 1.0);
  }

`;