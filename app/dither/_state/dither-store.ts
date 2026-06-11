import { create } from "zustand";
import { runUvComputePipeline } from "../_lib/run-uv-compute-pipeline";

type PreviewStatus = "idle" | "running" | "ready" | "error";

type DitherState = {
  previewStatus: PreviewStatus;
  previewError?: string;
  resolutionWidth: number;
  resolutionHeight: number;
  renderTimeMs: number | null;
  renderUvPreview: (canvas: HTMLCanvasElement) => Promise<void>;
};

export const useDitherStore = create<DitherState>((set, get) => ({
  previewStatus: "idle",
  previewError: undefined,
  resolutionWidth: 640,
  resolutionHeight: 480,
  renderTimeMs: null,
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
}));
