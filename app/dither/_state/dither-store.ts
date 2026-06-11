import {create} from "zustand";
import {getPreviewResolution} from "../_lib/get-preview-resolution";
import {runPreviewComputePipeline} from "../_lib/run-preview-compute-pipeline";

type PreviewStatus = "idle" | "running" | "ready" | "error";
type ExportFormat = "jpeg" | "png";
type MonochromaticPaletteColor = readonly [red: number, green: number, blue: number];
type MonochromaticPalette = readonly [
  MonochromaticPaletteColor,
  MonochromaticPaletteColor,
];

type DitherState = {
  previewStatus: PreviewStatus;
  previewCanvas: HTMLCanvasElement | null;
  sourceImage: ImageBitmap | null;
  renderTimeMs: number | null;
  contrast: number;
  monochromaticPalette: MonochromaticPalette;
  setPreviewCanvas: (canvas: HTMLCanvasElement | null) => void;
  setContrast: (contrast: number) => Promise<void>;
  setMonochromaticPaletteColor: (
    index: 0 | 1,
    color: MonochromaticPaletteColor,
  ) => Promise<void>;
  renderPreview: (canvas: HTMLCanvasElement) => Promise<void>;
  loadPreviewFile: (file: File) => Promise<void>;
  loadPreviewUrl: (url: string, fileName: string) => Promise<void>;
  exportPreview: (format: ExportFormat) => Promise<void>;
};

export const useDitherStore = create<DitherState>((set, get) => ({
  previewStatus: "idle",
  previewCanvas: null,
  sourceImage: null,
  renderTimeMs: null,
  contrast: 1,
  monochromaticPalette: [
    [80, 60, 100],
    [255, 140, 50],
  ],
  setPreviewCanvas: (canvas) => {
    set({previewCanvas: canvas});
  },
  setContrast: async (contrast) => {
    const {previewCanvas, sourceImage} = get();

    set({contrast});

    if (!previewCanvas || !sourceImage) {
      return;
    }

    await get().renderPreview(previewCanvas);
  },
  setMonochromaticPaletteColor: async (index, color) => {
    const {previewCanvas, sourceImage} = get();

    set((state) => ({
      monochromaticPalette:
        index === 0
          ? [color, state.monochromaticPalette[1]]
          : [state.monochromaticPalette[0], color],
    }));

    if (!previewCanvas || !sourceImage) {
      return;
    }

    await get().renderPreview(previewCanvas);
  },
  renderPreview: async (canvas) => {
    const {contrast, monochromaticPalette, sourceImage} = get();

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
    await runPreviewComputePipeline(canvas, {
      type: "monochromatic",
      width: previewResolution.width,
      height: previewResolution.height,
      sourceImage,
      contrast,
      palette: monochromaticPalette,
    });
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
    const {previewCanvas, sourceImage, renderPreview} = get();

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
    const {previewCanvas, sourceImage} = get();

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
