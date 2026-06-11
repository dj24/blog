import { create } from "zustand";
import { runUvComputePipeline } from "../_lib/run-uv-compute-pipeline";

type PreviewStatus = "idle" | "running" | "ready" | "error";

type DitherState = {
  previewStatus: PreviewStatus;
  renderTimeMs: number | null;
  renderUvPreview: (canvas: HTMLCanvasElement) => Promise<void>;
};

export const useDitherStore = create<DitherState>((set) => ({
  previewStatus: "idle",
  renderTimeMs: null,
  renderUvPreview: async (canvas) => {
    set({
      previewStatus: "running",
      renderTimeMs: null,
    });

    try {
      let start = performance.now();
      await runUvComputePipeline(canvas);
      let end = performance.now();
      set({
        previewStatus: "ready",
        renderTimeMs: start - end
      });
    } catch (error) {
      set({
        previewStatus: "error",
        renderTimeMs: null
      });
    }
  },
}));
