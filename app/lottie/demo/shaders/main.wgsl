@compute @workgroup_size(8, 8, 1)
fn tileBucketPrepassComputeMain(@builtin(global_invocation_id) globalInvocationId: vec3<u32>) {
  let tile_res = tile_resolution();

  if (globalInvocationId.x >= tile_res.x || globalInvocationId.y >= tile_res.y) {
    return;
  }

  tile_bucket_prepass(globalInvocationId.xy);
}

@group(0) @binding(5) var rasterTarget: texture_storage_2d<__RASTER_TARGET_FORMAT__, write>;

@compute @workgroup_size(8, 8, 1)
fn finalRasterComputeMain(@builtin(global_invocation_id) globalInvocationId: vec3<u32>) {
  let safe_canvas = canvas_resolution();

  if (
    globalInvocationId.x >= u32(safe_canvas.x) ||
    globalInvocationId.y >= u32(safe_canvas.y)
  ) {
    return;
  }

  let pixel_pos = vec2f(
    f32(globalInvocationId.x) + 0.5,
    safe_canvas.y - (f32(globalInvocationId.y) + 0.5),
  );
  let color = rasterize_tiled_scene(pixel_pos);

  textureStore(rasterTarget, vec2i(globalInvocationId.xy), color);
}
