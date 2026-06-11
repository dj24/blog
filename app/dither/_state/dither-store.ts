import { create } from "zustand";
import { runUvComputePipeline } from "../_lib/run-uv-compute-pipeline";

type PreviewStatus = "idle" | "running" | "ready" | "error";
type ExportFormat = "jpeg" | "png";

type DitherState = {
  previewStatus: PreviewStatus;
  previewError?: string;
  previewCanvas: HTMLCanvasElement | null;
  resolutionWidth: number;
  resolutionHeight: number;
  renderTimeMs: number | null;
  setPreviewCanvas: (canvas: HTMLCanvasElement | null) => void;
  renderUvPreview: (canvas: HTMLCanvasElement) => Promise<void>;
  exportPreview: (format: ExportFormat) => Promise<void>;
};

export const useDitherStore = create<DitherState>((set, get) => ({
  previewStatus: "idle",
  previewError: undefined,
  previewCanvas: null,
  resolutionWidth: 640,
  resolutionHeight: 480,
  renderTimeMs: null,
  setPreviewCanvas: (canvas) => {
    set({ previewCanvas: canvas });
  },
  renderUvPreview: async (canvas) => {
    set({
      previewStatus: "running",
      previewError: undefined,
      renderTimeMs: null,
    });

    try {
      const start = performance.now();
      const { resolutionWidth, resolutionHeight } = get();

      await runUvComputePipeline(canvas, {
        width: resolutionWidth,
        height: resolutionHeight,
      });

      const end = performance.now();

      set({
        previewStatus: "ready",
        previewError: undefined,
        renderTimeMs: end - start,
      });
    } catch (error) {
      set({
        previewStatus: "error",
        previewError:
          error instanceof Error ? error.message : "Could not render the WebGPU preview.",
        renderTimeMs: null,
      });
    }
  },
  exportPreview: async (format) => {
    const { previewCanvas, resolutionWidth, resolutionHeight } = get();

    if (!previewCanvas) {
      set({
        previewError: "No preview canvas is available to export.",
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
        previewError: `Could not export the preview as ${format}.`,
      });

      return;
    }

    const downloadUrl = URL.createObjectURL(blob);
    const downloadLink = document.createElement("a");

    downloadLink.href = downloadUrl;
    downloadLink.download = fileName;
    downloadLink.click();

    URL.revokeObjectURL(downloadUrl);

    set({
      previewError: undefined,
    });
  },
}));
