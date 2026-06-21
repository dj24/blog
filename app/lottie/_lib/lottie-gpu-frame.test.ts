import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { decompressDotLottieToJson, parseLottieJson } from "./dotlottie";
import {
  encodeGpuCubicBezierSegments,
  encodeGpuShapeRecords,
  gpuCubicBezierSegmentStrideInBytes,
  gpuPathTerminalFlags,
  gpuShapeRecordStrideInBytes,
  gpuShapeKinds,
} from "./gpu-shape-record";
import { createLottieGpuFrame } from "./lottie-gpu-frame";
import type { LottieComposition } from "./types/lottie-composition";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const assetsDirectory = path.join(currentDirectory, "..", "_assets");
const squareDotLottiePath = path.join(assetsDirectory, "square.lottie");
const tolerance = 0.0001;

const assertApproximatelyEqual = (actual: number, expected: number) => {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `Expected ${actual} to be approximately ${expected}.`,
  );
};

const loadSquareAnimation = async () => {
  return decompressDotLottieToJson(await readFile(squareDotLottiePath));
};

const findBlueSquare = (animation: LottieComposition, frameNumber: number) => {
  return createLottieGpuFrame(animation, frameNumber).shapeRecords.find((record) => {
    return (
      record.kind === gpuShapeKinds.rectangle &&
      Math.abs(record.fillBlue - 1) <= tolerance &&
      Math.abs(record.fillGreen - 0.15) <= tolerance
    );
  });
};

const holdKeyframeAnimation: LottieComposition = {
  v: "5.7.5",
  fr: 100,
  ip: 0,
  op: 20,
  w: 200,
  h: 200,
  layers: [
    {
      ddd: 0,
      ind: 1,
      ty: 4,
      ip: 0,
      op: 20,
      ks: {
        o: { a: 0, k: 100 },
      },
      shapes: [
        {
          ty: "gr",
          it: [
            {
              ty: "rc",
              s: { a: 0, k: [40, 40] },
              p: { a: 0, k: [0, 0] },
              r: { a: 0, k: 0 },
            },
            {
              ty: "fl",
              c: { a: 0, k: [0, 0.15, 1] },
              o: { a: 0, k: 100 },
            },
            {
              ty: "tr",
              p: {
                a: 1,
                k: [
                  { t: 0, s: [50, 50], h: 1 },
                  { t: 10, s: [150, 50] },
                ],
              },
            },
          ],
        },
      ],
    },
  ],
};

const createStaticPathAnimation = (closed: boolean): LottieComposition => {
  return {
    v: "5.7.5",
    fr: 60,
    ip: 0,
    op: 10,
    w: 200,
    h: 200,
    layers: [
      {
        ddd: 0,
        ind: 1,
        ty: 4,
        ip: 0,
        op: 10,
        ks: {
          o: { a: 0, k: 100 },
        },
        shapes: [
          {
            ty: "gr",
            it: [
              {
                ty: "sh",
                ks: {
                  a: 0,
                  k: {
                    c: closed,
                    v: [
                      [0, 0],
                      [40, 0],
                      [40, 40],
                    ],
                    i: [
                      [0, 0],
                      [-10, 0],
                      [0, -10],
                    ],
                    o: [
                      [10, 0],
                      [0, 10],
                      [0, 0],
                    ],
                  },
                },
              },
              {
                ty: "st",
                c: { a: 0, k: [0.2, 0.4, 0.8] },
                o: { a: 0, k: 100 },
                w: { a: 0, k: 10 },
              },
              {
                ty: "tr",
                p: { a: 0, k: [80, 80] },
                o: { a: 0, k: 100 },
              },
            ],
          },
        ],
      },
    ],
  };
};

const createRectangleWithSolidStrokeAnimation = (): LottieComposition => {
  return {
    v: "5.7.5",
    fr: 60,
    ip: 0,
    op: 10,
    w: 200,
    h: 200,
    layers: [
      {
        ddd: 0,
        ind: 1,
        ty: 4,
        ip: 0,
        op: 10,
        ks: {
          o: { a: 0, k: 100 },
        },
        shapes: [
          {
            ty: "gr",
            it: [
              {
                ty: "rc",
                s: { a: 0, k: [60, 40] },
                p: { a: 0, k: [0, 0] },
                r: { a: 0, k: 6 },
              },
              {
                ty: "fl",
                c: { a: 0, k: [0.1, 0.2, 0.3] },
                o: { a: 0, k: 80 },
              },
              {
                ty: "st",
                c: { a: 0, k: [0.9, 0.8, 0.7] },
                o: { a: 0, k: 60 },
                w: { a: 0, k: 12 },
                lc: 2,
                lj: 3,
                ml: 7,
                bm: 5,
              },
              {
                ty: "tr",
                p: { a: 0, k: [100, 90] },
                o: { a: 0, k: 100 },
              },
            ],
          },
        ],
      },
    ],
  };
};

const createStrokedPathAnimation = (): LottieComposition => {
  return {
    v: "5.7.5",
    fr: 60,
    ip: 0,
    op: 10,
    w: 200,
    h: 200,
    layers: [
      {
        ddd: 0,
        ind: 1,
        ty: 4,
        ip: 0,
        op: 10,
        ks: {
          o: { a: 0, k: 100 },
        },
        shapes: [
          {
            ty: "gr",
            it: [
              {
                ty: "sh",
                ks: {
                  a: 0,
                  k: {
                    c: false,
                    v: [
                      [0, 0],
                      [40, 0],
                    ],
                    i: [
                      [0, 0],
                      [0, 0],
                    ],
                    o: [
                      [0, 0],
                      [0, 0],
                    ],
                  },
                },
              },
              {
                ty: "st",
                c: { a: 0, k: [0.25, 0.5, 0.75] },
                o: { a: 0, k: 90 },
                w: { a: 0, k: 14 },
                lc: 3,
                lj: 2,
                ml: 9,
              },
              {
                ty: "tr",
                p: { a: 0, k: [80, 100] },
                o: { a: 0, k: 100 },
              },
            ],
          },
        ],
      },
    ],
  };
};

const animatedWrappedPathJson = JSON.stringify({
  v: "5.7.5",
  fr: 60,
  ip: 0,
  op: 20,
  w: 200,
  h: 200,
  layers: [
    {
      ddd: 0,
      ind: 1,
      ty: 4,
      ip: 0,
      op: 20,
      ks: {
        o: { a: 0, k: 100 },
      },
      shapes: [
        {
          ty: "gr",
          it: [
            {
              ty: "sh",
              ks: {
                a: 1,
                k: [
                  {
                    t: 0,
                    s: [
                      {
                        c: false,
                        v: [
                          [0, 0],
                          [40, 0],
                        ],
                        i: [
                          [0, 0],
                          [-10, 0],
                        ],
                        o: [
                          [10, 20],
                          [0, 0],
                        ],
                      },
                    ],
                    e: [
                      {
                        c: false,
                        v: [
                          [0, 10],
                          [40, 10],
                        ],
                        i: [
                          [0, 0],
                          [-10, -20],
                        ],
                        o: [
                          [10, 0],
                          [0, 0],
                        ],
                      },
                    ],
                  },
                  {
                    t: 10,
                    s: [
                      {
                        c: false,
                        v: [
                          [0, 10],
                          [40, 10],
                        ],
                        i: [
                          [0, 0],
                          [-10, -20],
                        ],
                        o: [
                          [10, 0],
                          [0, 0],
                        ],
                      },
                    ],
                  },
                ],
              },
            },
            {
              ty: "st",
              c: { a: 0, k: [0.2, 0.8, 0.4] },
              o: { a: 0, k: 100 },
              w: { a: 0, k: 10 },
            },
            {
              ty: "tr",
              p: { a: 0, k: [100, 100] },
              o: { a: 0, k: 100 },
            },
          ],
        },
      ],
    },
  ],
});

describe("Lottie GPU frame conversion", () => {
  test("converts supported first-frame square.lottie primitives to GPU shape records", async () => {
    const animation = await loadSquareAnimation();
    const frame = createLottieGpuFrame(animation, animation.ip);

    assert.equal(frame.compositionWidth, 640);
    assert.equal(frame.compositionHeight, 640);
    assert.equal(frame.shapeRecords.length, 4);
    assert.equal(frame.cubicBezierSegments.length, 1);
    assert.ok(frame.shapeRecords.some((record) => record.kind === gpuShapeKinds.ellipse));
    assert.ok(frame.shapeRecords.some((record) => record.kind === gpuShapeKinds.rectangle));
    assert.ok(frame.shapeRecords.some((record) => record.kind === gpuShapeKinds.path));
  });

  test("extracts the first-frame blue rounded square from square.lottie", async () => {
    const animation = await loadSquareAnimation();
    const blueSquare = findBlueSquare(animation, animation.ip);

    assert.ok(blueSquare);
    assertApproximatelyEqual(blueSquare.positionX, 320);
    assertApproximatelyEqual(blueSquare.positionY, 320);
    assertApproximatelyEqual(blueSquare.width, 100);
    assertApproximatelyEqual(blueSquare.height, 100);
    assertApproximatelyEqual(blueSquare.cornerRadius, 24);
  });

  test("interpolates the blue square position between keyframes", async () => {
    const animation = await loadSquareAnimation();
    const blueSquare = findBlueSquare(animation, 50);

    assert.ok(blueSquare);
    assert.equal(blueSquare.positionX, 320);
    assert.ok(blueSquare.positionY < 320);
    assert.ok(blueSquare.positionY > 150);
  });

  test("interpolates the blue square scale between keyframes", async () => {
    const animation = await loadSquareAnimation();
    const blueSquare = findBlueSquare(animation, 150);

    assert.ok(blueSquare);
    assert.ok(blueSquare.scaleX > 1);
    assert.ok(blueSquare.scaleX < 2);
    assert.ok(blueSquare.scaleY > 1);
    assert.ok(blueSquare.scaleY < 2);
  });

  test("preserves authored values at exact square keyframes", async () => {
    const animation = await loadSquareAnimation();
    const frameAtPositionKeyframe = findBlueSquare(animation, 100);
    const frameAtScaleKeyframe = findBlueSquare(animation, 200);

    assert.ok(frameAtPositionKeyframe);
    assert.ok(frameAtScaleKeyframe);
    assertApproximatelyEqual(frameAtPositionKeyframe.positionY, 150);
    assertApproximatelyEqual(frameAtPositionKeyframe.scaleX, 1);
    assertApproximatelyEqual(frameAtPositionKeyframe.scaleY, 1);
    assertApproximatelyEqual(frameAtScaleKeyframe.positionY, 150);
    assertApproximatelyEqual(frameAtScaleKeyframe.scaleX, 2);
    assertApproximatelyEqual(frameAtScaleKeyframe.scaleY, 2);
  });

  test("keeps hold keyframes stepped until the next keyframe", () => {
    const heldFrame = createLottieGpuFrame(holdKeyframeAnimation, 5);
    const switchedFrame = createLottieGpuFrame(holdKeyframeAnimation, 10);
    const heldSquare = heldFrame.shapeRecords.find((record) => record.kind === gpuShapeKinds.rectangle);
    const switchedSquare = switchedFrame.shapeRecords.find(
      (record) => record.kind === gpuShapeKinds.rectangle,
    );

    assert.ok(heldSquare);
    assert.ok(switchedSquare);
    assertApproximatelyEqual(heldSquare.positionX, 50);
    assertApproximatelyEqual(heldSquare.positionY, 50);
    assertApproximatelyEqual(switchedSquare.positionX, 150);
    assertApproximatelyEqual(switchedSquare.positionY, 50);
  });

  test("resolves frames before the first keyframe and after the last keyframe while visible", async () => {
    const animation = await loadSquareAnimation();
    const beforeFirstKeyframe = findBlueSquare(animation, animation.ip);
    const afterLastKeyframe = findBlueSquare(animation, animation.op);

    assert.ok(beforeFirstKeyframe);
    assert.ok(afterLastKeyframe);
    assertApproximatelyEqual(beforeFirstKeyframe.positionY, 320);
    assertApproximatelyEqual(beforeFirstKeyframe.scaleX, 1);
    assertApproximatelyEqual(beforeFirstKeyframe.scaleY, 1);
    assertApproximatelyEqual(afterLastKeyframe.positionY, 150);
    assertApproximatelyEqual(afterLastKeyframe.scaleX, 2);
    assertApproximatelyEqual(afterLastKeyframe.scaleY, 2);
  });

  test("flattens a closed static path into one shape per authored cubic segment", () => {
    const frame = createLottieGpuFrame(createStaticPathAnimation(true), 0);
    const pathShapes = frame.shapeRecords.filter((record) => record.kind === gpuShapeKinds.path);

    assert.equal(frame.shapeRecords.length, 3);
    assert.equal(frame.cubicBezierSegments.length, 3);
    assert.equal(pathShapes.length, 3);
    assert.deepEqual(
      pathShapes.map((record) => record.pathIndex),
      [0, 1, 2],
    );
    assert.ok(pathShapes.every((record) => record.flags === 0));
    assert.ok(pathShapes.every((record) => record.width === 10));
    assertApproximatelyEqual(pathShapes[0]?.positionX ?? 0, 100);
    assertApproximatelyEqual(pathShapes[0]?.positionY ?? 0, 80);
    assertApproximatelyEqual(pathShapes[0]?.boundsMinX ?? 0, -20);
    assertApproximatelyEqual(pathShapes[0]?.boundsMinY ?? 0, 0);
    assertApproximatelyEqual(pathShapes[0]?.boundsMaxX ?? 0, 20);
    assertApproximatelyEqual(pathShapes[0]?.boundsMaxY ?? 0, 0);
    assertApproximatelyEqual(frame.cubicBezierSegments[0]?.p0X ?? 0, -20);
    assertApproximatelyEqual(frame.cubicBezierSegments[0]?.p0Y ?? 0, 0);
    assertApproximatelyEqual(frame.cubicBezierSegments[0]?.c1X ?? 0, -10);
    assertApproximatelyEqual(frame.cubicBezierSegments[0]?.c2X ?? 0, 10);
    assertApproximatelyEqual(frame.cubicBezierSegments[0]?.p3X ?? 0, 20);
    assertApproximatelyEqual(frame.cubicBezierSegments[0]?.p3Y ?? 0, 0);
  });

  test("does not append a closing segment for open paths", () => {
    const frame = createLottieGpuFrame(createStaticPathAnimation(false), 0);
    const pathShapes = frame.shapeRecords.filter((record) => record.kind === gpuShapeKinds.path);

    assert.equal(frame.shapeRecords.length, 2);
    assert.equal(frame.cubicBezierSegments.length, 2);
    assert.equal(pathShapes.length, 2);
    assert.equal(pathShapes[0]?.flags, gpuPathTerminalFlags.start);
    assert.equal(pathShapes[1]?.flags, gpuPathTerminalFlags.end);
  });

  test("packs solid fill and solid stroke into the same rectangle record", () => {
    const frame = createLottieGpuFrame(createRectangleWithSolidStrokeAnimation(), 0);
    const rectangle = frame.shapeRecords.find((record) => record.kind === gpuShapeKinds.rectangle);

    assert.ok(rectangle);
    assertApproximatelyEqual(rectangle.positionX, 100);
    assertApproximatelyEqual(rectangle.positionY, 90);
    assertApproximatelyEqual(rectangle.fillRed, 0.1);
    assertApproximatelyEqual(rectangle.fillGreen, 0.2);
    assertApproximatelyEqual(rectangle.fillBlue, 0.3);
    assertApproximatelyEqual(rectangle.fillAlpha, 0.8);
    assertApproximatelyEqual(rectangle.strokeRed, 0.9);
    assertApproximatelyEqual(rectangle.strokeGreen, 0.8);
    assertApproximatelyEqual(rectangle.strokeBlue, 0.7);
    assertApproximatelyEqual(rectangle.strokeAlpha, 0.6);
    assertApproximatelyEqual(rectangle.strokeWidth, 12);
    assertApproximatelyEqual(rectangle.strokeMiterLimit, 7);
    assert.equal(rectangle.strokeLineCap, 2);
    assert.equal(rectangle.strokeLineJoin, 3);
    assert.equal(rectangle.strokeBlendMode, 5);
  });

  test("uses authored solid stroke data for path records", () => {
    const frame = createLottieGpuFrame(createStrokedPathAnimation(), 0);
    const pathRecord = frame.shapeRecords.find((record) => record.kind === gpuShapeKinds.path);

    assert.ok(pathRecord);
    assert.equal(
      pathRecord.flags,
      gpuPathTerminalFlags.start | gpuPathTerminalFlags.end,
    );
    assertApproximatelyEqual(pathRecord.width, 14);
    assertApproximatelyEqual(pathRecord.fillAlpha, 0);
    assertApproximatelyEqual(pathRecord.strokeRed, 0.25);
    assertApproximatelyEqual(pathRecord.strokeGreen, 0.5);
    assertApproximatelyEqual(pathRecord.strokeBlue, 0.75);
    assertApproximatelyEqual(pathRecord.strokeAlpha, 0.9);
    assertApproximatelyEqual(pathRecord.strokeWidth, 14);
    assertApproximatelyEqual(pathRecord.strokeMiterLimit, 9);
    assert.equal(pathRecord.strokeLineCap, 3);
    assert.equal(pathRecord.strokeLineJoin, 2);
  });

  test("encodes path segment shapes and cubic segments with the expected layout", () => {
    const frame = createLottieGpuFrame(createStaticPathAnimation(true), 0);
    const encodedShapeRecords = encodeGpuShapeRecords(frame.shapeRecords);
    const encodedSegments = encodeGpuCubicBezierSegments(frame.cubicBezierSegments);
    const shapeView = new DataView(encodedShapeRecords.arrayBuffer);
    const segmentView = new DataView(encodedSegments.arrayBuffer);

    assert.equal(encodedShapeRecords.recordCount, 3);
    assert.equal(encodedShapeRecords.strideInBytes, gpuShapeRecordStrideInBytes);
    assert.equal(shapeView.getUint32(8, true), 0);
    assert.equal(shapeView.getUint32(16, true), 0);
    assert.equal(shapeView.getUint32(gpuShapeRecordStrideInBytes + 16, true), 1);
    assert.equal(encodedSegments.recordCount, 3);
    assert.equal(encodedSegments.strideInBytes, gpuCubicBezierSegmentStrideInBytes);
    assertApproximatelyEqual(segmentView.getFloat32(0, true), -20);
    assertApproximatelyEqual(segmentView.getFloat32(4, true), 0);
    assertApproximatelyEqual(segmentView.getFloat32(8, true), -10);
    assertApproximatelyEqual(segmentView.getFloat32(12, true), 0);
    assertApproximatelyEqual(segmentView.getFloat32(16, true), 10);
    assertApproximatelyEqual(segmentView.getFloat32(20, true), 0);
    assertApproximatelyEqual(segmentView.getFloat32(24, true), 20);
    assertApproximatelyEqual(segmentView.getFloat32(28, true), 0);
  });

  test("encodes solid stroke payload into the GPU shape struct lanes", () => {
    const frame = createLottieGpuFrame(createRectangleWithSolidStrokeAnimation(), 0);
    const encodedShapeRecords = encodeGpuShapeRecords(frame.shapeRecords);
    const shapeView = new DataView(encodedShapeRecords.arrayBuffer);

    assert.equal(shapeView.getUint32(12, true), 2);
    assert.equal(shapeView.getUint32(20, true), 3);
    assert.equal(shapeView.getUint32(24, true), 5);
    assertApproximatelyEqual(shapeView.getFloat32(40, true), 0.9);
    assertApproximatelyEqual(shapeView.getFloat32(44, true), 0.8);
    assertApproximatelyEqual(shapeView.getFloat32(108, true), 0.7);
    assertApproximatelyEqual(shapeView.getFloat32(112, true), 0.6);
    assertApproximatelyEqual(shapeView.getFloat32(116, true), 12);
    assertApproximatelyEqual(shapeView.getFloat32(120, true), 7);
  });

  test("preserves authored cubic endpoints and handles after centering and y-flip", () => {
    const frame = createLottieGpuFrame(createStaticPathAnimation(false), 0);
    const firstSegment = frame.cubicBezierSegments[0];
    const secondSegment = frame.cubicBezierSegments[1];

    assert.ok(firstSegment);
    assert.ok(secondSegment);
    assertApproximatelyEqual(firstSegment.p0X, -20);
    assertApproximatelyEqual(firstSegment.p0Y, 0);
    assertApproximatelyEqual(firstSegment.p3X, 20);
    assertApproximatelyEqual(firstSegment.p3Y, 0);
    assertApproximatelyEqual(secondSegment.p0X, 0);
    assertApproximatelyEqual(secondSegment.p0Y, 20);
    assertApproximatelyEqual(secondSegment.p3X, 0);
    assertApproximatelyEqual(secondSegment.p3Y, -20);
  });

  test("parses and flattens animated wrapped path keyframes without blanking the frame", () => {
    const animation = parseLottieJson(animatedWrappedPathJson);
    const startFrame = createLottieGpuFrame(animation, 0);
    const midFrame = createLottieGpuFrame(animation, 5);
    const endFrame = createLottieGpuFrame(animation, 10);

    assert.equal(startFrame.shapeRecords.length, 1);
    assert.equal(midFrame.shapeRecords.length, 1);
    assert.equal(endFrame.shapeRecords.length, 1);
    assert.equal(
      startFrame.shapeRecords[0]?.flags,
      gpuPathTerminalFlags.start | gpuPathTerminalFlags.end,
    );
    assert.equal(
      midFrame.shapeRecords[0]?.flags,
      gpuPathTerminalFlags.start | gpuPathTerminalFlags.end,
    );
    assert.equal(
      endFrame.shapeRecords[0]?.flags,
      gpuPathTerminalFlags.start | gpuPathTerminalFlags.end,
    );
    assert.deepEqual(
      startFrame.shapeRecords.map((record) => record.pathIndex),
      [0],
    );
    assert.ok(startFrame.cubicBezierSegments.length > 0);
    assert.ok(midFrame.cubicBezierSegments.length > 0);
    assert.ok(endFrame.cubicBezierSegments.length > 0);
    assert.notEqual(startFrame.shapeRecords[0]?.positionY, endFrame.shapeRecords[0]?.positionY);
    assert.notEqual(
      startFrame.cubicBezierSegments[0]?.p0Y,
      endFrame.cubicBezierSegments[0]?.p0Y,
    );
  });
});
