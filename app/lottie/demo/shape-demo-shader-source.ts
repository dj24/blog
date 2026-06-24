import invariant from "tiny-invariant";
import {
  gpuCubicBezierSegmentWgsl,
  gpuGradientStopWgsl,
  gpuShapeRecordWgsl,
} from "../_lib/gpu-shape-record";
import mainSource from "./shaders/main.wgsl";
import sdfUtilsSource from "./shaders/sdf/utils.wgsl";
import sdfBoxSource from "./shaders/sdf/sd_box.wgsl";
import sdfRoundedBoxSource from "./shaders/sdf/sd_rounded_box.wgsl";
import sdfEllipseSource from "./shaders/sdf/sd_ellipse.wgsl";
import sdfStarSource from "./shaders/sdf/sd_star.wgsl";
import sdfCubicBezierSource from "./shaders/sdf/sd_cubic_bezier.wgsl";
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
  const sdfSources = [
    getRawShaderSource(sdfUtilsSource, "utils.wgsl"),
    getRawShaderSource(sdfBoxSource, "sd_box.wgsl"),
    getRawShaderSource(sdfRoundedBoxSource, "sd_rounded_box.wgsl"),
    getRawShaderSource(sdfEllipseSource, "sd_ellipse.wgsl"),
    getRawShaderSource(sdfStarSource, "sd_star.wgsl"),
    getRawShaderSource(sdfCubicBezierSource, "sd_cubic_bezier.wgsl"),
  ];
  const cubicBezierSegments = gpuCubicBezierSegmentWgsl;
  const gradientStops = gpuGradientStopWgsl;
  const shapeRender = getRawShaderSource(shapeRenderSource, "shape_render.wgsl");
  const main = getRawShaderSource(mainSource, "main.wgsl").replaceAll(
    "__RASTER_TARGET_FORMAT__",
    rasterTargetFormat,
  );

  return `
${sdfSources.join("\n\n")}

${gpuShapeRecordWgsl}

${cubicBezierSegments}

${gradientStops}

${shapeRender}

${main}
`.trim();
};
