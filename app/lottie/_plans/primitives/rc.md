# Rectangle

## Lottie Data

- `ty: "rc"`: shape discriminator.
- `d?`: exporter direction metadata.
- `s`: rectangle size as an animatable `vec2`.
- `p`: rectangle position as an animatable `vec2`.
- `r`: corner radius as an animatable number.
- Other data: unknown exporter-specific fields may also be present.

## Animated Attributes

- Animatable attributes here: `s`, `p`, `r`.
- Lottie stores animatable properties as either `{ a: 0, k, ix? }` or `{ a: 1, k: [keyframes...], ix? }`.
- `a`: whether the property is animated.
- `k`: the static value or the ordered keyframe array.
- `ix?`: exporter property index.

## Per-Keyframe Data

- `t`: frame where the keyframe starts.
- `s`: start value for the segment.
- `e?`: optional end value for the segment.
- `i?`: incoming easing handle.
- `o?`: outgoing easing handle.
- `h?`: hold flag.
- `i.x`, `i.y`, `o.x`, `o.y`: easing handle coordinates, each stored as either a number or an array of numbers.
- Other data: keyframes can also carry exporter-specific extra fields.

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
