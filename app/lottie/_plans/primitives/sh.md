# Bezier Path

Sources:
- https://iquilezles.org/articles/distfunctions2d/
- https://iquilezles.org/articles/bboxes2d/

Notes:
- The bounding-box article includes quadratic and cubic Bezier AABB functions.
- The SDF article includes an exact quadratic Bezier distance function on this page.
- I did not find a cubic Bezier SDF on the same 2D distance-function page.

## WGSL

```wgsl
fn dot2(v: vec2f) -> f32 {
    return dot(v, v);
}

fn aabb_quadratic_bezier(p0: vec2f, p1: vec2f, p2: vec2f) -> vec4f {
    let a = p0 - 2.0 * p1 + p2;
    let b = p1 - p0;
    let t = clamp(-b / a, vec2f(0.0), vec2f(1.0));
    let q = p0 + t * (2.0 * b + t * a);
    return vec4f(min(min(p0, p2), q), max(max(p0, p2), q));
}

fn aabb_cubic_bezier(p0: vec2f, p1: vec2f, p2: vec2f, p3: vec2f) -> vec4f {
    let c = -p0 + p1;
    let b = p0 - 2.0 * p1 + p2;
    let a = -p0 + 3.0 * p1 - 3.0 * p2 + p3;
    let g = sqrt(max(b * b - a * c, vec2f(0.0)));
    let t1 = clamp((-b - g) / a, vec2f(0.0), vec2f(1.0));
    let t2 = clamp((-b + g) / a, vec2f(0.0), vec2f(1.0));
    let q1 = p0 + t1 * (3.0 * c + t1 * (3.0 * b + t1 * a));
    let q2 = p0 + t2 * (3.0 * c + t2 * (3.0 * b + t2 * a));
    return vec4f(min(min(p0, p3), min(q1, q2)), max(max(p0, p3), max(q1, q2)));
}

fn sd_quadratic_bezier(pos: vec2f, a_in: vec2f, b_in: vec2f, c_in: vec2f) -> f32 {
    let a = b_in - a_in;
    let b = a_in - 2.0 * b_in + c_in;
    let c = a * 2.0;
    let d = a_in - pos;
    let kk = 1.0 / dot(b, b);
    let kx = kk * dot(a, b);
    let ky = kk * (2.0 * dot(a, a) + dot(d, b)) / 3.0;
    let kz = kk * dot(d, a);
    let p = ky - kx * kx;
    let p3 = p * p * p;
    let q = kx * (2.0 * kx * kx - 3.0 * ky) + kz;
    let h = q * q + 4.0 * p3;

    var res: f32;

    if (h >= 0.0) {
        let h_sqrt = sqrt(h);
        let x = (vec2f(h_sqrt, -h_sqrt) - vec2f(q)) / 2.0;
        let uv = sign(x) * vec2f(
            pow(abs(x.x), 1.0 / 3.0),
            pow(abs(x.y), 1.0 / 3.0),
        );
        let t = clamp(uv.x + uv.y - kx, 0.0, 1.0);
        res = dot2(d + (c + b * t) * t);
    } else {
        let z = sqrt(-p);
        let v = acos(q / (p * z * 2.0)) / 3.0;
        let m = cos(v);
        let n = sin(v) * 1.732050808;
        let t = clamp(vec3f(m + m, -n - m, n - m) * z - vec3f(kx), vec3f(0.0), vec3f(1.0));
        res = min(
            dot2(d + (c + b * t.x) * t.x),
            dot2(d + (c + b * t.y) * t.y),
        );
    }

    return sqrt(res);
}
```
