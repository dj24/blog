"use client";

import type { Downscale } from "../../_state/dither-store";
import { useDitherStore } from "../../_state/dither-store";
import { Card } from "../card/card";
import { ModeCheckbox } from "../mode-checkbox/mode-checkbox";
import { MonochromaticPaletteControl } from "../monochromatic-palette-control/monochromatic-palette-control";
import { PolychromaticPaletteControl } from "../polychromatic-palette-control/polychromatic-palette-control";
import { RangeInput } from "../range-input/range-input";
import { ThresholdMapSelect } from "../threshold-map-select/threshold-map-select";
import styles from "../../page.module.css";

const CONTRAST_SCALE = 0.5;
const BRIGHTNESS_SCALE = 0.1;
const DOWNSCALE_SLIDER_MIN = 1;
const DOWNSCALE_SLIDER_MAX = 5;

const getDownscaleFromSliderValue = (value: number): Downscale => {
  return 2 ** (value - 1) as Downscale;
};

const getSliderValueFromDownscale = (downscale: Downscale) => {
  return Math.log2(downscale) + 1;
};

export const DitherSettingsSection = () => {
  const { brightness, contrast, downscale, mode } = useDitherStore((state) => state.settings);
  const setBrightness = useDitherStore((state) => state.setBrightness);
  const setContrast = useDitherStore((state) => state.setContrast);
  const setDownscale = useDitherStore((state) => state.setDownscale);

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
                  onValueChange={(value) => {
                    void setContrast(value);
                  }}
                  scale={CONTRAST_SCALE}
                  value={contrast}
                />
              </div>
              <div className={styles.cardRow}>
                <p>brightness</p>
                <RangeInput
                  id="brightness-monochromatic"
                  name="brightness-monochromatic"
                  min="-10"
                  max="10"
                  onValueChange={(value) => {
                    void setBrightness(value);
                  }}
                  scale={BRIGHTNESS_SCALE}
                  value={brightness}
                />
              </div>
              <div className={styles.cardRow}>
                <p>downscale</p>
                <RangeInput
                  id="downscale-monochromatic"
                  name="downscale-monochromatic"
                  min={String(DOWNSCALE_SLIDER_MIN)}
                  max={String(DOWNSCALE_SLIDER_MAX)}
                  onValueChange={(value) => {
                    void setDownscale(getDownscaleFromSliderValue(value));
                  }}
                  step="1"
                  value={getSliderValueFromDownscale(downscale)}
                />
              </div>
              <div className={styles.cardRow}>
                <ThresholdMapSelect />
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
                  onValueChange={(value) => {
                    void setContrast(value);
                  }}
                  scale={CONTRAST_SCALE}
                  value={contrast}
                />
              </div>
              <div className={styles.cardRow}>
                <p>brightness</p>
                <RangeInput
                  id="brightness-polychromatic"
                  name="brightness-polychromatic"
                  min="-10"
                  max="10"
                  onValueChange={(value) => {
                    void setBrightness(value);
                  }}
                  scale={BRIGHTNESS_SCALE}
                  value={brightness}
                />
              </div>
              <div className={styles.cardRow}>
                <p>downscale</p>
                <RangeInput
                  id="downscale-polychromatic"
                  name="downscale-polychromatic"
                  min={String(DOWNSCALE_SLIDER_MIN)}
                  max={String(DOWNSCALE_SLIDER_MAX)}
                  onValueChange={(value) => {
                    void setDownscale(getDownscaleFromSliderValue(value));
                  }}
                  step="1"
                  value={getSliderValueFromDownscale(downscale)}
                />
              </div>
              <div className={styles.cardRow}>
                <ThresholdMapSelect />
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
