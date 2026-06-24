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
