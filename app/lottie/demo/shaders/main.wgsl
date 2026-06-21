@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
  return vertexMainImpl(vertexIndex);
}

@compute @workgroup_size(8, 8, 1)
fn tileBucketPrepassComputeMain(@builtin(global_invocation_id) globalInvocationId: vec3<u32>) {
  let tile_res = tile_resolution();

  if (globalInvocationId.x >= tile_res.x || globalInvocationId.y >= tile_res.y) {
    return;
  }

  tile_bucket_prepass(globalInvocationId.xy);
}

@fragment
fn finalRasterFragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
  let safe_canvas = canvas_resolution();
  let pixel_pos = vec2f(input.uv.x * safe_canvas.x, input.uv.y * safe_canvas.y);

  return rasterize_tiled_scene(pixel_pos);
}
