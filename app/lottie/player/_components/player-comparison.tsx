"use client";

import { useState } from "react";
import type { LottieComposition } from "../../_lib/types/lottie-composition";
import { WebGpuShapeDemo } from "../../demo/webgpu-shape-demo";
import styles from "../page.module.css";
import { DotlottiePlayer } from "./dotlottie-player/dotlottie-player";

type PlayerComparisonProps = {
  animation: LottieComposition;
  initialFrame: number;
  src: string;
};

export const PlayerComparison = ({ animation, initialFrame, src }: PlayerComparisonProps) => {
  const [currentFrame, setCurrentFrame] = useState(initialFrame);

  return (
    <section className={styles.layout}>
      <article className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2 className={styles.panelTitle}>Scrubber</h2>
          <span className={`${styles.status} ${styles.statusPaused}`}>Paused By Default</span>
        </div>
        <DotlottiePlayer
          currentFrame={currentFrame}
          onCurrentFrameChange={setCurrentFrame}
          src={src}
        />
      </article>

      <article className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2 className={styles.panelTitle}>WebGPU Shape Demo</h2>
          <span className={styles.status}>Frame {currentFrame}</span>
        </div>
        <div className={styles.demoPanelBody}>
          <WebGpuShapeDemo animation={animation} compact currentFrame={currentFrame} />
        </div>
      </article>
    </section>
  );
};
