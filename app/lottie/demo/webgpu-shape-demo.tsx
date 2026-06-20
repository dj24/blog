"use client";

import dynamic from "next/dynamic";
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
  compact = false,
  currentFrame = 0,
}: {
  compact?: boolean;
  currentFrame?: number;
}) => {
  return <WebGpuShapeDemoClient compact={compact} currentFrame={currentFrame} />;
};
