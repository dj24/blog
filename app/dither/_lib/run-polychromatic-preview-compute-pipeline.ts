import {
  createTextureFromSource,
  makeShaderDataDefinitions,
  makeStructuredView,
} from "webgpu-utils";
import {
  canvasFormat,
  createThresholdTexture,
  createPreviewComputeContext,
  toShaderColor,
  workgroupSize,
} from "./preview-compute-pipeline-shared";
import type { PolychromaticPreviewComputePipelineOptions } from "./preview-compute-pipeline-options";

const shaderCode = `
struct PreviewUniforms {
  width: u32,
  height: u32,
  sourceWidth: u32,
  sourceHeight: u32,
  bytesPerRow: u32,
  thresholdMapMode: u32,
  downscale: u32,
  brightness: f32,
  contrast: f32,
  paletteColor0: vec4f,
  paletteColor1: vec4f,
  paletteColor2: vec4f,
  paletteColor3: vec4f,
};

@group(0) @binding(0) var<uniform> previewUniforms: PreviewUniforms;
@group(0) @binding(1) var<storage, read_write> pixels: array<u32>;
@group(0) @binding(2) var sourceTexture: texture_2d<f32>;
@group(0) @binding(3) var thresholdTexture: texture_2d<f32>;

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

fn applyBrightness(color: vec3f) -> vec3f {
  return clamp(
    color + vec3f(previewUniforms.brightness),
    vec3f(0.0),
    vec3f(1.0),
  );
}

fn applyContrast(color: vec3f) -> vec3f {
  let contrast = max(previewUniforms.contrast, 0.0);

  return clamp(
    ((color - vec3f(0.5)) * (contrast + 1.0)) + vec3f(0.5),
    vec3f(0.0),
    vec3f(1.0),
  );
}

fn luminance(color: vec3f) -> f32 {
  return dot(color, vec3f(0.2126, 0.7152, 0.0722));
}

fn bayerThreshold(position: vec2u) -> f32 {
  let index = (position.y & 7u) * 8u + (position.x & 7u);

  return (f32(bayerMatrix[index]) + 0.5) / 64.0;
}

fn blueNoiseThreshold(position: vec2u) -> f32 {
  let thresholdTextureSize = textureDimensions(thresholdTexture);
  let textureCoordinate = vec2u(
    position.x % thresholdTextureSize.x,
    position.y % thresholdTextureSize.y,
  );
  let thresholdSample = luminance(textureLoad(thresholdTexture, vec2i(textureCoordinate), 0).rgb);

  return ((thresholdSample * 255.0) + 0.5) / 256.0;
}

fn getThreshold(position: vec2u) -> f32 {
  if (previewUniforms.thresholdMapMode == 1u) {
    return blueNoiseThreshold(position);
  }

  return bayerThreshold(position);
}

fn averageSourceRegion(position: vec2u) -> vec4f {
  let downscale = max(previewUniforms.downscale, 1u);
  let sourceOrigin = position * downscale;
  let sourceMax = vec2u(
    max(previewUniforms.sourceWidth, 1u) - 1u,
    max(previewUniforms.sourceHeight, 1u) - 1u,
  );
  var accumulatedColor = vec4f(0.0);

  for (var offsetY = 0u; offsetY < downscale; offsetY = offsetY + 1u) {
    for (var offsetX = 0u; offsetX < downscale; offsetX = offsetX + 1u) {
      let sourceCoordinate = min(sourceOrigin + vec2u(offsetX, offsetY), sourceMax);

      accumulatedColor += textureLoad(
        sourceTexture,
        vec2i(i32(sourceCoordinate.x), i32(sourceCoordinate.y)),
        0,
      );
    }
  }

  return accumulatedColor / f32(downscale * downscale);
}

fn getPaletteColor(index: u32) -> vec4f {
  switch index {
    case 0u: {
      return previewUniforms.paletteColor0;
    }
    case 1u: {
      return previewUniforms.paletteColor1;
    }
    case 2u: {
      return previewUniforms.paletteColor2;
    }
    default: {
      return previewUniforms.paletteColor3;
    }
  }
}

@compute @workgroup_size(${workgroupSize}, ${workgroupSize})
fn main(@builtin(global_invocation_id) id: vec3u) {
  if (id.x >= previewUniforms.width || id.y >= previewUniforms.height) {
    return;
  }

  let sourceColor = averageSourceRegion(id.xy);
  let brightenedColor = applyBrightness(sourceColor.rgb);
  let contrastedColor = applyContrast(brightenedColor);
  var nearestIndex = 0u;
  var secondNearestIndex = 1u;
  var nearestDistance = 1e9;
  var secondNearestDistance = 1e9;

  for (var paletteIndex = 0u; paletteIndex < 4u; paletteIndex = paletteIndex + 1u) {
    let paletteColor = getPaletteColor(paletteIndex);
    let paletteDistance = distance(contrastedColor, paletteColor.rgb);

    if (paletteDistance < nearestDistance) {
      secondNearestIndex = nearestIndex;
      secondNearestDistance = nearestDistance;
      nearestIndex = paletteIndex;
      nearestDistance = paletteDistance;
    } else if (paletteDistance < secondNearestDistance) {
      secondNearestIndex = paletteIndex;
      secondNearestDistance = paletteDistance;
    }
  }

  let threshold = getThreshold(id.xy);
  let totalDistance = nearestDistance + secondNearestDistance;
  let nearestWeight = select(0.5, secondNearestDistance / totalDistance, totalDistance > 0.0);
  let ditheredColor = select(
    getPaletteColor(secondNearestIndex),
    getPaletteColor(nearestIndex),
    threshold <= nearestWeight,
  );
  let outputColor = vec4f(ditheredColor.rgb, sourceColor.a);

  let rowPixelStride = previewUniforms.bytesPerRow / 4u;
  let pixelIndex = id.y * rowPixelStride + id.x;

  pixels[pixelIndex] = packColor(outputColor);
}
`;

export const runPolychromaticPreviewComputePipeline = async (
  canvas: HTMLCanvasElement,
  options: PolychromaticPreviewComputePipelineOptions,
) => {
  const { width, height, sourceImage, brightness, contrast, downscale, palette, thresholdMap } =
    options;

  if (!sourceImage) {
    throw new Error("No preview image is loaded.");
  }

  const { bytesPerRow, context, device } = await createPreviewComputeContext(canvas, width, height);
  const bufferSize = bytesPerRow * height;
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
  const thresholdTexture = createThresholdTexture(
    device,
    thresholdMap === "blue-noise" ? options.thresholdMapTexture : undefined,
  );

  previewUniforms.set({
    width,
    height,
    sourceWidth: sourceImage.width,
    sourceHeight: sourceImage.height,
    bytesPerRow,
    thresholdMapMode: thresholdMap === "blue-noise" ? 1 : 0,
    downscale,
    brightness,
    contrast,
    paletteColor0: toShaderColor(palette[0]),
    paletteColor1: toShaderColor(palette[1]),
    paletteColor2: toShaderColor(palette[2]),
    paletteColor3: toShaderColor(palette[3]),
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
      {
        binding: 3,
        resource: thresholdTexture.createView(),
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
  thresholdTexture.destroy();
};
