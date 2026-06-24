"use client";

import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import type { LottieComposition } from "../_lib/types/lottie-composition";
import { WebGpuShapeDemo } from "../demo/webgpu-shape-demo";
import styles from "./page.module.css";

export const ShapeLottiePreview = ({
  animation,
  label,
  src,
}: {
  animation: LottieComposition;
  label: string;
  src: string;
}) => {
  return (
    <div className={styles.previewComparison}>
      <div className={styles.previewPane}>
        <DotLottieReact
          aria-label={`${label} Lottie player preview`}
          autoplay
          className={styles.lottiePreview}
          loop
          renderConfig={{ autoResize: true }}
          src={src}
        />
      </div>
      <div className={`${styles.previewPane} ${styles.rendererPreview}`}>
        <WebGpuShapeDemo animation={animation} compact currentFrame={0} />
      </div>
    </div>
  );
};
