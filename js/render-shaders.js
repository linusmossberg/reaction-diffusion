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
  uniform vec2 resolution;
  uniform float time;

  varying vec2 texcoord;

  float height(float x_offset, float y_offset)
  {
    return pow(texture2D(reaction_diffusion, texcoord + vec2(x_offset, y_offset) / resolution).g * 2.1, 2.0);
  }

  vec3 normal(float scale)
  {
    float
                            h10 = height(0.0, 1.0),
    h01 = height(-1.0, 0.0),                       h21 = height(1.0, 0.0),
                            h12 = height(0.0,-1.0);

    float x_angle = atan((h21 - h01) * scale, 2.0 / resolution.x);
    float y_angle = atan((h10 - h12) * scale, 2.0 / resolution.y);

    return vec3(sin(y_angle),
                sin(x_angle) * cos(y_angle),
                cos(x_angle) * cos(y_angle));
  }

  void main() 
  {
    vec3 normal = normal(0.05);

    //vec3 light_dir = normalize(vec3(0.5,0.0,-1.0));

    vec3 light_pos = vec3(0.5, 0.5, 10.0);
    vec3 light_dir = normalize(light_pos - vec3(0.5, 0.5, 0.0));
    //vec3 light_pos = vec3(0.0, 0.0, 1.0);

    //vec3 light_dir = normalize(vec3(-0.5, -0.5, 10.0));

    vec3 view_dir = vec3(0.0,0.0,-1.0);
    vec3 reflect_dir = reflect(-light_dir, normal);

    vec3 light_color = vec3(1.0,1.0,1.0);
    vec3 diffuse_color = texture2D(color_map, vec2(height(0.0, 0.0), 0.0)).rgb;
    //vec3 diffuse_color = vec3(1.0, 1.0, 1.0);
    vec3 specular_color = vec3(0.5,0.5,0.5);

    vec3 ambient = light_color * 0.1;
    vec3 diffuse = light_color * max(dot(normal, light_dir), 0.0) * diffuse_color;
    vec3 specular = light_color * pow(max(dot(view_dir, reflect_dir), 0.0), 64.0) * specular_color;

    gl_FragColor = vec4(ambient + diffuse + specular, 1.0);
  }

`;