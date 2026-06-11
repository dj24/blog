"use client";

import { useDitherStore } from "../../_state/dither-store";
import styles from "./render-time.module.css";

export const RenderTime = () => {
  const renderTimeMs = useDitherStore((state) => state.renderTimeMs);

  return (
    <p className={styles.renderTime}>{renderTimeMs === null ? "--" : renderTimeMs.toFixed(2)} ms</p>
  );
};
