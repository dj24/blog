export type PreviewComputePipelineBaseOptions = {
  width: number;
  height: number;
  sourceImage: ImageBitmap | null;
};

export type PreviewPaletteColor = readonly [red: number, green: number, blue: number];

export type MonochromaticPreviewComputePipelineOptions = PreviewComputePipelineBaseOptions & {
  type: "monochromatic";
  contrast: number;
  palette: readonly [PreviewPaletteColor, PreviewPaletteColor];
};

export type PolychromaticPreviewComputePipelineOptions = PreviewComputePipelineBaseOptions & {
  type: "polychromatic";
  contrast: number;
  palette: readonly [
    PreviewPaletteColor,
    PreviewPaletteColor,
    PreviewPaletteColor,
    PreviewPaletteColor,
  ];
};

export type PreviewComputePipelineOptions =
  | MonochromaticPreviewComputePipelineOptions
  | PolychromaticPreviewComputePipelineOptions;
