/****************************************************
This is a fragment shader that computes the next iteration in the 
reaction-diffusion simulation from the substance state texture 
reaction_diffusion. The reaction_diffusion texture uniform is 
passed automatically by THREE.GPUComputationRenderer.
****************************************************/

let reaction_diffusion_fragment = `

uniform sampler2D environment;

uniform float feed;
uniform float kill;
uniform float diffusion_scale;

uniform float feed_variation;
uniform float kill_variation;
uniform float diffusion_scale_variation;

uniform float anisotropy;
uniform bool separate_fields;

uniform vec2 mouse_pos;
uniform bool mouse_down;

uniform bool reset;

const vec2 D = vec2(1, 0.5);
const float Dt = 1.0;

#define p2(v) v * v
#define PI 3.14159265358979323846

// Sampling function with offset around current texel
vec2 s(float x_offset, float y_offset)
{
  return texture2D(reaction_diffusion, (gl_FragCoord.xy + vec2(x_offset, y_offset)) / resolution).xy;
}

/****************************************************
Finite differences laplace operator with diagonals included based on 
https://www.karlsims.com/rd.html
****************************************************/
const float diagonal = 0.05, adjacent = 0.2;
vec2 laplace(vec2 center)
{
  vec2
  v00 = s(-1.0, 1.0), v10 = s(0.0, 1.0), v20 = s(1.0, 1.0),
  v01 = s(-1.0, 0.0),                    v21 = s(1.0, 0.0),
  v02 = s(-1.0,-1.0), v12 = s(0.0,-1.0), v22 = s(1.0,-1.0);

  return diagonal * (v00 + v20 + v02 + v22) + adjacent * (v10 + v01 + v21 + v12) - center;
}

/****************************************************
Based on the anisotropic diffusion mask from the paper:

Reaction-Diffusion Textures - Andrew Witkin and Michael Kassy
http://www.cs.cmu.edu/~jkh/462_s07/reaction_diffusion.pdf

but with a few changes. a1 and a2 controls the major axis lengths/eigenvalues of 
the diffusion tensor, but they always add up to 1. The input a1 therefore 
controls the anisotropy or "ellipticity" of the diffusion tensor, but the amount 
of total diffusion always stays approximately the same.

a1 = 0.5 => no anisotropy
a1 > 0.5 => more diffusion parallel to dir vector
a1 < 0.5 => more diffusion orthogonal to dir vector

The total amount of diffusion is then controled later by the variable diffusion_scale.

I've also changed the mask to make it the general case of the above laplace 
operator which includes the diagonals, which makes them equivalent at a1 = 0.5.

****************************************************/
vec2 anisotropicDiffusion(vec2 angles, float a1, vec2 center)
{
  vec2
  v00 = s(-1.0, 1.0), v10 = s(0.0, 1.0), v20 = s(1.0, 1.0),
  v01 = s(-1.0, 0.0),                    v21 = s(1.0, 0.0),
  v02 = s(-1.0,-1.0), v12 = s(0.0,-1.0), v22 = s(1.0,-1.0);

  vec2 cos_t = cos(angles);
  vec2 sin_t = sin(angles);

  float a2 = 1.0 - a1;

  vec2 cos2_t = p2(cos_t);
  vec2 sin2_t = p2(sin_t);

  vec2 d = ((a2 - a1) * p2(cos_t * sin_t)) / 2.0;
  vec2 h = (a1 * cos2_t + a2 * sin2_t) / 2.0 - diagonal;
  vec2 v = (a2 * cos2_t + a1 * sin2_t) / 2.0 - diagonal;

  return (-d+diagonal) * (v00 + v22) +
         ( d+diagonal) * (v20 + v02) +
         h * (v01 + v21) +
         v * (v10 + v12)
         - center;
}

void main() 
{
  vec4 env = texture2D(environment, (gl_FragCoord.xy / resolution).xy);

  float F = feed + env[0] * feed_variation;
  float K = kill + env[1] * kill_variation;
  float DS = diffusion_scale + env[2] * diffusion_scale_variation;

  // Old substance concentrations
  vec2 old = s(0.0, 0.0);

  // Convert some of substance 0 to substance 1
  vec2 reaction = vec2(-1.0, 1.0) * old[0] * old[1] * old[1];

  // Add some substance 0 and remove some substance 1
  vec2 dissipation = vec2(F * (1.0 - old[0]), -old[1] * (K + F));

  // Diffuse substances
  vec2 angles = (1.0 + vec2(env[3], separate_fields ? env[0] : env[3])) * PI;
  vec2 diffusion = anisotropicDiffusion(angles, anisotropy, old) * (D * DS);

  // New substance concentrations
  gl_FragColor.xy = old + (reaction + dissipation + diffusion) * (Dt / DS);
  
  if(mouse_down && gl_FragColor.y <= 0.2)
  {
    float distance = length(gl_FragCoord.xy - mouse_pos);
    if(distance <= 10.0)
    {
      gl_FragColor.y += (10.0 - distance)/56.0;
    }
  }

  if(reset)
  {
    gl_FragColor = vec4(0.0);
  }
}

`;