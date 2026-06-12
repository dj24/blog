import { getSwatches, type SwatchMap } from "colorthief";
import { match } from "ts-pattern";
import { create } from "zustand";
import { getPreviewResolution } from "../_lib/get-preview-resolution";
import { saturatePaletteColor, type PaletteColor } from "../_lib/palette-color";
import { getBlueNoiseTexture, type ThresholdMapMode } from "../_lib/threshold-map";
import { runPreviewComputePipeline } from "../_lib/run-preview-compute-pipeline";

type PreviewStatus = "idle" | "running" | "ready" | "error";
type ExportFormat = "jpeg" | "png";
type MonochromaticPalette = readonly [PaletteColor, PaletteColor];
type PolychromaticPalette = readonly [PaletteColor, PaletteColor, PaletteColor, PaletteColor];

type MonochromaticSettings = {
  mode: "monochromatic";
  brightness: number;
  contrast: number;
  thresholdMap: ThresholdMapMode;
  palette: MonochromaticPalette;
};

type PolychromaticSettings = {
  mode: "polychromatic";
  brightness: number;
  contrast: number;
  thresholdMap: ThresholdMapMode;
  palette: PolychromaticPalette;
};

export type DitherSettings = MonochromaticSettings | PolychromaticSettings;
export type DitherMode = DitherSettings["mode"];
type DitherSettingsByMode = {
  monochromatic: MonochromaticSettings;
  polychromatic: PolychromaticSettings;
};

type DitherState = {
  mode: DitherMode;
  previewStatus: PreviewStatus;
  previewCanvas: HTMLCanvasElement | null;
  sourceImage: ImageBitmap | null;
  renderTimeMs: number | null;
  settings: DitherSettings;
  settingsByMode: DitherSettingsByMode;
  setPreviewCanvas: (canvas: HTMLCanvasElement | null) => void;
  setBrightness: (brightness: number) => Promise<void>;
  setMode: (mode: DitherMode) => Promise<void>;
  setContrast: (contrast: number) => Promise<void>;
  setThresholdMap: (thresholdMap: ThresholdMapMode) => Promise<void>;
  setPaletteColor: (index: 0 | 1 | 2 | 3, color: PaletteColor) => Promise<void>;
  renderPreview: (canvas: HTMLCanvasElement) => Promise<void>;
  loadPreviewFile: (file: File) => Promise<void>;
  loadPreviewUrl: (url: string, fileName: string) => Promise<void>;
  exportPreview: (format: ExportFormat) => Promise<void>;
};

const monochromaticDefaultSettings: MonochromaticSettings = {
  mode: "monochromatic",
  brightness: 0,
  contrast: 1,
  thresholdMap: "bayer",
  palette: [
    [80, 60, 100],
    [255, 140, 50],
  ],
};

const polychromaticDefaultSettings: PolychromaticSettings = {
  mode: "polychromatic",
  brightness: 0,
  contrast: 1,
  thresholdMap: "bayer",
  palette: [
    [25, 20, 35],
    [80, 60, 100],
    [180, 110, 70],
    [255, 220, 180],
  ],
};

const defaultSettingsByMode: DitherSettingsByMode = {
  monochromatic: monochromaticDefaultSettings,
  polychromatic: polychromaticDefaultSettings,
};

const extractedPaletteSaturationBoost = 50;

const getSettingsForMode = (settingsByMode: DitherSettingsByMode, mode: DitherMode) => {
  return settingsByMode[mode];
};

const getPaletteColorFromSwatch = (
  swatch: SwatchMap[keyof SwatchMap],
  fallback: PaletteColor,
): PaletteColor => {
  if (!swatch) {
    return fallback;
  }

  const [red, green, blue] = swatch.color.array();

  return saturatePaletteColor([red, green, blue], extractedPaletteSaturationBoost);
};

const getPolychromaticPaletteFromSwatches = async (
  sourceImage: ImageBitmap,
  fallbackPalette: PolychromaticPalette,
): Promise<PolychromaticPalette> => {
  const swatches = await getSwatches(sourceImage);

  return [
    getPaletteColorFromSwatch(swatches.DarkVibrant, fallbackPalette[0]),
    getPaletteColorFromSwatch(swatches.Muted, fallbackPalette[1]),
    getPaletteColorFromSwatch(swatches.Vibrant, fallbackPalette[2]),
    getPaletteColorFromSwatch(swatches.LightVibrant, fallbackPalette[3]),
  ];
};

export const useDitherStore = create<DitherState>((set, get) => ({
  mode: "monochromatic",
  previewStatus: "idle",
  previewCanvas: null,
  sourceImage: null,
  renderTimeMs: null,
  settings: monochromaticDefaultSettings,
  settingsByMode: defaultSettingsByMode,
  setPreviewCanvas: (canvas) => {
    set({ previewCanvas: canvas });
  },
  setBrightness: async (brightness) => {
    const { mode, previewCanvas, settingsByMode, sourceImage } = get();
    const nextSettings = {
      ...getSettingsForMode(settingsByMode, mode),
      brightness,
    };

    set({
      settings: nextSettings,
      settingsByMode: {
        ...settingsByMode,
        [mode]: nextSettings,
      },
    });

    if (!previewCanvas || !sourceImage) {
      return;
    }

    await get().renderPreview(previewCanvas);
  },
  setMode: async (mode) => {
    const { previewCanvas, settingsByMode, sourceImage } = get();

    if (get().mode === mode) {
      return;
    }

    set({
      mode,
      settings: getSettingsForMode(settingsByMode, mode),
    });

    if (!previewCanvas || !sourceImage) {
      return;
    }

    await get().renderPreview(previewCanvas);
  },
  setContrast: async (contrast) => {
    const { mode, previewCanvas, settingsByMode, sourceImage } = get();
    const nextSettings = {
      ...getSettingsForMode(settingsByMode, mode),
      contrast,
    };

    set({
      settings: nextSettings,
      settingsByMode: {
        ...settingsByMode,
        [mode]: nextSettings,
      },
    });

    if (!previewCanvas || !sourceImage) {
      return;
    }

    await get().renderPreview(previewCanvas);
  },
  setThresholdMap: async (thresholdMap) => {
    const { mode, previewCanvas, settingsByMode, sourceImage } = get();
    const nextSettings = {
      ...getSettingsForMode(settingsByMode, mode),
      thresholdMap,
    };

    set({
      settings: nextSettings,
      settingsByMode: {
        ...settingsByMode,
        [mode]: nextSettings,
      },
    });

    if (!previewCanvas || !sourceImage) {
      return;
    }

    await get().renderPreview(previewCanvas);
  },
  setPaletteColor: async (index, color) => {
    const { mode, previewCanvas, settingsByMode, sourceImage } = get();
    const polychromaticPalette = settingsByMode.polychromatic.palette;

    if (mode === "monochromatic" && index > 1) {
      return;
    }

    const nextSettings =
      mode === "monochromatic"
        ? ({
            ...settingsByMode.monochromatic,
            palette:
              index === 0
                ? [color, settingsByMode.monochromatic.palette[1]]
                : [settingsByMode.monochromatic.palette[0], color],
          } satisfies MonochromaticSettings)
        : ({
            ...settingsByMode.polychromatic,
            palette: match(index)
              .with(0, (): PolychromaticPalette => [
                color,
                polychromaticPalette[1],
                polychromaticPalette[2],
                polychromaticPalette[3],
              ])
              .with(1, (): PolychromaticPalette => [
                polychromaticPalette[0],
                color,
                polychromaticPalette[2],
                polychromaticPalette[3],
              ])
              .with(2, (): PolychromaticPalette => [
                polychromaticPalette[0],
                polychromaticPalette[1],
                color,
                polychromaticPalette[3],
              ])
              .with(3, (): PolychromaticPalette => [
                polychromaticPalette[0],
                polychromaticPalette[1],
                polychromaticPalette[2],
                color,
              ])
              .exhaustive(),
          } satisfies PolychromaticSettings);

    set({
      settings: nextSettings,
      settingsByMode: {
        ...settingsByMode,
        [mode]: nextSettings,
      },
    });

    if (!previewCanvas || !sourceImage) {
      return;
    }

    await get().renderPreview(previewCanvas);
  },
  renderPreview: async (canvas) => {
    const { settings, sourceImage } = get();

    if (!sourceImage) {
      set({
        previewStatus: "error",
      });

      return;
    }

    const previewResolution = getPreviewResolution(sourceImage);

    if (!previewResolution) {
      set({
        previewStatus: "error",
      });

      return;
    }

    set({
      previewStatus: "running",
    });

    const thresholdMapOptions =
      settings.thresholdMap === "blue-noise"
        ? {
            thresholdMap: "blue-noise" as const,
            thresholdMapTexture: await getBlueNoiseTexture(),
          }
        : {
            thresholdMap: "bayer" as const,
          };

    const start = performance.now();
    await runPreviewComputePipeline(
      canvas,
      settings.mode === "monochromatic"
        ? {
            type: "monochromatic",
            width: previewResolution.width,
            height: previewResolution.height,
            sourceImage,
            brightness: settings.brightness,
            contrast: settings.contrast,
            palette: settings.palette,
            ...thresholdMapOptions,
          }
        : {
            type: "polychromatic",
            width: previewResolution.width,
            height: previewResolution.height,
            sourceImage,
            brightness: settings.brightness,
            contrast: settings.contrast,
            palette: settings.palette,
            ...thresholdMapOptions,
          },
    );
    const end = performance.now();

    set({
      previewStatus: "ready",
      renderTimeMs: end - start,
    });
  },
  loadPreviewUrl: async (url, fileName) => {
    set({
      previewStatus: "running",
    });

    const response = await fetch(url);
    const blob = await response.blob();
    const file = new File([blob], fileName, {
      type: blob.type || "image/jpeg",
    });

    await get().loadPreviewFile(file);
  },
  loadPreviewFile: async (file) => {
    if (!file.type.startsWith("image/")) {
      set({
        previewStatus: "error",
      });

      return;
    }

    set({
      previewStatus: "running",
    });

    const nextSourceImage = await createImageBitmap(file);
    const currentPolychromaticSettings = get().settingsByMode.polychromatic;
    const nextPolychromaticPalette = await getPolychromaticPaletteFromSwatches(
      nextSourceImage,
      currentPolychromaticSettings.palette,
    );
    const nextPolychromaticSettings = {
      ...currentPolychromaticSettings,
      palette: nextPolychromaticPalette,
    } satisfies PolychromaticSettings;
    const { mode, previewCanvas, sourceImage, renderPreview, settingsByMode } = get();

    sourceImage?.close();

    set({
      sourceImage: nextSourceImage,
      settings: mode === "polychromatic" ? nextPolychromaticSettings : get().settings,
      settingsByMode: {
        ...settingsByMode,
        polychromatic: nextPolychromaticSettings,
      },
    });

    if (!previewCanvas) {
      set({
        previewStatus: "ready",
      });

      return;
    }

    await renderPreview(previewCanvas);
  },
  exportPreview: async (format) => {
    const { previewCanvas, sourceImage } = get();

    if (!previewCanvas || !sourceImage) {
      set({
        previewStatus: "error",
      });

      return;
    }

    const previewResolution = getPreviewResolution(sourceImage);

    if (!previewResolution) {
      set({
        previewStatus: "error",
      });

      return;
    }

    const mimeType = format === "png" ? "image/png" : "image/jpeg";
    const extension = format === "png" ? "png" : "jpg";
    const fileName = `ordered-dither-${previewResolution.width}x${previewResolution.height}.${extension}`;

    const blob = await new Promise<Blob | null>((resolve) => {
      previewCanvas.toBlob(resolve, mimeType);
    });

    if (!blob) {
      set({
        previewStatus: "error",
      });

      return;
    }

    const downloadUrl = URL.createObjectURL(blob);
    const downloadLink = document.createElement("a");

    downloadLink.href = downloadUrl;
    downloadLink.download = fileName;
    downloadLink.click();

    URL.revokeObjectURL(downloadUrl);
  },
}));
