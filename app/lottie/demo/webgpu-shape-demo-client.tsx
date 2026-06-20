"use client";

import { useQuery } from "@tanstack/react-query";
import invariant from "tiny-invariant";
import { useEffect, useRef } from "react";
import { encodeGpuShapeRecords, gpuShapeRecordStrideInBytes } from "../_lib/gpu-shape-record";
import { createLottieGpuFrame } from "../_lib/lottie-gpu-frame";
import { readLottieJson } from "../_lib/dotlottie";
import type { LottieComposition } from "../_lib/types/lottie-composition";
import { buildShapeDemoShaderSource } from "./shape-demo-shader-source";
import styles from "./page.module.css";

const shapeDemoUniformSizeInBytes = 32;
const squareDotLottieAssetUrl = "/lottie/assets/square.lottie";

const roundUpToMultiple = (value: number, multiple: number) => {
  return Math.ceil(value / multiple) * multiple;
};

const writeShapeDemoUniform = (
  view: DataView,
  byteOffset: number,
  activeShapeIndex: number,
  shapeCount: number,
  canvasWidth: number,
  canvasHeight: number,
  compositionWidth: number,
  compositionHeight: number,
) => {
  view.setUint32(byteOffset, activeShapeIndex, true);
  view.setUint32(byteOffset + 4, shapeCount, true);
  view.setUint32(byteOffset + 8, 0, true);
  view.setUint32(byteOffset + 12, 0, true);
  view.setFloat32(byteOffset + 16, canvasWidth, true);
  view.setFloat32(byteOffset + 20, canvasHeight, true);
  view.setFloat32(byteOffset + 24, compositionWidth, true);
  view.setFloat32(byteOffset + 28, compositionHeight, true);
};

type WebGpuShapeDemoSetup = {
  animation: LottieComposition;
  device: GPUDevice;
  maxShapeCount: number;
  presentationFormat: GPUTextureFormat;
  uniformStride: number;
};

type WebGpuShapeFrameData = {
  compositionHeight: number;
  compositionWidth: number;
  encodedShapeRecords: ReturnType<typeof encodeGpuShapeRecords>;
  shapeCount: number;
};

type WebGpuRenderState = {
  context: GPUCanvasContext;
  drawFrame: (frame: number) => void;
  resizeObserver: ResizeObserver;
};

const getShapeFrameData = (animation: LottieComposition, frame: number): WebGpuShapeFrameData => {
  const lottieFrame = createLottieGpuFrame(animation, frame);

  return {
    compositionHeight: lottieFrame.compositionHeight,
    compositionWidth: lottieFrame.compositionWidth,
    encodedShapeRecords: encodeGpuShapeRecords(lottieFrame.shapeRecords),
    shapeCount: lottieFrame.shapeRecords.length,
  };
};

const getMaxShapeCount = (animation: LottieComposition) => {
  const startFrame = Math.floor(animation.ip);
  const endFrame = Math.max(startFrame, Math.ceil(animation.op) - 1);

  let maxShapeCount = 0;

  for (let frame = startFrame; frame <= endFrame; frame += 1) {
    maxShapeCount = Math.max(
      maxShapeCount,
      createLottieGpuFrame(animation, frame).shapeRecords.length,
    );
  }

  return maxShapeCount;
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

  return {
    animation,
    device,
    maxShapeCount: getMaxShapeCount(animation),
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

    const { animation, device, maxShapeCount, presentationFormat, uniformStride } = setup;
    const drawCapacity = Math.max(maxShapeCount, 1);
    const shapeStorageSize = gpuShapeRecordStrideInBytes * drawCapacity;
    const shaderCode = buildShapeDemoShaderSource();
    const shaderModule = device.createShaderModule({ code: shaderCode });
    const bindGroupLayout = device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.FRAGMENT,
          buffer: {
            type: "read-only-storage",
          },
        },
        {
          binding: 1,
          visibility: GPUShaderStage.FRAGMENT,
          buffer: {
            type: "uniform",
            hasDynamicOffset: true,
          },
        },
      ],
    });
    const pipelineLayout = device.createPipelineLayout({
      bindGroupLayouts: [bindGroupLayout],
    });
    const renderPipeline = device.createRenderPipeline({
      layout: pipelineLayout,
      vertex: {
        module: shaderModule,
        entryPoint: "vertexMain",
      },
      fragment: {
        module: shaderModule,
        entryPoint: "fragmentMain",
        targets: [
          {
            format: presentationFormat,
            blend: {
              color: {
                operation: "add",
                srcFactor: "src-alpha",
                dstFactor: "one-minus-src-alpha",
              },
              alpha: {
                operation: "add",
                srcFactor: "one",
                dstFactor: "one-minus-src-alpha",
              },
            },
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
    const uniformBuffer = device.createBuffer({
      size: uniformStride * drawCapacity,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM,
    });
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
      ],
    });

    const drawFrame = (frame: number) => {
      const { compositionHeight, compositionWidth, encodedShapeRecords, shapeCount } =
        getShapeFrameData(animation, frame);
      const devicePixelRatio = window.devicePixelRatio || 1;
      const width = Math.max(1, Math.floor(canvas.clientWidth * devicePixelRatio));
      const height = Math.max(1, Math.floor(canvas.clientHeight * devicePixelRatio));

      canvas.width = width;
      canvas.height = height;

      context.configure({
        device,
        format: presentationFormat,
        alphaMode: "premultiplied",
      });

      if (encodedShapeRecords.arrayBuffer.byteLength > 0) {
        device.queue.writeBuffer(shapeBuffer, 0, encodedShapeRecords.arrayBuffer);
      }

      const uniformArrayBuffer = new ArrayBuffer(uniformStride * Math.max(shapeCount, 1));
      const uniformView = new DataView(uniformArrayBuffer);

      for (let index = 0; index < shapeCount; index += 1) {
        writeShapeDemoUniform(
          uniformView,
          index * uniformStride,
          index,
          shapeCount,
          width,
          height,
          compositionWidth,
          compositionHeight,
        );
      }

      device.queue.writeBuffer(uniformBuffer, 0, uniformArrayBuffer);

      const commandEncoder = device.createCommandEncoder();
      const renderPass = commandEncoder.beginRenderPass({
        colorAttachments: [
          {
            view: context.getCurrentTexture().createView(),
            clearValue: { r: 0, g: 0, b: 0, a: 0 },
            loadOp: "clear",
            storeOp: "store",
          },
        ],
      });

      renderPass.setPipeline(renderPipeline);

      for (let index = 0; index < shapeCount; index += 1) {
        renderPass.setBindGroup(0, bindGroup, [index * uniformStride]);
        renderPass.draw(3);
      }
      renderPass.end();

      device.queue.submit([commandEncoder.finish()]);
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
