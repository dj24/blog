import { create } from "zustand";
import { runPreviewComputePipeline } from "../_lib/run-preview-compute-pipeline";

type PreviewStatus = "idle" | "running" | "ready" | "error";
type ExportFormat = "jpeg" | "png";

const toQuarterResolution = (size: number) => {
  return Math.max(1, Math.floor(size / 4));
};

type DitherState = {
  previewStatus: PreviewStatus;
  previewCanvas: HTMLCanvasElement | null;
  sourceImage: ImageBitmap | null;
  resolutionWidth: number;
  resolutionHeight: number;
  renderTimeMs: number | null;
  setPreviewCanvas: (canvas: HTMLCanvasElement | null) => void;
  renderPreview: (canvas: HTMLCanvasElement) => Promise<void>;
  loadPreviewFile: (file: File) => Promise<void>;
  loadPreviewUrl: (url: string, fileName: string) => Promise<void>;
  exportPreview: (format: ExportFormat) => Promise<void>;
};

export const useDitherStore = create<DitherState>((set, get) => ({
  previewStatus: "idle",
  previewCanvas: null,
  sourceImage: null,
  resolutionWidth: 640,
  resolutionHeight: 480,
  renderTimeMs: null,
  setPreviewCanvas: (canvas) => {
    set({ previewCanvas: canvas });
  },
  renderPreview: async (canvas) => {
    const { resolutionWidth, resolutionHeight, sourceImage } = get();

    if (!sourceImage) {
      set({
        previewStatus: "error",
        renderTimeMs: null,
      });

      return;
    }

    set({
      previewStatus: "running",
      renderTimeMs: null,
    });

    try {
      const start = performance.now();

      await runPreviewComputePipeline(canvas, {
        width: resolutionWidth,
        height: resolutionHeight,
        sourceImage,
      });

      const end = performance.now();

      set({
        previewStatus: "ready",
        renderTimeMs: end - start,
      });
    } catch {
      set({
        previewStatus: "error",
        renderTimeMs: null,
      });
    }
  },
  loadPreviewUrl: async (url, fileName) => {
    set({
      previewStatus: "running",
      renderTimeMs: null,
    });

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("Could not load the default preview image.");
      }

      const blob = await response.blob();
      const file = new File([blob], fileName, {
        type: blob.type || "image/jpeg",
      });

      await get().loadPreviewFile(file);
    } catch {
      set({
        previewStatus: "error",
        renderTimeMs: null,
      });
    }
  },
  loadPreviewFile: async (file) => {
    if (!file.type.startsWith("image/")) {
      set({
        previewStatus: "error",
        renderTimeMs: null,
      });

      return;
    }

    set({
      previewStatus: "running",
      renderTimeMs: null,
    });

    try {
      const nextSourceImage = await createImageBitmap(file);
      const { previewCanvas, sourceImage, renderPreview } = get();

      sourceImage?.close();

      set({
        sourceImage: nextSourceImage,
        resolutionWidth: toQuarterResolution(nextSourceImage.width),
        resolutionHeight: toQuarterResolution(nextSourceImage.height),
      });

      if (!previewCanvas) {
        set({
          previewStatus: "ready",
          renderTimeMs: null,
        });

        return;
      }

      await renderPreview(previewCanvas);
    } catch {
      set({
        previewStatus: "error",
        renderTimeMs: null,
      });
    }
  },
  exportPreview: async (format) => {
    const { previewCanvas, resolutionWidth, resolutionHeight } = get();

    if (!previewCanvas) {
      set({
        previewStatus: "error",
      });

      return;
    }

    const mimeType = format === "png" ? "image/png" : "image/jpeg";
    const extension = format === "png" ? "png" : "jpg";
    const fileName = `ordered-dither-${resolutionWidth}x${resolutionHeight}.${extension}`;

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
