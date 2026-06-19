# Lottie Schema Notes

This folder models the subset of the Lottie and dotLottie formats that we currently parse in this
project.

## Quick Map

Use these notes based on what you are trying to understand:

- [composition.md](/C:/Users/Dan/code/blog/app/lottie/_lib/types/_docs/composition.md:1): top-level animation object
- [layers-and-assets.md](/C:/Users/Dan/code/blog/app/lottie/_lib/types/_docs/layers-and-assets.md:1): layer stack, layer type numbers, and reusable assets
- [shapes.md](/C:/Users/Dan/code/blog/app/lottie/_lib/types/_docs/shapes.md:1): shape item types, groups, and transforms
- [properties.md](/C:/Users/Dan/code/blog/app/lottie/_lib/types/_docs/properties.md:1): static vs animated property wrappers and common keyframe fields
- [dotlottie-and-validation.md](/C:/Users/Dan/code/blog/app/lottie/_lib/types/_docs/dotlottie-and-validation.md:1): dotLottie packaging and validation strategy

## Mental Model

The common structure is:

1. composition
2. layers
3. shape layers
4. grouped shape items
5. animatable properties

The main schema entry points in this folder are:

- [lottie-composition.ts](/C:/Users/Dan/code/blog/app/lottie/_lib/types/lottie-composition.ts:1)
- [lottie-layer.ts](/C:/Users/Dan/code/blog/app/lottie/_lib/types/lottie-layer.ts:1)
- [lottie-shape.ts](/C:/Users/Dan/code/blog/app/lottie/_lib/types/lottie-shape.ts:1)
- [lottie-property.ts](/C:/Users/Dan/code/blog/app/lottie/_lib/types/lottie-property.ts:1)
- [lottie-asset.ts](/C:/Users/Dan/code/blog/app/lottie/_lib/types/lottie-asset.ts:1)
- [dotlottie.ts](/C:/Users/Dan/code/blog/app/lottie/_lib/types/dotlottie.ts:1)

Keep docs close to the schemas: when the parser grows, update the matching `_docs` page alongside
the schema file.
