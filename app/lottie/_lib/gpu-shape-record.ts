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
  paintIndex: number;
  pathIndex: number;
  mergeNodeIndex: number;
  repeaterGroupIndex: number;
  reserved0: number;
  positionX: number;
  positionY: number;
  anchorX: number;
  anchorY: number;
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
  roundRadius: number;
  points: number;
  innerRadius: number;
  outerRadius: number;
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

export const gpuShapeRecordWgsl = /* wgsl */ `
struct ShapeRecord {
  id: u32,
  kind: u32,
  flags: u32,
  paintIndex: u32,

  pathIndex: u32,
  mergeNodeIndex: u32,
  repeaterGroupIndex: u32,
  reserved0: u32,

  positionX: f32,
  positionY: f32,
  anchorX: f32,
  anchorY: f32,

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
  roundRadius: f32,

  points: f32,
  innerRadius: f32,
  outerRadius: f32,
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

const definitions = makeShaderDataDefinitions(gpuShapeRecordWgsl);
const storageDefinition = definitions.storages.shapeRecords;
const unsizedArrayElement = getSizeAndAlignmentOfUnsizedArrayElement(storageDefinition);

export const gpuShapeRecordStrideInBytes = unsizedArrayElement.size;

export type EncodedGpuShapeRecordBuffer = {
  arrayBuffer: ArrayBuffer;
  recordCount: number;
  strideInBytes: number;
  structuredView: StructuredView;
};

const gpuShapeRecordFieldLayout = [
  { field: "id", type: "u32" },
  { field: "kind", type: "u32" },
  { field: "flags", type: "u32" },
  { field: "paintIndex", type: "u32" },
  { field: "pathIndex", type: "u32" },
  { field: "mergeNodeIndex", type: "u32" },
  { field: "repeaterGroupIndex", type: "u32" },
  { field: "reserved0", type: "u32" },
  { field: "positionX", type: "f32" },
  { field: "positionY", type: "f32" },
  { field: "anchorX", type: "f32" },
  { field: "anchorY", type: "f32" },
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
  { field: "roundRadius", type: "f32" },
  { field: "points", type: "f32" },
  { field: "innerRadius", type: "f32" },
  { field: "outerRadius", type: "f32" },
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

export const createEmptyGpuShapeRecord = (): GpuShapeRecord => {
  return {
    id: 0,
    kind: gpuShapeKinds.rectangle,
    flags: 0,
    paintIndex: 0,
    pathIndex: 0,
    mergeNodeIndex: 0,
    repeaterGroupIndex: 0,
    reserved0: 0,
    positionX: 0,
    positionY: 0,
    anchorX: 0,
    anchorY: 0,
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
    roundRadius: 0,
    points: 0,
    innerRadius: 0,
    outerRadius: 0,
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

export const createGpuShapeRecordStructuredView = (
  recordCount: number,
  arrayBuffer = new ArrayBuffer(recordCount * gpuShapeRecordStrideInBytes),
): StructuredView => {
  return makeStructuredView(storageDefinition, arrayBuffer);
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

  return {
    arrayBuffer,
    recordCount: records.length,
    strideInBytes: gpuShapeRecordStrideInBytes,
    structuredView,
  };
};
