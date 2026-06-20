"use client";

import { useQuery } from "@tanstack/react-query";
import invariant from "tiny-invariant";
import { useEffect, useRef } from "react";
import { encodeGpuShapeRecords, gpuShapeRecordStrideInBytes } from "../_lib/gpu-shape-record";
import { createLottieGpuFrame } from "../_lib/lottie-gpu-frame";
import { readLottieJson } from "../_lib/dotlottie";
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

type EncodedGpuShapeRecords = ReturnType<typeof encodeGpuShapeRecords>;

type WebGpuShapeDemoSetup = {
  compositionHeight: number;
  compositionWidth: number;
  device: GPUDevice;
  encodedShapeRecords: EncodedGpuShapeRecords;
  presentationFormat: GPUTextureFormat;
  shapeCount: number;
  uniformStride: number;
};

const getWebGpuShapeDemoSetup = async (): Promise<WebGpuShapeDemoSetup> => {
  const response = await fetch(squareDotLottieAssetUrl);

  invariant(response.ok, "The square.lottie demo asset could not be loaded.");

  const animation = await readLottieJson("square.lottie", await response.arrayBuffer());
  const lottieFrame = createLottieGpuFrame(animation, animation.ip);
  const { compositionHeight, compositionWidth, shapeRecords } = lottieFrame;
  const encodedShapeRecords = encodeGpuShapeRecords(shapeRecords);

  invariant("gpu" in navigator, "WebGPU is not available in this browser.");

  const adapter = await navigator.gpu.requestAdapter();

  invariant(adapter, "No compatible GPU adapter was found.");

  const device = await adapter.requestDevice();
  const uniformStride = roundUpToMultiple(
    shapeDemoUniformSizeInBytes,
    device.limits.minUniformBufferOffsetAlignment,
  );

  return {
    compositionHeight,
    compositionWidth,
    device,
    encodedShapeRecords,
    presentationFormat: navigator.gpu.getPreferredCanvasFormat(),
    shapeCount: shapeRecords.length,
    uniformStride,
  };
};

export const WebGpuShapeDemoClient = ({ compact = false }: { compact?: boolean }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const webGpuShapeDemoQuery = useQuery({
    queryKey: ["webgpu-shape-demo", squareDotLottieAssetUrl],
    queryFn: getWebGpuShapeDemoSetup,
    staleTime: Number.POSITIVE_INFINITY,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const setup = webGpuShapeDemoQuery.data;

    if (!canvas || !setup) {
      return;
    }

    const context = canvas.getContext("webgpu");

    invariant(context, "The canvas could not acquire a WebGPU context.");

    const {
      compositionHeight,
      compositionWidth,
      device,
      encodedShapeRecords,
      presentationFormat,
      shapeCount,
      uniformStride,
    } = setup;
    const shaderCode = buildShapeDemoShaderSource();
    const shaderModule = device.createShaderModule({ code: shaderCode });
    const drawCount = Math.max(shapeCount, 1);
    const shapeStorageSize = Math.max(
      encodedShapeRecords.arrayBuffer.byteLength,
      gpuShapeRecordStrideInBytes,
    );

    const shapeBuffer = device.createBuffer({
      size: shapeStorageSize,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE,
    });
    const uniformBuffer = device.createBuffer({
      size: uniformStride * drawCount,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM,
    });

    if (encodedShapeRecords.arrayBuffer.byteLength > 0) {
      device.queue.writeBuffer(shapeBuffer, 0, encodedShapeRecords.arrayBuffer);
    }

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
    const uniformArrayBuffer = new ArrayBuffer(uniformStride * drawCount);
    const uniformView = new DataView(uniformArrayBuffer);

    const drawFrame = () => {
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

    const configureCanvas = () => {
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

      for (let index = 0; index < drawCount; index += 1) {
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
      drawFrame();
    };

    configureCanvas();

    const resizeObserver = new ResizeObserver(() => {
      configureCanvas();
    });

    resizeObserver.observe(canvas);

    return () => {
      resizeObserver.disconnect();
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
