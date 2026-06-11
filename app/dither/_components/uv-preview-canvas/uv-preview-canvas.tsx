"use client";

import { useEffect, useRef } from "react";
import { useDitherStore } from "../../_state/dither-store";
import styles from "./uv-preview-canvas.module.css";

export const UvPreviewCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderUvPreview = useDitherStore((state) => state.renderUvPreview);
  const previewStatus = useDitherStore((state) => state.previewStatus);
  const previewError = useDitherStore((state) => state.previewError);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    void renderUvPreview(canvas);
  }, [renderUvPreview]);

  return (
    <div className={styles.preview}>
      <canvas ref={canvasRef} aria-label="WebGPU UV preview" className={styles.canvas} />
      {previewStatus === "error" ? <p className={styles.status}>{previewError}</p> : null}
    </div>
  );
};
