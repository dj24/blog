import { z } from "zod";
import { lottieCompositionSchema } from "./lottie-composition";

export const dotLottieAnimationSchema = z
  .object({
    /** Animation identifier used to locate `animations/<id>.json` in the archive. */
    id: z.string(),
  })
  .catchall(z.unknown());

export type DotLottieAnimation = z.infer<typeof dotLottieAnimationSchema>;

export const dotLottieManifestSchema = z
  .object({
    /** dotLottie manifest schema version. */
    version: z.string(),
    /** Optional human-readable author name. */
    author: z.string().optional(),
    /** Optional tool identifier that generated the archive. */
    generator: z.string().optional(),
    /** List of animations packaged in the archive. */
    animations: z.array(dotLottieAnimationSchema),
  })
  .catchall(z.unknown());

export type DotLottieManifest = z.infer<typeof dotLottieManifestSchema>;

export const dotLottieArchiveSchema = z
  .object({
    /** Parsed manifest metadata from `manifest.json`. */
    manifest: dotLottieManifestSchema,
    /** Parsed animations keyed by animation id. */
    animations: z.record(z.string(), lottieCompositionSchema),
  })
  .catchall(z.unknown());

export type DotLottieArchive = z.infer<typeof dotLottieArchiveSchema>;
