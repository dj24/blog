const SHAPE_KIND_RECTANGLE: u32 = 1u;
const SHAPE_KIND_ELLIPSE: u32 = 2u;
const SHAPE_KIND_PATH: u32 = 4u;
const RENDER_MODE_BOUNDING_BOX: u32 = 0u;
const RENDER_MODE_SDF: u32 = 1u;
const CONTROL_POINT_RADIUS: vec2f = vec2f(32.0);

struct DemoUniforms {
  activeShapeIndex: u32,
  shapeCount: u32,
  renderMode: u32,
  reserved: u32,
  canvasResolution: vec2f,
  compositionResolution: vec2f,
}

@group(0) @binding(1) var<uniform> demoUniforms: DemoUniforms;

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

fn composition_position_from_canvas(pixel_pos: vec2f) -> vec2f {
  let safe_canvas = max(demoUniforms.canvasResolution, vec2f(1.0, 1.0));
  let safe_composition = max(demoUniforms.compositionResolution, vec2f(1.0, 1.0));

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
  return random_color_from_primitive_id(shape.id);
}

fn point_in_shape_bounds(shape: ShapeRecord, local_p: vec2f) -> bool {
  return local_p.x >= shape.boundsMinX &&
    local_p.x <= shape.boundsMaxX &&
    local_p.y >= shape.boundsMinY &&
    local_p.y <= shape.boundsMaxY;
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

fn render_active_shape(pixel_pos: vec2f) -> vec4f {
  if (demoUniforms.activeShapeIndex >= demoUniforms.shapeCount) {
    return vec4f(0.0, 0.0, 0.0, 0.0);
  }

  let shape = shapeRecords[demoUniforms.activeShapeIndex];
  let local_p = shape_local_point(shape, pixel_pos);

  if (demoUniforms.renderMode == RENDER_MODE_BOUNDING_BOX) {
    let alpha = select(0.0, 0.2, point_in_shape_bounds(shape, local_p));

    return vec4f(shape_color(shape), alpha);
  }

  let aa_width = max(length(fwidth(local_p)) * 0.5, 0.75);
  let sd = evaluate_shape_sdf(shape, local_p);
  let alpha = fill_from_sdf(sd, aa_width) * clamp(shape.opacity * shape.fillAlpha, 0.0, 1.0);

  return vec4f(shape_color(shape), alpha);
}
