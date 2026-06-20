# Text

THIS WILL PROBABLY NOT GET USED

It seems that editors commonly convert text to paths on the fly, so there is no reliance on system fonts

## Lottie Data

- This primitive plan does not currently have a matching local `lottie-shape.ts` schema entry.
- Rendering note: text will use the slug algorithm to convert glyphs to paths, then render them the same way as path shapes.
- Other data: real Lottie text layers typically carry separate layer-level text documents, animators, and transforms rather than a simple shape-item payload.

## Animated Attributes

- At the Lottie property level, text-related animatable values still commonly use `{ a: 0, k, ix? }` or `{ a: 1, k: [keyframes...], ix? }`.
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
- https://github.com/diffusionstudio/slug-webgpu
