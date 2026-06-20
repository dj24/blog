# Gradient Fill

## Lottie Data

- `ty: "gf"`: shape discriminator.
- `o`: fill opacity as an animatable number.
- `r?`: fill rule identifier.
- `bm?`: blend mode identifier.
- `g`: gradient colors object.
- `g.p`: number of color stop points encoded in `g.k`.
- `g.k`: packed gradient stop values as an animatable number array.
- `s`: gradient start point as an animatable `vec2`.
- `e`: gradient end point as an animatable `vec2`.
- `t?`: gradient type identifier, typically linear or radial.
- Other data: unknown exporter-specific fields may also be present.

## Animated Attributes

- Animatable attributes here: `o`, `g.k`, `s`, `e`.
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
