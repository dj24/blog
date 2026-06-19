# Layers And Assets

## Layers

Layers are defined in [lottie-layer.ts](/C:/Users/Dan/code/blog/app/lottie/_lib/types/lottie-layer.ts:1).

Each layer has shared timeline and transform fields such as:

- `ind`: layer id
- `ty`: layer type
- `ks`: transform properties
- `ip` / `op`: in and out frames
- `st`: start time offset
- `parent`: optional parent layer id

Common layer types in this schema:

- `0`: precomp layer, referencing an asset by `refId`
- `1`: solid layer
- `2`: image layer
- `3`: null/helper layer
- `4`: shape layer
- `5`: text layer

Shape layers are the most important for vector animation because they contain `shapes`.

## Assets

Assets are defined in [lottie-asset.ts](/C:/Users/Dan/code/blog/app/lottie/_lib/types/lottie-asset.ts:1).

They are usually one of:

- precomp assets, which contain nested `layers`
- image assets, which point at an image file or embedded image data

Precomp layers connect to precomp assets via `refId`.
