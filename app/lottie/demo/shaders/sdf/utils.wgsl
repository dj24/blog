fn positive_mod(x: f32, y: f32) -> f32 {
  return x - y * floor(x / y);
}

fn op_round(sd_shape: f32, r: f32) -> f32 {
  return sd_shape - r;
}
