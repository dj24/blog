# Composition

The main animation JSON is represented by `lottieCompositionSchema` in
[lottie-composition.ts](/C:/Users/Dan/code/blog/app/lottie/_lib/types/lottie-composition.ts:1).

At the top level, a composition typically contains:

- `nm`: optional human-readable animation name
- `ver`: optional Lottie spec version encoded as `MMmmpp`
- `v`: optional legacy bodymovin/exporter version string still seen in many files
- `fr`: frame rate
- `ip`: first frame in the timeline
- `op`: frame after the animation ends
- `w`: width in pixels
- `h`: height in pixels
- `ddd`: optional 3D flag
- `assets`: reusable precomps or images
- `markers`: optional named timeline sections
- `slots`: optional slot dictionary for shared property replacement
- `layers`: the top-level layer stack

The [official composition spec](https://lottie.github.io/lottie-spec/1.0/specs/composition/#animation)
defines `nm`, `ver`, `fr`, `ip`, `op`, `w`, `h`, `assets`, `markers`, `slots`, and `layers` on the
top-level animation object.

This codebase also keeps `v` because many real-world Lottie files, including assets already checked
into this repo, still use the older bodymovin version string even though it is not part of the 1.0
animation object described by the spec page above.
