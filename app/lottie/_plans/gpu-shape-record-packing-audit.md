# GPU Shape Record Packing Audit

## Scope

Reviewed:

- `app/lottie/_lib/gpu-shape-record.ts`
- `app/lottie/_lib/lottie-gpu-frame.ts`
- `app/lottie/demo/shaders/shape_render.wgsl`
- `app/lottie/_plans/webgpu-architecture.md`

## Current State

- `GpuShapeRecord` currently has `56` fields, all written as `u32` or `f32`.
- That makes the flattened record `224` bytes per shape.
- The current CPU flattening path only assigns `22` fields:
  `id`, `kind`, `positionX`, `positionY`, `scaleX`, `scaleY`, `rotation`, `opacity`,
  `fillRed`, `fillGreen`, `fillBlue`, `fillAlpha`, `width`, `height`, `radiusX`, `radiusY`,
  `cornerRadius`, `pathIndex`, `boundsMinX`, `boundsMinY`, `boundsMaxX`, `boundsMaxY`.
- The current shader reads `24` fields, but `centerX` and `centerY` are only read, never written,
  so they are effectively constant zero in the flattened path today.

The biggest immediate win is not just "pack smaller values". It is also "stop carrying dead lanes"
for fields that are not part of the current rectangle / ellipse / path runtime.

## Safe Small-Value Candidates

| Fields | Better encoding | Why |
| --- | --- | --- |
| `fillRed`, `fillGreen`, `fillBlue`, `fillAlpha` | `rgba8unorm` packed into one `u32` | These are treated as normalized color channels in the shader. |
| `opacity` | `u8` unorm | The flattening code normalizes it to `0..1` before upload. |
| `kind` | `u8` | Only a handful of shape kinds are defined. |
| `polygonMode`, `trimMode`, `mergeMode` | `u8` each, or bits inside a shared flags word | These are enum-like mode values, not full 32-bit quantities. |
| `flags` | `u8` or `u16` bitfield | Best used for presence bits and small mode flags. |
| `reserved0`, `reserved1`, `reserved2` | remove | Pure padding / placeholders right now. |
| `centerX`, `centerY` | remove or fold into `position*` | They are read in shader but currently always zero in the flattened path. |

## Good `u16` Candidates

These are indexes or ids, so they should not stay as floats. They can often shrink below `u32`
as long as we are comfortable with explicit caps.

| Fields | Better encoding | Notes |
| --- | --- | --- |
| `pathIndex` | `u16` if the cubic segment buffer is capped below `65536` | Keep `u32` only if very large animations are a real target. |
| `paintIndex`, `mergeNodeIndex`, `repeaterGroupIndex` | `u16` | Same reasoning as `pathIndex`. |
| `id` | `u16` or `u24` | In the current shader it is only used to derive a debug fallback color. |

If we want no hard cap, these can stay `u32`, but they still belong in integer header words rather
than in a wide float-heavy record.

## Good `f16` Candidates

These fields are shape-local geometry or transform values and are much better `f16` candidates than
large absolute world coordinates.

| Fields | Better encoding | Why |
| --- | --- | --- |
| `width`, `height` | `f16` | Local dimensions usually tolerate half precision well. |
| `radiusX`, `radiusY`, `cornerRadius` | `f16` | Same as above. |
| `boundsMinX`, `boundsMinY`, `boundsMaxX`, `boundsMaxY` | `f16` | These are local bounds around the shape center. |
| `scaleX`, `scaleY` | `f16` | Scale factors are usually small and smooth. |
| `rotation` | `f16` | Angle precision requirements are modest for this renderer. |

If we later pack the cubic Bezier side buffer too, the control points are also good `f16`
candidates because they are uploaded in segment-local space around the segment center.

## More Cautious `f16` Candidates

| Fields | Better encoding | Risk |
| --- | --- | --- |
| `positionX`, `positionY` | maybe `f16` | These are composition-space values. Around `1024-4096px`, half precision can start introducing visible subpixel jitter or 1-2px snapping. |

I would only shrink `position*` after a visual test pass on larger compositions.

## Fields That Should Probably Disappear From The Flattened Record

Many fields are not just "too wide"; they are not active in the current flattened renderer at all:

- `anchorX`, `anchorY`
- `paintIndex`
- `mergeNodeIndex`
- `repeaterGroupIndex`
- `roundRadius`
- `points`
- `innerRadius`
- `outerRadius`
- `starInnerRoundness`
- `starOuterRoundness`
- `starAngle`
- `polygonMode`
- `twistAmount`
- `twistCenterX`
- `twistCenterY`
- `puckerBloatAmount`
- `zigZagAmplitude`
- `zigZagFrequency`
- `zigZagPoints`
- `offsetAmount`
- `trimStart`
- `trimEnd`
- `trimOffset`
- `trimMode`
- `mergeMode`
- `repeaterCopies`
- `repeaterOffset`

For these, omission is a better optimization than smaller scalar types. The
`app/lottie/_plans/webgpu-architecture.md` direction toward a small shared header plus per-kind
payload is the right long-term shape.

## Practical Recommendation

For the current rectangle / ellipse / path renderer, a good next step would be:

1. Pack fill into one `rgba8unorm` word.
2. Pack `opacity`, `kind`, and small mode bits into one or two integer header words.
3. Remove `reserved*` and the currently dead `center*` lanes.
4. Move index-like fields into integer header words.
5. Shrink local geometry fields to `f16` only where we can tolerate the precision tradeoff.

That should get much closer to the existing `64`-byte target described in
`app/lottie/_plans/webgpu-architecture.md`, without forcing aggressive precision loss on
composition-space positions.
