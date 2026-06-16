import type { Downscale } from "../_state/dither-store";

export const getPreviewResolution = (
  sourceImage: ImageBitmap | null,
  downscale: Downscale,
) => {
  if (!sourceImage) {
    return null;
  }

  return {
    width: Math.max(1, Math.floor(sourceImage.width / downscale)),
    height: Math.max(1, Math.floor(sourceImage.height / downscale)),
  };
};
