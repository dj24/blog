fn fill_from_sdf(sd: f32, aa_width: f32) -> f32 {
  let aa = max(aa_width, 0.003);
  return 1.0 - smoothstep(-aa, aa, sd);
}

fn stroke_from_distance(distance_to_curve: f32, half_width: f32, aa_width: f32) -> f32 {
  let edge = distance_to_curve - half_width;
  let aa = max(aa_width, 0.003);
  return 1.0 - smoothstep(-aa, aa, edge);
}

fn cell_background(local_uv: vec2f) -> vec3f {
  let grid = 0.08 * (1.0 - smoothstep(0.0, 0.01, abs(fract(local_uv.x * 5.0) - 0.5) * 2.0));
  let cross = 0.08 * (1.0 - smoothstep(0.0, 0.01, abs(fract(local_uv.y * 5.0) - 0.5) * 2.0));
  return vec3f(0.08, 0.1, 0.14) + vec3f(grid + cross);
}

fn render_shape(cell_index: u32, p: vec2f, aa_width: f32) -> vec4f {
  if (cell_index == 0u) {
    let sd = sd_box(p, vec2f(0.42, 0.28));
    return vec4f(vec3f(0.95, 0.55, 0.31), fill_from_sdf(sd, aa_width));
  }

  if (cell_index == 1u) {
    let sd = sd_rounded_box(p, vec2f(0.4, 0.28), vec4f(0.14, 0.08, 0.2, 0.12));
    return vec4f(vec3f(0.95, 0.79, 0.29), fill_from_sdf(sd, aa_width));
  }

  if (cell_index == 2u) {
    let sd = sd_ellipse(p, vec2f(0.38, 0.28));
    return vec4f(vec3f(0.26, 0.85, 0.67), fill_from_sdf(sd, aa_width));
  }

  if (cell_index == 3u) {
    let sd = sd_star(p * vec2f(1.0, -1.0), 0.38, 5, 2.5);
    return vec4f(vec3f(0.39, 0.67, 0.98), fill_from_sdf(sd, aa_width));
  }

  if (cell_index == 4u) {
    let base_sd = sd_star(p * vec2f(1.0, -1.0), 0.38, 5, 2.5);
    let sd = op_round(base_sd, 0.12);
    return vec4f(vec3f(0.79, 0.53, 0.97), fill_from_sdf(sd, aa_width));
  }

  let curve_distance = sd_quadratic_bezier(
    p,
    vec2f(-0.46, 0.26),
    vec2f(0.0, -0.32),
    vec2f(0.46, 0.22),
  );
  let alpha = stroke_from_distance(curve_distance, 0.035, aa_width);
  return vec4f(vec3f(0.98, 0.44, 0.58), alpha);
}

fn fragmentMainImpl(input: VertexOutput) -> vec4<f32> {
  let uv = clamp(input.uv, vec2f(0.0), vec2f(0.9999));
  let cols = 2.0;
  let rows = 3.0;
  let grid_uv = vec2f(uv.x * cols, uv.y * rows);
  let cell = floor(grid_uv);
  let cell_index = u32(cell.y) * 2u + u32(cell.x);
  let local_uv = fract(grid_uv);
  let local_p = (local_uv - 0.5) * vec2f(1.7, -1.7);
  let aa_width = length(fwidth(local_p)) * 0.5;

  var color = cell_background(local_uv);
  let shape = render_shape(cell_index, local_p, aa_width);
  color = mix(color, shape.rgb, shape.a);

  let border_x = 1.0 - smoothstep(0.0, 0.02, min(local_uv.x, 1.0 - local_uv.x));
  let border_y = 1.0 - smoothstep(0.0, 0.02, min(local_uv.y, 1.0 - local_uv.y));
  let border = max(border_x, border_y) * 0.35;
  color = mix(color, vec3f(0.94, 0.96, 0.99), border);

  return vec4f(color, 1.0);
}
