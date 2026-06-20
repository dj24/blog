# Rounded Corners

Source:
- https://iquilezles.org/articles/distfunctions2d/

Notes:
- The 2D distance-function article does not expose a dedicated rounded-corners primitive, but it does show the generic rounding operator used to round any existing 2D SDF.
- There is no matching bbox function for this operator on the bounding-box page.

## WGSL

```wgsl
fn op_round(sd_shape: f32, r: f32) -> f32 {
    return sd_shape - r;
}
```
