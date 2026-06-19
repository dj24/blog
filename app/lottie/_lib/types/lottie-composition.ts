import { z } from "zod";
import { lottieAssetSchema } from "./lottie-asset";
import { lottieLayerSchema } from "./lottie-layer";

export const lottieCompositionSchema = z
  .object({
    /** Lottie/bodymovin schema version string. */
    v: z.string(),
    /** Animation frame rate. */
    fr: z.number(),
    /** First frame in the composition timeline. */
    ip: z.number(),
    /** Frame after the composition ends. */
    op: z.number(),
    /** Composition width in pixels. */
    w: z.number(),
    /** Composition height in pixels. */
    h: z.number(),
    /** Whether the root composition enables 3D layers. */
    ddd: z.number().optional(),
    /** Reusable assets such as precomps and images. */
    assets: z.array(lottieAssetSchema).optional(),
    /** Top-level layer stack for the composition. */
    layers: z.array(lottieLayerSchema),
  })
  .catchall(z.unknown());

export type LottieComposition = z.infer<typeof lottieCompositionSchema>;
