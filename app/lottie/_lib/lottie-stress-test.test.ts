import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { compressJsonToDotLottie, decompressDotLottieToJson } from "./dotlottie";
import { createLottieGpuFrame } from "./lottie-gpu-frame";
import { createStressTestLottie, summarizeStressTestLottie } from "./lottie-stress-test";
import { lottieCompositionSchema } from "./types/lottie-composition";

describe("Lottie stress test generator", () => {
  test("creates a deterministic schema-valid composition", () => {
    const firstAnimation = createStressTestLottie();
    const secondAnimation = createStressTestLottie();

    assert.deepEqual(secondAnimation, firstAnimation);
    assert.deepEqual(lottieCompositionSchema.parse(firstAnimation), firstAnimation);
    assert.equal(firstAnimation.w, 1024);
    assert.equal(firstAnimation.h, 1024);
    assert.equal(firstAnimation.fr, 60);
    assert.equal(firstAnimation.op, 180);
    assert.deepEqual(
      firstAnimation.markers?.map((marker) => marker.cm),
      ["supported", "mixed", "peak"],
    );
  });

  test("round-trips through dotLottie compression and decompression", async () => {
    const animation = createStressTestLottie();
    const archive = await compressJsonToDotLottie(animation);

    assert.deepEqual(await decompressDotLottieToJson(archive), animation);
  });

  test("emits supported GPU records without crashing on unsupported items", () => {
    const animation = createStressTestLottie();
    const supportedFrame = createLottieGpuFrame(animation, 30);
    const mixedFrame = createLottieGpuFrame(animation, 90);
    const peakFrame = createLottieGpuFrame(animation, 150);
    const summary = summarizeStressTestLottie(animation);

    assert.ok(supportedFrame.shapeRecords.length > 0);
    assert.ok(mixedFrame.shapeRecords.length > 0);
    assert.ok(peakFrame.shapeRecords.length >= mixedFrame.shapeRecords.length);
    assert.ok(summary.supportedCounts.rectangles > 0);
    assert.ok(summary.supportedCounts.ellipses > 0);
    assert.ok(summary.supportedCounts.paths > 0);
    assert.ok(summary.unsupportedCounts.stars > 0);
    assert.ok(summary.unsupportedCounts.polygons > 0);
    assert.ok(summary.unsupportedCounts.trimPaths > 0);
    assert.ok(summary.unsupportedCounts.repeaters > 0);
    assert.ok(summary.unsupportedCounts.roundCorners > 0);
    assert.ok(summary.unsupportedCounts.offsetPaths > 0);
    assert.ok(summary.unsupportedCounts.puckerBloat > 0);
    assert.ok(summary.unsupportedCounts.zigZag > 0);
  });
});
