const CUBIC_BEZIER_SDF_ITERATIONS: i32 = 2;
const COMPLEX_EPSILON: f32 = 0.000001;

struct CubicRoots {
  x0: vec2f,
  x1: vec2f,
  x2: vec2f,
}

fn cexp_complex(c: vec2f) -> vec2f {
  return exp(c.x) * vec2f(cos(c.y), sin(c.y));
}

fn cln_complex(c: vec2f) -> vec2f {
  return vec2f(log(dot(c, c)) * 0.5, atan2(c.y, c.x));
}

fn cmul_complex(a: vec2f, b: vec2f) -> vec2f {
  return vec2f(
    a.x * b.x - a.y * b.y,
    a.x * b.y + a.y * b.x,
  );
}

fn conj_complex(c: vec2f) -> vec2f {
  return vec2f(c.x, -c.y);
}

fn cdiv_complex(a: vec2f, b: vec2f) -> vec2f {
  return cmul_complex(a, conj_complex(b)) / max(dot(b, b), COMPLEX_EPSILON);
}

fn csqrt_complex(a: vec2f) -> vec2f {
  let r = length(a);

  if (r <= COMPLEX_EPSILON) {
    return vec2f(0.0);
  }

  if ((a.y + a.x) - a.x == 0.0) {
    if (a.x >= 0.0) {
      return vec2f(sqrt(r), 0.0);
    }

    return vec2f(0.0, sqrt(r));
  }

  let h = a / r + vec2f(1.0, 0.0);
  return h * sqrt(r / max(dot(h, h), COMPLEX_EPSILON));
}

fn ccbrt_complex(a: vec2f) -> vec2f {
  return cexp_complex(cln_complex(a) / 3.0);
}

fn cubic_complex(a: vec2f, b: vec2f, c: vec2f, d: vec2f, x: vec2f) -> vec2f {
  return cmul_complex(cmul_complex(cmul_complex(a, x) + b, x) + c, x) + d;
}

fn cubic_bezier_complex_roots(a: vec2f, b: vec2f, c: vec2f, d: vec2f) -> CubicRoots {
  let ac = cmul_complex(a, c);
  let bb = cmul_complex(b, b);
  let aa = cmul_complex(a, a);
  let d0 = bb - 3.0 * ac;
  let d1 = 2.0 * cmul_complex(b, bb) - 9.0 * cmul_complex(ac, b) + 27.0 * cmul_complex(aa, d);
  let s = csqrt_complex(cmul_complex(d1, d1) - 4.0 * cmul_complex(cmul_complex(d0, d0), d0));
  let opt_a = d1 - s;
  let opt_b = d1 + s;
  let opt = select(opt_a, opt_b, dot(opt_a, opt_a) < dot(opt_b, opt_b));
  let cb0 = ccbrt_complex(opt * 0.5);
  let safe_cb0 = select(cb0, vec2f(COMPLEX_EPSILON, 0.0), dot(cb0, cb0) <= COMPLEX_EPSILON);
  let x0 = cdiv_complex(b + safe_cb0 + cdiv_complex(d0, safe_cb0), -3.0 * a);
  let cube_root_rotation = vec2f(-0.5, 0.866025403784439);
  let cb1 = cmul_complex(safe_cb0, cube_root_rotation);
  let safe_cb1 = select(cb1, vec2f(COMPLEX_EPSILON, 0.0), dot(cb1, cb1) <= COMPLEX_EPSILON);
  let x1 = cdiv_complex(b + safe_cb1 + cdiv_complex(d0, safe_cb1), -3.0 * a);
  let cb2 = cmul_complex(safe_cb1, cube_root_rotation);
  let safe_cb2 = select(cb2, vec2f(COMPLEX_EPSILON, 0.0), dot(cb2, cb2) <= COMPLEX_EPSILON);
  let x2 = cdiv_complex(b + safe_cb2 + cdiv_complex(d0, safe_cb2), -3.0 * a);

  return CubicRoots(
    x0,
    x1,
    x2,
  );
}

fn cubic_bezier_point(a: vec2f, b: vec2f, c: vec2f, d: vec2f, t: f32) -> vec2f {
  return ((a * t + b) * t + c) * t + d;
}

fn cubic_bezier_tangent(a: vec2f, b: vec2f, c: vec2f, t: f32) -> vec2f {
  return (3.0 * a * t + 2.0 * b) * t + c;
}

fn newton_quintic(a: f32, b: f32, c: f32, d: f32, e: f32, f: f32, x0: f32) -> f32 {
  let v = ((((a * x0 + b) * x0 + c) * x0 + d) * x0 + e) * x0 + f;
  let dv = (((5.0 * a * x0 + 4.0 * b) * x0 + 3.0 * c) * x0 + 2.0 * d) * x0 + e;
  let ddv = ((20.0 * a * x0 + 12.0 * b) * x0 + 6.0 * c) * x0 + 2.0 * d;
  let safe_ddv = select(ddv, sign(ddv) * COMPLEX_EPSILON, abs(ddv) < COMPLEX_EPSILON);
  let p = dv / safe_ddv;
  let q = v / safe_ddv * 2.0;
  let discriminant = max(p * p - q, 0.0);
  let safe_sign = select(sign(p), 1.0, abs(p) < COMPLEX_EPSILON);
  let dx = p - sqrt(discriminant) * safe_sign;

  return x0 - dx;
}

fn newton_bezier(a: f32, b: f32, c: f32, d: f32, e: f32, f: f32, x0: f32) -> f32 {
  var x = clamp(x0, 0.0, 1.0);

  for (var iteration = 0; iteration < CUBIC_BEZIER_SDF_ITERATIONS; iteration += 1) {
    x = clamp(newton_quintic(a, b, c, d, e, f, x), 0.0, 1.0);
  }

  return x;
}

fn sd_cubic_bezier(pos: vec2f, p0: vec2f, p1: vec2f, p2: vec2f, p3: vec2f) -> f32 {
  let a = p3 - p0 + 3.0 * (p1 - p2);
  let b = 3.0 * p0 - 6.0 * p1 + 3.0 * p2;
  let c = -3.0 * p0 + 3.0 * p1;
  let d = p0 - pos;

  let qa = 3.0 * dot(a, a);
  let qb = 5.0 * dot(a, b);
  let qc = 2.0 * dot(b, b) + 4.0 * dot(a, c);
  let qd = 3.0 * dot(c, b) + 3.0 * dot(a, d);
  let qe = 2.0 * dot(b, d) + dot(c, c);
  let qf = dot(c, d);
  let roots = cubic_bezier_complex_roots(a, b, c, d);

  var best_t = 0.0;
  var best_distance = length(p0 - pos);

  let t0 = newton_bezier(qa, qb, qc, qd, qe, qf, roots.x0.x);
  let distance0 = length(cubic_complex(a, b, c, d, vec2f(t0, 0.0)));
  if (distance0 < best_distance) {
    best_t = t0;
    best_distance = distance0;
  }

  let t1 = newton_bezier(qa, qb, qc, qd, qe, qf, roots.x1.x);
  let distance1 = length(cubic_complex(a, b, c, d, vec2f(t1, 0.0)));
  if (distance1 < best_distance) {
    best_t = t1;
    best_distance = distance1;
  }

  let t2 = newton_bezier(qa, qb, qc, qd, qe, qf, roots.x2.x);
  let distance2 = length(cubic_complex(a, b, c, d, vec2f(t2, 0.0)));
  if (distance2 < best_distance) {
    best_t = t2;
    best_distance = distance2;
  }

  let end_distance = length(p3 - pos);
  if (end_distance < best_distance) {
    best_t = 1.0;
    best_distance = end_distance;
  }

  let curve_pos = cubic_bezier_point(a, b, c, d, best_t);
  let tangent = cubic_bezier_tangent(a, b, c, best_t);
  let cross_value = cmul_complex(conj_complex(tangent), curve_pos).y;
  let sgn0 = select(sign(cross_value), 1.0, abs(cross_value) < COMPLEX_EPSILON);
  let determinant = a.x * b.y - a.y * b.x;

  var sgn = sgn0;

  if (abs(determinant) > COMPLEX_EPSILON) {
    let inverse_times_c = vec2f(
      (b.y * c.x - b.x * c.y) / determinant,
      (-a.y * c.x + a.x * c.y) / determinant,
    );
    let loop_p = -inverse_times_c;
    let q = loop_p.y * loop_p.y - loop_p.x;

    if (q > 0.0 && (q - loop_p.y + 1.0) > 0.0) {
      let loop_sign = sign(best_t * best_t - loop_p.y * best_t + q);
      sgn = sgn0 * select(loop_sign, 1.0, abs(loop_sign) < COMPLEX_EPSILON);
    }
  }

  return best_distance * sgn;
}
