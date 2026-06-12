"use client";

import { toHexColor, toRgbColor } from "../../_lib/palette-color";
import { useDitherStore } from "../../_state/dither-store";
import styles from "./monochromatic-palette-control.module.css";

const paletteControls = [
  {
    index: 0 as const,
    label: "Dark monochromatic color",
  },
  {
    index: 1 as const,
    label: "Light monochromatic color",
  },
];

export const MonochromaticPaletteControl = () => {
  const settings = useDitherStore((state) => state.settings);
  const setPaletteColor = useDitherStore((state) => state.setPaletteColor);

  if (settings.mode !== "monochromatic") {
    return null;
  }

  return (
    <div className={styles.palette}>
      {paletteControls.map(({ index, label }) => {
        return (
          <input
            key={label}
            aria-label={label}
            className={styles.colorInput}
            onChange={(event) => {
              void setPaletteColor(index, toRgbColor(event.currentTarget.value));
            }}
            type="color"
            value={toHexColor(settings.palette[index])}
          />
        );
      })}
    </div>
  );
};
