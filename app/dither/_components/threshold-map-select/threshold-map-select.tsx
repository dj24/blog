"use client";

import type { ThresholdMapMode } from "../../_lib/threshold-map";
import { useDitherStore } from "../../_state/dither-store";
import { SquareCheckbox } from "../square-checkbox/square-checkbox";
import styles from "./threshold-map-select.module.css";

const thresholdMapOptions: readonly { label: string; value: ThresholdMapMode }[] = [
  {
    label: "bayer",
    value: "bayer",
  },
  {
    label: "blue noise",
    value: "blue-noise",
  },
];

export const ThresholdMapSelect = () => {
  const thresholdMap = useDitherStore((state) => state.settings.thresholdMap);
  const setThresholdMap = useDitherStore((state) => state.setThresholdMap);

  return (
    <div className={styles.wrapper}>
      {thresholdMapOptions.map(({ label, value }) => {
        return (
          <label key={value} className={styles.option}>
            <span className={styles.label}>{label}</span>
            <SquareCheckbox
              aria-label={`Select ${label} threshold map`}
              checked={thresholdMap === value}
              name="threshold-map"
              onChange={() => {
                void setThresholdMap(value);
              }}
              type="radio"
            />
          </label>
        );
      })}
    </div>
  );
};
