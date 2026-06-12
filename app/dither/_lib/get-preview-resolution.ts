const previewScale = 4;

export const getPreviewResolution = (sourceImage: ImageBitmap | null) => {
  if (!sourceImage) {
    return null;
  }

  return {
    width: Math.max(1, Math.floor(sourceImage.width / previewScale)),
    height: Math.max(1, Math.floor(sourceImage.height / previewScale)),
  };
};
