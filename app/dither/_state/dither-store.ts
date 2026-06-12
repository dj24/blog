import { create } from "zustand";
import { getPreviewResolution } from "../_lib/get-preview-resolution";
import type { PaletteColor } from "../_lib/palette-color";
import { runPreviewComputePipeline } from "../_lib/run-preview-compute-pipeline";

type PreviewStatus = "idle" | "running" | "ready" | "error";
type ExportFormat = "jpeg" | "png";
type MonochromaticPalette = readonly [PaletteColor, PaletteColor];
type PolychromaticPalette = readonly [PaletteColor, PaletteColor, PaletteColor, PaletteColor];

type MonochromaticSettings = {
  mode: "monochromatic";
  contrast: number;
  palette: MonochromaticPalette;
};

type PolychromaticSettings = {
  mode: "polychromatic";
  contrast: number;
  palette: PolychromaticPalette;
};

export type DitherSettings = MonochromaticSettings | PolychromaticSettings;
export type DitherMode = DitherSettings["mode"];

type DitherState = {
  previewStatus: PreviewStatus;
  previewCanvas: HTMLCanvasElement | null;
  sourceImage: ImageBitmap | null;
  renderTimeMs: number | null;
  settings: DitherSettings;
  setPreviewCanvas: (canvas: HTMLCanvasElement | null) => void;
  setMode: (mode: DitherMode) => Promise<void>;
  setContrast: (contrast: number) => Promise<void>;
  setMonochromaticPaletteColor: (index: 0 | 1, color: PaletteColor) => Promise<void>;
  setPolychromaticPaletteColor: (index: 0 | 1 | 2 | 3, color: PaletteColor) => Promise<void>;
  renderPreview: (canvas: HTMLCanvasElement) => Promise<void>;
  loadPreviewFile: (file: File) => Promise<void>;
  loadPreviewUrl: (url: string, fileName: string) => Promise<void>;
  exportPreview: (format: ExportFormat) => Promise<void>;
};

const monochromaticDefaultSettings: MonochromaticSettings = {
  mode: "monochromatic",
  contrast: 1,
  palette: [
    [80, 60, 100],
    [255, 140, 50],
  ],
};

const polychromaticDefaultSettings: PolychromaticSettings = {
  mode: "polychromatic",
  contrast: 1,
  palette: [
    [25, 20, 35],
    [80, 60, 100],
    [180, 110, 70],
    [255, 220, 180],
  ],
};

export const useDitherStore = create<DitherState>((set, get) => ({
  previewStatus: "idle",
  previewCanvas: null,
  sourceImage: null,
  renderTimeMs: null,
  settings: monochromaticDefaultSettings,
  setPreviewCanvas: (canvas) => {
    set({ previewCanvas: canvas });
  },
  setMode: async (mode) => {
    const { previewCanvas, settings, sourceImage } = get();

    if (settings.mode === mode) {
      return;
    }

    set({
      settings:
        mode === "monochromatic"
          ? {
              ...monochromaticDefaultSettings,
              contrast: settings.contrast,
            }
          : {
              ...polychromaticDefaultSettings,
              contrast: settings.contrast,
            },
    });

    if (!previewCanvas || !sourceImage) {
      return;
    }

    await get().renderPreview(previewCanvas);
  },
  setContrast: async (contrast) => {
    const { previewCanvas, settings, sourceImage } = get();

    set({
      settings: {
        ...settings,
        contrast,
      },
    });

    if (!previewCanvas || !sourceImage) {
      return;
    }

    await get().renderPreview(previewCanvas);
  },
  setMonochromaticPaletteColor: async (index, color) => {
    const { previewCanvas, settings, sourceImage } = get();

    if (settings.mode !== "monochromatic") {
      return;
    }

    set({
      settings: {
        ...settings,
        palette: index === 0 ? [color, settings.palette[1]] : [settings.palette[0], color],
      },
    });

    if (!previewCanvas || !sourceImage) {
      return;
    }

    await get().renderPreview(previewCanvas);
  },
  setPolychromaticPaletteColor: async (index, color) => {
    const { previewCanvas, settings, sourceImage } = get();

    if (settings.mode !== "polychromatic") {
      return;
    }

    set({
      settings: {
        ...settings,
        palette:
          index === 0
            ? [color, settings.palette[1], settings.palette[2], settings.palette[3]]
            : index === 1
              ? [settings.palette[0], color, settings.palette[2], settings.palette[3]]
              : index === 2
                ? [settings.palette[0], settings.palette[1], color, settings.palette[3]]
                : [settings.palette[0], settings.palette[1], settings.palette[2], color],
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

    const start = performance.now();
    await runPreviewComputePipeline(
      canvas,
      settings.mode === "monochromatic"
        ? {
            type: "monochromatic",
            width: previewResolution.width,
            height: previewResolution.height,
            sourceImage,
            contrast: settings.contrast,
            palette: settings.palette,
          }
        : {
            type: "polychromatic",
            width: previewResolution.width,
            height: previewResolution.height,
            sourceImage,
            contrast: settings.contrast,
            palette: settings.palette,
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
    const { previewCanvas, sourceImage, renderPreview } = get();

    sourceImage?.close();

    set({
      sourceImage: nextSourceImage,
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
