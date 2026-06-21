import {
  getSizeAndAlignmentOfUnsizedArrayElement,
  makeShaderDataDefinitions,
  makeStructuredView,
  type StructuredView,
} from "webgpu-utils";

const gpuShaderStageGlobal = globalThis as typeof globalThis & {
  GPUShaderStage?: {
    COMPUTE: number;
    FRAGMENT: number;
    VERTEX: number;
  };
};

gpuShaderStageGlobal.GPUShaderStage ??= {
  VERTEX: 0x1,
  FRAGMENT: 0x2,
  COMPUTE: 0x4,
};

export const gpuShapeKinds = {
  rectangle: 1,
  ellipse: 2,
  polystar: 3,
  path: 4,
} as const;

export type GpuShapeRecord = {
  id: number;
  kind: number;
  flags: number;
  strokeLineCap: number;
  pathIndex: number;
  strokeLineJoin: number;
  strokeBlendMode: number;
  reserved0: number;
  positionX: number;
  positionY: number;
  strokeRed: number;
  strokeGreen: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  opacity: number;
  fillRed: number;
  fillGreen: number;
  fillBlue: number;
  fillAlpha: number;
  centerX: number;
  centerY: number;
  width: number;
  height: number;
  radiusX: number;
  radiusY: number;
  cornerRadius: number;
  strokeBlue: number;
  strokeAlpha: number;
  strokeWidth: number;
  strokeMiterLimit: number;
  starInnerRoundness: number;
  starOuterRoundness: number;
  starAngle: number;
  polygonMode: number;
  reserved1: number;
  twistAmount: number;
  twistCenterX: number;
  twistCenterY: number;
  puckerBloatAmount: number;
  zigZagAmplitude: number;
  zigZagFrequency: number;
  zigZagPoints: number;
  offsetAmount: number;
  trimStart: number;
  trimEnd: number;
  trimOffset: number;
  trimMode: number;
  mergeMode: number;
  repeaterCopies: number;
  repeaterOffset: number;
  reserved2: number;
  boundsMinX: number;
  boundsMinY: number;
  boundsMaxX: number;
  boundsMaxY: number;
};

export type GpuCubicBezierSegment = {
  p0X: number;
  p0Y: number;
  c1X: number;
  c1Y: number;
  c2X: number;
  c2Y: number;
  p3X: number;
  p3Y: number;
};

export const gpuShapeRecordWgsl = /* wgsl */ `
struct ShapeRecord {
  id: u32,
  kind: u32,
  flags: u32,
  strokeLineCap: u32,

  pathIndex: u32,
  strokeLineJoin: u32,
  strokeBlendMode: u32,
  reserved0: u32,

  positionX: f32,
  positionY: f32,
  strokeRed: f32,
  strokeGreen: f32,

  scaleX: f32,
  scaleY: f32,
  rotation: f32,
  opacity: f32,

  fillRed: f32,
  fillGreen: f32,
  fillBlue: f32,
  fillAlpha: f32,

  centerX: f32,
  centerY: f32,
  width: f32,
  height: f32,

  radiusX: f32,
  radiusY: f32,
  cornerRadius: f32,
  strokeBlue: f32,

  strokeAlpha: f32,
  strokeWidth: f32,
  strokeMiterLimit: f32,
  starInnerRoundness: f32,

  starOuterRoundness: f32,
  starAngle: f32,
  polygonMode: u32,
  reserved1: u32,

  twistAmount: f32,
  twistCenterX: f32,
  twistCenterY: f32,
  puckerBloatAmount: f32,

  zigZagAmplitude: f32,
  zigZagFrequency: f32,
  zigZagPoints: f32,
  offsetAmount: f32,

  trimStart: f32,
  trimEnd: f32,
  trimOffset: f32,
  trimMode: u32,

  mergeMode: u32,
  repeaterCopies: f32,
  repeaterOffset: f32,
  reserved2: u32,

  boundsMinX: f32,
  boundsMinY: f32,
  boundsMaxX: f32,
  boundsMaxY: f32,
};

@group(0) @binding(0) var<storage, read> shapeRecords: array<ShapeRecord>;
`;

export const gpuCubicBezierSegmentWgsl = /* wgsl */ `
struct CubicBezierSegment {
  p0X: f32,
  p0Y: f32,
  c1X: f32,
  c1Y: f32,
  c2X: f32,
  c2Y: f32,
  p3X: f32,
  p3Y: f32,
};

@group(0) @binding(2) var<storage, read> cubicBezierSegments: array<CubicBezierSegment>;
`;

const definitions = makeShaderDataDefinitions(gpuShapeRecordWgsl);
const storageDefinition = definitions.storages.shapeRecords;
const unsizedArrayElement = getSizeAndAlignmentOfUnsizedArrayElement(storageDefinition);
const cubicBezierDefinitions = makeShaderDataDefinitions(gpuCubicBezierSegmentWgsl);
const cubicBezierStorageDefinition = cubicBezierDefinitions.storages.cubicBezierSegments;
const cubicBezierUnsizedArrayElement = getSizeAndAlignmentOfUnsizedArrayElement(
  cubicBezierStorageDefinition,
);

export const gpuShapeRecordStrideInBytes = unsizedArrayElement.size;
export const gpuCubicBezierSegmentStrideInBytes = cubicBezierUnsizedArrayElement.size;

export type EncodedGpuShapeRecordBuffer = {
  arrayBuffer: ArrayBuffer;
  recordCount: number;
  strideInBytes: number;
  structuredView: StructuredView;
};

export type EncodedGpuCubicBezierSegmentBuffer = {
  arrayBuffer: ArrayBuffer;
  recordCount: number;
  strideInBytes: number;
  structuredView: StructuredView;
};

const gpuShapeRecordFieldLayout = [
  { field: "id", type: "u32" },
  { field: "kind", type: "u32" },
  { field: "flags", type: "u32" },
  { field: "strokeLineCap", type: "u32" },
  { field: "pathIndex", type: "u32" },
  { field: "strokeLineJoin", type: "u32" },
  { field: "strokeBlendMode", type: "u32" },
  { field: "reserved0", type: "u32" },
  { field: "positionX", type: "f32" },
  { field: "positionY", type: "f32" },
  { field: "strokeRed", type: "f32" },
  { field: "strokeGreen", type: "f32" },
  { field: "scaleX", type: "f32" },
  { field: "scaleY", type: "f32" },
  { field: "rotation", type: "f32" },
  { field: "opacity", type: "f32" },
  { field: "fillRed", type: "f32" },
  { field: "fillGreen", type: "f32" },
  { field: "fillBlue", type: "f32" },
  { field: "fillAlpha", type: "f32" },
  { field: "centerX", type: "f32" },
  { field: "centerY", type: "f32" },
  { field: "width", type: "f32" },
  { field: "height", type: "f32" },
  { field: "radiusX", type: "f32" },
  { field: "radiusY", type: "f32" },
  { field: "cornerRadius", type: "f32" },
  { field: "strokeBlue", type: "f32" },
  { field: "strokeAlpha", type: "f32" },
  { field: "strokeWidth", type: "f32" },
  { field: "strokeMiterLimit", type: "f32" },
  { field: "starInnerRoundness", type: "f32" },
  { field: "starOuterRoundness", type: "f32" },
  { field: "starAngle", type: "f32" },
  { field: "polygonMode", type: "u32" },
  { field: "reserved1", type: "u32" },
  { field: "twistAmount", type: "f32" },
  { field: "twistCenterX", type: "f32" },
  { field: "twistCenterY", type: "f32" },
  { field: "puckerBloatAmount", type: "f32" },
  { field: "zigZagAmplitude", type: "f32" },
  { field: "zigZagFrequency", type: "f32" },
  { field: "zigZagPoints", type: "f32" },
  { field: "offsetAmount", type: "f32" },
  { field: "trimStart", type: "f32" },
  { field: "trimEnd", type: "f32" },
  { field: "trimOffset", type: "f32" },
  { field: "trimMode", type: "u32" },
  { field: "mergeMode", type: "u32" },
  { field: "repeaterCopies", type: "f32" },
  { field: "repeaterOffset", type: "f32" },
  { field: "reserved2", type: "u32" },
  { field: "boundsMinX", type: "f32" },
  { field: "boundsMinY", type: "f32" },
  { field: "boundsMaxX", type: "f32" },
  { field: "boundsMaxY", type: "f32" },
] as const satisfies readonly {
  field: keyof GpuShapeRecord;
  type: "f32" | "u32";
}[];

const gpuCubicBezierSegmentFieldLayout = [
  { field: "p0X", type: "f32" },
  { field: "p0Y", type: "f32" },
  { field: "c1X", type: "f32" },
  { field: "c1Y", type: "f32" },
  { field: "c2X", type: "f32" },
  { field: "c2Y", type: "f32" },
  { field: "p3X", type: "f32" },
  { field: "p3Y", type: "f32" },
] as const satisfies readonly {
  field: keyof GpuCubicBezierSegment;
  type: "f32";
}[];

export const createEmptyGpuShapeRecord = (): GpuShapeRecord => {
  return {
    id: 0,
    kind: gpuShapeKinds.rectangle,
    flags: 0,
    strokeLineCap: 1,
    pathIndex: 0,
    strokeLineJoin: 1,
    strokeBlendMode: 0,
    reserved0: 0,
    positionX: 0,
    positionY: 0,
    strokeRed: 0,
    strokeGreen: 0,
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
    opacity: 1,
    fillRed: 1,
    fillGreen: 1,
    fillBlue: 1,
    fillAlpha: 1,
    centerX: 0,
    centerY: 0,
    width: 0,
    height: 0,
    radiusX: 0,
    radiusY: 0,
    cornerRadius: 0,
    strokeBlue: 0,
    strokeAlpha: 0,
    strokeWidth: 0,
    strokeMiterLimit: 4,
    starInnerRoundness: 0,
    starOuterRoundness: 0,
    starAngle: 0,
    polygonMode: 0,
    reserved1: 0,
    twistAmount: 0,
    twistCenterX: 0,
    twistCenterY: 0,
    puckerBloatAmount: 0,
    zigZagAmplitude: 0,
    zigZagFrequency: 0,
    zigZagPoints: 0,
    offsetAmount: 0,
    trimStart: 0,
    trimEnd: 1,
    trimOffset: 0,
    trimMode: 1,
    mergeMode: 0,
    repeaterCopies: 0,
    repeaterOffset: 0,
    reserved2: 0,
    boundsMinX: 0,
    boundsMinY: 0,
    boundsMaxX: 0,
    boundsMaxY: 0,
  };
};

export const createEmptyGpuCubicBezierSegment = (): GpuCubicBezierSegment => {
  return {
    p0X: 0,
    p0Y: 0,
    c1X: 0,
    c1Y: 0,
    c2X: 0,
    c2Y: 0,
    p3X: 0,
    p3Y: 0,
  };
};

export const createGpuShapeRecordStructuredView = (
  recordCount: number,
  arrayBuffer = new ArrayBuffer(recordCount * gpuShapeRecordStrideInBytes),
): StructuredView => {
  return makeStructuredView(storageDefinition, arrayBuffer);
};

export const createGpuCubicBezierSegmentStructuredView = (
  recordCount: number,
  arrayBuffer = new ArrayBuffer(recordCount * gpuCubicBezierSegmentStrideInBytes),
): StructuredView => {
  return makeStructuredView(cubicBezierStorageDefinition, arrayBuffer);
};

export const encodeGpuShapeRecords = (
  records: readonly GpuShapeRecord[],
): EncodedGpuShapeRecordBuffer => {
  const arrayBuffer = new ArrayBuffer(records.length * gpuShapeRecordStrideInBytes);
  const view = new DataView(arrayBuffer);

  records.forEach((record, recordIndex) => {
    let byteOffset = recordIndex * gpuShapeRecordStrideInBytes;

    gpuShapeRecordFieldLayout.forEach(({ field, type }) => {
      if (type === "u32") {
        view.setUint32(byteOffset, record[field], true);
      } else {
        view.setFloat32(byteOffset, record[field], true);
      }

      byteOffset += 4;
    });
  });

  const structuredView = createGpuShapeRecordStructuredView(records.length, arrayBuffer);

  console.log(structuredView.arrayBuffer.byteLength / 1024, "KB");

  return {
    arrayBuffer,
    recordCount: records.length,
    strideInBytes: gpuShapeRecordStrideInBytes,
    structuredView,
  };
};

export const encodeGpuCubicBezierSegments = (
  records: readonly GpuCubicBezierSegment[],
): EncodedGpuCubicBezierSegmentBuffer => {
  const arrayBuffer = new ArrayBuffer(records.length * gpuCubicBezierSegmentStrideInBytes);
  const view = new DataView(arrayBuffer);

  records.forEach((record, recordIndex) => {
    let byteOffset = recordIndex * gpuCubicBezierSegmentStrideInBytes;

    gpuCubicBezierSegmentFieldLayout.forEach(({ field }) => {
      view.setFloat32(byteOffset, record[field], true);
      byteOffset += 4;
    });
  });

  const structuredView = createGpuCubicBezierSegmentStructuredView(records.length, arrayBuffer);

  return {
    arrayBuffer,
    recordCount: records.length,
    strideInBytes: gpuCubicBezierSegmentStrideInBytes,
    structuredView,
  };
};
