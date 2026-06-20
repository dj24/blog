# Properties

Animatable properties are defined in [lottie-property.ts](/C:/Users/Dan/code/blog/app/lottie/_lib/types/lottie-property.ts:1).

Most numeric, vector, color, and path values are stored as either:

- a static property: `{ a: 0, k: ... }`
- an animated property: `{ a: 1, k: [keyframes...] }`

Important pieces:

- `a`: whether the property is animated
- `k`: the value or keyframe list
- `ix`: exporter-specific property index

Keyframes commonly include:

- `t`: frame number
- `s`: start value
- `e`: optional end value
- `i` / `o`: easing handles
- `h`: hold flag

In TypeScript, the shared model is exposed as a generic intersection:

- `LottieKeyframe<TValue, TAttributeMetadata>`

This lets us represent the common keyframe fields once, then layer in attribute-specific metadata
for cases like path tangents or other exporter-specific per-keyframe fields.

This property wrapper is one of the core patterns in the Lottie format.
