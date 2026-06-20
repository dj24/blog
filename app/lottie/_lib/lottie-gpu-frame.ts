import { match } from "ts-pattern";
import {
  createEmptyGpuShapeRecord,
  gpuShapeKinds,
  type GpuShapeRecord,
} from "./gpu-shape-record";
import type { LottieComposition } from "./types/lottie-composition";
import type { LottieShapeLayer, LottieTransform } from "./types/lottie-layer";
import type {
  LottieColor,
  LottieGradientStopValues,
  LottieNumberProperty,
  LottieProperty,
  LottieVector2,
  LottieVector2Or3,
} from "./types/lottie-property";
import type {
  LottieEllipseShape,
  LottieFillShape,
  LottieGradientFillShape,
  LottieRectangleShape,
  LottieShapeGroup,
  LottieTransformShape,
} from "./types/lottie-shape";

type Matrix2d = readonly [number, number, number, number, number, number];

type Paint = {
  color: LottieColor;
  opacity: number;
};

type WalkContext = {
  matrix: Matrix2d;
  opacity: number;
  paint: Paint | null;
};

type ShapeItemWithType = {
  ty: string;
};

export type LottieGpuFrame = {
  compositionWidth: number;
  compositionHeight: number;
  shapeRecords: GpuShapeRecord[];
};

const identityMatrix: Matrix2d = [1, 0, 0, 1, 0, 0];
const defaultPaint: Paint = {
  color: [1, 1, 1],
  opacity: 1,
};

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

const evaluateProperty = <TValue>(
  property: LottieProperty<TValue, Record<string, unknown>> | undefined,
  frame: number,
): TValue | undefined => {
  if (!property) {
    return undefined;
  }

  if (property.a === 0) {
    return property.k;
  }

  const keyframe =
    property.k
      .filter((candidate) => candidate.t <= frame)
      .at(-1) ?? property.k[0];

  return keyframe?.s;
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

const numberFrom = (property: LottieNumberProperty | undefined, frame: number, fallback: number) => {
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

const paintFromItem = (item: LottieFillShape | LottieGradientFillShape, frame: number): Paint => {
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

const groupTransform = (group: LottieShapeGroup) => {
  return group.it.find((item): item is LottieTransformShape => {
    return hasShapeType(item) && item.ty === "tr";
  });
};

const groupPaint = (group: LottieShapeGroup, frame: number, inheritedPaint: Paint | null) => {
  const paintItem = group.it.find(
    (item): item is LottieFillShape | LottieGradientFillShape =>
      hasShapeType(item) && (item.ty === "fl" || item.ty === "gf"),
  );

  return paintItem ? paintFromItem(paintItem, frame) : inheritedPaint;
};

const createBaseRecord = ({
  context,
  id,
  paint,
  position,
}: {
  context: WalkContext;
  id: number;
  paint: Paint;
  position: LottieVector2;
}) => {
  const record = createEmptyGpuShapeRecord();
  const transformedPosition = applyMatrix(context.matrix, position);

  record.id = id;
  record.positionX = transformedPosition[0];
  record.positionY = transformedPosition[1];
  record.scaleX = matrixScaleX(context.matrix);
  record.scaleY = matrixScaleY(context.matrix);
  record.rotation = matrixRotation(context.matrix);
  record.opacity = context.opacity;
  record.fillRed = paint.color[0];
  record.fillGreen = paint.color[1];
  record.fillBlue = paint.color[2];
  record.fillAlpha = paint.opacity;

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
  const paint = context.paint ?? defaultPaint;
  const record = createBaseRecord({ context, id, paint, position });

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
  const paint = context.paint ?? defaultPaint;
  const record = createBaseRecord({ context, id, paint, position });

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

const shapeRecordsFromItem = (
  item: unknown,
  context: WalkContext,
  frame: number,
  nextId: () => number,
): GpuShapeRecord[] => {
  if (!hasShapeType(item)) {
    return [];
  }

  if (item.ty === "gr") {
    const group = item as LottieShapeGroup;
    const groupContext = createContextWithTransform(
      { ...context, paint: groupPaint(group, frame, context.paint) },
      groupTransform(group),
      frame,
    );

    return group.it.flatMap((child) => {
      if (hasShapeType(child)) {
        if (child.ty === "tr" || child.ty === "fl" || child.ty === "gf") {
          return [];
        }
      }

      return shapeRecordsFromItem(child, groupContext, frame, nextId);
    });
  }

  if (item.ty === "rc") {
    return [rectangleRecordFromShape(item as LottieRectangleShape, context, frame, nextId())];
  }

  if (item.ty === "el") {
    return [ellipseRecordFromShape(item as LottieEllipseShape, context, frame, nextId())];
  }

  return [];
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
    paint: null,
  };
};

export const createLottieGpuFrame = (
  composition: LottieComposition,
  frame = composition.ip,
): LottieGpuFrame => {
  let id = 0;
  const nextId = () => {
    const currentId = id;

    id += 1;

    return currentId;
  };

  const shapeRecords = composition.layers
    .filter(isShapeLayer)
    .filter((layer) => layerIsVisible(layer, frame))
    .flatMap((layer) => {
      const context = contextFromLayer(layer, frame);

      return layer.shapes.flatMap((shape) => shapeRecordsFromItem(shape, context, frame, nextId));
    });

  return {
    compositionWidth: composition.w,
    compositionHeight: composition.h,
    shapeRecords,
  };
};
