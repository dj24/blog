import blueNoiseTextureAsset from "../../blue-noise.png";
import type { ThresholdMapMode } from "./preview-compute-pipeline-options";

let blueNoiseTexturePromise: Promise<ImageBitmap> | null = null;

export type { ThresholdMapMode };

export const getBlueNoiseTexture = async () => {
  if (!blueNoiseTexturePromise) {
    blueNoiseTexturePromise = (async () => {
      const response = await fetch(blueNoiseTextureAsset.src);
      const blob = await response.blob();

      return createImageBitmap(blob);
    })();
  }

  try {
    return await blueNoiseTexturePromise;
  } catch (error) {
    blueNoiseTexturePromise = null;
    throw error;
  }
};
