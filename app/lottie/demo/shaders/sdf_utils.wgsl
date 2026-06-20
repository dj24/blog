fn dot2(v: vec2f) -> f32 {
  return dot(v, v);
}

fn positive_mod(x: f32, y: f32) -> f32 {
  return x - y * floor(x / y);
}

fn sd_box(p: vec2f, b: vec2f) -> f32 {
  let d = abs(p) - b;
  return length(max(d, vec2f(0.0))) + min(max(d.x, d.y), 0.0);
}

fn sd_rounded_box(p: vec2f, b: vec2f, radii: vec4f) -> f32 {
  let selected_xy = select(radii.zw, radii.xy, p.x > 0.0);
  let corner_radius = select(selected_xy.y, selected_xy.x, p.y > 0.0);
  let q = abs(p) - b + vec2f(corner_radius);
  return min(max(q.x, q.y), 0.0) + length(max(q, vec2f(0.0))) - corner_radius;
}

fn op_round(sd_shape: f32, r: f32) -> f32 {
  return sd_shape - r;
}

fn sd_ellipse(p_in: vec2f, ab_in: vec2f) -> f32 {
  var p = abs(p_in);
  var ab = ab_in;

  if (p.x > p.y) {
    p = p.yx;
    ab = ab.yx;
  }

  let l = ab.y * ab.y - ab.x * ab.x;
  let m = ab.x * p.x / l;
  let m2 = m * m;
  let n = ab.y * p.y / l;
  let n2 = n * n;
  let c = (m2 + n2 - 1.0) / 3.0;
  let c3 = c * c * c;
  let q = c3 + 2.0 * m2 * n2;
  let d = c3 + m2 * n2;
  let g = m + m * n2;

  var co: f32;

  if (d < 0.0) {
    let h = acos(q / c3) / 3.0;
    let s = cos(h);
    let t = sin(h) * sqrt(3.0);
    let rx = sqrt(-c * (s + t + 2.0) + m2);
    let ry = sqrt(-c * (s - t + 2.0) + m2);
    co = (ry + sign(l) * rx + abs(g) / (rx * ry) - m) / 2.0;
  } else {
    let h = 2.0 * m * n * sqrt(d);
    let s = sign(q + h) * pow(abs(q + h), 1.0 / 3.0);
    let u = sign(q - h) * pow(abs(q - h), 1.0 / 3.0);
    let rx = -s - u - 4.0 * c + 2.0 * m2;
    let ry = (s - u) * sqrt(3.0);
    let rm = sqrt(rx * rx + ry * ry);
    co = (ry / sqrt(rm - rx) + 2.0 * g / rm - m) / 2.0;
  }

  let r = ab * vec2f(co, sqrt(1.0 - co * co));
  return length(r - p) * sign(p.y - r.y);
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
    let t = clamp(
      vec3f(m + m, -n - m, n - m) * z - vec3f(kx),
      vec3f(0.0),
      vec3f(1.0),
    );
    res = min(
      dot2(d + (c + b * t.x) * t.x),
      dot2(d + (c + b * t.y) * t.y),
    );
  }

  return sqrt(res);
}
