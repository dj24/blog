"use client";

import invariant from "tiny-invariant";
import { useEffect, useRef } from "react";
import {
  createEmptyGpuShapeRecord,
  encodeGpuShapeRecords,
  gpuShapeKinds,
  gpuShapeRecordStrideInBytes,
} from "../_lib/gpu-shape-record";
import { buildUvShaderSource } from "./runtime-wgsl-shader";
import styles from "./page.module.css";

const demoUniformSizeInBytes = 32;

const roundUpToMultiple = (value: number, multiple: number) => {
  return Math.ceil(value / multiple) * multiple;
};

const writeDemoUniform = (
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

const hardcodedRectangleRecord = () => {
  const record = createEmptyGpuShapeRecord();

  record.id = 0;
  record.kind = gpuShapeKinds.rectangle;
  record.positionX = 320;
  record.positionY = 320;
  record.width = 180;
  record.height = 180;
  record.cornerRadius = 32;
  record.boundsMinX = -90;
  record.boundsMinY = -90;
  record.boundsMaxX = 90;
  record.boundsMaxY = 90;

  return record;
};

export const WebGpuUvDemoClient = ({ compact = false }: { compact?: boolean }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const shapeRecords = [hardcodedRectangleRecord()];
    const encodedShapeRecords = encodeGpuShapeRecords(shapeRecords);

    const run = async () => {
      invariant("gpu" in navigator, "WebGPU is not available in this browser.");

      const context = canvas.getContext("webgpu");

      invariant(context, "The canvas could not acquire a WebGPU context.");

      const adapter = await navigator.gpu.requestAdapter();

      invariant(adapter, "No compatible GPU adapter was found.");

      const device = await adapter.requestDevice();
      const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
      const shaderCode = buildUvShaderSource();
      const shaderModule = device.createShaderModule({ code: shaderCode });
      const drawCount = Math.max(shapeRecords.length, 1);
      const shapeStorageSize = Math.max(
        encodedShapeRecords.arrayBuffer.byteLength,
        gpuShapeRecordStrideInBytes,
      );
      const uniformStride = roundUpToMultiple(
        demoUniformSizeInBytes,
        device.limits.minUniformBufferOffsetAlignment,
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
              size: demoUniformSizeInBytes,
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
              clearValue: { r: 0, g: 0, b: 0, a: 1 },
              loadOp: "clear",
              storeOp: "store",
            },
          ],
        });

        renderPass.setPipeline(renderPipeline);

        for (let index = 0; index < shapeRecords.length; index += 1) {
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
          writeDemoUniform(
            uniformView,
            index * uniformStride,
            index,
            shapeRecords.length,
            width,
            height,
            640,
            640,
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
    };

    let cleanupResizeObserver: (() => void) | undefined;

    run()
      .then((cleanup) => {
        cleanupResizeObserver = cleanup;
      })
      .catch((error: unknown) => {
        console.error("WebGPU rectangle demo setup failed", error);
      });

    return () => {
      cleanupResizeObserver?.();
    };
  }, []);

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
