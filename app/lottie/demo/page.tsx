import type { Metadata } from "next";
import { WebGpuUvDemo } from "./webgpu-uv-demo";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Lottie WebGPU Demo",
  description: "A minimal WebGPU compute shader demo that writes UV coordinates into a canvas.",
};

const Page = () => {
  return (
    <main className={styles.page}>
      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2 className={styles.panelTitle}>live output</h2>
          <span className={styles.panelBadge}>compute + fullscreen pass</span>
        </div>
        <WebGpuUvDemo />
      </section>
    </main>
  );
};

export default Page;
