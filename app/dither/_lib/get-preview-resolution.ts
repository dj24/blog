export const getPreviewResolution = (sourceImage: ImageBitmap | null) => {
  if (!sourceImage) {
    return null;
  }

  return {
    width: Math.max(1, Math.floor(sourceImage.width / 4)),
    height: Math.max(1, Math.floor(sourceImage.height / 4)),
  };
};
