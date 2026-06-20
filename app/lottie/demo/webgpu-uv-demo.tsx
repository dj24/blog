"use client";

import dynamic from "next/dynamic";
import styles from "./page.module.css";

const WebGpuUvDemoClient = dynamic(
  () => import("./webgpu-uv-demo-client").then((mod) => mod.WebGpuUvDemoClient),
  {
    loading: () => (
      <div className={styles.demo}>
        <div className={styles.canvasFrame} />
      </div>
    ),
    ssr: false,
  },
);

export const WebGpuUvDemo = ({ compact = false }: { compact?: boolean }) => {
  return <WebGpuUvDemoClient compact={compact} />;
};
