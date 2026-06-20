@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
  return vertexMainImpl(vertexIndex);
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
  return fragmentMainImpl(input);
}
