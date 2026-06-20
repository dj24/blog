# Polystar

## Lottie Data

- `ty: "sr"`: shape discriminator.
- `sy?`: mode identifier, commonly `1` for star and `2` for polygon.
- `pt`: point count as an animatable number.
- `p`: position as an animatable `vec2`.
- `or`: outer radius as an animatable number.
- `os`: outer roundness percentage as an animatable number.
- `r`: rotation as an animatable number.
- `ir?`: inner radius as an optional animatable number.
- `is?`: inner roundness percentage as an optional animatable number.
- Other data: unknown exporter-specific fields may also be present.

## Animated Attributes

- Animatable attributes here: `pt`, `p`, `or`, `os`, `r`, `ir?`, `is?`.
- Lottie stores animatable properties as either `{ a: 0, k, ix? }` or `{ a: 1, k: [keyframes...], ix? }`.
- `a`: whether the property is animated.
- `k`: the static value or the ordered keyframe array.
- `ix?`: exporter property index.

## Per-Keyframe Data

- `t`: frame where the keyframe starts.
- `s`: start value for the segment.
- `e?`: optional end value for the segment.
- `i?`: incoming easing handle.
- `o?`: outgoing easing handle.
- `h?`: hold flag.
- `i.x`, `i.y`, `o.x`, `o.y`: easing handle coordinates, each stored as either a number or an array of numbers.
- Other data: keyframes can also carry exporter-specific extra fields.

Sources:
- https://iquilezles.org/articles/distfunctions2d/
- https://iquilezles.org/articles/bboxes2d/

Notes:
- The bbox article includes a star bounding-box function.
- The SDF article includes an exact regular star SDF and notes that `ecs = vec2(0,1)` produces a regular polygon, which makes it relevant to both star and polygon modes of a Lottie polystar.

## WGSL

```wgsl
fn positive_mod(x: f32, y: f32) -> f32 {
    return x - y * floor(x / y);
}

fn aabb_star(r: f32, n: i32, _w: f32) -> vec4f {
    let an = 6.283185 / f32(n);
    let kk = vec2f(
        cos(round(f32(n) / 2.0) * an),
        sin(round(f32(n) / 4.0) * an),
    );
    return r * vec4f(-kk.y, kk.x, kk.y, 1.0);
}

fn sd_star(p_in: vec2f, r: f32, n: i32, m: f32) -> f32 {
    let an = 3.141593 / f32(n);
    let en = 3.141593 / m;
    let acs = vec2f(cos(an), sin(an));
    let ecs = vec2f(cos(en), sin(en));

    let bn = positive_mod(atan2(p_in.x, p_in.y), 2.0 * an) - an;

    var p = length(p_in) * vec2f(cos(bn), abs(sin(bn)));
    p -= r * acs;
    p += ecs * clamp(-dot(p, ecs), 0.0, r * acs.y / ecs.y);

    return length(p) * sign(p.x);
}
```
