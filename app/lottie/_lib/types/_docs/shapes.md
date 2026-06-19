# Shapes

Shape items are defined in [lottie-shape.ts](/C:/Users/Dan/code/blog/app/lottie/_lib/types/lottie-shape.ts:1).

A shape layer contains a `shapes` array. Inside it, the most common pattern is a group:

- `gr`: group of child shape items

Inside a group, the current parser models:

- `sh`: bezier path
- `rc`: rectangle
- `el`: ellipse
- `sr`: star or polygon
- `fl`: solid fill
- `gf`: gradient fill
- `st`: solid stroke
- `gs`: gradient stroke
- `tm`: trim paths
- `tr`: transform for that shape group

The broader Lottie shape spec also includes additional shape operators that this repo does not
currently model in `lottie-shape.ts`:

- `rp`: repeater
- `mm`: merge paths
- `rd`: round corners
- `pb`: pucker and bloat
- `op`: offset paths
- `zz`: zig zag

## Group Transforms

Inside a `gr` group, a `tr` item acts as the transform for the other items in that same group.

If a group contains a shape item such as `sh`, `rc`, or `el` plus a `tr` item, the usual meaning
is:

- the shape defines geometry in the group's local coordinate space
- the `tr` item applies position, anchor, scale, rotation, and opacity to that group
- the transform affects the sibling drawing items in the group rather than acting like a separate
  visible shape of its own

In practice, a group usually has at most one `tr` item.

If a group has no `tr`, it simply uses the inherited coordinate space and default transform values.
That effectively means:

- position offset: none
- scale: `100%, 100%`
- rotation: `0`
- opacity: `100%`

Outer parent groups and layer transforms still apply as usual.

## Common Nesting

The nesting usually looks like:

1. composition
2. layers
3. shape layer
4. shapes
5. group items
6. paths, fills, strokes, transforms, and other drawing instructions
