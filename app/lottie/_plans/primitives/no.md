# No Style

## Lottie Data

- `ty: "no"`: shape discriminator.
- `bm?`: blend mode identifier.
- Other data: unknown exporter-specific fields may also be present.

## Animated Attributes

- This item does not define animatable properties in the current schema.

## Per-Keyframe Data

- If exporter-specific animated fields appear, they would still use the standard Lottie keyframe structure:
- `t`, `s`, `e?`, `i?`, `o?`, `h?`.
- `i.x`, `i.y`, `o.x`, `o.y`: easing handle coordinates, each stored as either a number or an array of numbers.
