# Blog

## Lottie Shape Types

The current parser subset in this repo is defined in [app/lottie/_lib/types/lottie-shape.ts](/C:/Users/Dan/code/blog/app/lottie/_lib/types/lottie-shape.ts:1).

- `gr`: group
- `sh`: bezier path
- `rc`: rectangle
- `el`: ellipse
- `sr`: polystar container
- `fl`: solid fill
- `gf`: gradient fill
- `st`: solid stroke
- `gs`: gradient stroke
- `tm`: trim paths
- `tr`: transform

The broader Lottie shape-item vocabulary also includes:

- `rp`: repeater
- `mm`: merge paths
- `rd`: round corners
- `pb`: pucker and bloat
- `op`: offset paths
- `zz`: zig zag

Putting that together, the full shape-item list we care about for the Lottie shape spec is:

- `gr`: group
- `sh`: bezier path
- `rc`: rectangle
- `el`: ellipse
- `sr`: polystar container
- `fl`: solid fill
- `gf`: gradient fill
- `st`: solid stroke
- `gs`: gradient stroke
- `tm`: trim paths
- `tr`: transform
- `rp`: repeater
- `mm`: merge paths
- `rd`: round corners
- `pb`: pucker and bloat
- `op`: offset paths
- `zz`: zig zag

For the `sr` polystar shape, the numeric `sy` mode values are:

- `1`: star
- `2`: polygon

Related layer type numbers from the current schema are:

- `0`: precomp layer
- `1`: solid layer
- `2`: image layer
- `3`: null/helper layer
- `4`: shape layer
- `5`: text layer
