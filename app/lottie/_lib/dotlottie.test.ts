import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  compressJsonToDotLottie,
  decompressDotLottie,
  decompressDotLottieToJson,
  readLottieJson,
} from "./dotlottie";
import { dotLottieArchiveSchema, dotLottieManifestSchema } from "./types/dotlottie";
import { lottieCompositionSchema } from "./types/lottie-composition";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const assetsDirectory = path.join(currentDirectory, "..", "_assets");
const dotLottiePath = path.join(assetsDirectory, "Gradient Text _ Stacked.lottie");
const jsonPath = path.join(assetsDirectory, "Gradient Text _ Stacked.json");
const staggeredDotLottiePath = path.join(
  assetsDirectory,
  "Inbound integrations _ Staggered.lottie",
);

describe("dotLottie conversion", () => {
  test("decompresses the lottie archive to the paired JSON animation", async () => {
    const [dotLottieFile, jsonFile] = await Promise.all([
      readFile(dotLottiePath),
      readFile(jsonPath, "utf8"),
    ]);

    assert.deepEqual(await decompressDotLottieToJson(dotLottieFile), JSON.parse(jsonFile));
  });

  test("parses the sample raw lottie JSON with the composition schema", async () => {
    const jsonFile = await readFile(jsonPath, "utf8");
    const animation = JSON.parse(jsonFile);

    assert.deepEqual(lottieCompositionSchema.parse(animation), animation);
  });

  test("parses the sample .lottie archive contents with the archive schemas", async () => {
    const dotLottieFile = await readFile(dotLottiePath);
    const archive = await decompressDotLottie(dotLottieFile);

    assert.deepEqual(dotLottieManifestSchema.parse(archive.manifest), archive.manifest);
    assert.deepEqual(dotLottieArchiveSchema.parse(archive), archive);
  });

  test("parses the staggered sample .lottie archive contents with the archive schemas", async () => {
    const dotLottieFile = await readFile(staggeredDotLottiePath);
    const archive = await decompressDotLottie(dotLottieFile);

    assert.deepEqual(dotLottieManifestSchema.parse(archive.manifest), archive.manifest);
    assert.deepEqual(dotLottieArchiveSchema.parse(archive), archive);
  });

  test("compresses JSON to a lottie archive that decompresses back to the same animation", async () => {
    const jsonFile = await readFile(jsonPath, "utf8");
    const animation = JSON.parse(jsonFile);
    const compressed = await compressJsonToDotLottie(animation);

    assert.deepEqual(await decompressDotLottieToJson(compressed), animation);
  });

  test("keeps manifest metadata when requested during compression", async () => {
    const animation = {
      v: "5.7.5",
      fr: 60,
      ip: 0,
      op: 1,
      w: 1200,
      h: 1200,
      layers: [],
    };
    const compressed = await compressJsonToDotLottie(animation, {
      manifest: {
        author: "Lottielab",
        generator: "@lottielab/dotlottie@1.0.0",
      },
    });

    assert.deepEqual((await decompressDotLottie(compressed)).manifest, {
      version: "1.0.0",
      author: "Lottielab",
      generator: "@lottielab/dotlottie@1.0.0",
      animations: [{ id: "main" }],
    });
  });

  test("treats .json and .lot files as uncompressed Lottie JSON", async () => {
    const jsonFile = await readFile(jsonPath, "utf8");
    const animation = JSON.parse(jsonFile);

    assert.deepEqual(await readLottieJson("animation.json", jsonFile), animation);
    assert.deepEqual(await readLottieJson("animation.lot", jsonFile), animation);
  });
});
