"use client";

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

const toHexChannel = (value: number) => {
  return value.toString(16).padStart(2, "0");
};

const toHexColor = ([red, green, blue]: readonly [number, number, number]) => {
  return `#${toHexChannel(red)}${toHexChannel(green)}${toHexChannel(blue)}`;
};

const toRgbColor = (value: string) => {
  return [
    Number.parseInt(value.slice(1, 3), 16),
    Number.parseInt(value.slice(3, 5), 16),
    Number.parseInt(value.slice(5, 7), 16),
  ] as const;
};

export const MonochromaticPaletteControl = () => {
  const monochromaticPalette = useDitherStore((state) => state.monochromaticPalette);
  const setMonochromaticPaletteColor = useDitherStore(
    (state) => state.setMonochromaticPaletteColor,
  );

  return (
    <div className={styles.palette}>
      {paletteControls.map(({ index, label }) => {
        return (
          <input
            key={label}
            aria-label={label}
            className={styles.colorInput}
            onChange={(event) => {
              void setMonochromaticPaletteColor(index, toRgbColor(event.currentTarget.value));
            }}
            type="color"
            value={toHexColor(monochromaticPalette[index])}
          />
        );
      })}
    </div>
  );
};
