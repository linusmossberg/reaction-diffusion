function onMove(event)
{
  let x = event.clientX * (simulation_width / width);
  let y = simulation_height - event.clientY * (simulation_height / height);

  reaction_diffusion_uniforms.mouse_pos.value.fromArray([x, y]);

  if(mouse_down)
  {
    let mouse_pos = new THREE.Vector2(event.clientX, height - event.clientY);
    if(light_enabled && (light_move || mouse_pos.distanceTo(light_pos) < light_half_dim))
    {
      light_move = true;
      brush_move = false;
      updateLightPosition(mouse_pos);
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
    Settings.toggleLight.initiated = true;
    Settings.toggleLight();
    document.getElementById('draw').remove();
    onDown.draw_text_removed = true;
  }
}

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
    onMove(event.touches[0]);
  }
}

function touchEnd(event) 
{
  if(event.touches.length == 0)
  {
    onUp();
  }
}

renderer.domElement.onmousedown = onDown;
renderer.domElement.onmouseup = onUp;
renderer.domElement.onmouseleave = onUp;
renderer.domElement.onmousemove = onMove;

renderer.domElement.addEventListener("touchstart", touchStart, false);
renderer.domElement.addEventListener("touchend", touchEnd, false);
renderer.domElement.addEventListener("touchcancel", touchEnd, false);
renderer.domElement.addEventListener("touchmove", touchMove, false);