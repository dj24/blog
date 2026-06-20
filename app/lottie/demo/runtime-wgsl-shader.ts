import invariant from "tiny-invariant";
import fullscreenTriangleSource from "./shaders/fullscreen_triangle.wgsl";
import mainSource from "./shaders/main.wgsl";
import sdfUtilsSource from "./shaders/sdf_utils.wgsl";
import uvGradientSource from "./shaders/uv_gradient.wgsl";

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

export const buildUvShaderSource = () => {
  const fullscreenTriangle = getRawShaderSource(
    fullscreenTriangleSource,
    "fullscreen_triangle.wgsl",
  );
  const sdfUtils = getRawShaderSource(sdfUtilsSource, "sdf_utils.wgsl");
  const uvGradient = getRawShaderSource(uvGradientSource, "uv_gradient.wgsl");
  const main = getRawShaderSource(mainSource, "main.wgsl");

  return `
${fullscreenTriangle}

${sdfUtils}

${uvGradient}

${main}
`.trim();
};
