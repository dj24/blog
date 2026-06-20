# Transform

## Lottie Data

- `ty: "tr"`: shape discriminator.
- `p?`: position as an optional animatable `vec2`.
- `a?`: anchor point as an optional animatable `vec2`.
- `s?`: scale percentages as an optional animatable `vec2`.
- `r?`: rotation as an optional animatable number.
- `o?`: opacity as an optional animatable number.
- Other data: unknown exporter-specific fields may also be present.

## Animated Attributes

- Animatable attributes here: `p?`, `a?`, `s?`, `r?`, `o?`.
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
