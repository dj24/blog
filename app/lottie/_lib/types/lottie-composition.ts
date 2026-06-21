import { z } from "zod";
import { lottieAssetSchema } from "./lottie-asset";
import { lottieLayerSchema } from "./lottie-layer";

export const lottieMarkerSchema = z
  .object({
    /** Marker comment or name. */
    cm: z.string(),
    /** Marker start time in frames. */
    tm: z.number(),
    /** Marker duration in frames. */
    dr: z.number(),
  })
  .catchall(z.unknown());

export type LottieMarker = z.infer<typeof lottieMarkerSchema>;

export const lottieSlotSchema = z
  .object({
    /** Property value applied to all matched `sid` references. */
    p: z.unknown(),
  })
  .catchall(z.unknown());

export type LottieSlot = z.infer<typeof lottieSlotSchema>;

export const lottieCompositionSchema = z
  .object({
    /** Human-readable composition name. */
    nm: z.string().optional(),
    /** Lottie specification version encoded as `MMmmpp`. */
    ver: z.number().int().optional(),
    /** Lottie/bodymovin schema version string. */
    v: z.string().optional(),
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
    /** Named timeline regions. */
    markers: z.array(lottieMarkerSchema).optional(),
    /** Slot values keyed by slot id. */
    slots: z.record(z.string(), lottieSlotSchema).optional(),
    /** Top-level layer stack for the composition. */
    layers: z.array(lottieLayerSchema),
  })
  .catchall(z.unknown());

export type LottieComposition = z.infer<typeof lottieCompositionSchema>;
