var reaction_diffusion_fragment = `

const float scale = 2.0;
const float Da = 1.0 * scale;
const float Db = 0.5 * scale;
const float Dt = 1.0 / scale;
const float F  = 0.0545;
const float K  = 0.062;
//const float F = 0.0367;
//const float K = 0.0649;

vec2 s(float x_offset, float y_offset)
{
  return texture2D(reaction_diffusion, (gl_FragCoord.xy + vec2(x_offset, y_offset)) / resolution).xy;
}

void main() 
{
  vec2 v00 = s(-1., 1.); vec2 v10 = s(0., 1.); vec2 v20 = s(1., 1.);
  vec2 v01 = s(-1., 0.); vec2 v11 = s(0., 0.); vec2 v21 = s(1., 0.);
  vec2 v02 = s(-1.,-1.); vec2 v12 = s(0.,-1.); vec2 v22 = s(1.,-1.);

  float A = v11.x;
  float B = v11.y;

  vec2 laplace = 0.05 * (v00 + v20 + v02 + v22) + 0.2 * (v10 + v01 + v21 + v12) - v11;

  float laplace_A = laplace.x;
  float laplace_B = laplace.y;

  float ABB = A * B * B;

  float A_new = A + (Da * laplace_A - ABB + F * (1. - A))*Dt;
  float B_new = B + (Db * laplace_B + ABB - B * (K  + F))*Dt;

  gl_FragColor = vec4(A_new, B_new, 0.5, 1.0);
}

`;