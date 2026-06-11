"use client";

import { useEffect, useRef } from "react";
import { useDitherStore } from "../../_state/dither-store";
import styles from "./preview-canvas.module.css";

export const PreviewCanvas = ({ defaultImageUrl }: { defaultImageUrl: string }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hasRequestedDefaultImageRef = useRef(false);
  const loadPreviewUrl = useDitherStore((state) => state.loadPreviewUrl);
  const previewStatus = useDitherStore((state) => state.previewStatus);
  const resolutionWidth = useDitherStore((state) => state.resolutionWidth);
  const resolutionHeight = useDitherStore((state) => state.resolutionHeight);
  const setPreviewCanvas = useDitherStore((state) => state.setPreviewCanvas);
  const sourceImage = useDitherStore((state) => state.sourceImage);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    setPreviewCanvas(canvas);

    return () => {
      setPreviewCanvas(null);
    };
  }, [setPreviewCanvas]);

  useEffect(() => {
    if (sourceImage || hasRequestedDefaultImageRef.current) {
      return;
    }

    hasRequestedDefaultImageRef.current = true;
    void loadPreviewUrl(defaultImageUrl, "pearl-earring.jpg");
  }, [defaultImageUrl, loadPreviewUrl, sourceImage]);

  return (
    <div className={styles.preview}>
      <canvas
        ref={canvasRef}
        aria-label="WebGPU preview"
        className={styles.canvas}
        width={resolutionWidth}
        height={resolutionHeight}
        style={{
          aspectRatio: `${resolutionWidth} / ${resolutionHeight}`,
        }}
      />
      {previewStatus === "error" ? <p className={styles.status}>error</p> : null}
    </div>
  );
};
