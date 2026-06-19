# Composition

The main animation JSON is represented by `lottieCompositionSchema` in
[lottie-composition.ts](/C:/Users/Dan/code/blog/app/lottie/_lib/types/lottie-composition.ts:1).

At the top level, a composition typically contains:

- `v`: the Lottie/bodymovin version string
- `fr`: frame rate
- `ip`: first frame in the timeline
- `op`: frame after the animation ends
- `w`: width in pixels
- `h`: height in pixels
- `ddd`: optional 3D flag
- `assets`: reusable precomps or images
- `layers`: the top-level layer stack

You can think of the composition as the root scene for the animation.
