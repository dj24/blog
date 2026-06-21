const SHAPE_KIND_RECTANGLE: u32 = 1u;
const SHAPE_KIND_ELLIPSE: u32 = 2u;
const SHAPE_KIND_PATH: u32 = 4u;
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

@group(0) @binding(1) var<uniform> demoUniforms: DemoUniforms;
@group(0) @binding(3) var<storage, read_write> tileShapeCounts: array<atomic<u32>>;
@group(0) @binding(4) var<storage, read_write> tileShapeIndices: array<u32>;

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

fn composition_position_from_canvas(pixel_pos: vec2f) -> vec2f {
  let safe_canvas = canvas_resolution();
  let safe_composition = composition_resolution();

  return vec2f(
    (pixel_pos.x / safe_canvas.x) * safe_composition.x,
    (1.0 - pixel_pos.y / safe_canvas.y) * safe_composition.y,
  );
}

fn shape_local_point(shape: ShapeRecord, pixel_pos: vec2f) -> vec2f {
  let composition_pos = composition_position_from_canvas(pixel_pos);
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

fn shape_color(shape: ShapeRecord) -> vec3f {
  let fill_color = vec3f(shape.fillRed, shape.fillGreen, shape.fillBlue);
  let has_visible_fill = shape.fillAlpha > 0.001;

  return select(random_color_from_primitive_id(shape.id), fill_color, has_visible_fill);
}

fn shape_bounds_padding(shape: ShapeRecord) -> f32 {
  if (shape.kind == SHAPE_KIND_PATH) {
    return max(shape.width * 0.5, 1.0);
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
  let tile_min = vec2f(
    f32(tile_coord.x * TILE_SIZE_PX),
    f32(tile_coord.y * TILE_SIZE_PX),
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

fn tile_intersects_shape(tile_coord: vec2u, shape: ShapeRecord) -> bool {
  let tile_bounds = tile_composition_bounds(tile_coord);
  let shape_bounds = shape_world_bounds(shape);

  return shape_bounds.z >= tile_bounds.x &&
    shape_bounds.x <= tile_bounds.z &&
    shape_bounds.w >= tile_bounds.y &&
    shape_bounds.y <= tile_bounds.w;
}

fn append_shape_to_tile(tile_coord: vec2u, shape_index: u32) {
  let tile_res = tile_resolution();
  let tile_index = tile_coord.y * tile_res.x + tile_coord.x;
  let bucket_index = atomicAdd(&tileShapeCounts[tile_index], 1u);

  if (bucket_index < demoUniforms.maxShapesPerTile) {
    tileShapeIndices[tile_index * demoUniforms.maxShapesPerTile + bucket_index] = shape_index;
  }
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

    return abs(curve_distance) - half_stroke_width;
  }

  return 1e6;
}

fn rasterized_shape_alpha(shape: ShapeRecord, pixel_pos: vec2f) -> f32 {
  let local_p = shape_local_point(shape, pixel_pos);

  if (!point_in_shape_bounds(shape, local_p)) {
    return 0.0;
  }

  let aa_width = 0.75;
  let sd = evaluate_shape_sdf(shape, local_p);

  return fill_from_sdf(sd, aa_width) * clamp(shape.opacity * shape.fillAlpha, 0.0, 1.0);
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

fn rasterize_tiled_scene(pixel_pos: vec2f) -> vec4f {
  let safe_canvas = canvas_resolution();
  let tile_res = tile_resolution();
  let max_tile_coord = vec2u(tile_res.x - 1u, tile_res.y - 1u);
  let tile_coord = min(
    vec2u(
      u32(min(max(pixel_pos.x, 0.0), safe_canvas.x - 0.0001) / f32(TILE_SIZE_PX)),
      u32(min(max(pixel_pos.y, 0.0), safe_canvas.y - 0.0001) / f32(TILE_SIZE_PX)),
    ),
    max_tile_coord,
  );
  let tile_index = tile_coord.y * tile_res.x + tile_coord.x;
  let shape_count = min(atomicLoad(&tileShapeCounts[tile_index]), demoUniforms.maxShapesPerTile);
  var accumulated_color = random_color_from_primitive_id(tile_index);
  var accumulated_alpha = 1.0;

  for (var shape_index = 0u; shape_index < shape_count; shape_index = shape_index + 1u) {
    let primitive_index =
      tileShapeIndices[tile_index * demoUniforms.maxShapesPerTile + shape_index];
    let shape = shapeRecords[primitive_index];
    let alpha = rasterized_shape_alpha(shape, pixel_pos);

    if (alpha <= 0.0) {
      continue;
    }

    let color = shape_color(shape);

    accumulated_color = color * alpha + accumulated_color * (1.0 - alpha);
    accumulated_alpha = alpha + accumulated_alpha * (1.0 - alpha);
  }

  return vec4f(accumulated_color, accumulated_alpha);
}
