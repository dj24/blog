# Rectangle

Sources:
- https://iquilezles.org/articles/distfunctions2d/
- https://iquilezles.org/articles/bboxes2d/

Notes:
- The SDF article includes exact `sdBox` and `sdRoundedBox` functions that map well to Lottie rectangles.
- I did not find a dedicated axis-aligned rectangle AABB function on the bounding-box article, so only the SDF conversions are included here.

## WGSL

```wgsl
fn sd_box(p: vec2f, b: vec2f) -> f32 {
    let d = abs(p) - b;
    return length(max(d, vec2f(0.0))) + min(max(d.x, d.y), 0.0);
}

fn sd_rounded_box(p: vec2f, b: vec2f, radii: vec4f) -> f32 {
    let selected_xy = select(radii.zw, radii.xy, p.x > 0.0);
    let corner_radius = select(selected_xy.y, selected_xy.x, p.y > 0.0);
    let q = abs(p) - b + vec2f(corner_radius);
    return min(max(q.x, q.y), 0.0) + length(max(q, vec2f(0.0))) - corner_radius;
}
```
