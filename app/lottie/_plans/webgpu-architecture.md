https://iquilezles.org/articles/bboxes2d/

https://iquilezles.org/articles/distfunctions2d/

# GPU Serialisation
The Lottie hierarchy needs to be traversed, resulting in a simpler struct for each primitive, so it can be loaded into a GPUBuffer.
This will likely involve walking the tree and multiplying transforms together, but this needs to be fleshed-out further

# Create Tile
 * Divide the screen into 32x32 tiles
 * Run each shape's bounding box function in a compute shader
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

