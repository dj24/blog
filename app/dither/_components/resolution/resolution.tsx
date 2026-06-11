"use client";

import { useDitherStore } from "../../_state/dither-store";
import styles from "./resolution.module.css";

export const Resolution = () => {
  const resolutionWidth = useDitherStore((state) => state.resolutionWidth);
  const resolutionHeight = useDitherStore((state) => state.resolutionHeight);

  return (
    <p className={styles.resolution}>
      {resolutionWidth} x {resolutionHeight}
    </p>
  );
};
