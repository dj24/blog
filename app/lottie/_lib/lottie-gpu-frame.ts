import { match } from "ts-pattern";
import {
  createEmptyGpuCubicBezierSegment,
  createEmptyGpuShapeRecord,
  gpuPathTerminalFlags,
  gpuShapeKinds,
  type GpuCubicBezierSegment,
  type GpuShapeRecord,
} from "./gpu-shape-record";
import type { LottieComposition } from "./types/lottie-composition";
import type { LottieShapeLayer, LottieTransform } from "./types/lottie-layer";
import type {
  LottieBezierPathGeometry,
  LottieBezierPathGeometryKeyframeValue,
  LottieColor,
  LottieGradientStopValues,
  LottieKeyframe,
  LottieNumberProperty,
  LottieProperty,
  LottieVector2,
  LottieVector2Or3,
} from "./types/lottie-property";
import type {
  LottieEllipseShape,
  LottieFillShape,
  LottieGradientFillShape,
  LottiePathShape,
  LottieRectangleShape,
  LottieShapeGroup,
  LottieStrokeShape,
  LottieTransformShape,
} from "./types/lottie-shape";

type Matrix2d = readonly [number, number, number, number, number, number];

type Paint = {
  color: LottieColor;
  opacity: number;
};

type Stroke = Paint & {
  width: number;
  lineCap: number;
  lineJoin: number;
  miterLimit: number;
  blendMode: number;
};

type ShapeStyle = {
  fill: Paint | null;
  stroke: Stroke | null;
};

type WalkContext = {
  matrix: Matrix2d;
  opacity: number;
  style: ShapeStyle;
};

type ShapeItemWithType = {
  ty: string;
};

export type LottieGpuFrame = {
  compositionWidth: number;
  compositionHeight: number;
  shapeRecords: GpuShapeRecord[];
  cubicBezierSegments: GpuCubicBezierSegment[];
};

type FlattenedGpuShapeBuffers = {
  shapeRecords: GpuShapeRecord[];
  cubicBezierSegments: GpuCubicBezierSegment[];
};

const identityMatrix: Matrix2d = [1, 0, 0, 1, 0, 0];
const defaultPaint: Paint = {
  color: [0, 0, 0],
  opacity: 0,
};
const defaultLineCap = 1;
const defaultLineJoin = 1;
const defaultMiterLimit = 4;
const defaultBlendMode = 0;
const defaultBezierPathGeometry: LottieBezierPathGeometry = {
  c: false,
  v: [],
  i: [],
  o: [],
};
const cubicBezierEpsilon = 0.000001;
const cubicBezierIterations = 8;

const multiplyMatrices = (left: Matrix2d, right: Matrix2d): Matrix2d => {
  return [
    left[0] * right[0] + left[2] * right[1],
    left[1] * right[0] + left[3] * right[1],
    left[0] * right[2] + left[2] * right[3],
    left[1] * right[2] + left[3] * right[3],
    left[0] * right[4] + left[2] * right[5] + left[4],
    left[1] * right[4] + left[3] * right[5] + left[5],
  ];
};

const applyMatrix = (matrix: Matrix2d, point: LottieVector2): LottieVector2 => {
  return [
    matrix[0] * point[0] + matrix[2] * point[1] + matrix[4],
    matrix[1] * point[0] + matrix[3] * point[1] + matrix[5],
  ];
};

const transformMatrix = ({
  anchor,
  position,
  rotation,
  scale,
}: {
  anchor: LottieVector2;
  position: LottieVector2;
  rotation: number;
  scale: LottieVector2;
}): Matrix2d => {
  const angle = (rotation * Math.PI) / 180;
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  const scaleX = scale[0] / 100;
  const scaleY = scale[1] / 100;

  return [
    cosine * scaleX,
    sine * scaleX,
    -sine * scaleY,
    cosine * scaleY,
    position[0] - (cosine * scaleX * anchor[0] - sine * scaleY * anchor[1]),
    position[1] - (sine * scaleX * anchor[0] + cosine * scaleY * anchor[1]),
  ];
};

const matrixScaleX = (matrix: Matrix2d) => {
  return Math.hypot(matrix[0], matrix[1]);
};

const matrixScaleY = (matrix: Matrix2d) => {
  return Math.hypot(matrix[2], matrix[3]);
};

const matrixRotation = (matrix: Matrix2d) => {
  return (Math.atan2(matrix[1], matrix[0]) * 180) / Math.PI;
};

const hasShapeType = (item: unknown): item is ShapeItemWithType => {
  return typeof item === "object" && item !== null && "ty" in item && typeof item.ty === "string";
};

const clamp = (value: number, min: number, max: number) => {
  return Math.min(Math.max(value, min), max);
};

const cubicBezier = (a: number, b: number, c: number, d: number, t: number) => {
  const inverseT = 1 - t;

  return (
    inverseT * inverseT * inverseT * a +
    3 * inverseT * inverseT * t * b +
    3 * inverseT * t * t * c +
    t * t * t * d
  );
};

const cubicBezierDerivative = (a: number, b: number, c: number, d: number, t: number) => {
  const inverseT = 1 - t;

  return 3 * inverseT * inverseT * (b - a) + 6 * inverseT * t * (c - b) + 3 * t * t * (d - c);
};

const bezierComponentFrom = (value: number | number[] | undefined, fallback: number) => {
  if (typeof value === "number") {
    return value;
  }

  if (Array.isArray(value)) {
    return value[0] ?? fallback;
  }

  return fallback;
};

const cubicBezierProgress = ({
  x1,
  y1,
  x2,
  y2,
  progress,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  progress: number;
}) => {
  let lower = 0;
  let upper = 1;
  let t = clamp(progress, 0, 1);

  for (let iteration = 0; iteration < cubicBezierIterations; iteration += 1) {
    const slope = cubicBezierDerivative(0, x1, x2, 1, t);

    if (Math.abs(slope) < cubicBezierEpsilon) {
      break;
    }

    const x = cubicBezier(0, x1, x2, 1, t) - progress;

    if (Math.abs(x) < cubicBezierEpsilon) {
      return clamp(cubicBezier(0, y1, y2, 1, t), 0, 1);
    }

    t -= x / slope;
  }

  t = clamp(t, 0, 1);

  for (let iteration = 0; iteration < cubicBezierIterations; iteration += 1) {
    const x = cubicBezier(0, x1, x2, 1, t);

    if (Math.abs(x - progress) < cubicBezierEpsilon) {
      break;
    }

    if (x < progress) {
      lower = t;
    } else {
      upper = t;
    }

    t = (lower + upper) / 2;
  }

  return clamp(cubicBezier(0, y1, y2, 1, t), 0, 1);
};

const isNumberArray = (value: unknown): value is number[] => {
  return Array.isArray(value) && value.every((item) => typeof item === "number");
};

const isVector2 = (value: unknown): value is LottieVector2 => {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === "number" &&
    typeof value[1] === "number"
  );
};

const isBezierPathGeometry = (value: unknown): value is LottieBezierPathGeometry => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<LottieBezierPathGeometry>;

  return (
    typeof candidate.c === "boolean" &&
    Array.isArray(candidate.v) &&
    Array.isArray(candidate.i) &&
    Array.isArray(candidate.o) &&
    candidate.v.every(isVector2) &&
    candidate.i.every(isVector2) &&
    candidate.o.every(isVector2)
  );
};

const hasBezierPathGeometryValue = (
  value: unknown,
): value is LottieBezierPathGeometryKeyframeValue | LottieBezierPathGeometry => {
  return (
    isBezierPathGeometry(value) ||
    (Array.isArray(value) && value.length > 0 && isBezierPathGeometry(value[0]))
  );
};

const normalizeBezierPathGeometry = (
  value: LottieBezierPathGeometryKeyframeValue | LottieBezierPathGeometry | undefined,
): LottieBezierPathGeometry => {
  if (hasBezierPathGeometryValue(value)) {
    return Array.isArray(value) ? value[0] : value;
  }

  return defaultBezierPathGeometry;
};

const interpolateNumber = (from: number, to: number, progress: number) => {
  return from + (to - from) * progress;
};

const interpolateArray = <TValue extends number[]>(from: TValue, to: TValue, progress: number) => {
  return from.map((value, index) =>
    interpolateNumber(value, to[index] ?? value, progress),
  ) as TValue;
};

const interpolateVector2Array = (
  from: readonly LottieVector2[],
  to: readonly LottieVector2[],
  progress: number,
) => {
  return from.map((value, index) => {
    const target = to[index] ?? value;

    return [
      interpolateNumber(value[0], target[0], progress),
      interpolateNumber(value[1], target[1], progress),
    ] as LottieVector2;
  });
};

const interpolateBezierPathGeometry = (
  fromValue: LottieBezierPathGeometryKeyframeValue | LottieBezierPathGeometry,
  toValue: LottieBezierPathGeometryKeyframeValue | LottieBezierPathGeometry,
  progress: number,
): LottieBezierPathGeometry => {
  const from = normalizeBezierPathGeometry(fromValue);
  const to = normalizeBezierPathGeometry(toValue);
  const matchingPointCounts =
    from.v.length === to.v.length && from.i.length === to.i.length && from.o.length === to.o.length;

  if (!matchingPointCounts) {
    return from;
  }

  return {
    c: from.c,
    v: interpolateVector2Array(from.v, to.v, progress),
    i: interpolateVector2Array(from.i, to.i, progress),
    o: interpolateVector2Array(from.o, to.o, progress),
  };
};

const interpolateValue = <TValue>(from: TValue, to: TValue, progress: number): TValue => {
  if (hasBezierPathGeometryValue(from) && hasBezierPathGeometryValue(to)) {
    return interpolateBezierPathGeometry(from, to, progress) as TValue;
  }

  if (typeof from === "number" && typeof to === "number") {
    return interpolateNumber(from, to, progress) as TValue;
  }

  if (isNumberArray(from) && isNumberArray(to)) {
    if (from.length !== to.length) {
      return from;
    }

    return interpolateArray(from, to, progress) as TValue;
  }

  return from;
};

const easingProgressFrom = <TValue>(
  keyframe: LottieKeyframe<TValue, Record<string, unknown>>,
  progress: number,
) => {
  const x1 = bezierComponentFrom(keyframe.o?.x, 0);
  const y1 = bezierComponentFrom(keyframe.o?.y, 0);
  const x2 = bezierComponentFrom(keyframe.i?.x, 1);
  const y2 = bezierComponentFrom(keyframe.i?.y, 1);

  return cubicBezierProgress({
    x1: clamp(x1, 0, 1),
    y1,
    x2: clamp(x2, 0, 1),
    y2,
    progress: clamp(progress, 0, 1),
  });
};

const evaluateProperty = <TValue>(
  property: LottieProperty<TValue> | undefined,
  frame: number,
): TValue | undefined => {
  if (!property) {
    return undefined;
  }

  if (property.a === 0) {
    return property.k;
  }

  const firstKeyframe = property.k[0];

  if (!firstKeyframe) {
    return undefined;
  }

  if (frame < firstKeyframe.t) {
    return firstKeyframe.s;
  }

  for (let index = 0; index < property.k.length; index += 1) {
    const keyframe = property.k[index];
    const nextKeyframe = property.k[index + 1];
    const finalValue = keyframe.e ?? nextKeyframe?.s ?? keyframe.s;

    if (!nextKeyframe) {
      return finalValue;
    }

    if (frame < nextKeyframe.t) {
      if (keyframe.h) {
        return keyframe.s;
      }

      const segmentDuration = nextKeyframe.t - keyframe.t;

      if (segmentDuration <= 0) {
        return finalValue;
      }

      const linearProgress = clamp((frame - keyframe.t) / segmentDuration, 0, 1);
      const easedProgress = easingProgressFrom(keyframe, linearProgress);

      return interpolateValue(keyframe.s, finalValue, easedProgress);
    }
  }

  return firstKeyframe.s;
};

const vector2From = (
  value: LottieVector2Or3 | undefined,
  fallback: LottieVector2,
): LottieVector2 => {
  if (!value) {
    return fallback;
  }

  return [value[0], value[1]];
};

const numberFrom = (
  property: LottieNumberProperty | undefined,
  frame: number,
  fallback: number,
) => {
  return evaluateProperty(property, frame) ?? fallback;
};

const vector2PropertyFrom = (
  property: LottieProperty<LottieVector2, Record<string, unknown>> | undefined,
  frame: number,
  fallback: LottieVector2,
) => {
  return evaluateProperty(property, frame) ?? fallback;
};

const vector2Or3PropertyFrom = (
  property: LottieProperty<LottieVector2Or3, Record<string, unknown>> | undefined,
  frame: number,
  fallback: LottieVector2,
) => {
  return vector2From(evaluateProperty(property, frame), fallback);
};

const transformFromLayer = (transform: LottieTransform | undefined, frame: number) => {
  return {
    anchor: vector2Or3PropertyFrom(transform?.a, frame, [0, 0]),
    position: vector2Or3PropertyFrom(transform?.p, frame, [0, 0]),
    rotation: numberFrom(transform?.r, frame, 0),
    scale: vector2Or3PropertyFrom(transform?.s, frame, [100, 100]),
    opacity: numberFrom(transform?.o, frame, 100) / 100,
  };
};

const transformFromShape = (shape: LottieTransformShape | undefined, frame: number) => {
  return {
    anchor: vector2PropertyFrom(shape?.a, frame, [0, 0]),
    position: vector2PropertyFrom(shape?.p, frame, [0, 0]),
    rotation: numberFrom(shape?.r, frame, 0),
    scale: vector2PropertyFrom(shape?.s, frame, [100, 100]),
    opacity: numberFrom(shape?.o, frame, 100) / 100,
  };
};

const createContextWithTransform = (
  context: WalkContext,
  transform: LottieTransformShape | undefined,
  frame: number,
) => {
  const resolved = transformFromShape(transform, frame);

  return {
    ...context,
    matrix: multiplyMatrices(context.matrix, transformMatrix(resolved)),
    opacity: context.opacity * resolved.opacity,
  };
};

const firstGradientColor = (stops: LottieGradientStopValues): LottieColor => {
  return [stops[1] ?? 1, stops[2] ?? 1, stops[3] ?? 1];
};

const emptyFlattenedGpuShapeBuffers = (): FlattenedGpuShapeBuffers => {
  return {
    shapeRecords: [],
    cubicBezierSegments: [],
  };
};

const mergeFlattenedGpuShapeBuffers = (
  frames: readonly FlattenedGpuShapeBuffers[],
): FlattenedGpuShapeBuffers => {
  return frames.reduce<FlattenedGpuShapeBuffers>((accumulator, frame) => {
    return {
      shapeRecords: [...accumulator.shapeRecords, ...frame.shapeRecords],
      cubicBezierSegments: [
        ...accumulator.cubicBezierSegments,
        ...frame.cubicBezierSegments,
      ],
    };
  }, emptyFlattenedGpuShapeBuffers());
};

const fillFromItem = (item: LottieFillShape | LottieGradientFillShape, frame: number): Paint => {
  return match(item)
    .with({ ty: "fl" }, (fill) => {
      return {
        color: evaluateProperty(fill.c, frame) ?? defaultPaint.color,
        opacity: numberFrom(fill.o, frame, 100) / 100,
      };
    })
    .with({ ty: "gf" }, (fill) => {
      return {
        color: firstGradientColor(evaluateProperty(fill.g.k, frame) ?? []),
        opacity: numberFrom(fill.o, frame, 100) / 100,
      };
    })
    .exhaustive();
};

const strokeFromItem = (item: LottieStrokeShape, frame: number): Stroke => {
  return {
    color: evaluateProperty(item.c, frame) ?? defaultPaint.color,
    opacity: numberFrom(item.o, frame, 100) / 100,
    width: numberFrom(item.w, frame, 0),
    lineCap: item.lc ?? defaultLineCap,
    lineJoin: item.lj ?? defaultLineJoin,
    miterLimit: item.ml ?? defaultMiterLimit,
    blendMode: item.bm ?? defaultBlendMode,
  };
};

const bezierPathGeometryFrom = (
  shape: LottiePathShape,
  frame: number,
): LottieBezierPathGeometry => {
  return normalizeBezierPathGeometry(evaluateProperty(shape.ks, frame));
};

const createCubicBezierSegment = (
  p0: LottieVector2,
  c1: LottieVector2,
  c2: LottieVector2,
  p3: LottieVector2,
): GpuCubicBezierSegment => {
  const segment = createEmptyGpuCubicBezierSegment();

  segment.p0X = p0[0];
  segment.p0Y = p0[1];
  segment.c1X = c1[0];
  segment.c1Y = c1[1];
  segment.c2X = c2[0];
  segment.c2Y = c2[1];
  segment.p3X = p3[0];
  segment.p3Y = p3[1];

  return segment;
};

const boundsFromPoints = (points: readonly LottieVector2[]) => {
  return points.reduce(
    (accumulator, point) => {
      return {
        minX: Math.min(accumulator.minX, point[0]),
        minY: Math.min(accumulator.minY, point[1]),
        maxX: Math.max(accumulator.maxX, point[0]),
        maxY: Math.max(accumulator.maxY, point[1]),
      };
    },
    {
      minX: Number.POSITIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY,
    },
  );
};

const cubicSegmentsFromGeometry = (geometry: LottieBezierPathGeometry) => {
  const pointCount = geometry.v.length;

  if (pointCount < 2 || geometry.i.length !== pointCount || geometry.o.length !== pointCount) {
    return [];
  }

  const lastOpenIndex = geometry.c ? pointCount : pointCount - 1;

  return Array.from({ length: lastOpenIndex }, (_, index) => {
    const nextIndex = (index + 1) % pointCount;
    const p0 = geometry.v[index] ?? [0, 0];
    const p3 = geometry.v[nextIndex] ?? [0, 0];
    const outgoing = geometry.o[index] ?? [0, 0];
    const incoming = geometry.i[nextIndex] ?? [0, 0];
    const c1: LottieVector2 = [p0[0] + outgoing[0], p0[1] + outgoing[1]];
    const c2: LottieVector2 = [p3[0] + incoming[0], p3[1] + incoming[1]];

    return { p0, c1, c2, p3 };
  });
};

const groupTransform = (group: LottieShapeGroup) => {
  return group.it.find((item): item is LottieTransformShape => {
    return hasShapeType(item) && item.ty === "tr";
  });
};

const groupStyle = (group: LottieShapeGroup, frame: number, inheritedStyle: ShapeStyle) => {
  return group.it.reduce<ShapeStyle>((style, item) => {
    if (!hasShapeType(item)) {
      return style;
    }

    if (item.ty === "fl" || item.ty === "gf") {
      const fillItem = item as LottieFillShape | LottieGradientFillShape;

      return {
        ...style,
        fill: fillFromItem(fillItem, frame),
      };
    }

    if (item.ty === "st") {
      const strokeItem = item as LottieStrokeShape;

      return {
        ...style,
        stroke: strokeFromItem(strokeItem, frame),
      };
    }

    return style;
  }, inheritedStyle);
};

const createBaseRecord = ({
  context,
  id,
  position,
}: {
  context: WalkContext;
  id: number;
  position: LottieVector2;
}) => {
  const record = createEmptyGpuShapeRecord();
  const transformedPosition = applyMatrix(context.matrix, position);
  const fill = context.style.fill ?? defaultPaint;
  const stroke = context.style.stroke;

  record.id = id;
  record.positionX = transformedPosition[0];
  record.positionY = transformedPosition[1];
  record.scaleX = matrixScaleX(context.matrix);
  record.scaleY = matrixScaleY(context.matrix);
  record.rotation = matrixRotation(context.matrix);
  record.opacity = context.opacity;
  record.fillRed = fill.color[0];
  record.fillGreen = fill.color[1];
  record.fillBlue = fill.color[2];
  record.fillAlpha = fill.opacity;
  record.strokeRed = stroke?.color[0] ?? 0;
  record.strokeGreen = stroke?.color[1] ?? 0;
  record.strokeBlue = stroke?.color[2] ?? 0;
  record.strokeAlpha = stroke?.opacity ?? 0;
  record.strokeWidth = stroke?.width ?? 0;
  record.strokeMiterLimit = stroke?.miterLimit ?? defaultMiterLimit;
  record.strokeLineCap = stroke?.lineCap ?? defaultLineCap;
  record.strokeLineJoin = stroke?.lineJoin ?? defaultLineJoin;
  record.strokeBlendMode = stroke?.blendMode ?? defaultBlendMode;

  return record;
};

const rectangleRecordFromShape = (
  shape: LottieRectangleShape,
  context: WalkContext,
  frame: number,
  id: number,
) => {
  const size = vector2PropertyFrom(shape.s, frame, [0, 0]);
  const position = vector2PropertyFrom(shape.p, frame, [0, 0]);
  const record = createBaseRecord({ context, id, position });

  record.kind = gpuShapeKinds.rectangle;
  record.width = size[0];
  record.height = size[1];
  record.cornerRadius = numberFrom(shape.r, frame, 0);
  record.boundsMinX = -size[0] / 2;
  record.boundsMinY = -size[1] / 2;
  record.boundsMaxX = size[0] / 2;
  record.boundsMaxY = size[1] / 2;

  return record;
};

const ellipseRecordFromShape = (
  shape: LottieEllipseShape,
  context: WalkContext,
  frame: number,
  id: number,
) => {
  const size = vector2PropertyFrom(shape.s, frame, [0, 0]);
  const position = vector2PropertyFrom(shape.p, frame, [0, 0]);
  const record = createBaseRecord({ context, id, position });

  record.kind = gpuShapeKinds.ellipse;
  record.width = size[0];
  record.height = size[1];
  record.radiusX = size[0] / 2;
  record.radiusY = size[1] / 2;
  record.boundsMinX = -size[0] / 2;
  record.boundsMinY = -size[1] / 2;
  record.boundsMaxX = size[0] / 2;
  record.boundsMaxY = size[1] / 2;

  return record;
};

const pathRecordFromShape = (
  shape: LottiePathShape,
  context: WalkContext,
  frame: number,
  nextId: () => number,
  allocateSegmentOffset: (segmentCount: number) => number,
): FlattenedGpuShapeBuffers => {
  const geometry = bezierPathGeometryFrom(shape, frame);
  const segments = cubicSegmentsFromGeometry(geometry);

  if (segments.length === 0) {
    return emptyFlattenedGpuShapeBuffers();
  }

  const pathStroke = context.style.stroke;

  if (!pathStroke) {
    return emptyFlattenedGpuShapeBuffers();
  }

  const segmentOffset = allocateSegmentOffset(segments.length);
  const isOpenPath = !geometry.c;
  const segmentInstances = segments.map((segment, index) => {
    const uploadedPoints: readonly LottieVector2[] = [
      [segment.p0[0], -segment.p0[1]],
      [segment.c1[0], -segment.c1[1]],
      [segment.c2[0], -segment.c2[1]],
      [segment.p3[0], -segment.p3[1]],
    ];
    const bounds = boundsFromPoints(uploadedPoints);
    const center: LottieVector2 = [
      (bounds.minX + bounds.maxX) / 2,
      (bounds.minY + bounds.maxY) / 2,
    ];

    return {
      bounds,
      center,
      segmentIndex: segmentOffset + index,
      uploadedPoints,
    };
  });

  return {
    shapeRecords: segmentInstances.map((segmentInstance) => {
      const record = createBaseRecord({
        context: {
          ...context,
          style: {
            fill: null,
            stroke: pathStroke,
          },
        },
        id: nextId(),
        position: [segmentInstance.center[0], -segmentInstance.center[1]],
      });

      record.kind = gpuShapeKinds.path;
      record.flags =
        (isOpenPath && segmentInstance.segmentIndex === segmentOffset ? gpuPathTerminalFlags.start : 0) |
        (isOpenPath && segmentInstance.segmentIndex === segmentOffset + segments.length - 1
          ? gpuPathTerminalFlags.end
          : 0);
      record.pathIndex = segmentInstance.segmentIndex;
      record.width = pathStroke.width;
      record.boundsMinX = segmentInstance.bounds.minX - segmentInstance.center[0];
      record.boundsMinY = segmentInstance.bounds.minY - segmentInstance.center[1];
      record.boundsMaxX = segmentInstance.bounds.maxX - segmentInstance.center[0];
      record.boundsMaxY = segmentInstance.bounds.maxY - segmentInstance.center[1];

      return record;
    }),
    cubicBezierSegments: segmentInstances.map((segmentInstance) => {
      return createCubicBezierSegment(
        [
          segmentInstance.uploadedPoints[0][0] - segmentInstance.center[0],
          segmentInstance.uploadedPoints[0][1] - segmentInstance.center[1],
        ],
        [
          segmentInstance.uploadedPoints[1][0] - segmentInstance.center[0],
          segmentInstance.uploadedPoints[1][1] - segmentInstance.center[1],
        ],
        [
          segmentInstance.uploadedPoints[2][0] - segmentInstance.center[0],
          segmentInstance.uploadedPoints[2][1] - segmentInstance.center[1],
        ],
        [
          segmentInstance.uploadedPoints[3][0] - segmentInstance.center[0],
          segmentInstance.uploadedPoints[3][1] - segmentInstance.center[1],
        ],
      );
    }),
  };
};

const shapeRecordsFromItem = (
  item: unknown,
  context: WalkContext,
  frame: number,
  nextId: () => number,
  allocateSegmentOffset: (segmentCount: number) => number,
): FlattenedGpuShapeBuffers => {
  if (!hasShapeType(item)) {
    return emptyFlattenedGpuShapeBuffers();
  }

  if (item.ty === "gr") {
    const group = item as LottieShapeGroup;
    const groupContext = createContextWithTransform(
      { ...context, style: groupStyle(group, frame, context.style) },
      groupTransform(group),
      frame,
    );

    return mergeFlattenedGpuShapeBuffers(
      group.it.map((child) => {
        if (hasShapeType(child)) {
          if (child.ty === "tr" || child.ty === "fl" || child.ty === "gf" || child.ty === "st") {
            return emptyFlattenedGpuShapeBuffers();
          }
        }

        return shapeRecordsFromItem(child, groupContext, frame, nextId, allocateSegmentOffset);
      }),
    );
  }

  if (item.ty === "rc") {
    return {
      shapeRecords: [
        rectangleRecordFromShape(item as LottieRectangleShape, context, frame, nextId()),
      ],
      cubicBezierSegments: [],
    };
  }

  if (item.ty === "el") {
    return {
      shapeRecords: [ellipseRecordFromShape(item as LottieEllipseShape, context, frame, nextId())],
      cubicBezierSegments: [],
    };
  }

  if (item.ty === "sh") {
    return pathRecordFromShape(
      item as LottiePathShape,
      context,
      frame,
      nextId,
      allocateSegmentOffset,
    );
  }

  return emptyFlattenedGpuShapeBuffers();
};

const isShapeLayer = (layer: unknown): layer is LottieShapeLayer => {
  return typeof layer === "object" && layer !== null && "ty" in layer && layer.ty === 4;
};

const layerIsVisible = (layer: LottieShapeLayer, frame: number) => {
  return (
    frame >= (layer.ip ?? Number.NEGATIVE_INFINITY) &&
    frame < (layer.op ?? Number.POSITIVE_INFINITY)
  );
};

const contextFromLayer = (layer: LottieShapeLayer, frame: number): WalkContext => {
  const resolved = transformFromLayer(layer.ks, frame);

  return {
    matrix: multiplyMatrices(identityMatrix, transformMatrix(resolved)),
    opacity: resolved.opacity,
    style: {
      fill: null,
      stroke: null,
    },
  };
};

export const createLottieGpuFrame = (
  composition: LottieComposition,
  frame = composition.ip,
): LottieGpuFrame => {
  let id = 0;
  let cubicBezierSegmentIndex = 0;
  const nextId = () => {
    const currentId = id;

    id += 1;

    return currentId;
  };
  const allocateSegmentOffset = (segmentCount: number) => {
    const currentSegmentOffset = cubicBezierSegmentIndex;

    cubicBezierSegmentIndex += segmentCount;

    return currentSegmentOffset;
  };

  const flattened = mergeFlattenedGpuShapeBuffers(
    composition.layers
      .filter(isShapeLayer)
      .filter((layer) => layerIsVisible(layer, frame))
      .map((layer) => {
        const context = contextFromLayer(layer, frame);

        return mergeFlattenedGpuShapeBuffers(
          layer.shapes.map((shape) =>
            shapeRecordsFromItem(shape, context, frame, nextId, allocateSegmentOffset),
          ),
        );
      }),
  );

  return {
    compositionWidth: composition.w,
    compositionHeight: composition.h,
    shapeRecords: flattened.shapeRecords,
    cubicBezierSegments: flattened.cubicBezierSegments,
  };
};
