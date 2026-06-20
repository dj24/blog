import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { decompressDotLottieToJson } from "./dotlottie";
import { gpuShapeKinds } from "./gpu-shape-record";
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

describe("Lottie GPU frame conversion", () => {
  test("converts supported first-frame square.lottie primitives to GPU shape records", async () => {
    const animation = await loadSquareAnimation();
    const frame = createLottieGpuFrame(animation, animation.ip);

    assert.equal(frame.compositionWidth, 640);
    assert.equal(frame.compositionHeight, 640);
    assert.equal(frame.shapeRecords.length, 3);
    assert.ok(frame.shapeRecords.some((record) => record.kind === gpuShapeKinds.ellipse));
    assert.ok(frame.shapeRecords.some((record) => record.kind === gpuShapeKinds.rectangle));
    assert.ok(frame.shapeRecords.every((record) => record.kind !== gpuShapeKinds.path));
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

  test("resolves frames before the first keyframe and after the last keyframe", async () => {
    const animation = await loadSquareAnimation();
    const beforeFirstKeyframe = findBlueSquare(animation, -10);
    const afterLastKeyframe = findBlueSquare(animation, 1000);

    assert.ok(beforeFirstKeyframe);
    assert.ok(afterLastKeyframe);
    assertApproximatelyEqual(beforeFirstKeyframe.positionY, 320);
    assertApproximatelyEqual(beforeFirstKeyframe.scaleX, 1);
    assertApproximatelyEqual(beforeFirstKeyframe.scaleY, 1);
    assertApproximatelyEqual(afterLastKeyframe.positionY, 150);
    assertApproximatelyEqual(afterLastKeyframe.scaleX, 2);
    assertApproximatelyEqual(afterLastKeyframe.scaleY, 2);
  });
});
