"use client";

import { getPreviewResolution } from "../../_lib/get-preview-resolution";
import { useDitherStore } from "../../_state/dither-store";
import styles from "./resolution.module.css";

export const Resolution = () => {
  const downscale = useDitherStore((state) => state.settings.downscale);
  const sourceImage = useDitherStore((state) => state.sourceImage);
  const previewResolution = getPreviewResolution(sourceImage, downscale);

  return (
    <p className={styles.resolution}>
      {previewResolution ? `${previewResolution.width} x ${previewResolution.height}` : null}
    </p>
  );
};
