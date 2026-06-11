import {create} from "zustand";
import {getPreviewResolution} from "../_lib/get-preview-resolution";
import {runPreviewComputePipeline} from "../_lib/run-preview-compute-pipeline";

type PreviewStatus = "idle" | "running" | "ready" | "error";
type ExportFormat = "jpeg" | "png";

type DitherState = {
  previewStatus: PreviewStatus;
  previewCanvas: HTMLCanvasElement | null;
  sourceImage: ImageBitmap | null;
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
  renderTimeMs: null,
  setPreviewCanvas: (canvas) => {
    set({previewCanvas: canvas});
  },
  renderPreview: async (canvas) => {
    const {sourceImage} = get();

    if (!sourceImage) {
      set({
        previewStatus: "error",
        renderTimeMs: null,
      });

      return;
    }

    const previewResolution = getPreviewResolution(sourceImage);

    if (!previewResolution) {
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

    const start = performance.now();
    await runPreviewComputePipeline(canvas, {
      width: previewResolution.width,
      height: previewResolution.height,
      sourceImage,
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
      renderTimeMs: null,
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
        renderTimeMs: null,
      });

      return;
    }

    set({
      previewStatus: "running",
      renderTimeMs: null,
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
        renderTimeMs: null,
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
