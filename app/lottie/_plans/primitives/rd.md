# Rounded Corners

## Lottie Data

- `ty: "rd"`: shape discriminator.
- `r`: applied corner radius as an animatable number.
- Other data: unknown exporter-specific fields may also be present.

## Animated Attributes

- Animatable attributes here: `r`.
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

Source:
- https://iquilezles.org/articles/distfunctions2d/

Notes:
- The 2D distance-function article does not expose a dedicated rounded-corners primitive, but it does show the generic rounding operator used to round any existing 2D SDF.
- There is no matching bbox function for this operator on the bounding-box page.

## WGSL

```wgsl
fn op_round(sd_shape: f32, r: f32) -> f32 {
    return sd_shape - r;
}
```
