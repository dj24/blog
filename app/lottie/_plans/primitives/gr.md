# Group

## Lottie Data

- `ty: "gr"`: shape discriminator.
- `it`: ordered child shape items in the group.
- Other data: unknown exporter-specific fields may also be present.

## Animated Attributes

- The group item itself does not define animatable properties in the current schema.
- Animation usually comes from child items, especially sibling `tr` transform items or animated child shapes.

## Per-Keyframe Data

- Child animatable properties still use the standard Lottie keyframe fields:
- `t`: frame where the keyframe starts.
- `s`: start value for the segment.
- `e?`: optional end value for the segment.
- `i?`: incoming easing handle.
- `o?`: outgoing easing handle.
- `h?`: hold flag.
- `i.x`, `i.y`, `o.x`, `o.y`: easing handle coordinates, each stored as either a number or an array of numbers.
- Other data: keyframes can also carry exporter-specific extra fields.
