import { getGpuDevice } from "./gpu-device";

const canvasFormat: GPUTextureFormat = "rgba8unorm";
const workgroupSize = 8;

const shaderCode = `
struct CanvasUniforms {
  width: u32,
  height: u32,
  bytesPerRow: u32,
};

@group(0) @binding(0) var<uniform> canvasUniforms: CanvasUniforms;
@group(0) @binding(1) var<storage, read_write> pixels: array<u32>;

@compute @workgroup_size(${workgroupSize}, ${workgroupSize})
fn main(@builtin(global_invocation_id) id: vec3u) {
  if (id.x >= canvasUniforms.width || id.y >= canvasUniforms.height) {
    return;
  }

  let uv = vec2f(id.xy) / vec2f(
    max(f32(canvasUniforms.width - 1u), 1.0),
    max(f32(canvasUniforms.height - 1u), 1.0),
  );
  let r = u32(round(uv.x * 255.0));
  let g = u32(round(uv.y * 255.0));
  let b = u32(round((1.0 - uv.x) * (1.0 - uv.y) * 255.0));
  let rowPixelStride = canvasUniforms.bytesPerRow / 4u;
  let pixelIndex = id.y * rowPixelStride + id.x;

  pixels[pixelIndex] = r | (g << 8u) | (b << 16u) | (255u << 24u);
}
`;

const alignTo = (value: number, alignment: number) => {
  return Math.ceil(value / alignment) * alignment;
};

const getCanvasSize = (canvas: HTMLCanvasElement) => {
  const pixelRatio = window.devicePixelRatio || 1;
  const width = Math.max(1, Math.floor(canvas.clientWidth * pixelRatio));
  const height = Math.max(1, Math.floor(canvas.clientHeight * pixelRatio));

  return { width, height };
};

export const runUvComputePipeline = async (canvas: HTMLCanvasElement) => {
  const { makeShaderDataDefinitions, makeStructuredView } = await import("webgpu-utils");
  const device = await getGpuDevice();
  const context = canvas.getContext("webgpu");

  if (!context) {
    throw new Error("Could not create a WebGPU canvas context.");
  }

  const { width, height } = getCanvasSize(canvas);
  const bytesPerRow = alignTo(width * 4, 256);
  const bufferSize = bytesPerRow * height;

  if (canvas.width !== width) {
    canvas.width = width;
  }

  if (canvas.height !== height) {
    canvas.height = height;
  }

  context.configure({
    device,
    format: canvasFormat,
    alphaMode: "opaque",
    usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
  });

  const shaderModule = device.createShaderModule({ code: shaderCode });
  const pipeline = device.createComputePipeline({
    layout: "auto",
    compute: {
      module: shaderModule,
      entryPoint: "main",
    },
  });
  const shaderDefinitions = makeShaderDataDefinitions(shaderCode);
  const canvasUniforms = makeStructuredView(shaderDefinitions.uniforms.canvasUniforms);
  const uniformBuffer = device.createBuffer({
    size: canvasUniforms.arrayBuffer.byteLength,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const pixelBuffer = device.createBuffer({
    size: bufferSize,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
  });

  canvasUniforms.set({ width, height, bytesPerRow });
  device.queue.writeBuffer(uniformBuffer, 0, canvasUniforms.arrayBuffer);

  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      {
        binding: 0,
        resource: { buffer: uniformBuffer },
      },
      {
        binding: 1,
        resource: { buffer: pixelBuffer },
      },
    ],
  });
  const encoder = device.createCommandEncoder();
  const pass = encoder.beginComputePass();

  pass.setPipeline(pipeline);
  pass.setBindGroup(0, bindGroup);
  pass.dispatchWorkgroups(Math.ceil(width / workgroupSize), Math.ceil(height / workgroupSize));
  pass.end();

  encoder.copyBufferToTexture(
    {
      buffer: pixelBuffer,
      bytesPerRow,
      rowsPerImage: height,
    },
    {
      texture: context.getCurrentTexture(),
    },
    {
      width,
      height,
    },
  );

  device.queue.submit([encoder.finish()]);
  await device.queue.onSubmittedWorkDone();

  uniformBuffer.destroy();
  pixelBuffer.destroy();
};
