import { z } from "zod";
import { lottieLayerSchema } from "./lottie-layer";

export const lottiePrecompAssetSchema = z
  .object({
    /** Asset identifier referenced by `refId` on precomp layers. */
    id: z.string(),
    /** Nested layers that make up the precomposition. */
    layers: z.array(lottieLayerSchema),
  })
  .catchall(z.unknown());

export type LottiePrecompAsset = z.infer<typeof lottiePrecompAssetSchema>;

export const lottieImageAssetSchema = z
  .object({
    /** Asset identifier referenced by `refId` on image layers. */
    id: z.string(),
    /** File name of the image asset. */
    p: z.string().optional(),
    /** Base directory or URL for the image file. */
    u: z.string().optional(),
    /** Embedded image flag used by some exporters. */
    e: z.number().optional(),
    /** Pixel width of the image asset. */
    w: z.number().optional(),
    /** Pixel height of the image asset. */
    h: z.number().optional(),
  })
  .catchall(z.unknown());

export type LottieImageAsset = z.infer<typeof lottieImageAssetSchema>;

export const lottieUnknownAssetSchema = z
  .object({
    /** Asset identifier for unmodeled asset entries. */
    id: z.string(),
  })
  .catchall(z.unknown());

export type LottieUnknownAsset = z.infer<typeof lottieUnknownAssetSchema>;

export const lottieAssetSchema = z.union([
  lottiePrecompAssetSchema,
  lottieImageAssetSchema,
  lottieUnknownAssetSchema,
]);

export type LottieAsset = z.infer<typeof lottieAssetSchema>;
