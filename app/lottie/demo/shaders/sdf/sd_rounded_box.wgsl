fn sd_rounded_box(p: vec2f, b: vec2f, radii: vec4f) -> f32 {
  let selected_xy = select(radii.zw, radii.xy, p.x > 0.0);
  let corner_radius = select(selected_xy.y, selected_xy.x, p.y > 0.0);
  let q = abs(p) - b + vec2f(corner_radius);
  return min(max(q.x, q.y), 0.0) + length(max(q, vec2f(0.0))) - corner_radius;
}
