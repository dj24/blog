"use client";

import { useEffect, useRef } from "react";
import { getPreviewResolution } from "../../_lib/get-preview-resolution";
import { useDitherStore } from "../../_state/dither-store";
import styles from "./preview-canvas.module.css";

export const PreviewCanvas = ({ defaultImageUrl }: { defaultImageUrl: string }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hasRequestedDefaultImageRef = useRef(false);
  const loadPreviewUrl = useDitherStore((state) => state.loadPreviewUrl);
  const previewStatus = useDitherStore((state) => state.previewStatus);
  const setPreviewCanvas = useDitherStore((state) => state.setPreviewCanvas);
  const sourceImage = useDitherStore((state) => state.sourceImage);
  const previewResolution = getPreviewResolution(sourceImage);

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
        width={previewResolution?.width}
        height={previewResolution?.height}
        style={{
          aspectRatio: previewResolution
            ? `${previewResolution.width} / ${previewResolution.height}`
            : undefined,
        }}
      />
      {previewStatus === "error" ? <p className={styles.status}>error</p> : null}
    </div>
  );
};
