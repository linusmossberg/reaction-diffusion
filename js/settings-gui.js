function Settings()
{
  let gui = new dat.GUI({
    load: gui_presets
  });

  gui.width = 300;

  gui.useLocalStorage = true;

  gui.remember(Settings);

  Settings.anisotropy = 0.7;
  Settings.simulation_iterations_per_frame = 4;
  Settings.environment_noise_scale = 250;
  Settings.update_environment = createEnvironment;
  Settings.background_color = [229, 229, 229];
  Settings.substance_color = [50, 158, 168];
  Settings.specular_color = [128, 128, 128];
  Settings.shininess = 64.0;
  Settings.light_height = 300;
  Settings.bump = 10;
  Settings.separate_fields = false;

  Settings.clearLocalStorage = () => {
    localStorage.clear();
    location.reload();
  };

  Settings.toggleLight = () => {
    if(Settings.toggleLight.initiated === true)
    {
      light_enabled = !light_enabled;
      light_element.style.opacity = light_enabled * 0.6;
    }
  };

  Settings.reset = () => {
    reaction_diffusion_uniforms['reset'].value = true;
    gpu_compute.compute();
    reaction_diffusion_uniforms['reset'].value = false;
  };

  Settings.saveImage = () => {
    render.save_image = true;
    render.savename = 'reaction-diffusion-' + gui.preset.replace(/ /g,"-").replace(/\//g,"-").toLowerCase() + '.png';
  };

  function variationProperty(value, variation, name, min0, max0, step0, min1, max1, step1)
  {
    this.val_name = name.replace(/ /g,"_").toLowerCase();
    this.var_name = this.val_name + "_variation";
    Settings[this.val_name] = value;
    Settings[this.var_name] = variation;

    folder = gui.addFolder(name);

    this.value_controller = folder.add(Settings, this.val_name, min0, max0, step0).onChange(() => {
      reaction_diffusion_uniforms[this.val_name].value = Settings[this.val_name];
    }).name('Value');

    this.variation_controller = folder.add(Settings, this.var_name, min1, max1, step1).onChange(() => {
      reaction_diffusion_uniforms[this.var_name].value = Settings[this.var_name];
    }).name('Variation');
  }

  const min_diffusion_scale = 0.5;

  let DS_prop = new variationProperty(2.5, 1.5, "Diffusion Scale", min_diffusion_scale, 10, 0.01, 0, 2.5 - min_diffusion_scale, 0.01);
  let F_prop = new variationProperty(0.042, 0.001, "Feed", 0.01, 0.12, 0.0001, 0, 0.01, 0.0001);
  let K_prop = new variationProperty(0.06, 0.001, "Kill", 0.01, 0.12, 0.0001, 0, 0.01, 0.0001);

  function changeDS()
  {
    let max_variation = Settings[DS_prop.val_name] - min_diffusion_scale;
    if(max_variation <  Settings[DS_prop.var_name])
    {
      Settings[DS_prop.var_name] = max_variation;
    }

    DS_prop.variation_controller.max(max_variation);
    DS_prop.variation_controller.updateDisplay();

    reaction_diffusion_uniforms[DS_prop.val_name].value = Settings[DS_prop.val_name];
    reaction_diffusion_uniforms[DS_prop.var_name].value = Settings[DS_prop.var_name];
  }

  DS_prop.value_controller.onChange(changeDS);
  DS_prop.variation_controller.onChange(changeDS);

  environment_folder = gui.addFolder('Environment');

  environment_folder.add(Settings, 'anisotropy', 0.2, 0.8, 0.01).onChange(() => {
    reaction_diffusion_uniforms['anisotropy'].value = Settings.anisotropy;
  }).name('Anisotropy');

  environment_folder.add(Settings, 'environment_noise_scale', 1, 1000, 1).name('Noise Scale').onFinishChange(() => {
    createEnvironment(false);
  });

  environment_folder.add(Settings, 'separate_fields').onChange(() => {
    reaction_diffusion_uniforms.separate_fields.value = Settings.separate_fields;
  }).name('Separate Fields');

  environment_folder.add(Settings, 'update_environment').name('Update');

  let render_folder = gui.addFolder('Render Settings')

  render_folder.addColor(Settings, 'substance_color').onChange(() => {
    material.uniforms.substance_color.value.fromArray(Settings.substance_color).divideScalar(255);
  }).name("Substance");

  render_folder.addColor(Settings, 'background_color').onChange(() => {
    material.uniforms.background_color.value.fromArray(Settings.background_color).divideScalar(255);
  }).name("Background");

  render_folder.addColor(Settings, 'specular_color').onChange(() => {
    material.uniforms.specular_color.value.fromArray(Settings.specular_color).divideScalar(255);
  }).name("Specular");

  render_folder.add(Settings, 'bump', 0.1, 20, 0.1).onChange(() => {
    material.uniforms.step.value = 1.0 / Settings.bump;
  }).name('Bump');

  render_folder.add(Settings, 'shininess', 8, 256, 1).onChange(() => {
    material.uniforms.shininess.value = Settings.shininess;
  }).name('Phong Shininess');

  render_folder.add(Settings, 'light_height', 10, 1000, 1).onChange(() => {
    material.uniforms.light_pos.value.z = Settings.light_height;
  }).name('Light Height');

  gui.add(Settings, 'clearLocalStorage').name('Revert Local Changes');
  gui.add(Settings, 'toggleLight').name('Toggle Light');
  gui.add(Settings, 'saveImage').name('Save Image');
  gui.add(Settings, 'reset').name('Clear Substances');

  gui.add(Settings, 'simulation_iterations_per_frame', 1, 64, 1).name('Simulation Speed');

  gui.close();
}