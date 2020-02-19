var reaction_diffusion_fragment = `

uniform sampler2D environment;

uniform vec2 mouse_pos;
uniform bool mouse_down;

const vec2 D = vec2(1, 0.5);
const float Dt = 1.0;

// Sampling function with offset around current texel
vec2 s(float x_offset, float y_offset)
{
  return texture2D(reaction_diffusion, (gl_FragCoord.xy + vec2(x_offset, y_offset)) / resolution).xy;
}

// Finite differences laplace operator
vec2 laplace(vec2 center)
{
  vec2
  v00 = s(-1.0, 1.0), v10 = s(0.0, 1.0), v20 = s(1.0, 1.0),
  v01 = s(-1.0, 0.0),                    v21 = s(1.0, 0.0),
  v02 = s(-1.0,-1.0), v12 = s(0.0,-1.0), v22 = s(1.0,-1.0);

  return 0.05 * (v00 + v20 + v02 + v22) + 0.2 * (v10 + v01 + v21 + v12) - center;
}

float p2(float v)
{
  return v * v;
}

vec2 anisotropicDiffusion(vec2 dir, float a, vec2 center)
{
  vec2
  v00 = s(-1.0, 1.0), v10 = s(0.0, 1.0), v20 = s(1.0, 1.0),
  v01 = s(-1.0, 0.0),                    v21 = s(1.0, 0.0),
  v02 = s(-1.0,-1.0), v12 = s(0.0,-1.0), v22 = s(1.0,-1.0);

  float a1 = clamp(a, 0.0, 1.0);
  float a2 = 1.0 - a1;

  float cos_t = dir.x;
  float sin_t = dir.y;
  float cos2_t = p2(cos_t);
  float sin2_t = p2(sin_t);

  float d = ((a2 - a1) * p2(cos_t * sin_t)) / 2.0;
  float h = (a1 * cos2_t + a2 * sin2_t) / 2.0 - 0.05;
  float v = (a2 * cos2_t + a1 * sin2_t) / 2.0 - 0.05;

  vec2 result = (-d+0.05) * (v00 + v22) +
                ( d+0.05) * (v20 + v02) +
                h * (v01 + v21) +
                v * (v10 + v12)
                - center;

  return result;
}

void main() 
{
  vec4 env = texture2D(environment, (gl_FragCoord.xy / resolution).xy);

  float feed = env[0];
  float kill = env[1];
  float scale = env[2];
  vec2 direction = vec2(cos(env[3]), sin(env[3]));

  // Old substance concentrations
  vec2 old = s(0.0, 0.0);

  // Convert some of substance 0 to substance 1
  vec2 reaction = vec2(-1.0, 1.0) * old[0] * old[1] * old[1];

  // Add some substance 0 and remove some substance 1
  vec2 dissipation = vec2(feed * (1.0 - old[0]), -old[1] * (kill + feed));

  // Diffuse substances at different rates specified by D
  //vec2 diffusion = laplace(old) * (D * scale);
  vec2 diffusion = anisotropicDiffusion(direction, 0.7, old) * (D * scale);

  // New substance concentrations
  gl_FragColor.xy = old + (reaction + dissipation + diffusion) * (Dt / scale);

  
  if(mouse_down && gl_FragColor.y <= 0.5)
  {
    float distance = length(gl_FragCoord.xy - mouse_pos);
    if(distance <= 7.0)
    {
      gl_FragColor.y += (7.0 - distance)/56.0;
    }
  }

  //gl_FragColor.xy = clamp(gl_FragColor.xy, 0.0, 1.0);
}

`;