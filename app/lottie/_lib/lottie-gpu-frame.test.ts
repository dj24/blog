import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { decompressDotLottieToJson } from "./dotlottie";
import { gpuShapeKinds } from "./gpu-shape-record";
import { createLottieGpuFrame } from "./lottie-gpu-frame";

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

describe("Lottie GPU frame conversion", () => {
  test("converts supported first-frame square.lottie primitives to GPU shape records", async () => {
    const animation = await decompressDotLottieToJson(await readFile(squareDotLottiePath));
    const frame = createLottieGpuFrame(animation, animation.ip);

    assert.equal(frame.compositionWidth, 640);
    assert.equal(frame.compositionHeight, 640);
    assert.equal(frame.shapeRecords.length, 3);
    assert.ok(frame.shapeRecords.some((record) => record.kind === gpuShapeKinds.ellipse));
    assert.ok(frame.shapeRecords.some((record) => record.kind === gpuShapeKinds.rectangle));
    assert.ok(frame.shapeRecords.every((record) => record.kind !== gpuShapeKinds.path));
  });

  test("extracts the first-frame blue rounded square from square.lottie", async () => {
    const animation = await decompressDotLottieToJson(await readFile(squareDotLottiePath));
    const frame = createLottieGpuFrame(animation, animation.ip);
    const blueSquare = frame.shapeRecords.find((record) => {
      return (
        record.kind === gpuShapeKinds.rectangle &&
        Math.abs(record.fillBlue - 1) <= tolerance &&
        Math.abs(record.fillGreen - 0.15) <= tolerance
      );
    });

    assert.ok(blueSquare);
    assertApproximatelyEqual(blueSquare.positionX, 320);
    assertApproximatelyEqual(blueSquare.positionY, 320);
    assertApproximatelyEqual(blueSquare.width, 100);
    assertApproximatelyEqual(blueSquare.height, 100);
    assertApproximatelyEqual(blueSquare.cornerRadius, 24);
  });
});
