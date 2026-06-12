"use client";

import { useDitherStore } from "../../_state/dither-store";
import { Card } from "../card/card";
import { ModeCheckbox } from "../mode-checkbox/mode-checkbox";
import { MonochromaticPaletteControl } from "../monochromatic-palette-control/monochromatic-palette-control";
import { PolychromaticPaletteControl } from "../polychromatic-palette-control/polychromatic-palette-control";
import { RangeInput } from "../range-input/range-input";
import styles from "../../page.module.css";

export const DitherSettingsSection = () => {
  const mode = useDitherStore((state) => state.settings.mode);

  return (
    <div className={`${styles.section} ${styles.settingsSection}`}>
      <h2 className={styles.sectionTitle}>settings</h2>
      <div className={styles.monoCard}>
        <Card>
          <div className={styles.cardRow}>
            <p>monochromatic</p>
            <ModeCheckbox label="Select monochromatic mode" mode="monochromatic" />
          </div>
          {mode === "monochromatic" ? (
            <>
              <div className={styles.cardRow}>
                <p>contrast</p>
                <RangeInput
                  id="contrast-monochromatic"
                  name="contrast-monochromatic"
                  min="0"
                  max="11"
                />
              </div>
              <div className={styles.cardRow}>
                <p>palette</p>
                <MonochromaticPaletteControl />
              </div>
            </>
          ) : null}
        </Card>
      </div>
      <div className={styles.polyCard}>
        <Card>
          <div className={styles.cardRow}>
            <p>polychromatic</p>
            <ModeCheckbox label="Select polychromatic mode" mode="polychromatic" />
          </div>
          {mode === "polychromatic" ? (
            <>
              <div className={styles.cardRow}>
                <p>contrast</p>
                <RangeInput
                  id="contrast-polychromatic"
                  name="contrast-polychromatic"
                  min="0"
                  max="11"
                />
              </div>
              <div className={styles.cardRow}>
                <p>palette</p>
                <PolychromaticPaletteControl />
              </div>
            </>
          ) : null}
        </Card>
      </div>
    </div>
  );
};
