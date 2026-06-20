# Repeater

## Lottie Data

- `ty: "rp"`: shape discriminator.
- `c`: copy count as an animatable number.
- `o`: pre-copy offset as an animatable number.
- `m?`: composite order identifier.
- `tr`: repeater transform object.
- `tr.a?`: anchor point as an optional animatable `vec2`.
- `tr.p?`: position offset as an optional animatable `vec2`.
- `tr.s?`: scale percentages as an optional animatable `vec2`.
- `tr.r?`: rotation as an optional animatable number.
- `tr.o?`: opacity as an optional animatable number.
- `tr.sk?`: skew as an optional animatable number.
- `tr.sa?`: skew axis as an optional animatable number.
- `tr.so?`: start opacity as an optional animatable number.
- `tr.eo?`: end opacity as an optional animatable number.
- Other data: unknown exporter-specific fields may also be present.

## Animated Attributes

- Animatable attributes here: `c`, `o`, and every animatable property inside `tr`.
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
