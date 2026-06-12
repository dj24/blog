export type PreviewComputePipelineBaseOptions = {
  width: number;
  height: number;
  sourceImage: ImageBitmap | null;
};

export type PreviewPaletteColor = readonly [red: number, green: number, blue: number];

export type MonochromaticPreviewComputePipelineOptions = PreviewComputePipelineBaseOptions & {
  type: "monochromatic";
  brightness: number;
  contrast: number;
  palette: readonly [PreviewPaletteColor, PreviewPaletteColor];
};

export type PolychromaticPreviewComputePipelineOptions = PreviewComputePipelineBaseOptions & {
  type: "polychromatic";
  brightness: number;
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
