https://iquilezles.org/articles/bboxes2d/

https://iquilezles.org/articles/distfunctions2d/

# GPU Serialisation
The Lottie hierarchy needs to be traversed, resulting in a simpler struct for each primitive, so it can be loaded into a GPUBuffer.
This will likely involve walking the tree and multiplying transforms together, but this needs to be fleshed-out further

## What Actually Renders

When serialising Lottie data for the GPU, not every parsed Lottie type needs a matching GPU struct.
Many of the Lottie items exist to organise content, apply transforms, or modify geometry before the
final drawable data is produced.

The shape items that define drawable geometry in the current parser subset are:

* `sh`: bezier path geometry
* `rc`: rectangle geometry
* `el`: ellipse geometry
* `sr`: polystar geometry

These are the items that directly contribute visible pixels:

* `sh`
* `rc`
* `el`
* `sr`

The shape items that provide auxiliary paint data for geometry are:

* `fl`: solid fill styling
* `gf`: gradient fill styling
* `st`: solid stroke styling
* `gs`: gradient stroke styling

These do not define visible geometry on their own, but they do determine how geometry is shaded
once a drawable shape exists.

The following items are not directly visible and should usually be resolved before upload:

* `gr`: grouping and hierarchy
* `tr`: shape-group transform
* layer `ks`: layer transform
* `tm`: trim paths modifier
* `rp`: repeater modifier
* `rd`: rounded corners modifier
* `pb`: pucker and bloat modifier
* `tw`: twist modifier
* `mm`: merge paths modifier
* `op`: offset paths modifier
* `zz`: zig-zag modifier
* `no`: explicit no-style marker

At the layer level, content that can eventually produce visible pixels is:

* shape layers
* solid layers
* image layers
* text layers
* precomp layers via their child layers

Layers that are not directly visible:

* null layers

In practice, that means the GPU boundary should favour final drawables over raw Lottie nodes.
Most Lottie data should be flattened into:

* final geometry
* final paint
* final transform
* final opacity
* final draw order

We should target a shared `64`-byte WGSL primitive struct for all instances in the main buffer.
That gives us a fixed stride for storage-buffer indexing while still leaving enough room for a
small header plus packed payload data.

One likely layout is:

```wgsl
struct Primitive {
    kind: u32,
    flags: u32,
    aux0: u32,
    aux1: u32,
    data0: vec4f,
    data1: vec4f,
    data2: vec4f,
}
```

The exact interpretation of `flags`, `aux0`, `aux1`, and the `data*` lanes depends on `kind`.
Rather than storing a separate WGSL struct type per primitive in the shared buffer, we should pack
the data into this common layout and then use bitwise parsing / unpacking in shader code to
reinterpret the payload for the active primitive kind.

In practice that means:

* `kind` is the discriminator used by shader switches.
* `aux0` and `aux1` can hold offsets, counts, ids, or other packed metadata.
* `flags` can store optional-field presence and mode bits.
* float lanes can be recovered directly from `data0`-`data2`, while packed integers can be decoded
  from the integer header words or bitcasted words when needed.
* helper functions like `rectParams(prim)`, `ellipseParams(prim)`, `pathParams(prim)`, and
  `gradientParams(prim)` should unpack the shared layout into primitive-specific views.

## Recommended GPU Split

Rather than mirroring each Lottie type one-to-one on the GPU, the GPU-facing model should probably
be reduced to:

* `GpuPrimitive`: final geometry kind such as path, rect, ellipse, or polystar
* `GpuPaint`: fill or stroke styling, including gradient metadata
* `GpuInstance`: transform, opacity, bounds, and z-order
* optional side buffers for variable-length data such as path segments or gradient stops

That keeps most of the Lottie-specific complexity on the CPU side, where we can:

* walk groups
* multiply transforms
* resolve parenting
* apply path modifiers
* expand repeaters
* discard explicit non-rendering nodes

The main question is whether repeaters should stay CPU-side or become a GPU instancing feature.
Everything else listed above should default to CPU preprocessing unless there is a strong reason to
keep it dynamic in shader code.

# Create Tiles
 * Divide the screen into 32x32 tiles
 * Run each shape's bounding box function in a compute shader
 * Dispatch one pass for each layer, so they are stacked in the right order
 * We could experiment with running the full sdf in this pass
 * If it overlaps that tile, add it to that tile's list via atomic counter

# Rasterise
* Get each pixels tile primitive list from the previous pass
* Iterate over each
* Create a coverage function for each shape type, using SDFs and analytic anti-aliasing where possible
* Run a switch in the compute shader based on a discriminator on the primitive struct
```
fn evaluateCoverage(p: vec2<f32>, prim: Primitive) -> f32 {
    switch prim.kind {
        case PRIM_RECT: {
            return coverageFromSdf(sdRoundRect(p, rectParams(prim)));
        }
        case PRIM_ELLIPSE: {
            return coverageFromSdf(sdEllipse(p, ellipseParams(prim)));
        }
        case PRIM_STAR: {
            return coverageFromSdf(sdStar(p, starParams(prim)));
        }
        case PRIM_PATH: {
            return coverageFromPath(p, prim.pathOffset);
        }
        default: {
            return 1.0;
        }
    }
}
  ```

* Unrepresented nodes can have full coverage and a pink colour so we can clearly see what is missing
* Blend with the accumulated colour from previous loop iterations, based on coverage and opacity

```wgsl
fn shadePixel(pixelPos: vec2<f32>, tile: TileRef) -> vec4<f32> {
    var accumulatedColor = vec3<f32>(0.0);

    for (var i = 0u; i < arrayLength(tile.primitiveArr); i = i + 1u) {
        let prim = primitives[tile.primitiveOffset + i];
        let coverage = evaluateCoverage(pixelPos, prim);
        let sampleColor = evaluateColor(pixelPos, prim);
        accumulatedColor = mix(accumulatedColor, sampleColor, sampleColor.a * coverage);
    }

    return vec4<f32>(accumulatedColor, 1.0);
}
```
