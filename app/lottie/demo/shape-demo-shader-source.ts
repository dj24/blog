import invariant from "tiny-invariant";
import {
  gpuCubicBezierSegmentWgsl,
  gpuShapeRecordWgsl,
} from "../_lib/gpu-shape-record";
import mainSource from "./shaders/main.wgsl";
import sdfUtilsSource from "./shaders/sdf_utils.wgsl";
import shapeRenderSource from "./shaders/shape_render.wgsl";

const getRawShaderSource = (source: unknown, label: string) => {
  if (typeof source === "string") {
    return source;
  }

  if (
    typeof source === "object" &&
    source !== null &&
    "default" in source &&
    typeof source.default === "string"
  ) {
    return source.default;
  }

  invariant(false, `${label} did not load as a raw string.`);
};

export const buildShapeDemoShaderSource = ({
  rasterTargetFormat,
}: {
  rasterTargetFormat: "bgra8unorm" | "rgba8unorm";
}) => {
  const sdfUtils = getRawShaderSource(sdfUtilsSource, "sdf_utils.wgsl");
  const cubicBezierSegments = gpuCubicBezierSegmentWgsl;
  const shapeRender = getRawShaderSource(shapeRenderSource, "shape_render.wgsl");
  const main = getRawShaderSource(mainSource, "main.wgsl").replaceAll(
    "__RASTER_TARGET_FORMAT__",
    rasterTargetFormat,
  );

  return `
${sdfUtils}

${gpuShapeRecordWgsl}

${cubicBezierSegments}

${shapeRender}

${main}
`.trim();
};
