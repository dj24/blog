# Bezier Path

Cubic Lottie paths will be uploaded directly as cubic GPU segments.

Each uploaded cubic segment becomes its own GPU path shape. `ShapeRecord.pathIndex` points
directly at one cubic segment in the side buffer, so the shader evaluates a single segment SDF
per shape rather than iterating a path-local segment range.


## Lottie Data

- `ty: "sh"`: shape discriminator.
- `d?`: exporter direction metadata.
- `ks`: animated bezier path geometry property.
- Path geometry value data:
- `c`: whether the path is closed.
- `v`: absolute vertex positions.
- `i`: incoming tangent offsets for each vertex.
- `o`: outgoing tangent offsets for each vertex.
- Other data: unknown exporter-specific fields may also be present.

## Animated Attributes

- Animatable attributes here: `ks`.
- Lottie stores animatable properties as either `{ a: 0, k, ix? }` or `{ a: 1, k: [keyframes...], ix? }`.
- `a`: whether the property is animated.
- `k`: the static path geometry value or the ordered keyframe array.
- `ix?`: exporter property index.

## Per-Keyframe Data

- `t`: frame where the keyframe starts.
- `s`: start path geometry for the segment.
- `e?`: optional end path geometry for the segment.
- `i?`: incoming easing handle.
- `o?`: outgoing easing handle.
- `h?`: hold flag.
- `i.x`, `i.y`, `o.x`, `o.y`: easing handle coordinates, each stored as either a number or an array of numbers.
- For path animation, the `s` and `e` values themselves contain `c`, `v`, `i`, and `o`.
- Other data: keyframes can also carry exporter-specific extra fields.

Sources:
- https://iquilezles.org/articles/distfunctions2d/
- https://iquilezles.org/articles/bboxes2d/

Notes:
- Lottie path tangents define cubic Bezier segments between vertices.
- Each authored cubic is uploaded as one cubic GPU segment with its original `p0/c1/c2/p3` control points.
- Runtime bounds are computed from the cubic upload payload's control-point AABB.
- The runtime demo uses a cubic Bezier distance function translated from the GLSL reference.

## GLSL Reference

```glsl
float sdBezier( in vec2 pos, in vec2 A, in vec2 B, in vec2 C )
{    
    vec2 a = B - A;
    vec2 b = A - 2.0*B + C;
    vec2 c = a * 2.0;
    vec2 d = A - pos;
    float kk = 1.0/dot(b,b);
    float kx = kk * dot(a,b);
    float ky = kk * (2.0*dot(a,a)+dot(d,b)) / 3.0;
    float kz = kk * dot(d,a);      
    float res = 0.0;
    float p = ky - kx*kx;
    float p3 = p*p*p;
    float q = kx*(2.0*kx*kx-3.0*ky) + kz;
    float h = q*q + 4.0*p3;
    if( h >= 0.0) 
    { 
        h = sqrt(h);
        vec2 x = (vec2(h,-h)-q)/2.0;
        vec2 uv = sign(x)*pow(abs(x), vec2(1.0/3.0));
        float t = clamp( uv.x+uv.y-kx, 0.0, 1.0 );
        res = dot2(d + (c + b*t)*t);
    }
    else
    {
        float z = sqrt(-p);
        float v = acos( q/(p*z*2.0) ) / 3.0;
        float m = cos(v);
        float n = sin(v)*1.732050808;
        vec3  t = clamp(vec3(m+m,-n-m,n-m)*z-kx,0.0,1.0);
        res = min( dot2(d+(c+b*t.x)*t.x),
                   dot2(d+(c+b*t.y)*t.y) );
    }
    return sqrt( res );
}
```
