import { z } from "zod";
import {
  lottieBezierPathGeometryPropertySchema,
  lottieColorPropertySchema,
  lottieGradientStopValuesPropertySchema,
  lottieNumberPropertySchema,
  lottieVector2PropertySchema,
} from "./lottie-property";

export const lottieShapeBaseSchema = z
  .object({
    /** Discriminator for the kind of shape item. */
    ty: z.string(),
  })
  .catchall(z.unknown());

export type LottieShapeBase = z.infer<typeof lottieShapeBaseSchema>;

export const lottieGradientColorsSchema = z
  .object({
    /** Number of color stop points encoded in `k`. */
    p: z.number(),
    /** Packed gradient stop values. */
    k: lottieGradientStopValuesPropertySchema,
  })
  .catchall(z.unknown());

export type LottieGradientColors = z.infer<typeof lottieGradientColorsSchema>;

export const lottieShapeItemSchema: z.ZodTypeAny = z.lazy(() =>
  z.discriminatedUnion("ty", [
    lottieShapeGroupSchema,
    lottiePathShapeSchema,
    lottieRectangleShapeSchema,
    lottieEllipseShapeSchema,
    lottiePolystarShapeSchema,
    lottieFillShapeSchema,
    lottieGradientFillShapeSchema,
    lottieStrokeShapeSchema,
    lottieGradientStrokeShapeSchema,
    lottieTrimPathShapeSchema,
    lottieTransformShapeSchema,
  ]),
);

export const lottieShapeGroupSchema = z
  .object({
    /** Group item type. */
    ty: z.literal("gr"),
    /** Ordered child items contained in this group. */
    it: z.array(lottieShapeItemSchema),
  })
  .catchall(z.unknown());

export type LottieShapeGroup = z.infer<typeof lottieShapeGroupSchema>;

export const lottiePathShapeSchema = z
  .object({
    /** Path item type. */
    ty: z.literal("sh"),
    /** Drawing direction metadata from the exporter. */
    d: z.number().optional(),
    /** Animated bezier path geometry. */
    ks: lottieBezierPathGeometryPropertySchema,
  })
  .catchall(z.unknown());

export type LottiePathShape = z.infer<typeof lottiePathShapeSchema>;

export const lottieRectangleShapeSchema = z
  .object({
    /** Rectangle item type. */
    ty: z.literal("rc"),
    /** Drawing direction metadata from the exporter. */
    d: z.number().optional(),
    /** Rectangle size. */
    s: lottieVector2PropertySchema,
    /** Rectangle position relative to the group origin. */
    p: lottieVector2PropertySchema,
    /** Rectangle corner radius. */
    r: lottieNumberPropertySchema,
  })
  .catchall(z.unknown());

export type LottieRectangleShape = z.infer<typeof lottieRectangleShapeSchema>;

export const lottieEllipseShapeSchema = z
  .object({
    /** Ellipse item type. */
    ty: z.literal("el"),
    /** Drawing direction metadata from the exporter. */
    d: z.number().optional(),
    /** Ellipse size. */
    s: lottieVector2PropertySchema,
    /** Ellipse position relative to the group origin. */
    p: lottieVector2PropertySchema,
  })
  .catchall(z.unknown());

export type LottieEllipseShape = z.infer<typeof lottieEllipseShapeSchema>;

export const lottiePolystarShapeSchema = z
  .object({
    /** Star or polygon item type. */
    ty: z.literal("sr"),
    /** Shape mode. Commonly `1` for star and `2` for polygon. */
    sy: z.number().optional(),
    /** Number of points on the star or polygon. */
    pt: lottieNumberPropertySchema,
    /** Position relative to the group origin. */
    p: lottieVector2PropertySchema,
    /** Outer radius. */
    or: lottieNumberPropertySchema,
    /** Outer roundness percentage. */
    os: lottieNumberPropertySchema,
    /** Rotation in degrees. */
    r: lottieNumberPropertySchema,
    /** Inner radius for star shapes. */
    ir: lottieNumberPropertySchema.optional(),
    /** Inner roundness percentage for star shapes. */
    is: lottieNumberPropertySchema.optional(),
  })
  .catchall(z.unknown());

export type LottiePolystarShape = z.infer<typeof lottiePolystarShapeSchema>;

export const lottieFillShapeSchema = z
  .object({
    /** Solid fill item type. */
    ty: z.literal("fl"),
    /** Fill color in normalized RGB values. */
    c: lottieColorPropertySchema,
    /** Fill opacity percentage. */
    o: lottieNumberPropertySchema,
    /** Fill rule used by the renderer. */
    r: z.number().optional(),
    /** Blend mode identifier. */
    bm: z.number().optional(),
  })
  .catchall(z.unknown());

export type LottieFillShape = z.infer<typeof lottieFillShapeSchema>;

export const lottieGradientFillShapeSchema = z
  .object({
    /** Gradient fill item type. */
    ty: z.literal("gf"),
    /** Fill opacity percentage. */
    o: lottieNumberPropertySchema,
    /** Fill rule used by the renderer. */
    r: z.number().optional(),
    /** Blend mode identifier. */
    bm: z.number().optional(),
    /** Encoded gradient color stops. */
    g: lottieGradientColorsSchema,
    /** Gradient start point. */
    s: lottieVector2PropertySchema,
    /** Gradient end point. */
    e: lottieVector2PropertySchema,
    /** Gradient kind, typically linear or radial. */
    t: z.number().optional(),
  })
  .catchall(z.unknown());

export type LottieGradientFillShape = z.infer<typeof lottieGradientFillShapeSchema>;

export const lottieStrokeShapeSchema = z
  .object({
    /** Stroke item type. */
    ty: z.literal("st"),
    /** Stroke color in normalized RGB values. */
    c: lottieColorPropertySchema,
    /** Stroke opacity percentage. */
    o: lottieNumberPropertySchema,
    /** Stroke width. */
    w: lottieNumberPropertySchema,
    /** Line cap style identifier. */
    lc: z.number().optional(),
    /** Line join style identifier. */
    lj: z.number().optional(),
    /** Miter limit used for sharp joins. */
    ml: z.number().optional(),
    /** Blend mode identifier. */
    bm: z.number().optional(),
  })
  .catchall(z.unknown());

export type LottieStrokeShape = z.infer<typeof lottieStrokeShapeSchema>;

export const lottieGradientStrokeShapeSchema = z
  .object({
    /** Gradient stroke item type. */
    ty: z.literal("gs"),
    /** Stroke opacity percentage. */
    o: lottieNumberPropertySchema,
    /** Stroke width. */
    w: lottieNumberPropertySchema,
    /** Encoded gradient color stops. */
    g: lottieGradientColorsSchema,
    /** Gradient start point. */
    s: lottieVector2PropertySchema,
    /** Gradient end point. */
    e: lottieVector2PropertySchema,
    /** Gradient kind, typically linear or radial. */
    t: z.number().optional(),
    /** Line cap style identifier. */
    lc: z.number().optional(),
    /** Line join style identifier. */
    lj: z.number().optional(),
    /** Miter limit used for sharp joins. */
    ml: z.number().optional(),
    /** Blend mode identifier. */
    bm: z.number().optional(),
  })
  .catchall(z.unknown());

export type LottieGradientStrokeShape = z.infer<typeof lottieGradientStrokeShapeSchema>;

export const lottieTrimPathShapeSchema = z
  .object({
    /** Trim paths item type. */
    ty: z.literal("tm"),
    /** Start percentage for the trimmed segment. */
    s: lottieNumberPropertySchema,
    /** End percentage for the trimmed segment. */
    e: lottieNumberPropertySchema,
    /** Offset applied to the trimmed segment. */
    o: lottieNumberPropertySchema,
    /** Trim mode identifier. */
    m: z.number().optional(),
  })
  .catchall(z.unknown());

export type LottieTrimPathShape = z.infer<typeof lottieTrimPathShapeSchema>;

export const lottieTransformShapeSchema = z
  .object({
    /** Shape-group transform item type. */
    ty: z.literal("tr"),
    /** Position relative to the parent group. */
    p: lottieVector2PropertySchema.optional(),
    /** Anchor point used for rotation and scale. */
    a: lottieVector2PropertySchema.optional(),
    /** Scale percentages. */
    s: lottieVector2PropertySchema.optional(),
    /** Rotation in degrees. */
    r: lottieNumberPropertySchema.optional(),
    /** Opacity percentage. */
    o: lottieNumberPropertySchema.optional(),
  })
  .catchall(z.unknown());

export type LottieTransformShape = z.infer<typeof lottieTransformShapeSchema>;

export const lottieUnknownShapeSchema = lottieShapeBaseSchema.catchall(z.unknown());

export type LottieUnknownShape = z.infer<typeof lottieUnknownShapeSchema>;

export type LottieShapeItem = z.infer<typeof lottieShapeItemSchema>;
