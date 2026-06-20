fn fragmentMainImpl(input: VertexOutput) -> vec4<f32> {
  return vec4<f32>(input.uv, 0.0, 1.0);
}
