@compute @workgroup_size(8, 8, 1)
fn tileBucketPrepassComputeMain(@builtin(global_invocation_id) globalInvocationId: vec3<u32>) {
  let tile_res = tile_resolution();

  if (globalInvocationId.x >= tile_res.x || globalInvocationId.y >= tile_res.y) {
    return;
  }

  tile_bucket_prepass(globalInvocationId.xy);
}

@compute @workgroup_size(8, 8, 1)
fn tileInstructionCompactionComputeMain(@builtin(global_invocation_id) globalInvocationId: vec3<u32>) {
  let tile_res = tile_resolution();

  if (globalInvocationId.x >= tile_res.x || globalInvocationId.y >= tile_res.y) {
    return;
  }

  if (globalInvocationId.x == 0u && globalInvocationId.y == 0u) {
    indirectDispatchArgs.dispatchY = 1u;
    indirectDispatchArgs.dispatchZ = 1u;
    indirectDispatchArgs.reserved0 = 0u;
  }

  compact_tile_instruction(globalInvocationId.xy);
}

@group(0) @binding(7) var rasterTarget: texture_storage_2d<__RASTER_TARGET_FORMAT__, write>;

@compute @workgroup_size(8, 8, 1)
fn clearRasterTargetComputeMain(@builtin(global_invocation_id) globalInvocationId: vec3<u32>) {
  let safe_canvas = canvas_resolution();

  if (
    globalInvocationId.x >= u32(safe_canvas.x) ||
    globalInvocationId.y >= u32(safe_canvas.y)
  ) {
    return;
  }

  textureStore(rasterTarget, vec2i(globalInvocationId.xy), vec4f(0.0));
}

@compute @workgroup_size(8, 8, 1)
fn finalRasterComputeMain(
  @builtin(local_invocation_id) localInvocationId: vec3<u32>,
  @builtin(workgroup_id) workgroupId: vec3<u32>,
) {
  let safe_canvas = canvas_resolution();
  let instruction = tileInstructions[workgroupId.x];
  let tile_coord = vec2u(instruction.tileX, instruction.tileY);
  // `tileY` already matches the screen-space tile row chosen by the bucketing pass.
  // Flipping the write origin here mirrors the occupancy tiles even when SDF sampling is correct.
  let tile_origin = vec2u(instruction.tileX * TILE_SIZE_PX, instruction.tileY * TILE_SIZE_PX);
  let local_pixel_origin = vec2u(localInvocationId.xy) * 4u;

  for (var localY = 0u; localY < 4u; localY = localY + 1u) {
    for (var localX = 0u; localX < 4u; localX = localX + 1u) {
      let pixel_coord = tile_origin + local_pixel_origin + vec2u(localX, localY);

      if (pixel_coord.x >= u32(safe_canvas.x) || pixel_coord.y >= u32(safe_canvas.y)) {
        continue;
      }

      // The storage texture is addressed from the top-left, but the shape sampling path expects
      // the old bottom-left-style pixel coordinates used by the fullscreen fragment pass.
      let pixel_pos = vec2f(
        f32(pixel_coord.x) + 0.5,
        safe_canvas.y - (f32(pixel_coord.y) + 0.5),
      );
      let color = rasterize_tiled_scene_for_tile(pixel_pos, tile_coord);

      textureStore(rasterTarget, vec2i(pixel_coord), color);
    }
  }
}
