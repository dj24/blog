# Lottie Route

This route is a mini project for exploring Lottie parsing, dotLottie archive handling, and a
custom WebGPU shape renderer. The most important idea is that the renderer does not try to render
raw Lottie nodes directly. It parses and validates Lottie data, flattens visible shape content on
the CPU into GPU-friendly records for one frame, uploads those records into storage buffers, then
rasterises them in WGSL.

Check [`_plans`](./_plans) before changing behaviour. The architecture notes there are the working
design record for decisions that are not yet fully reflected in the implementation.

## Runtime Flow

1. Page/UI code loads a `.lottie` or JSON animation.
2. [`_lib/dotlottie.ts`](./_lib/dotlottie.ts) decompresses `.lottie` archives, reads
   `manifest.json`, parses animation JSON, and validates it through the Zod schemas in
   [`_lib/types`](./_lib/types).
3. [`_lib/lottie-gpu-frame.ts`](./_lib/lottie-gpu-frame.ts) evaluates the requested frame and walks
   visible shape layers. It resolves animated properties, layer transforms, group transforms, fill
   and stroke styles, gradients, path segments, bounds, opacity, and draw order into a flat
   `LottieGpuFrame`.
4. [`_lib/gpu-shape-record.ts`](./_lib/gpu-shape-record.ts) defines the CPU record types, matching
   WGSL structs, style flags, kind discriminators, buffer strides, and binary encoders.
5. [`demo/webgpu-shape-demo-client.tsx`](./demo/webgpu-shape-demo-client.tsx) creates the WebGPU
   device, allocates buffers, encodes the current frame, writes buffers, runs compute passes, and
   copies the storage texture into the visible canvas.
6. [`demo/shaders/shape_render.wgsl`](./demo/shaders/shape_render.wgsl) evaluates SDF coverage,
   gradients, strokes, fills, tile bucketing, and compositing.

## Key Files

- [`page.tsx`](./page.tsx): route entry for `/lottie`.
- [`_components/lottie-page-client.tsx`](./_components/lottie-page-client.tsx): browser-side schema
  explorer for the bundled sample archive.
- [`_components/lottie-verification/lottie-verification.tsx`](./_components/lottie-verification/lottie-verification.tsx):
  page-level verification UI.
- [`layout.tsx`](./layout.tsx): Lottie route layout and subpage navigation shell.
- [`_components/lottie-subpage-navigation`](./_components/lottie-subpage-navigation): shared route
  navigation.
- [`_assets`](./_assets): local source assets imported by route code.
- [`../../public/lottie/assets`](../../public/lottie/assets): public assets loaded by browser URLs
  such as `/lottie/assets/square.lottie`.

## Renderer Files

- [`_lib/types`](./_lib/types): Zod schemas and TypeScript types for dotLottie, compositions,
  layers, assets, properties, and shape items.
- [`_lib/dotlottie.ts`](./_lib/dotlottie.ts): ZIP reader/writer for `.lottie`, JSON parsing, and
  archive conversion helpers.
- [`_lib/lottie-gpu-frame.ts`](./_lib/lottie-gpu-frame.ts): CPU flattening from Lottie tree to GPU
  frame data.
- [`_lib/gpu-shape-record.ts`](./_lib/gpu-shape-record.ts): GPU record layout, WGSL storage struct
  strings, and ArrayBuffer encoders.
- [`demo/shape-demo-shader-source.ts`](./demo/shape-demo-shader-source.ts): combines WGSL modules
  and injects target texture format.
- [`demo/shaders/main.wgsl`](./demo/shaders/main.wgsl): compute entry points.
- [`demo/shaders/shape_render.wgsl`](./demo/shaders/shape_render.wgsl): core renderer logic.
- [`demo/shaders/sdf`](./demo/shaders/sdf): reusable SDF primitives for boxes, ellipses, stars, and
  cubic beziers.

## Pages And Tools

- `/lottie`: schema/data explorer for a bundled `.lottie` file.
- `/lottie/demo`: WebGPU renderer demo using the custom renderer.
- `/lottie/player`: comparison page using the official `@lottiefiles/dotlottie-react` player.
- `/lottie/shapes`: shape rendering playground.
- `/lottie/stress`: stress page for large/generated shape sets.

## CPU Flattening

The CPU side currently renders shape layers only. It filters layers by visibility for the requested
frame, resolves the layer transform, then walks each layer's `shapes` array.

Supported drawable shape items:

- `rc`: rectangle
- `el`: ellipse
- `sr`: polystar / polygon
- `sh`: bezier path

Supported style items:

- `fl`: solid fill
- `gf`: gradient fill
- `st`: solid stroke
- `gs`: gradient stroke

Supported structure/transform items:

- `gr`: group
- `tr`: group transform
- layer `ks`: layer transform

The flattening output is:

- `shapeRecords`: one fixed-layout record per rendered primitive or path stroke segment.
- `cubicBezierSegments`: side buffer for variable-length path geometry.
- `gradientStops`: side buffer for fill and stroke gradients.

Most future Lottie modifiers should be resolved here first, before adding shader complexity. That
includes trim paths, repeaters, merge paths, rounded corners, offset paths, pucker/bloat, twist, and
zig-zag unless there is a clear reason to make them GPU dynamic.

## GPU Rendering

The WebGPU demo allocates capacity for the maximum number of shape records, cubic segments, and
gradient stops needed by any frame in the animation. Each rendered frame rewrites the active records
into those buffers.

The render path is compute-based:

1. A tile prepass runs once per shape and appends intersecting shapes to 32x32 pixel tile buckets.
2. A compaction pass creates indirect dispatch instructions for non-empty tiles.
3. A clear pass clears the storage texture.
4. The final raster pass shades only the compacted non-empty tiles and composites shape samples.
5. The storage texture is copied into the current canvas texture.

The shader uses the `kind` discriminator in `ShapeRecord` to switch between rectangle, ellipse,
polystar, and path SDF evaluation. Gradients are referenced by index/count into the gradient stop
side buffer.

## Where To Work

- Add or tighten schema support in [`_lib/types`](./_lib/types).
- Change `.lottie` archive reading/writing in [`_lib/dotlottie.ts`](./_lib/dotlottie.ts).
- Add frame interpolation, transforms, style resolution, or new shape/modifier flattening in
  [`_lib/lottie-gpu-frame.ts`](./_lib/lottie-gpu-frame.ts).
- Change the binary GPU ABI in [`_lib/gpu-shape-record.ts`](./_lib/gpu-shape-record.ts), then update
  matching WGSL reads in [`demo/shaders/shape_render.wgsl`](./demo/shaders/shape_render.wgsl).
- Add a new drawable primitive by updating `gpuShapeKinds`, the CPU record creation path, and
  `evaluate_shape_sdf` / `rasterized_shape_sample` in WGSL.
- Change tile sizing, pass orchestration, buffer allocation, or GPU timing in
  [`demo/webgpu-shape-demo-client.tsx`](./demo/webgpu-shape-demo-client.tsx).
- Change route UI in the relevant page/component folder rather than in renderer files.
- Add public test assets under [`../../public/lottie/assets`](../../public/lottie/assets) when the
  browser must fetch them by URL.

## Tests

Renderer-adjacent tests live beside the implementation:

- [`_lib/dotlottie.test.ts`](./_lib/dotlottie.test.ts): archive parsing/conversion coverage.
- [`_lib/lottie-gpu-frame.test.ts`](./_lib/lottie-gpu-frame.test.ts): CPU flattening and GPU frame
  record coverage.
- [`_lib/lottie-stress-test.test.ts`](./_lib/lottie-stress-test.test.ts): generated stress cases.

Run the relevant tests after changing parser, schema, flattening, or record layout code:

```sh
bunx vitest app/lottie
```

Use the route pages for visual verification after shader or WebGPU changes. The custom renderer
requires a browser with WebGPU enabled.

## Shape Type Reference

The parser subset is defined in [`_lib/types/lottie-shape.ts`](./_lib/types/lottie-shape.ts).

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

Additional Lottie shape-item vocabulary tracked by the plans/docs:

- `rp`: repeater
- `mm`: merge paths
- `rd`: round corners
- `pb`: pucker and bloat
- `op`: offset paths
- `zz`: zig zag

For the `sr` polystar shape, `sy` mode values are:

- `1`: star
- `2`: polygon

Layer type numbers from the schema:

- `0`: precomp layer
- `1`: solid layer
- `2`: image layer
- `3`: null/helper layer
- `4`: shape layer
- `5`: text layer

For deeper type-level notes, see [`_lib/types/README.md`](./_lib/types/README.md).
