import { createTextureFromSource } from "webgpu-utils";
import { getGpuDevice } from "./gpu-device";
import type { PreviewPaletteColor } from "./preview-compute-pipeline-options";

export const canvasFormat: GPUTextureFormat = "rgba8unorm";
export const workgroupSize = 8;

export const alignTo = (value: number, alignment: number) => {
  return Math.ceil(value / alignment) * alignment;
};

const normalizeColorChannel = (value: number) => {
  return Math.min(Math.max(value, 0), 255) / 255;
};

export const toShaderColor = ([red, green, blue]: PreviewPaletteColor) => {
  return [
    normalizeColorChannel(red),
    normalizeColorChannel(green),
    normalizeColorChannel(blue),
    1,
  ] as const;
};

export const createPreviewComputeContext = async (
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
) => {
  const device = await getGpuDevice();
  const context = canvas.getContext("webgpu");

  if (!context) {
    throw new Error("Could not create a WebGPU canvas context.");
  }

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

  return {
    device,
    context,
    bytesPerRow: alignTo(width * 4, 256),
  };
};

export const createThresholdTexture = (
  device: GPUDevice,
  thresholdMapTexture?: ImageBitmap,
) => {
  if (thresholdMapTexture) {
    return createTextureFromSource(device, thresholdMapTexture, {
      format: canvasFormat,
      flipY: false,
      mips: false,
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    });
  }

  const texture = device.createTexture({
    size: {
      width: 1,
      height: 1,
    },
    format: canvasFormat,
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
  });

  device.queue.writeTexture(
    {
      texture,
    },
    new Uint8Array([255, 255, 255, 255]),
    {
      bytesPerRow: 4,
      rowsPerImage: 1,
    },
    {
      width: 1,
      height: 1,
      depthOrArrayLayers: 1,
    },
  );

  return texture;
};
