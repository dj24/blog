"use client";

import { useQuery } from "@tanstack/react-query";
import invariant from "tiny-invariant";
import { useEffect, useRef } from "react";
import {
  encodeGpuCubicBezierSegments,
  encodeGpuShapeRecords,
  gpuCubicBezierSegmentStrideInBytes,
  gpuShapeRecordStrideInBytes,
} from "../_lib/gpu-shape-record";
import { createLottieGpuFrame } from "../_lib/lottie-gpu-frame";
import { readLottieJson } from "../_lib/dotlottie";
import type { LottieComposition } from "../_lib/types/lottie-composition";
import { buildShapeDemoShaderSource } from "./shape-demo-shader-source";
import styles from "./page.module.css";

const shapeDemoUniformSizeInBytes = 48;
const squareDotLottieAssetUrl = "/lottie/assets/square.lottie";
const tileSize = 32;

const roundUpToMultiple = (value: number, multiple: number) => {
  return Math.ceil(value / multiple) * multiple;
};

const writeShapeDemoUniform = (
  view: DataView,
  byteOffset: number,
  {
    activeShapeIndex,
    canvasHeight,
    canvasWidth,
    compositionHeight,
    compositionWidth,
    maxShapesPerTile,
    shapeCount,
    tileHeight,
    tileWidth,
  }: {
    activeShapeIndex: number;
    canvasHeight: number;
    canvasWidth: number;
    compositionHeight: number;
    compositionWidth: number;
    maxShapesPerTile: number;
    shapeCount: number;
    tileHeight: number;
    tileWidth: number;
  },
) => {
  view.setUint32(byteOffset, activeShapeIndex, true);
  view.setUint32(byteOffset + 4, shapeCount, true);
  view.setUint32(byteOffset + 8, maxShapesPerTile, true);
  view.setUint32(byteOffset + 12, 0, true);
  view.setFloat32(byteOffset + 16, canvasWidth, true);
  view.setFloat32(byteOffset + 20, canvasHeight, true);
  view.setFloat32(byteOffset + 24, compositionWidth, true);
  view.setFloat32(byteOffset + 28, compositionHeight, true);
  view.setUint32(byteOffset + 32, tileWidth, true);
  view.setUint32(byteOffset + 36, tileHeight, true);
  view.setUint32(byteOffset + 40, 0, true);
  view.setUint32(byteOffset + 44, 0, true);
};

type WebGpuShapeDemoSetup = {
  animation: LottieComposition;
  device: GPUDevice;
  maxCubicBezierSegmentCount: number;
  maxShapeCount: number;
  presentationFormat: GPUTextureFormat;
  uniformStride: number;
};

type WebGpuShapeFrameData = {
  compositionHeight: number;
  compositionWidth: number;
  encodedCubicBezierSegments: ReturnType<typeof encodeGpuCubicBezierSegments>;
  encodedShapeRecords: ReturnType<typeof encodeGpuShapeRecords>;
  shapeCount: number;
};

type WebGpuRenderState = {
  context: GPUCanvasContext;
  drawFrame: (frame: number) => void;
  resizeObserver: ResizeObserver;
};

type WebGpuTileBucketResources = {
  debugReadbackInFlight: boolean;
  tileHeight: number;
  tileShapeCountBuffer: GPUBuffer;
  tileShapeIndexBuffer: GPUBuffer;
  tileWidth: number;
  zeroTileShapeCounts: ArrayBuffer;
};

const getTileDimensions = (canvasWidth: number, canvasHeight: number) => {
  const tileWidth = Math.max(1, Math.ceil(canvasWidth / tileSize));
  const tileHeight = Math.max(1, Math.ceil(canvasHeight / tileSize));

  return {
    tileHeight,
    tileWidth,
  };
};

const destroyTileBucketResources = (resources: WebGpuTileBucketResources | null) => {
  resources?.tileShapeCountBuffer.destroy();
  resources?.tileShapeIndexBuffer.destroy();
};

const logTileBuckets = async ({
  device,
  maxShapesPerTile,
  tileHeight,
  tileShapeCountBuffer,
  tileShapeIndexBuffer,
  tileWidth,
}: {
  device: GPUDevice;
  maxShapesPerTile: number;
  tileHeight: number;
  tileShapeCountBuffer: GPUBuffer;
  tileShapeIndexBuffer: GPUBuffer;
  tileWidth: number;
}) => {
  const tileCount = tileWidth * tileHeight;
  const tileCountSizeInBytes = tileCount * Uint32Array.BYTES_PER_ELEMENT;
  const tileIndexSizeInBytes =
    tileCount * maxShapesPerTile * Uint32Array.BYTES_PER_ELEMENT;
  const tileShapeCountReadbackBuffer = device.createBuffer({
    size: tileCountSizeInBytes,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
  });
  const tileShapeIndexReadbackBuffer = device.createBuffer({
    size: tileIndexSizeInBytes,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
  });
  const commandEncoder = device.createCommandEncoder();

  commandEncoder.copyBufferToBuffer(
    tileShapeCountBuffer,
    0,
    tileShapeCountReadbackBuffer,
    0,
    tileCountSizeInBytes,
  );
  commandEncoder.copyBufferToBuffer(
    tileShapeIndexBuffer,
    0,
    tileShapeIndexReadbackBuffer,
    0,
    tileIndexSizeInBytes,
  );

  device.queue.submit([commandEncoder.finish()]);
  await device.queue.onSubmittedWorkDone();

  await Promise.all([
    tileShapeCountReadbackBuffer.mapAsync(GPUMapMode.READ),
    tileShapeIndexReadbackBuffer.mapAsync(GPUMapMode.READ),
  ]);

  const countData = new Uint32Array(tileShapeCountReadbackBuffer.getMappedRange().slice(0));
  const indexData = new Uint32Array(tileShapeIndexReadbackBuffer.getMappedRange().slice(0));
  const buckets = Array.from({ length: tileCount }, (_, tileIndex) => {
    const rawCount = countData[tileIndex] ?? 0;
    const clampedCount = Math.min(rawCount, maxShapesPerTile);
    const bucketOffset = tileIndex * maxShapesPerTile;
    const shapeIndices = Array.from(
      indexData.slice(bucketOffset, bucketOffset + clampedCount),
    );

    return {
      shapeIndices,
      tileIndex,
      x: tileIndex % tileWidth,
      y: Math.floor(tileIndex / tileWidth),
    };
  });

  console.log("tile buckets", {
    buckets,
    tileHeight,
    tileWidth,
  });

  tileShapeCountReadbackBuffer.unmap();
  tileShapeIndexReadbackBuffer.unmap();
  tileShapeCountReadbackBuffer.destroy();
  tileShapeIndexReadbackBuffer.destroy();
};

const getShapeFrameData = (animation: LottieComposition, frame: number): WebGpuShapeFrameData => {
  const lottieFrame = createLottieGpuFrame(animation, frame);

  return {
    compositionHeight: lottieFrame.compositionHeight,
    compositionWidth: lottieFrame.compositionWidth,
    encodedCubicBezierSegments: encodeGpuCubicBezierSegments(
      lottieFrame.cubicBezierSegments,
    ),
    encodedShapeRecords: encodeGpuShapeRecords(lottieFrame.shapeRecords),
    shapeCount: lottieFrame.shapeRecords.length,
  };
};

const getMaxFramePayloadCounts = (animation: LottieComposition) => {
  const startFrame = Math.floor(animation.ip);
  const endFrame = Math.max(startFrame, Math.ceil(animation.op) - 1);

  let maxShapeCount = 0;
  let maxCubicBezierSegmentCount = 0;

  for (let frame = startFrame; frame <= endFrame; frame += 1) {
    const lottieFrame = createLottieGpuFrame(animation, frame);

    maxShapeCount = Math.max(maxShapeCount, lottieFrame.shapeRecords.length);
    maxCubicBezierSegmentCount = Math.max(
      maxCubicBezierSegmentCount,
      lottieFrame.cubicBezierSegments.length,
    );
  }

  return {
    maxCubicBezierSegmentCount,
    maxShapeCount,
  };
};

const getWebGpuShapeDemoSetup = async (): Promise<WebGpuShapeDemoSetup> => {
  const response = await fetch(squareDotLottieAssetUrl);

  invariant(response.ok, "The square.lottie demo asset could not be loaded.");

  const animation = await readLottieJson("square.lottie", await response.arrayBuffer());

  invariant("gpu" in navigator, "WebGPU is not available in this browser.");

  const adapter = await navigator.gpu.requestAdapter();

  invariant(adapter, "No compatible GPU adapter was found.");

  const device = await adapter.requestDevice();
  const uniformStride = roundUpToMultiple(
    shapeDemoUniformSizeInBytes,
    device.limits.minUniformBufferOffsetAlignment,
  );
  const framePayloadCounts = getMaxFramePayloadCounts(animation);

  return {
    animation,
    device,
    maxCubicBezierSegmentCount: framePayloadCounts.maxCubicBezierSegmentCount,
    maxShapeCount: framePayloadCounts.maxShapeCount,
    presentationFormat: navigator.gpu.getPreferredCanvasFormat(),
    uniformStride,
  };
};

export const WebGpuShapeDemoClient = ({
  compact = false,
  currentFrame = 0,
}: {
  compact?: boolean;
  currentFrame?: number;
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const currentFrameRef = useRef(currentFrame);
  const renderStateRef = useRef<WebGpuRenderState | null>(null);
  const webGpuShapeDemoQuery = useQuery({
    queryKey: ["webgpu-shape-demo", squareDotLottieAssetUrl],
    queryFn: getWebGpuShapeDemoSetup,
    staleTime: Number.POSITIVE_INFINITY,
  });

  useEffect(() => {
    currentFrameRef.current = currentFrame;
    renderStateRef.current?.drawFrame(currentFrame);
  }, [currentFrame]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const setup = webGpuShapeDemoQuery.data;

    if (!canvas || !setup) {
      return;
    }

    const context = canvas.getContext("webgpu");

    invariant(context, "The canvas could not acquire a WebGPU context.");

    const {
      animation,
      device,
      maxCubicBezierSegmentCount,
      maxShapeCount,
      presentationFormat,
      uniformStride,
    } = setup;
    const drawCapacity = Math.max(maxShapeCount, 1);
    const cubicBezierSegmentCapacity = Math.max(maxCubicBezierSegmentCount, 1);
    const shapeStorageSize = gpuShapeRecordStrideInBytes * drawCapacity;
    const cubicBezierSegmentStorageSize =
      gpuCubicBezierSegmentStrideInBytes * cubicBezierSegmentCapacity;
    const shaderCode = buildShapeDemoShaderSource();
    const shaderModule = device.createShaderModule({ code: shaderCode });
    const bindGroupLayout = device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.COMPUTE | GPUShaderStage.FRAGMENT,
          buffer: {
            type: "read-only-storage",
          },
        },
        {
          binding: 1,
          visibility: GPUShaderStage.COMPUTE | GPUShaderStage.FRAGMENT,
          buffer: {
            type: "uniform",
            hasDynamicOffset: true,
          },
        },
        {
          binding: 2,
          visibility: GPUShaderStage.COMPUTE | GPUShaderStage.FRAGMENT,
          buffer: {
            type: "read-only-storage",
          },
        },
        {
          binding: 3,
          visibility: GPUShaderStage.COMPUTE | GPUShaderStage.FRAGMENT,
          buffer: {
            type: "storage",
          },
        },
        {
          binding: 4,
          visibility: GPUShaderStage.COMPUTE | GPUShaderStage.FRAGMENT,
          buffer: {
            type: "storage",
          },
        },
      ],
    });
    const pipelineLayout = device.createPipelineLayout({
      bindGroupLayouts: [bindGroupLayout],
    });
    const tileBucketPipeline = device.createComputePipeline({
      layout: pipelineLayout,
      compute: {
        module: shaderModule,
        entryPoint: "tileBucketPrepassComputeMain",
      },
    });
    const finalRasterPipeline = device.createRenderPipeline({
      layout: pipelineLayout,
      vertex: {
        module: shaderModule,
        entryPoint: "vertexMain",
      },
      fragment: {
        module: shaderModule,
        entryPoint: "finalRasterFragmentMain",
        targets: [
          {
            format: presentationFormat,
          },
        ],
      },
      primitive: {
        topology: "triangle-list",
      },
    });
    const shapeBuffer = device.createBuffer({
      size: shapeStorageSize,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE,
    });
    const cubicBezierSegmentBuffer = device.createBuffer({
      size: cubicBezierSegmentStorageSize,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE,
    });
    const uniformBuffer = device.createBuffer({
      size: uniformStride * (drawCapacity + 1),
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM,
    });
    let tileBucketResources: WebGpuTileBucketResources | null = null;

    const drawFrame = (frame: number) => {
      const {
        compositionHeight,
        compositionWidth,
        encodedCubicBezierSegments,
        encodedShapeRecords,
        shapeCount,
      } = getShapeFrameData(animation, frame);
      const devicePixelRatio = window.devicePixelRatio || 1;
      const width = Math.max(1, Math.floor(canvas.clientWidth * devicePixelRatio));
      const height = Math.max(1, Math.floor(canvas.clientHeight * devicePixelRatio));
      const { tileHeight, tileWidth } = getTileDimensions(width, height);

      canvas.width = width;
      canvas.height = height;

      context.configure({
        device,
        format: presentationFormat,
        alphaMode: "premultiplied",
      });

      if (
        !tileBucketResources ||
        tileBucketResources.tileWidth !== tileWidth ||
        tileBucketResources.tileHeight !== tileHeight
      ) {
        destroyTileBucketResources(tileBucketResources);

        const tileCount = tileWidth * tileHeight;

        tileBucketResources = {
          debugReadbackInFlight: false,
          tileHeight,
          tileShapeCountBuffer: device.createBuffer({
            size: tileCount * Uint32Array.BYTES_PER_ELEMENT,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC | GPUBufferUsage.STORAGE,
          }),
          tileShapeIndexBuffer: device.createBuffer({
            size: tileCount * drawCapacity * Uint32Array.BYTES_PER_ELEMENT,
            usage: GPUBufferUsage.COPY_SRC | GPUBufferUsage.STORAGE,
          }),
          tileWidth,
          zeroTileShapeCounts: new ArrayBuffer(tileCount * Uint32Array.BYTES_PER_ELEMENT),
        };
      }

      if (encodedShapeRecords.arrayBuffer.byteLength > 0) {
        device.queue.writeBuffer(shapeBuffer, 0, encodedShapeRecords.arrayBuffer);
      }

      if (encodedCubicBezierSegments.arrayBuffer.byteLength > 0) {
        device.queue.writeBuffer(
          cubicBezierSegmentBuffer,
          0,
          encodedCubicBezierSegments.arrayBuffer,
        );
      }

      const uniformArrayBuffer = new ArrayBuffer(uniformStride * (drawCapacity + 1));
      const uniformView = new DataView(uniformArrayBuffer);

      for (let index = 0; index < shapeCount; index += 1) {
        writeShapeDemoUniform(
          uniformView,
          index * uniformStride,
          {
            activeShapeIndex: index,
            canvasHeight: height,
            canvasWidth: width,
            compositionHeight,
            compositionWidth,
            maxShapesPerTile: drawCapacity,
            shapeCount,
            tileHeight,
            tileWidth,
          },
        );
      }

      const finalPassUniformOffset = uniformStride * drawCapacity;

      writeShapeDemoUniform(uniformView, finalPassUniformOffset, {
        activeShapeIndex: 0,
        canvasHeight: height,
        canvasWidth: width,
        compositionHeight,
        compositionWidth,
        maxShapesPerTile: drawCapacity,
        shapeCount,
        tileHeight,
        tileWidth,
      });

      device.queue.writeBuffer(uniformBuffer, 0, uniformArrayBuffer);
      device.queue.writeBuffer(
        tileBucketResources.tileShapeCountBuffer,
        0,
        tileBucketResources.zeroTileShapeCounts,
      );

      const bindGroup = device.createBindGroup({
        layout: bindGroupLayout,
        entries: [
          {
            binding: 0,
            resource: {
              buffer: shapeBuffer,
            },
          },
          {
            binding: 1,
            resource: {
              buffer: uniformBuffer,
              size: shapeDemoUniformSizeInBytes,
            },
          },
          {
            binding: 2,
            resource: {
              buffer: cubicBezierSegmentBuffer,
            },
          },
          {
            binding: 3,
            resource: {
              buffer: tileBucketResources.tileShapeCountBuffer,
            },
          },
          {
            binding: 4,
            resource: {
              buffer: tileBucketResources.tileShapeIndexBuffer,
            },
          },
        ],
      });

      const commandEncoder = device.createCommandEncoder();
      const boundingBoxPass = commandEncoder.beginComputePass();

      boundingBoxPass.setPipeline(tileBucketPipeline);

      for (let index = 0; index < shapeCount; index += 1) {
        boundingBoxPass.setBindGroup(0, bindGroup, [index * uniformStride]);
        boundingBoxPass.dispatchWorkgroups(Math.ceil(tileWidth / 8), Math.ceil(tileHeight / 8));
      }
      boundingBoxPass.end();

      const shapePass = commandEncoder.beginRenderPass({
        colorAttachments: [
          {
            view: context.getCurrentTexture().createView(),
            clearValue: { r: 0, g: 0, b: 0, a: 0 },
            loadOp: "clear",
            storeOp: "store",
          },
        ],
      });

      shapePass.setPipeline(finalRasterPipeline);
      shapePass.setBindGroup(0, bindGroup, [finalPassUniformOffset]);
      shapePass.draw(3);
      shapePass.end();

      device.queue.submit([commandEncoder.finish()]);

      if (!tileBucketResources.debugReadbackInFlight) {
        tileBucketResources.debugReadbackInFlight = true;

        void logTileBuckets({
          device,
          maxShapesPerTile: drawCapacity,
          tileHeight,
          tileShapeCountBuffer: tileBucketResources.tileShapeCountBuffer,
          tileShapeIndexBuffer: tileBucketResources.tileShapeIndexBuffer,
          tileWidth,
        }).finally(() => {
          if (tileBucketResources) {
            tileBucketResources.debugReadbackInFlight = false;
          }
        });
      }
    };

    const resizeObserver = new ResizeObserver(() => {
      drawFrame(currentFrameRef.current);
    });

    resizeObserver.observe(canvas);
    renderStateRef.current = {
      context,
      drawFrame,
      resizeObserver,
    };
    drawFrame(currentFrameRef.current);

    return () => {
      resizeObserver.disconnect();
      destroyTileBucketResources(tileBucketResources);
      shapeBuffer.destroy();
      cubicBezierSegmentBuffer.destroy();
      uniformBuffer.destroy();

      if (renderStateRef.current?.context === context) {
        renderStateRef.current = null;
      }
    };
  }, [webGpuShapeDemoQuery.data]);

  return (
    <div className={compact ? `${styles.demo} ${styles.demoCompact}` : styles.demo}>
      <div
        className={
          compact ? `${styles.canvasFrame} ${styles.canvasFrameCompact}` : styles.canvasFrame
        }
      >
        <canvas
          ref={canvasRef}
          className={compact ? `${styles.canvas} ${styles.canvasCompact}` : styles.canvas}
        />
      </div>
    </div>
  );
};
