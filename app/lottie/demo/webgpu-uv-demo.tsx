"use client";

import invariant from "tiny-invariant";
import { useEffect, useRef, useState } from "react";
import { buildUvShaderSource } from "./runtime-wgsl-shader";
import styles from "./page.module.css";

type DemoStatus = "loading" | "ready" | "error";

const getStatusClassName = (status: DemoStatus) => {
  if (status === "ready") {
    return `${styles.status} ${styles.statusReady}`;
  }

  if (status === "error") {
    return `${styles.status} ${styles.statusError}`;
  }

  return `${styles.status} ${styles.statusLoading}`;
};

export const WebGpuUvDemo = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [status, setStatus] = useState<DemoStatus>("loading");
  const [statusMessage, setStatusMessage] = useState("Combining WGSL shader modules...");
  const [resolutionLabel, setResolutionLabel] = useState("Awaiting canvas setup");

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    invariant("gpu" in navigator, "WebGPU is not available in this browser.");

    const context = canvas.getContext("webgpu");

    invariant(context, "The canvas could not acquire a WebGPU context.");

    let animationFrameId = 0;
    let disposed = false;

    const run = async () => {
      const adapter = await navigator.gpu.requestAdapter();

      invariant(adapter, "No compatible GPU adapter was found.");

      const device = await adapter.requestDevice();
      const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
      const shaderCode = buildUvShaderSource();
      const shaderModule = device.createShaderModule({ code: shaderCode });
      const renderPipeline = device.createRenderPipeline({
        layout: "auto",
        vertex: {
          module: shaderModule,
          entryPoint: "vertexMain",
        },
        fragment: {
          module: shaderModule,
          entryPoint: "fragmentMain",
          targets: [{ format: presentationFormat }],
        },
        primitive: {
          topology: "triangle-list",
        },
      });

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
        setResolutionLabel(`${width} x ${height} pixels`);
      };

      configureCanvas();

      const resizeObserver = new ResizeObserver(() => {
        configureCanvas();
      });

      resizeObserver.observe(canvas);
      const frame = () => {
        if (disposed) {
          return;
        }

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
        renderPass.draw(3);
        renderPass.end();

        device.queue.submit([commandEncoder.finish()]);
        animationFrameId = window.requestAnimationFrame(frame);
      };

      setStatus("ready");
      setStatusMessage("Rendering UV coordinates from combined WGSL source.");
      animationFrameId = window.requestAnimationFrame(frame);

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
        const message = error instanceof Error ? error.message : "Unknown WGSL setup error.";
        reportError(message);
      });

    return () => {
      disposed = true;
      window.cancelAnimationFrame(animationFrameId);
      cleanupResizeObserver?.();
    };
  }, []);

  return (
    <div className={styles.demo}>
      <div className={styles.statusRow}>
        <span className={getStatusClassName(status)}>{statusMessage}</span>
        <span className={styles.meta}>{resolutionLabel}</span>
      </div>
      <div className={styles.canvasFrame}>
        <canvas ref={canvasRef} className={styles.canvas} />
      </div>
      <div className={styles.notes}>
        <p>
          The canvas shader is assembled by concatenating separate <code>.wgsl</code> files, then
          the fragment stage writes <code>uv.x</code> into red and <code>uv.y</code> into green.
        </p>
      </div>
    </div>
  );
};
