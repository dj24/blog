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

const shapeDemoUniformSizeInBytes = 32;
const squareDotLottieAssetUrl = "/lottie/assets/square.lottie";
const renderPassCount = 2;
const renderModeBoundingBox = 0;
const renderModeSdf = 1;

const roundUpToMultiple = (value: number, multiple: number) => {
  return Math.ceil(value / multiple) * multiple;
};

const writeShapeDemoUniform = (
  view: DataView,
  byteOffset: number,
  activeShapeIndex: number,
  renderMode: number,
  shapeCount: number,
  canvasWidth: number,
  canvasHeight: number,
  compositionWidth: number,
  compositionHeight: number,
) => {
  view.setUint32(byteOffset, activeShapeIndex, true);
  view.setUint32(byteOffset + 4, shapeCount, true);
  view.setUint32(byteOffset + 8, renderMode, true);
  view.setUint32(byteOffset + 12, 0, true);
  view.setFloat32(byteOffset + 16, canvasWidth, true);
  view.setFloat32(byteOffset + 20, canvasHeight, true);
  view.setFloat32(byteOffset + 24, compositionWidth, true);
  view.setFloat32(byteOffset + 28, compositionHeight, true);
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
        {
          binding: 2,
          visibility: GPUShaderStage.FRAGMENT,
          buffer: {
            type: "read-only-storage",
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
    const cubicBezierSegmentBuffer = device.createBuffer({
      size: cubicBezierSegmentStorageSize,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE,
    });
    const uniformBuffer = device.createBuffer({
      size: uniformStride * drawCapacity * renderPassCount,
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
        {
          binding: 2,
          resource: {
            buffer: cubicBezierSegmentBuffer,
          },
        },
      ],
    });

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

      if (encodedCubicBezierSegments.arrayBuffer.byteLength > 0) {
        device.queue.writeBuffer(
          cubicBezierSegmentBuffer,
          0,
          encodedCubicBezierSegments.arrayBuffer,
        );
      }

      const uniformArrayBuffer = new ArrayBuffer(
        uniformStride * Math.max(shapeCount, 1) * renderPassCount,
      );
      const uniformView = new DataView(uniformArrayBuffer);

      for (let index = 0; index < shapeCount; index += 1) {
        writeShapeDemoUniform(
          uniformView,
          index * uniformStride,
          index,
          renderModeBoundingBox,
          shapeCount,
          width,
          height,
          compositionWidth,
          compositionHeight,
        );

        writeShapeDemoUniform(
          uniformView,
          uniformStride * drawCapacity + index * uniformStride,
          index,
          renderModeSdf,
          shapeCount,
          width,
          height,
          compositionWidth,
          compositionHeight,
        );
      }

      device.queue.writeBuffer(uniformBuffer, 0, uniformArrayBuffer);

      const commandEncoder = device.createCommandEncoder();
      const boundingBoxPass = commandEncoder.beginRenderPass({
        colorAttachments: [
          {
            view: context.getCurrentTexture().createView(),
            clearValue: { r: 0, g: 0, b: 0, a: 0 },
            loadOp: "clear",
            storeOp: "store",
          },
        ],
      });

      boundingBoxPass.setPipeline(renderPipeline);

      for (let index = 0; index < shapeCount; index += 1) {
        boundingBoxPass.setBindGroup(0, bindGroup, [index * uniformStride]);
        boundingBoxPass.draw(3);
      }
      boundingBoxPass.end();

      const shapePass = commandEncoder.beginRenderPass({
        colorAttachments: [
          {
            view: context.getCurrentTexture().createView(),
            loadOp: "load",
            storeOp: "store",
          },
        ],
      });

      shapePass.setPipeline(renderPipeline);

      for (let index = 0; index < shapeCount; index += 1) {
        shapePass.setBindGroup(
          0,
          bindGroup,
          [uniformStride * drawCapacity + index * uniformStride],
        );
        shapePass.draw(3);
      }
      shapePass.end();

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
