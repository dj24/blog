import {
  createTextureFromSource,
  makeShaderDataDefinitions,
  makeStructuredView,
} from "webgpu-utils";
import { getGpuDevice } from "./gpu-device";

const canvasFormat: GPUTextureFormat = "rgba8unorm";
const workgroupSize = 8;

const shaderCode = `
struct PreviewUniforms {
  width: u32,
  height: u32,
  sourceWidth: u32,
  sourceHeight: u32,
  bytesPerRow: u32,
};

@group(0) @binding(0) var<uniform> previewUniforms: PreviewUniforms;
@group(0) @binding(1) var<storage, read_write> pixels: array<u32>;
@group(0) @binding(2) var sourceTexture: texture_2d<f32>;

const bayerMatrix = array<u32, 64>(
  0u, 48u, 12u, 60u, 3u, 51u, 15u, 63u,
  32u, 16u, 44u, 28u, 35u, 19u, 47u, 31u,
  8u, 56u, 4u, 52u, 11u, 59u, 7u, 55u,
  40u, 24u, 36u, 20u, 43u, 27u, 39u, 23u,
  2u, 50u, 14u, 62u, 1u, 49u, 13u, 61u,
  34u, 18u, 46u, 30u, 33u, 17u, 45u, 29u,
  10u, 58u, 6u, 54u, 9u, 57u, 5u, 53u,
  42u, 26u, 38u, 22u, 41u, 25u, 37u, 21u,
);

fn packColor(color: vec4f) -> u32 {
  let rgba = vec4u(round(clamp(color, vec4f(0.0), vec4f(1.0)) * 255.0));

  return rgba.x | (rgba.y << 8u) | (rgba.z << 16u) | (rgba.w << 24u);
}

fn luminance(color: vec3f) -> f32 {
  return dot(color, vec3f(0.2126, 0.7152, 0.0722));
}

fn bayerThreshold(position: vec2u) -> f32 {
  let index = (position.y & 7u) * 8u + (position.x & 7u);

  return (f32(bayerMatrix[index]) + 0.5) / 64.0;
}

fn averageSourceRegion(position: vec2u) -> vec4f {
  let sourceOrigin = position * 4u;
  let sourceMax = vec2u(
    max(previewUniforms.sourceWidth, 1u) - 1u,
    max(previewUniforms.sourceHeight, 1u) - 1u,
  );
  var accumulatedColor = vec4f(0.0);

  for (var offsetY = 0u; offsetY < 4u; offsetY = offsetY + 1u) {
    for (var offsetX = 0u; offsetX < 4u; offsetX = offsetX + 1u) {
      let sourceCoordinate = min(sourceOrigin + vec2u(offsetX, offsetY), sourceMax);

      accumulatedColor += textureLoad(
        sourceTexture,
        vec2i(i32(sourceCoordinate.x), i32(sourceCoordinate.y)),
        0,
      );
    }
  }

  return accumulatedColor / 16.0;
}

@compute @workgroup_size(${workgroupSize}, ${workgroupSize})
fn main(@builtin(global_invocation_id) id: vec3u) {
  if (id.x >= previewUniforms.width || id.y >= previewUniforms.height) {
    return;
  }

  let color = averageSourceRegion(id.xy);
  let threshold = bayerThreshold(id.xy);
  let ditheredValue = select(0.0, 1.0, luminance(color.rgb) >= threshold);
  let ditheredColor = vec4f(vec3f(ditheredValue), color.a);

  let rowPixelStride = previewUniforms.bytesPerRow / 4u;
  let pixelIndex = id.y * rowPixelStride + id.x;

  pixels[pixelIndex] = packColor(ditheredColor);
}
`;

const alignTo = (value: number, alignment: number) => {
  return Math.ceil(value / alignment) * alignment;
};

type PreviewComputePipelineOptions = {
  width: number;
  height: number;
  sourceImage: ImageBitmap | null;
};

export const runPreviewComputePipeline = async (
  canvas: HTMLCanvasElement,
  { width, height, sourceImage }: PreviewComputePipelineOptions,
) => {
  if (!sourceImage) {
    throw new Error("No preview image is loaded.");
  }

  const device = await getGpuDevice();
  const context = canvas.getContext("webgpu");

  if (!context) {
    throw new Error("Could not create a WebGPU canvas context.");
  }

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
  const previewUniforms = makeStructuredView(shaderDefinitions.uniforms.previewUniforms);
  const uniformBuffer = device.createBuffer({
    size: previewUniforms.arrayBuffer.byteLength,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const pixelBuffer = device.createBuffer({
    size: bufferSize,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
  });
  const sourceTexture = createTextureFromSource(device, sourceImage, {
    format: canvasFormat,
    flipY: false,
    mips: false,
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
  });

  previewUniforms.set({
    width,
    height,
    sourceWidth: sourceImage.width,
    sourceHeight: sourceImage.height,
    bytesPerRow,
  });
  device.queue.writeBuffer(uniformBuffer, 0, previewUniforms.arrayBuffer);

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
      {
        binding: 2,
        resource: sourceTexture.createView(),
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
  sourceTexture.destroy();
};
