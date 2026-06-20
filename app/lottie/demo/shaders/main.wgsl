@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
  return vertexMainImpl(vertexIndex);
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
  return fragmentMainImpl(input);
}

fn fragmentMainImpl(input: VertexOutput) -> vec4<f32> {
  let safe_canvas = max(demoUniforms.canvasResolution, vec2f(1.0, 1.0));
  let pixel_pos = vec2f(input.uv.x * safe_canvas.x, input.uv.y * safe_canvas.y);

  return render_active_shape(pixel_pos);
}
