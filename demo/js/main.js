let width = window.innerWidth;
let height = window.innerHeight;

let simulation_width = Math.round(width * window.devicePixelRatio / 2.5);
let simulation_height = Math.round(height * window.devicePixelRatio / 2.5);

Settings();

let scene = new THREE.Scene();

let camera = new THREE.OrthographicCamera(width / - 2, width / 2, height / 2, height / - 2, 1, 1000);
camera.position.z = 5;

let renderer = new THREE.WebGLRenderer();
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(width, height);
document.body.appendChild(renderer.domElement);

let light_pos = new THREE.Vector2(simulation_width/2, simulation_height/2);
let light_enabled = false;
let mouse_down = false;
let light_move = false;
let brush_move = false;

let material = new THREE.ShaderMaterial
({ 
  vertexShader: render_vertex,
  fragmentShader: render_fragment,
  uniforms: { 
    "reaction_diffusion": { value: null }, 
    "resolution": { value: new THREE.Vector2(simulation_width, simulation_height) },
    "light_pos": { value: new THREE.Vector3(light_pos.x, light_pos.y, Settings.light_height) },
    "substance_color": { value: new THREE.Vector3().fromArray(Settings.substance_color).divideScalar(255) },
    "background_color": { value: new THREE.Vector3().fromArray(Settings.background_color).divideScalar(255) },
    "specular_color": { value: new THREE.Vector3().fromArray(Settings.specular_color).divideScalar(255) },
    "shininess": { value: Settings.shininess },
    "step": { value: 1.0 / Settings.bump }
  }
});
scene.add(new THREE.Mesh(new THREE.PlaneGeometry(width, height, 1, 1), material));

let gpu_compute = new THREE.GPUComputationRenderer(simulation_width, simulation_height, renderer);

let reaction_diffusion = gpu_compute.createTexture();

let reaction_diffusion_variable = gpu_compute.addVariable(
  "reaction_diffusion", 
  reaction_diffusion_fragment,
  reaction_diffusion
);

reaction_diffusion_variable.wrapS = THREE.ClampToEdgeWrapping;
reaction_diffusion_variable.wrapT = THREE.ClampToEdgeWrapping;

gpu_compute.setVariableDependencies(reaction_diffusion_variable, [reaction_diffusion_variable]);

reaction_diffusion_uniforms = reaction_diffusion_variable.material.uniforms;

reaction_diffusion_uniforms['mouse_pos'] = { value: new THREE.Vector2(-100, -100) };
reaction_diffusion_uniforms['mouse_down'] = { value: false };
reaction_diffusion_uniforms['feed'] = { value: Settings.feed };
reaction_diffusion_uniforms['kill'] = { value: Settings.kill };
reaction_diffusion_uniforms['diffusion_scale'] = { value: Settings.diffusion_scale };
reaction_diffusion_uniforms['feed_variation'] = { value: Settings.feed_variation };
reaction_diffusion_uniforms['kill_variation'] = { value: Settings.kill_variation };
reaction_diffusion_uniforms['diffusion_scale_variation'] = { value: Settings.diffusion_scale_variation };
reaction_diffusion_uniforms['anisotropy'] = { value: Settings.anisotropy };
reaction_diffusion_uniforms['reset'] = { value: false };
reaction_diffusion_uniforms['anisotropic'] = { value: Math.abs(Settings.anisotropy - 0.5) > 1e-3 };

let light_element = document.getElementById('light');
let light_half_dim = light_element.clientWidth / 2;
updateLightPosition(new THREE.Vector2(width/2, height/2));

createEnvironment();

gpu_compute.init();

function animate() 
{
  requestAnimationFrame(animate);
  render();
}

animate();

function render()
{
  simulateReactionDiffusion(Settings.simulation_iterations_per_frame);
  material.uniforms.reaction_diffusion.value = gpu_compute.getCurrentRenderTarget(reaction_diffusion_variable).texture;

  renderer.render(scene, camera);

  if(render.save_image === true)
  {
    render.save_image = false;
    let save_link = document.getElementById('save-link');
    save_link.download = render.savename;
    save_link.href = renderer.domElement.toDataURL();
    save_link.click();
  }
}

function simulateReactionDiffusion(iterations)
{
  for(let i = 0; i < iterations; i++)
  {
    gpu_compute.compute();
  }
}

function updateLightPosition(pos)
{
  pos.x = (pos.x - light_half_dim <= 0) ? light_half_dim : 
         ((pos.x + light_half_dim >= width) ? width - light_half_dim : pos.x);

  pos.y = (pos.y - light_half_dim <= 0) ? light_half_dim :
         ((pos.y + light_half_dim >= height) ? height - light_half_dim : pos.y); 

  light_pos = pos;
  light_element.style.top = height - pos.y - light_half_dim + "px";
  light_element.style.left = pos.x - light_half_dim + "px";

  material.uniforms.light_pos.value.x = pos.x * (simulation_width / width);
  material.uniforms.light_pos.value.y = simulation_height - (height - pos.y) * (simulation_height / height);
}

function createEnvironment(update = true)
{
  // Don't update unless it's explicitly wanted or if the noise scale is different.
  if(!update && createEnvironment.prev_scale !== undefined && createEnvironment.prev_scale == Settings.environment_noise_scale)
  {
    return;
  }

  createEnvironment.prev_scale = Settings.environment_noise_scale;

  let simplex = new THREE.SimplexNoise();

  let pixels = new Float32Array(simulation_width * simulation_height * 4);
  let p = 0;
  for (let y = 0; y < simulation_height; y++)
  {
    for (let x = 0; x < simulation_width; x++ )
    {
      pixels[p + 0] = simplex.noise3d(x / Settings.environment_noise_scale, y / Settings.environment_noise_scale, 0);
      pixels[p + 1] = simplex.noise3d(x / Settings.environment_noise_scale, y / Settings.environment_noise_scale, 1000);
      pixels[p + 2] = simplex.noise3d(x / Settings.environment_noise_scale, y / Settings.environment_noise_scale, 2000);
      pixels[p + 3] = (1 + simplex.noise3d(x / Settings.environment_noise_scale, y / Settings.environment_noise_scale, 3000)) * Math.PI;
      p += 4;
    }
  }

  reaction_diffusion_uniforms['environment'] = { 
    value: new THREE.DataTexture(pixels, simulation_width, simulation_height, THREE.RGBAFormat, THREE.FloatType) 
  };

  reaction_diffusion_uniforms.environment.value.magFilter = THREE.LinearFilter;
  reaction_diffusion_uniforms.environment.value.minFilter = THREE.LinearFilter;
}