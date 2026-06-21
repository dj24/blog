const SHAPE_KIND_RECTANGLE: u32 = 1u;
const SHAPE_KIND_ELLIPSE: u32 = 2u;
const SHAPE_KIND_PATH: u32 = 4u;
const PATH_TERMINAL_START: u32 = 1u;
const PATH_TERMINAL_END: u32 = 2u;
const SHAPE_FLAG_FILL_GRADIENT: u32 = 1u << 2u;
const SHAPE_FLAG_STROKE_GRADIENT: u32 = 1u << 3u;
const SHAPE_FLAG_FILL_GRADIENT_RADIAL: u32 = 1u << 4u;
const SHAPE_FLAG_STROKE_GRADIENT_RADIAL: u32 = 1u << 5u;
const STROKE_CAP_BUTT: u32 = 1u;
const STROKE_CAP_ROUND: u32 = 2u;
const STROKE_CAP_SQUARE: u32 = 3u;
const TILE_SIZE_PX: u32 = 32u;

struct DemoUniforms {
  activeShapeIndex: u32,
  shapeCount: u32,
  maxShapesPerTile: u32,
  reserved0: u32,
  canvasWidth: f32,
  canvasHeight: f32,
  compositionWidth: f32,
  compositionHeight: f32,
  tileWidth: u32,
  tileHeight: u32,
  reserved1: u32,
  reserved2: u32,
}

struct TileInstruction {
  tileIndex: u32,
  tileX: u32,
  tileY: u32,
  reserved0: u32,
}

struct IndirectDispatchArgs {
  dispatchX: atomic<u32>,
  dispatchY: u32,
  dispatchZ: u32,
  reserved0: u32,
}

@group(0) @binding(1) var<uniform> demoUniforms: DemoUniforms;
@group(0) @binding(3) var<storage, read_write> tileShapeCounts: array<atomic<u32>>;
@group(0) @binding(4) var<storage, read_write> tileShapeIndices: array<u32>;
@group(0) @binding(6) var<storage, read_write> tileInstructions: array<TileInstruction>;
@group(0) @binding(7) var<storage, read_write> indirectDispatchArgs: IndirectDispatchArgs;

fn fill_from_sdf(sd: f32, aa_width: f32) -> f32 {
  let aa = max(aa_width, 0.75);
  return 1.0 - smoothstep(-aa, aa, sd);
}

fn rotate_point(p: vec2f, angle_radians: f32) -> vec2f {
  let sine = sin(angle_radians);
  let cosine = cos(angle_radians);

  return vec2f(
    p.x * cosine - p.y * sine,
    p.x * sine + p.y * cosine,
  );
}

fn canvas_resolution() -> vec2f {
  return max(vec2f(demoUniforms.canvasWidth, demoUniforms.canvasHeight), vec2f(1.0, 1.0));
}

fn composition_resolution() -> vec2f {
  return max(
    vec2f(demoUniforms.compositionWidth, demoUniforms.compositionHeight),
    vec2f(1.0, 1.0),
  );
}

fn tile_resolution() -> vec2u {
  return vec2u(max(demoUniforms.tileWidth, 1u), max(demoUniforms.tileHeight, 1u));
}

fn flipped_tile_y(tile_y: u32) -> u32 {
  let tile_res = tile_resolution();

  return tile_res.y - 1u - tile_y;
}

fn composition_position_from_canvas(pixel_pos: vec2f) -> vec2f {
  let safe_canvas = canvas_resolution();
  let safe_composition = composition_resolution();

  return vec2f(
    (pixel_pos.x / safe_canvas.x) * safe_composition.x,
    (1.0 - pixel_pos.y / safe_canvas.y) * safe_composition.y,
  );
}

fn shape_local_point_from_composition_position(
  shape: ShapeRecord,
  composition_pos: vec2f,
) -> vec2f {
  let shape_center = vec2f(
    shape.centerX + shape.positionX,
    shape.centerY + shape.positionY,
  );
  let safe_scale = max(vec2f(abs(shape.scaleX), abs(shape.scaleY)), vec2f(0.0001, 0.0001));
  var local_p = composition_pos - shape_center;

  local_p = rotate_point(local_p, -radians(shape.rotation));
  local_p = vec2f(local_p.x / safe_scale.x, local_p.y / safe_scale.y);

  return vec2f(local_p.x, -local_p.y);
}

fn shape_local_point(shape: ShapeRecord, pixel_pos: vec2f) -> vec2f {
  return shape_local_point_from_composition_position(
    shape,
    composition_position_from_canvas(pixel_pos),
  );
}

fn composition_point_from_shape_local(shape: ShapeRecord, local_p: vec2f) -> vec2f {
  let shape_center = vec2f(
    shape.centerX + shape.positionX,
    shape.centerY + shape.positionY,
  );
  let safe_scale = max(vec2f(abs(shape.scaleX), abs(shape.scaleY)), vec2f(0.0001, 0.0001));
  let scaled_local = vec2f(local_p.x * safe_scale.x, -local_p.y * safe_scale.y);

  return shape_center + rotate_point(scaled_local, radians(shape.rotation));
}

fn hash_u32(value: u32) -> u32 {
  var hashed = value;

  hashed = (hashed ^ 61u) ^ (hashed >> 16u);
  hashed = hashed * 9u;
  hashed = hashed ^ (hashed >> 4u);
  hashed = hashed * 0x27d4eb2du;
  hashed = hashed ^ (hashed >> 15u);

  return hashed;
}

fn random_color_from_primitive_id(primitive_id: u32) -> vec3f {
  let red_hash = hash_u32(primitive_id);
  let green_hash = hash_u32(primitive_id ^ 0x9e3779b9u);
  let blue_hash = hash_u32(primitive_id ^ 0x85ebca6bu);
  let color = vec3f(
    f32(red_hash & 255u),
    f32(green_hash & 255u),
    f32(blue_hash & 255u),
  ) / 255.0;

  return mix(vec3f(0.3), vec3f(1.0), color);
}

fn fill_color(shape: ShapeRecord) -> vec3f {
  return vec3f(shape.fillRed, shape.fillGreen, shape.fillBlue);
}

fn stroke_color(shape: ShapeRecord) -> vec3f {
  return vec3f(shape.strokeRed, shape.strokeGreen, shape.strokeBlue);
}

fn has_visible_fill(shape: ShapeRecord) -> bool {
  return shape.fillAlpha > 0.001;
}

fn has_visible_stroke(shape: ShapeRecord) -> bool {
  return shape.strokeAlpha > 0.001 && shape.strokeWidth > 0.001;
}

fn centered_stroke_fill_inset(shape: ShapeRecord) -> f32 {
  if (!has_visible_stroke(shape)) {
    return 0.0;
  }

  return shape.strokeWidth * 0.5;
}

fn has_path_terminal_flag(shape: ShapeRecord, terminal_flag: u32) -> bool {
  return (shape.flags & terminal_flag) != 0u;
}

fn has_shape_style_flag(shape: ShapeRecord, style_flag: u32) -> bool {
  return (shape.flags & style_flag) != 0u;
}

fn fill_gradient_start(shape: ShapeRecord) -> vec2f {
  return vec2f(shape.centerX, shape.centerY);
}

fn fill_gradient_end(shape: ShapeRecord) -> vec2f {
  return vec2f(shape.starInnerRoundness, shape.starOuterRoundness);
}

fn fill_gradient_index(shape: ShapeRecord) -> u32 {
  return shape.reserved0;
}

fn fill_gradient_stop_count(shape: ShapeRecord) -> u32 {
  return shape.polygonMode;
}

fn stroke_gradient_start(shape: ShapeRecord) -> vec2f {
  return vec2f(shape.twistAmount, shape.twistCenterX);
}

fn stroke_gradient_end(shape: ShapeRecord) -> vec2f {
  return vec2f(shape.twistCenterY, shape.puckerBloatAmount);
}

fn stroke_gradient_index(shape: ShapeRecord) -> u32 {
  return shape.trimMode;
}

fn stroke_gradient_stop_count(shape: ShapeRecord) -> u32 {
  return shape.mergeMode;
}

fn linear_gradient_ratio(local_p: vec2f, start: vec2f, end: vec2f) -> f32 {
  let axis = end - start;
  let axis_length_squared = dot(axis, axis);

  if (axis_length_squared <= 0.000001) {
    return 0.0;
  }

  return clamp(dot(local_p - start, axis) / axis_length_squared, 0.0, 1.0);
}

fn radial_gradient_ratio(local_p: vec2f, start: vec2f, end: vec2f) -> f32 {
  let radius = max(length(end - start), 0.0001);

  return clamp(length(local_p - start) / radius, 0.0, 1.0);
}

fn sample_gradient_stop_range(gradient_index: u32, gradient_stop_count: u32, t: f32) -> vec4f {
  if (gradient_stop_count == 0u) {
    return vec4f(0.0);
  }

  let clamped_t = clamp(t, 0.0, 1.0);
  let first_stop = gradientStops[gradient_index];

  if (gradient_stop_count == 1u || clamped_t <= first_stop.offset) {
    return vec4f(first_stop.red, first_stop.green, first_stop.blue, first_stop.alpha);
  }

  for (var stop_index = 0u; stop_index + 1u < gradient_stop_count; stop_index = stop_index + 1u) {
    let current_stop = gradientStops[gradient_index + stop_index];
    let next_stop = gradientStops[gradient_index + stop_index + 1u];

    if (clamped_t <= next_stop.offset) {
      let range = next_stop.offset - current_stop.offset;

      if (abs(range) <= 0.000001) {
        return vec4f(next_stop.red, next_stop.green, next_stop.blue, next_stop.alpha);
      }

      let progress = clamp((clamped_t - current_stop.offset) / range, 0.0, 1.0);

      return mix(
        vec4f(current_stop.red, current_stop.green, current_stop.blue, current_stop.alpha),
        vec4f(next_stop.red, next_stop.green, next_stop.blue, next_stop.alpha),
        progress,
      );
    }
  }

  let last_stop = gradientStops[gradient_index + gradient_stop_count - 1u];

  return vec4f(last_stop.red, last_stop.green, last_stop.blue, last_stop.alpha);
}

fn sample_fill_gradient(shape: ShapeRecord, local_p: vec2f) -> vec4f {
  let start = fill_gradient_start(shape);
  let end = fill_gradient_end(shape);
  let t = select(
    linear_gradient_ratio(local_p, start, end),
    radial_gradient_ratio(local_p, start, end),
    has_shape_style_flag(shape, SHAPE_FLAG_FILL_GRADIENT_RADIAL),
  );

  return sample_gradient_stop_range(fill_gradient_index(shape), fill_gradient_stop_count(shape), t);
}

fn sample_stroke_gradient(shape: ShapeRecord, local_p: vec2f) -> vec4f {
  let start = stroke_gradient_start(shape);
  let end = stroke_gradient_end(shape);
  let t = select(
    linear_gradient_ratio(local_p, start, end),
    radial_gradient_ratio(local_p, start, end),
    has_shape_style_flag(shape, SHAPE_FLAG_STROKE_GRADIENT_RADIAL),
  );

  return sample_gradient_stop_range(
    stroke_gradient_index(shape),
    stroke_gradient_stop_count(shape),
    t,
  );
}

fn safe_normalize_or_fallback(direction: vec2f, fallback: vec2f) -> vec2f {
  let direction_length = length(direction);

  if (direction_length > 0.0001) {
    return direction / direction_length;
  }

  let fallback_length = length(fallback);

  if (fallback_length > 0.0001) {
    return fallback / fallback_length;
  }

  return vec2f(1.0, 0.0);
}

fn cubic_start_tangent(p0: vec2f, c1: vec2f, c2: vec2f, p3: vec2f) -> vec2f {
  return safe_normalize_or_fallback(c1 - p0, safe_normalize_or_fallback(c2 - p0, p3 - p0));
}

fn cubic_end_tangent(p0: vec2f, c1: vec2f, c2: vec2f, p3: vec2f) -> vec2f {
  return safe_normalize_or_fallback(p3 - c2, safe_normalize_or_fallback(p3 - c1, p3 - p0));
}

fn endpoint_clip_sdf(
  local_p: vec2f,
  endpoint: vec2f,
  inward_tangent: vec2f,
  extension: f32,
) -> f32 {
  return dot(endpoint - local_p, inward_tangent) - extension;
}

fn over(bottom: vec4f, top: vec4f) -> vec4f {
  let out_alpha = top.a + bottom.a * (1.0 - top.a);

  if (out_alpha <= 0.0001) {
    return vec4f(0.0);
  }

  let out_premultiplied =
    top.rgb * top.a + bottom.rgb * bottom.a * (1.0 - top.a);

  return vec4f(out_premultiplied / out_alpha, out_alpha);
}

fn heatmap_color_from_ratio(ratio: f32) -> vec3f {
  let t = clamp(ratio, 0.0, 1.0);

  if (t<0.001){
    return vec3(0.0);
  }

  if (t < 0.25) {
    return mix(vec3f(0.05, 0.08, 0.2), vec3f(0.0, 0.45, 1.0), t / 0.25);
  }

  if (t < 0.5) {
    return mix(vec3f(0.0, 0.45, 1.0), vec3f(0.0, 0.9, 0.55), (t - 0.25) / 0.25);
  }

  if (t < 0.75) {
    return mix(vec3f(0.0, 0.9, 0.55), vec3f(1.0, 0.85, 0.1), (t - 0.5) / 0.25);
  }

  return mix(vec3f(1.0, 0.85, 0.1), vec3f(1.0, 0.2, 0.1), (t - 0.75) / 0.25);
}

fn shape_bounds_padding(shape: ShapeRecord) -> f32 {
  if (shape.kind == SHAPE_KIND_PATH) {
    return max(shape.width * 0.5, 1.0);
  }

  if (has_visible_stroke(shape)) {
    return max(shape.strokeWidth * 0.5, 0.75);
  }

  return 0.75;
}

fn shape_local_bounds_min(shape: ShapeRecord) -> vec2f {
  let padding = shape_bounds_padding(shape);

  return vec2f(shape.boundsMinX - padding, shape.boundsMinY - padding);
}

fn shape_local_bounds_max(shape: ShapeRecord) -> vec2f {
  let padding = shape_bounds_padding(shape);

  return vec2f(shape.boundsMaxX + padding, shape.boundsMaxY + padding);
}

fn point_in_shape_bounds(shape: ShapeRecord, local_p: vec2f) -> bool {
  let local_min = shape_local_bounds_min(shape);
  let local_max = shape_local_bounds_max(shape);

  return local_p.x >= local_min.x &&
    local_p.x <= local_max.x &&
    local_p.y >= local_min.y &&
    local_p.y <= local_max.y;
}

fn shape_world_bounds(shape: ShapeRecord) -> vec4f {
  let local_min = shape_local_bounds_min(shape);
  let local_max = shape_local_bounds_max(shape);
  let p0 = composition_point_from_shape_local(shape, vec2f(local_min.x, local_min.y));
  let p1 = composition_point_from_shape_local(shape, vec2f(local_max.x, local_min.y));
  let p2 = composition_point_from_shape_local(shape, vec2f(local_max.x, local_max.y));
  let p3 = composition_point_from_shape_local(shape, vec2f(local_min.x, local_max.y));
  let min_corner = min(min(p0, p1), min(p2, p3));
  let max_corner = max(max(p0, p1), max(p2, p3));

  return vec4f(min_corner, max_corner);
}

fn tile_canvas_bounds(tile_coord: vec2u) -> vec4f {
  let safe_canvas = canvas_resolution();
  let tile_y = flipped_tile_y(tile_coord.y);
  let tile_min = vec2f(
    f32(tile_coord.x * TILE_SIZE_PX),
    f32(tile_y * TILE_SIZE_PX),
  );
  let tile_max = min(tile_min + vec2f(f32(TILE_SIZE_PX)), safe_canvas);

  return vec4f(tile_min, tile_max);
}

fn tile_composition_bounds(tile_coord: vec2u) -> vec4f {
  let canvas_bounds = tile_canvas_bounds(tile_coord);
  let p0 = composition_position_from_canvas(canvas_bounds.xy);
  let p1 = composition_position_from_canvas(canvas_bounds.zw);

  return vec4f(min(p0, p1), max(p0, p1));
}

fn tile_intersects_shape_bounds(tile_coord: vec2u, shape: ShapeRecord) -> bool {
  let tile_bounds = tile_composition_bounds(tile_coord);
  let shape_bounds = shape_world_bounds(shape);

  return shape_bounds.z >= tile_bounds.x &&
    shape_bounds.x <= tile_bounds.z &&
    shape_bounds.w >= tile_bounds.y &&
    shape_bounds.y <= tile_bounds.w;
}

fn tile_intersects_shape_sdf(tile_coord: vec2u, shape: ShapeRecord) -> bool {
  let tile_bounds = tile_composition_bounds(tile_coord);
  let tile_center = (tile_bounds.xy + tile_bounds.zw) * 0.5;
  let local_tile_center = shape_local_point_from_composition_position(shape, tile_center);
  let local_tile_corner0 =
    shape_local_point_from_composition_position(shape, vec2f(tile_bounds.x, tile_bounds.y));
  let local_tile_corner1 =
    shape_local_point_from_composition_position(shape, vec2f(tile_bounds.z, tile_bounds.y));
  let local_tile_corner2 =
    shape_local_point_from_composition_position(shape, vec2f(tile_bounds.z, tile_bounds.w));
  let local_tile_corner3 =
    shape_local_point_from_composition_position(shape, vec2f(tile_bounds.x, tile_bounds.w));
  let cover_radius = max(
    max(
      length(local_tile_corner0 - local_tile_center),
      length(local_tile_corner1 - local_tile_center),
    ),
    max(
      length(local_tile_corner2 - local_tile_center),
      length(local_tile_corner3 - local_tile_center),
    ),
  ) * 2.0;
  let sd = evaluate_shape_sdf(shape, local_tile_center);

  return sd <= cover_radius;
}

fn tile_intersects_shape(tile_coord: vec2u, shape: ShapeRecord) -> bool {
  if (!tile_intersects_shape_bounds(tile_coord, shape)) {
    return false;
  }

  return tile_intersects_shape_sdf(tile_coord, shape);
}

fn append_shape_to_tile(tile_coord: vec2u, shape_index: u32) {
  let tile_res = tile_resolution();
  let tile_index = tile_coord.y * tile_res.x + tile_coord.x;
  let bucket_index = atomicAdd(&tileShapeCounts[tile_index], 1u);

  if (bucket_index < demoUniforms.maxShapesPerTile) {
    tileShapeIndices[tile_index * demoUniforms.maxShapesPerTile + bucket_index] = shape_index;
  }
}

fn compact_tile_instruction(tile_coord: vec2u) {
  let tile_res = tile_resolution();
  let tile_index = tile_coord.y * tile_res.x + tile_coord.x;
  let shape_count = min(atomicLoad(&tileShapeCounts[tile_index]), demoUniforms.maxShapesPerTile);

  if (shape_count == 0u) {
    return;
  }

  let instruction_index = atomicAdd(&indirectDispatchArgs.dispatchX, 1u);

  tileInstructions[instruction_index] = TileInstruction(
    tile_index,
    tile_coord.x,
    tile_coord.y,
    0u,
  );
}

fn path_cap_clipping_sdf(shape: ShapeRecord, local_p: vec2f, segment: CubicBezierSegment, half_stroke_width: f32) -> f32 {
  if (shape.strokeLineCap == STROKE_CAP_ROUND) {
    return -1e6;
  }

  let p0 = vec2f(segment.p0X, segment.p0Y);
  let c1 = vec2f(segment.c1X, segment.c1Y);
  let c2 = vec2f(segment.c2X, segment.c2Y);
  let p3 = vec2f(segment.p3X, segment.p3Y);
  let start_tangent = cubic_start_tangent(p0, c1, c2, p3);
  let end_tangent = cubic_end_tangent(p0, c1, c2, p3);
  let cap_extension = select(half_stroke_width, 0.0, shape.strokeLineCap == STROKE_CAP_BUTT);
  var clip_sdf = -1e6;

  if (has_path_terminal_flag(shape, PATH_TERMINAL_START)) {
    clip_sdf = max(clip_sdf, endpoint_clip_sdf(local_p, p0, start_tangent, cap_extension));
  }

  if (has_path_terminal_flag(shape, PATH_TERMINAL_END)) {
    clip_sdf = max(clip_sdf, endpoint_clip_sdf(local_p, p3, -end_tangent, cap_extension));
  }

  return clip_sdf;
}

fn evaluate_shape_sdf(shape: ShapeRecord, local_p: vec2f) -> f32 {
  if (shape.kind == SHAPE_KIND_RECTANGLE) {
    let half_size = max(vec2f(shape.width, shape.height) * 0.5, vec2f(1.0, 1.0));

    if (shape.cornerRadius > 0.001) {
      return sd_rounded_box(
        local_p,
        half_size,
        vec4f(shape.cornerRadius, shape.cornerRadius, shape.cornerRadius, shape.cornerRadius),
      );
    }

    return sd_box(local_p, half_size);
  }

  if (shape.kind == SHAPE_KIND_ELLIPSE) {
    let radii = max(vec2f(shape.radiusX, shape.radiusY), vec2f(1.0, 1.0));

    return sd_ellipse(local_p, radii);
  }

  if (shape.kind == SHAPE_KIND_PATH) {
    let half_stroke_width = max(shape.width, 0.001) * 0.5;
    let segment = cubicBezierSegments[shape.pathIndex];
    let curve_distance = sd_cubic_bezier(
      local_p,
      vec2f(segment.p0X, segment.p0Y),
      vec2f(segment.c1X, segment.c1Y),
      vec2f(segment.c2X, segment.c2Y),
      vec2f(segment.p3X, segment.p3Y),
    );
    let stroke_sdf = abs(curve_distance) - half_stroke_width;
    let clip_sdf = path_cap_clipping_sdf(shape, local_p, segment, half_stroke_width);

    return max(stroke_sdf, clip_sdf);
  }

  return 1e6;
}

fn rasterized_shape_sample(shape: ShapeRecord, pixel_pos: vec2f) -> vec4f {
  let local_p = shape_local_point(shape, pixel_pos);

  if (!point_in_shape_bounds(shape, local_p)) {
    return vec4f(0.0);
  }

  let aa_width = 0.75;
  let sd = evaluate_shape_sdf(shape, local_p);
  let layer_opacity = clamp(shape.opacity, 0.0, 1.0);

  if (shape.kind == SHAPE_KIND_PATH) {
    let coverage = fill_from_sdf(sd, aa_width);

    if (coverage <= 0.0) {
      return vec4f(0.0);
    }

    if (has_shape_style_flag(shape, SHAPE_FLAG_STROKE_GRADIENT)) {
      let gradient_sample = sample_stroke_gradient(shape, local_p);
      let alpha =
        coverage * clamp(layer_opacity * shape.strokeAlpha * gradient_sample.a, 0.0, 1.0);

      if (alpha <= 0.0) {
        return vec4f(0.0);
      }

      return vec4f(gradient_sample.rgb, alpha);
    }

    let alpha = coverage * clamp(layer_opacity * shape.strokeAlpha, 0.0, 1.0);

    return vec4f(stroke_color(shape), alpha);
  }

  let fill_inset = centered_stroke_fill_inset(shape);
  let fill_coverage = select(
    0.0,
    fill_from_sdf(sd + fill_inset, aa_width),
    has_visible_fill(shape),
  );
  let stroke_coverage = select(
    0.0,
    fill_from_sdf(abs(sd) - shape.strokeWidth * 0.5, aa_width),
    has_visible_stroke(shape),
  );
  var sample = vec4f(0.0);

  if (fill_coverage > 0.0) {
    if (has_shape_style_flag(shape, SHAPE_FLAG_FILL_GRADIENT)) {
      let gradient_sample = sample_fill_gradient(shape, local_p);
      let fill_alpha =
        fill_coverage * clamp(layer_opacity * shape.fillAlpha * gradient_sample.a, 0.0, 1.0);

      if (fill_alpha > 0.0) {
        sample = over(sample, vec4f(gradient_sample.rgb, fill_alpha));
      }
    } else {
      let fill_alpha = fill_coverage * clamp(layer_opacity * shape.fillAlpha, 0.0, 1.0);

      if (fill_alpha > 0.0) {
        sample = over(sample, vec4f(fill_color(shape), fill_alpha));
      }
    }
  }

  if (stroke_coverage > 0.0) {
    if (has_shape_style_flag(shape, SHAPE_FLAG_STROKE_GRADIENT)) {
      let gradient_sample = sample_stroke_gradient(shape, local_p);
      let stroke_alpha =
        stroke_coverage * clamp(layer_opacity * shape.strokeAlpha * gradient_sample.a, 0.0, 1.0);

      if (stroke_alpha > 0.0) {
        sample = over(sample, vec4f(gradient_sample.rgb, stroke_alpha));
      }
    } else {
      let stroke_alpha = stroke_coverage * clamp(layer_opacity * shape.strokeAlpha, 0.0, 1.0);

      if (stroke_alpha > 0.0) {
        sample = over(sample, vec4f(stroke_color(shape), stroke_alpha));
      }
    }
  }

  if (sample.a <= 0.0001) {
    return vec4f(random_color_from_primitive_id(shape.id), 0.0);
  }

  return sample;
}

fn tile_bucket_prepass(tile_coord: vec2u) {
  if (demoUniforms.activeShapeIndex >= demoUniforms.shapeCount) {
    return;
  }

  let shape = shapeRecords[demoUniforms.activeShapeIndex];

  if (tile_intersects_shape(tile_coord, shape)) {
    append_shape_to_tile(tile_coord, demoUniforms.activeShapeIndex);
  }
}

fn tile_coord_from_pixel_pos(pixel_pos: vec2f) -> vec2u {
  let safe_canvas = canvas_resolution();
  let tile_res = tile_resolution();
  let max_tile_coord = vec2u(tile_res.x - 1u, tile_res.y - 1u);

  return min(
    vec2u(
      u32(min(max(pixel_pos.x, 0.0), safe_canvas.x - 0.0001) / f32(TILE_SIZE_PX)),
      flipped_tile_y(
        u32(min(max(pixel_pos.y, 0.0), safe_canvas.y - 0.0001) / f32(TILE_SIZE_PX)),
      ),
    ),
    max_tile_coord,
  );
}

fn tiled_scene_shape_count(pixel_pos: vec2f) -> u32 {
  let tile_res = tile_resolution();
  let tile_coord = tile_coord_from_pixel_pos(pixel_pos);
  let tile_index = tile_coord.y * tile_res.x + tile_coord.x;

  return min(atomicLoad(&tileShapeCounts[tile_index]), demoUniforms.maxShapesPerTile);
}

fn rasterize_tiled_scene_for_tile(pixel_pos: vec2f, tile_coord: vec2u) -> vec4f {
  let tile_res = tile_resolution();
  let tile_index = tile_coord.y * tile_res.x + tile_coord.x;
  let shape_count = min(atomicLoad(&tileShapeCounts[tile_index]), demoUniforms.maxShapesPerTile);
  let heatmap_ratio = f32(shape_count) / 8.0;
  var accumulated_color = heatmap_color_from_ratio(heatmap_ratio);
  var accumulated_alpha = 1.0;

  for (var shape_index = 0u; shape_index < shape_count; shape_index = shape_index + 1u) {
    let primitive_index =
      tileShapeIndices[tile_index * demoUniforms.maxShapesPerTile + shape_index];
    let shape = shapeRecords[primitive_index];
    let sample = rasterized_shape_sample(shape, pixel_pos);
    let alpha = sample.a;

    if (alpha <= 0.0) {
      continue;
    }

    let color = sample.rgb;

    accumulated_color = color * alpha + accumulated_color * (1.0 - alpha);
    accumulated_alpha = alpha + accumulated_alpha * (1.0 - alpha);
  }

  return vec4f(accumulated_color, accumulated_alpha);
}

fn rasterize_tiled_scene(pixel_pos: vec2f) -> vec4f {
  return rasterize_tiled_scene_for_tile(pixel_pos, tile_coord_from_pixel_pos(pixel_pos));
}
