import { z } from "zod";

export const lottieVector2Schema = z.tuple([z.number(), z.number()]);

export type LottieVector2 = z.infer<typeof lottieVector2Schema>;

export const lottieVector3Schema = z.tuple([z.number(), z.number(), z.number()]);

export type LottieVector3 = z.infer<typeof lottieVector3Schema>;

export const lottieColorSchema = z.tuple([z.number(), z.number(), z.number()]);

export type LottieColor = z.infer<typeof lottieColorSchema>;

export const lottieKeyframeBezierSchema = z
  .object({
    /** Outgoing easing handle values for a keyframe segment. */
    x: z.union([z.number(), z.array(z.number())]),
    /** Outgoing easing handle values for a keyframe segment. */
    y: z.union([z.number(), z.array(z.number())]),
  })
  .catchall(z.unknown());

export type LottieKeyframeBezier = z.infer<typeof lottieKeyframeBezierSchema>;

export const createLottieKeyframeSchema = <TValue extends z.ZodType>(valueSchema: TValue) => {
  return z
    .object({
      /** Frame index where this keyframe starts. */
      t: z.number(),
      /** Starting value used at this keyframe. */
      s: valueSchema,
      /** Optional ending value for the segment after this keyframe. */
      e: valueSchema.optional(),
      /** Incoming easing data for interpolation. */
      i: lottieKeyframeBezierSchema.optional(),
      /** Outgoing easing data for interpolation. */
      o: lottieKeyframeBezierSchema.optional(),
      /** Marks this keyframe as a hold instead of an interpolation. */
      h: z.number().optional(),
    })
    .catchall(z.unknown());
};

export const createLottieStaticPropertySchema = <TValue extends z.ZodType>(valueSchema: TValue) => {
  return z
    .object({
      /** Whether the property is animated. `0` means a static value. */
      a: z.literal(0),
      /** Static property value. */
      k: valueSchema,
      /** Internal property index emitted by the authoring tool. */
      ix: z.number().optional(),
    })
    .catchall(z.unknown());
};

export const createLottieAnimatedPropertySchema = <TValue extends z.ZodType>(
  valueSchema: TValue,
) => {
  return z
    .object({
      /** Whether the property is animated. `1` means keyframed. */
      a: z.literal(1),
      /** Ordered keyframes that drive this property over time. */
      k: z.array(createLottieKeyframeSchema(valueSchema)),
      /** Internal property index emitted by the authoring tool. */
      ix: z.number().optional(),
    })
    .catchall(z.unknown());
};

export const createLottiePropertySchema = <TValue extends z.ZodType>(valueSchema: TValue) => {
  return z.union([
    createLottieStaticPropertySchema(valueSchema),
    createLottieAnimatedPropertySchema(valueSchema),
  ]);
};

export const lottieGradientStopValuesSchema = z.array(z.number());

export type LottieGradientStopValues = z.infer<typeof lottieGradientStopValuesSchema>;

export const lottieBezierPathGeometrySchema = z
  .object({
    /** Whether the path closes back to its starting point. */
    c: z.boolean(),
    /** Absolute vertex positions for the bezier path. */
    v: z.array(lottieVector2Schema),
    /** Incoming tangent offsets for each vertex. */
    i: z.array(lottieVector2Schema),
    /** Outgoing tangent offsets for each vertex. */
    o: z.array(lottieVector2Schema),
  })
  .catchall(z.unknown());

export type LottieBezierPathGeometry = z.infer<typeof lottieBezierPathGeometrySchema>;

export const lottieNumberPropertySchema = createLottiePropertySchema(z.number());

export type LottieNumberProperty = z.infer<typeof lottieNumberPropertySchema>;

export const lottieVector2PropertySchema = createLottiePropertySchema(lottieVector2Schema);

export type LottieVector2Property = z.infer<typeof lottieVector2PropertySchema>;

export const lottieVector2Or3Schema = z.union([lottieVector2Schema, lottieVector3Schema]);

export type LottieVector2Or3 = z.infer<typeof lottieVector2Or3Schema>;

export const lottieVector2Or3PropertySchema = createLottiePropertySchema(lottieVector2Or3Schema);

export type LottieVector2Or3Property = z.infer<typeof lottieVector2Or3PropertySchema>;

export const lottieColorPropertySchema = createLottiePropertySchema(lottieColorSchema);

export type LottieColorProperty = z.infer<typeof lottieColorPropertySchema>;

export const lottieGradientStopValuesPropertySchema =
  createLottiePropertySchema(lottieGradientStopValuesSchema);

export type LottieGradientStopValuesProperty = z.infer<typeof lottieGradientStopValuesPropertySchema>;

export const lottieBezierPathGeometryPropertySchema =
  createLottiePropertySchema(lottieBezierPathGeometrySchema);

export type LottieBezierPathGeometryProperty = z.infer<typeof lottieBezierPathGeometryPropertySchema>;
