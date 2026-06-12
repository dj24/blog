"use client";

import { toHexColor, toRgbColor } from "../../_lib/palette-color";
import { useDitherStore } from "../../_state/dither-store";
import styles from "../monochromatic-palette-control/monochromatic-palette-control.module.css";

const paletteControls = [
  {
    index: 0 as const,
    label: "Polychromatic palette color 1",
  },
  {
    index: 1 as const,
    label: "Polychromatic palette color 2",
  },
  {
    index: 2 as const,
    label: "Polychromatic palette color 3",
  },
  {
    index: 3 as const,
    label: "Polychromatic palette color 4",
  },
];

export const PolychromaticPaletteControl = () => {
  const settings = useDitherStore((state) => state.settings);
  const setPolychromaticPaletteColor = useDitherStore(
    (state) => state.setPolychromaticPaletteColor,
  );

  if (settings.mode !== "polychromatic") {
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
              void setPolychromaticPaletteColor(index, toRgbColor(event.currentTarget.value));
            }}
            type="color"
            value={toHexColor(settings.palette[index])}
          />
        );
      })}
    </div>
  );
};
