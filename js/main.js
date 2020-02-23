let width = window.innerWidth;
let height = window.innerHeight;

let simulation_width = Math.round(width * window.devicePixelRatio / 2.5);
let simulation_height = Math.round(height * window.devicePixelRatio / 2.5);

let S = {};
settings();

let scene = new THREE.Scene();

let camera = new THREE.OrthographicCamera(width / - 2, width / 2, height / 2, height / - 2, 1, 1000);
camera.position.z = 5;

let renderer = new THREE.WebGLRenderer({precision: "highp"});
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
    "light_pos": { value: new THREE.Vector3(light_pos.x, light_pos.y, 300) },
    "substance_color": { value: new THREE.Vector3().fromArray(S.substance_color).divideScalar(255) },
    "background_color": { value: new THREE.Vector3().fromArray(S.background_color).divideScalar(255) },
    "shininess": { value: S.shininess }
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

gpu_compute.setVariableDependencies(reaction_diffusion_variable, [reaction_diffusion_variable]);

reaction_diffusion_uniforms = reaction_diffusion_variable.material.uniforms;

reaction_diffusion_uniforms['mouse_pos'] = { value: new THREE.Vector2(-100, -100) };
reaction_diffusion_uniforms['mouse_down'] = { value: false };
reaction_diffusion_uniforms['feed'] = { value: S.feed };
reaction_diffusion_uniforms['kill'] = { value: S.kill };
reaction_diffusion_uniforms['diffusion_scale'] = { value: S.diffusion_scale };
reaction_diffusion_uniforms['feed_variation'] = { value: S.feed_variation };
reaction_diffusion_uniforms['kill_variation'] = { value: S.kill_variation };
reaction_diffusion_uniforms['diffusion_scale_variation'] = { value: S.diffusion_scale_variation };
reaction_diffusion_uniforms['anisotropy'] = { value: S.anisotropy };
reaction_diffusion_uniforms['reset'] = { value: false };
reaction_diffusion_uniforms['anisotropic'] = { value: Math.abs(S.anisotropy - 0.5) > 1e-3 };

let light_element = document.getElementById('light');
let light_half_dim = light_element.clientWidth / 2;
updateLightPosition(new THREE.Vector2(width/2, height/2));

function onMove(clientX, clientY)
{
  let x = clientX * (simulation_width / width);
  let y = simulation_height - clientY * (simulation_height / height);

  reaction_diffusion_uniforms['mouse_pos'].value = new THREE.Vector2(x, y);

  if(mouse_down)
  {
    let mouse_pos = new THREE.Vector2(clientX, height - clientY);
    if(light_enabled && (light_move || mouse_pos.distanceTo(light_pos) < light_half_dim))
    {
      light_move = true;
      brush_move = false;
      updateLightPosition(mouse_pos);
      material.uniforms["light_pos"].value = new THREE.Vector3(x, y, 300);
    }
    else
    {
      brush_move = true;
      light_move = false;
    }
  }
  reaction_diffusion_uniforms['mouse_down'].value = brush_move;
}

function onUp()
{
  mouse_down = light_move = brush_move = false;
  reaction_diffusion_uniforms['mouse_down'].value = false;
}

function onDown()
{
  mouse_down = true;

  if(onDown.draw_text_removed === undefined)
  {
    S.toggleLight.initiated = true;
    S.toggleLight();
    document.getElementById('draw').remove();
    onDown.draw_text_removed = true;
  }
}

renderer.domElement.onmousemove = function(event)
{
  onMove(event.clientX, event.clientY);
}

renderer.domElement.onmousedown = function(event)
{
  onDown();
}

renderer.domElement.onmouseup = onUp;
renderer.domElement.onmouseleave = onUp;

function touchStart(event) 
{
  if(event.touches.length == 1)
  {
    onDown();
  }
}

function touchMove(event)
{
  if(event.touches.length == 1)
  {
    event.preventDefault();
    onMove(event.touches[0].clientX, event.touches[0].clientY);
  }
}

function touchEnd(event) 
{
  if(event.touches.length == 0)
  {
    onUp();
  }
}

function touchCancel(event) 
{
  if(event.touches.length == 0)
  {
    onUp();
  }
}

renderer.domElement.addEventListener("touchstart", touchStart, false);
renderer.domElement.addEventListener("touchend", touchEnd, false);
renderer.domElement.addEventListener("touchcancel", touchCancel, false);
renderer.domElement.addEventListener("touchmove", touchMove, false);

createEnvironment();

reaction_diffusion_variable.wrapS = THREE.ClampToEdgeWrapping;
reaction_diffusion_variable.wrapT = THREE.ClampToEdgeWrapping;

gpu_compute.init();

//let getImageData = false;
//let imgData;

function animate() 
{
  requestAnimationFrame(animate);
  render();
}

animate();

function render()
{
  simulateReactionDiffusion(S.simulation_iterations_per_frame);
  material.uniforms["reaction_diffusion"].value = gpu_compute.getCurrentRenderTarget(reaction_diffusion_variable).texture;

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
  if(pos.x - light_half_dim > 0 && pos.x + light_half_dim < width && 
     pos.y - light_half_dim > 0 && pos.y + light_half_dim < height)
  {
    light_pos = pos;
    light_element.style.top = height - pos.y - light_half_dim + "px";
    light_element.style.left = pos.x - light_half_dim + "px";
  }
}

function createEnvironment(update = true)
{
  // Don't update unless it's explicitly wanted or if the noise scale is different.
  if(!update && createEnvironment.prev_scale !== undefined && createEnvironment.prev_scale == S.environment_noise_scale)
  {
    return;
  }

  createEnvironment.prev_scale = S.environment_noise_scale;

  let simplex = new THREE.SimplexNoise();

  let pixels = new Float32Array(simulation_width * simulation_height * 4);
  let p = 0;
  for (let y = 0; y < simulation_height; y++)
  {
    for (let x = 0; x < simulation_width; x++ )
    {
      pixels[p + 0] = simplex.noise3d(x / S.environment_noise_scale, y / S.environment_noise_scale, 0);
      pixels[p + 1] = simplex.noise3d(x / S.environment_noise_scale, y / S.environment_noise_scale, 1000);
      pixels[p + 2] = simplex.noise3d(x / S.environment_noise_scale, y / S.environment_noise_scale, 2000);
      pixels[p + 3] = (1 + simplex.noise3d(x / S.environment_noise_scale, y / S.environment_noise_scale, 3000)) * Math.PI;
      p += 4;
    }
  }

  reaction_diffusion_uniforms['environment'] = { 
    value: new THREE.DataTexture(pixels, simulation_width, simulation_height, THREE.RGBAFormat, THREE.FloatType) 
  };

  reaction_diffusion_uniforms.environment.value.magFilter = THREE.LinearFilter;
  reaction_diffusion_uniforms.environment.value.minFilter = THREE.LinearFilter;
}

function settings()
{
  let gui = new dat.GUI({
    load: gui_presets
  });

  gui.width = 300;

  gui.useLocalStorage = true;
  gui.remember(S);

  function variationProperty(value, variation, name, min0, max0, step0, min1, max1, step1)
  {
    this.val_name = name.replace(/ /g,"_").toLowerCase();
    this.var_name = this.val_name + "_variation";
    S[this.val_name] = value;
    S[this.var_name] = variation;

    folder = gui.addFolder(name);

    this.value_controller = folder.add(S, this.val_name, min0, max0, step0).name('Value');
    this.value_controller.onChange(() => {
      reaction_diffusion_uniforms[this.val_name].value = S[this.val_name];
    });

    this.variation_controller = folder.add(S, this.var_name, min1, max1, step1).name('Variation');
    this.variation_controller.onChange(() => {
      reaction_diffusion_uniforms[this.var_name].value = S[this.var_name];
    });
  }

  S.clearLocalStorage = function() {
    localStorage.clear();
    location.reload();
  }
  gui.add(S, 'clearLocalStorage').name('Revert Local Changes');

  const min_diffusion_scale = 0.5;

  let DS_prop = new variationProperty(2.5, 1.5, "Diffusion Scale", min_diffusion_scale, 10, 0.01, 0, 2.5 - min_diffusion_scale, 0.01);
  let F_prop = new variationProperty(0.042, 0.001, "Feed", 0.01, 0.12, 0.0001, 0, 0.01, 0.0001);
  let K_prop = new variationProperty(0.06, 0.001, "Kill", 0.01, 0.12, 0.0001, 0, 0.01, 0.0001);

  function changeDS()
  {
    let max_variation = S[DS_prop.val_name] - min_diffusion_scale;
    if(max_variation <  S[DS_prop.var_name])
    {
      S[DS_prop.var_name] = max_variation;
    }

    DS_prop.variation_controller.max(max_variation);
    DS_prop.variation_controller.updateDisplay();

    reaction_diffusion_uniforms[DS_prop.val_name].value = S[DS_prop.val_name];
    reaction_diffusion_uniforms[DS_prop.var_name].value = S[DS_prop.var_name];
  }

  DS_prop.value_controller.onChange(changeDS);
  DS_prop.variation_controller.onChange(changeDS);

  S.anisotropy = 0.7;
  S.simulation_iterations_per_frame = 4;
  S.environment_noise_scale = 250;
  S.update_environment = createEnvironment;
  S.background_color = [229, 229, 229];
  S.substance_color = [50, 158, 168];
  S.shininess = 64.0;
  S.toggleLight = function()
  {
    if(S.toggleLight.initiated === true)
    {
      light_enabled = !light_enabled;
      light_element.style.opacity = light_enabled * 0.6;
    }
  }
  S.reset = function() 
  {
    reaction_diffusion_uniforms['reset'].value = true;
    gpu_compute.compute();
    reaction_diffusion_uniforms['reset'].value = false;
  }
  S.saveImage = function()
  {
    render.save_image = true;;
    render.savename = 'reaction-diffusion-' + gui.preset.replace(/ /g,"-").toLowerCase() + '.png';
  }

  gui.add(S, 'anisotropy', 0.2, 0.8, 0.01).onChange(() => {
    reaction_diffusion_uniforms['anisotropy'].value = S.anisotropy;
    reaction_diffusion_uniforms['anisotropic'].value = Math.abs(S.anisotropy - 0.5) > 1e-3;
  }).name('Anisotropy');

  gui.add(S, 'simulation_iterations_per_frame', 1, 32, 1).name('Iterations/Frame');

  environment_folder = gui.addFolder('Environment');

  environment_folder.add(S, 'environment_noise_scale', 1, 1000, 1).name('Noise Scale').onFinishChange(() => {
    createEnvironment(false);
  });

  environment_folder.add(S, 'update_environment').name('Update');

  gui.addColor(S, 'substance_color').onChange(() => {
    material.uniforms.substance_color.value.fromArray(S.substance_color).divideScalar(255);
  }).name("Substance");

  gui.addColor(S, 'background_color').onChange(() => {
    material.uniforms.background_color.value.fromArray(S.background_color).divideScalar(255);
  }).name("Background");

  gui.add(S, 'shininess', 8, 256, 1).onChange(() => {
    material.uniforms.shininess.value = S.shininess;
  }).name('Phong Shininess');

  gui.add(S, 'toggleLight').name('Toggle Light');
  gui.add(S, 'saveImage').name('Save Image');
  gui.add(S, 'reset').name('Clear Substances');

  gui.close();
}