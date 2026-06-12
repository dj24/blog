import { runMonochromaticPreviewComputePipeline } from "./run-monochromatic-preview-compute-pipeline";
import type { PreviewComputePipelineOptions } from "./preview-compute-pipeline-options";
import { runPolychromaticPreviewComputePipeline } from "./run-polychromatic-preview-compute-pipeline";

export type { PreviewComputePipelineOptions } from "./preview-compute-pipeline-options";

export const runPreviewComputePipeline = async (
  canvas: HTMLCanvasElement,
  options: PreviewComputePipelineOptions,
) => {
  if (options.type === "monochromatic") {
    await runMonochromaticPreviewComputePipeline(canvas, options);

    return;
  }

  await runPolychromaticPreviewComputePipeline(canvas, options);
};
