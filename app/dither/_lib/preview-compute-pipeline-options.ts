export type PreviewComputePipelineBaseOptions = {
  width: number;
  height: number;
  sourceImage: ImageBitmap | null;
};

export type PreviewPaletteColor = readonly [red: number, green: number, blue: number];
export type ThresholdMapMode = "bayer" | "blue-noise";

type BayerThresholdMapOptions = {
  thresholdMap: "bayer";
};

type BlueNoiseThresholdMapOptions = {
  thresholdMap: "blue-noise";
  thresholdMapTexture: ImageBitmap;
};

type ThresholdMapOptions = BayerThresholdMapOptions | BlueNoiseThresholdMapOptions;

export type MonochromaticPreviewComputePipelineOptions = PreviewComputePipelineBaseOptions & {
  type: "monochromatic";
  brightness: number;
  contrast: number;
  downscale: number;
  palette: readonly [PreviewPaletteColor, PreviewPaletteColor];
} & ThresholdMapOptions;

export type PolychromaticPreviewComputePipelineOptions = PreviewComputePipelineBaseOptions & {
  type: "polychromatic";
  brightness: number;
  contrast: number;
  downscale: number;
  palette: readonly [
    PreviewPaletteColor,
    PreviewPaletteColor,
    PreviewPaletteColor,
    PreviewPaletteColor,
  ];
} & ThresholdMapOptions;

export type PreviewComputePipelineOptions =
  | MonochromaticPreviewComputePipelineOptions
  | PolychromaticPreviewComputePipelineOptions;
