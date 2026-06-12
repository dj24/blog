"use client";

import { useDitherStore } from "../../_state/dither-store";
import styles from "./range-input.module.css";

const CONTRAST_SCALE = 0.5;

export const RangeInput = (props: React.InputHTMLAttributes<HTMLInputElement>) => {
  const contrast = useDitherStore((state) => state.settings.contrast);
  const setContrast = useDitherStore((state) => state.setContrast);

  return (
    <input
      {...props}
      className={styles.rangeInput}
      onChange={(event) => {
        props.onChange?.(event);
        void setContrast(Number(event.currentTarget.value) * CONTRAST_SCALE);
      }}
      type="range"
      value={contrast / CONTRAST_SCALE}
    />
  );
};
