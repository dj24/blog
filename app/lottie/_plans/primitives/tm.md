# Trim Paths

## Lottie Data

- `ty: "tm"`: shape discriminator.
- `s`: trim start percentage as an animatable number.
- `e`: trim end percentage as an animatable number.
- `o`: trim offset as an animatable number.
- `m?`: trim mode identifier.
- Other data: unknown exporter-specific fields may also be present.

## Animated Attributes

- Animatable attributes here: `s`, `e`, `o`.
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
