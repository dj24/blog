"use client";

import dynamic from "next/dynamic";
import type { LottieComposition } from "../_lib/types/lottie-composition";
import styles from "./page.module.css";

const WebGpuShapeDemoClient = dynamic(
  () => import("./webgpu-shape-demo-client").then((mod) => mod.WebGpuShapeDemoClient),
  {
    loading: () => (
      <div className={styles.demo}>
        <div className={styles.canvasFrame} />
      </div>
    ),
    ssr: false,
  },
);

export const WebGpuShapeDemo = ({
  animation,
  compact = false,
  currentFrame = 0,
}: {
  animation?: LottieComposition;
  compact?: boolean;
  currentFrame?: number;
}) => {
  return (
    <WebGpuShapeDemoClient animation={animation} compact={compact} currentFrame={currentFrame} />
  );
};
