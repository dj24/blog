import { z } from "zod";
import { lottieShapeItemSchema } from "./lottie-shape";
import {
  lottieNumberPropertySchema,
  lottieVector2Or3PropertySchema,
} from "./lottie-property";

export const lottieTransformSchema = z
  .object({
    /** Opacity percentage. */
    o: lottieNumberPropertySchema.optional(),
    /** Position in 2D or 3D space. */
    p: lottieVector2Or3PropertySchema.optional(),
    /** Anchor point used for scale and rotation. */
    a: lottieVector2Or3PropertySchema.optional(),
    /** Scale percentages. */
    s: lottieVector2Or3PropertySchema.optional(),
    /** Rotation in degrees for 2D layers. */
    r: lottieNumberPropertySchema.optional(),
  })
  .catchall(z.unknown());

export type LottieTransform = z.infer<typeof lottieTransformSchema>;

export const lottieLayerBaseSchema = z
  .object({
    /** Whether this layer participates in 3D transforms. */
    ddd: z.number().optional(),
    /** Stable layer identifier used by parenting and mattes. */
    ind: z.number(),
    /** Discriminator for the kind of layer. */
    ty: z.number(),
    /** Time stretch factor. */
    sr: z.number().optional(),
    /** Layer transform bundle. */
    ks: lottieTransformSchema.optional(),
    /** Auto-orient flag for motion paths. */
    ao: z.number().optional(),
    /** Parent layer identifier. */
    parent: z.number().optional(),
    /** First frame where the layer is visible. */
    ip: z.number().optional(),
    /** Frame after the layer stops being visible. */
    op: z.number().optional(),
    /** Time offset applied to the layer. */
    st: z.number().optional(),
    /** Track matte mode applied to this layer. */
    tt: z.number().optional(),
    /** Marks this layer as a matte source for another layer. */
    td: z.number().optional(),
  })
  .catchall(z.unknown());

export type LottieLayerBase = z.infer<typeof lottieLayerBaseSchema>;

export const lottiePrecompLayerSchema = lottieLayerBaseSchema
  .extend({
    /** Precomposition layer type. */
    ty: z.literal(0),
    /** Asset identifier referenced from the composition `assets` array. */
    refId: z.string(),
    /** Referenced precomp width. */
    w: z.number().optional(),
    /** Referenced precomp height. */
    h: z.number().optional(),
  })
  .catchall(z.unknown());

export type LottiePrecompLayer = z.infer<typeof lottiePrecompLayerSchema>;

export const lottieSolidLayerSchema = lottieLayerBaseSchema
  .extend({
    /** Solid color layer type. */
    ty: z.literal(1),
    /** Solid width. */
    sw: z.number().optional(),
    /** Solid height. */
    sh: z.number().optional(),
    /** Solid color as a CSS-style string. */
    sc: z.string().optional(),
  })
  .catchall(z.unknown());

export type LottieSolidLayer = z.infer<typeof lottieSolidLayerSchema>;

export const lottieImageLayerSchema = lottieLayerBaseSchema
  .extend({
    /** Image layer type. */
    ty: z.literal(2),
    /** Asset identifier referenced from the composition `assets` array. */
    refId: z.string(),
  })
  .catchall(z.unknown());

export type LottieImageLayer = z.infer<typeof lottieImageLayerSchema>;

export const lottieNullLayerSchema = lottieLayerBaseSchema
  .extend({
    /** Null helper layer type. */
    ty: z.literal(3),
  })
  .catchall(z.unknown());

export type LottieNullLayer = z.infer<typeof lottieNullLayerSchema>;

export const lottieShapeLayerSchema = lottieLayerBaseSchema
  .extend({
    /** Shape layer type. */
    ty: z.literal(4),
    /** Drawing instructions for this layer. */
    shapes: z.array(lottieShapeItemSchema),
  })
  .catchall(z.unknown());

export type LottieShapeLayer = z.infer<typeof lottieShapeLayerSchema>;

export const lottieTextLayerSchema = lottieLayerBaseSchema
  .extend({
    /** Text layer type. */
    ty: z.literal(5),
    /** Text payload exported by the authoring tool. */
    t: z.unknown().optional(),
  })
  .catchall(z.unknown());

export type LottieTextLayer = z.infer<typeof lottieTextLayerSchema>;

export const lottieUnknownLayerSchema = lottieLayerBaseSchema.catchall(z.unknown());

export type LottieUnknownLayer = z.infer<typeof lottieUnknownLayerSchema>;

export const lottieLayerSchema: z.ZodTypeAny = z.lazy(() =>
  z.union([
    lottiePrecompLayerSchema,
    lottieSolidLayerSchema,
    lottieImageLayerSchema,
    lottieNullLayerSchema,
    lottieShapeLayerSchema,
    lottieTextLayerSchema,
    lottieUnknownLayerSchema,
  ]),
);

export type LottieLayer = z.infer<typeof lottieLayerSchema>;
