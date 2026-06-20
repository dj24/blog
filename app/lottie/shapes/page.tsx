import type { Metadata } from "next";
import { readFile } from "node:fs/promises";
import path from "node:path";
import invariant from "tiny-invariant";
import { parseLottieJson } from "../_lib/dotlottie";
import type { LottieComposition } from "../_lib/types/lottie-composition";
import type { LottieAsset } from "../_lib/types/lottie-asset";
import type { LottieLayer, LottieShapeLayer } from "../_lib/types/lottie-layer";
import type {
  LottieEllipseShape,
  LottieFillShape,
  LottieGradientFillShape,
  LottieGradientStrokeShape,
  LottieMergeShape,
  LottieNoStyleShape,
  LottieOffsetPathShape,
  LottiePathShape,
  LottiePuckerBloatShape,
  LottiePolystarShape,
  LottieRectangleShape,
  LottieRepeaterShape,
  LottieRoundedCornersShape,
  LottieShapeGroup,
  LottieStrokeShape,
  LottieTransformShape,
  LottieTrimPathShape,
  LottieTwistShape,
  LottieZigZagShape,
} from "../_lib/types/lottie-shape";
import { ShapeRenderingPlayground } from "./shape-rendering-playground";
import styles from "./page.module.css";

export type KnownLottieShapeItem =
  | LottieShapeGroup
  | LottiePathShape
  | LottieRectangleShape
  | LottieEllipseShape
  | LottiePolystarShape
  | LottieFillShape
  | LottieGradientFillShape
  | LottieStrokeShape
  | LottieGradientStrokeShape
  | LottieNoStyleShape
  | LottieTrimPathShape
  | LottieRepeaterShape
  | LottieRoundedCornersShape
  | LottiePuckerBloatShape
  | LottieTwistShape
  | LottieMergeShape
  | LottieOffsetPathShape
  | LottieZigZagShape
  | LottieTransformShape;

export const metadata: Metadata = {
  title: "Lottie Shapes",
  description:
    "Isolated previews and controls for the currently modeled Lottie shape items plus synthetic text and image layers.",
};

export type PlaygroundTextSample = {
  ty: "text";
  text: string;
  fontSize: number;
  color: [number, number, number];
  opacity: number;
  position: [number, number];
  fontFamily: string;
};

export type PlaygroundImageSample = {
  ty: "image";
  src: string;
  width: number;
  height: number;
  opacity: number;
  position: [number, number];
  alt: string;
};

export type ShapeSample = {
  id: string;
  label: string;
  origin: string;
} & (
  | {
      kind: "shape";
      shape: KnownLottieShapeItem;
    }
  | {
      kind: "text";
      textLayer: PlaygroundTextSample;
    }
  | {
      kind: "image";
      imageLayer: PlaygroundImageSample;
    }
);

type ShapeType = KnownLottieShapeItem["ty"];

const assetDirectory = path.join(process.cwd(), "app", "lottie", "_assets");
const assetPaths = [
  path.join(assetDirectory, "Gradient Text _ Stacked.json"),
  path.join(assetDirectory, "Inbound integrations _ Staggered.json"),
];

const shapeTypeOrder: ShapeType[] = [
  "gr",
  "sh",
  "rc",
  "el",
  "sr",
  "fl",
  "gf",
  "st",
  "gs",
  "no",
  "tm",
  "rp",
  "rd",
  "pb",
  "tw",
  "mm",
  "op",
  "zz",
  "tr",
];

const shapeTypeLabels: Record<ShapeType, string> = {
  gr: "group",
  sh: "bezier path",
  rc: "rectangle",
  el: "ellipse",
  sr: "polystar",
  fl: "solid fill",
  gf: "gradient fill",
  st: "solid stroke",
  gs: "gradient stroke",
  no: "no style",
  tm: "trim paths",
  rp: "repeater",
  rd: "rounded corners",
  pb: "pucker bloat",
  tw: "twist",
  mm: "merge paths",
  op: "offset path",
  zz: "zig zag",
  tr: "transform",
};

const syntheticTextSample: ShapeSample = {
  id: "synthetic-text",
  kind: "text",
  label: "text layer",
  origin: "synthetic fallback",
  textLayer: {
    ty: "text",
    text: "Lottie",
    fontSize: 64,
    color: [0.12, 0.16, 0.24],
    opacity: 100,
    position: [0, 20],
    fontFamily: "Georgia",
  },
};

const syntheticImageMarkup = encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 220">
    <defs>
      <linearGradient id="sky" x1="0%" x2="100%" y1="0%" y2="100%">
        <stop offset="0%" stop-color="#fefae0" />
        <stop offset="100%" stop-color="#ccd5ae" />
      </linearGradient>
    </defs>
    <rect width="320" height="220" rx="28" fill="url(#sky)" />
    <circle cx="76" cy="72" r="24" fill="#dda15e" />
    <path d="M0 184L92 112l58 44 46-32 124 60v36H0Z" fill="#6b705c" />
    <path d="M114 116l26-30 28 34 20-18 42 50H88Z" fill="#a98467" />
  </svg>
`);

const syntheticImageSample: ShapeSample = {
  id: "synthetic-image",
  kind: "image",
  label: "image layer",
  origin: "synthetic fallback",
  imageLayer: {
    ty: "image",
    src: `data:image/svg+xml;charset=utf-8,${syntheticImageMarkup}`,
    width: 160,
    height: 110,
    opacity: 100,
    position: [0, 0],
    alt: "Stylized landscape card",
  },
};

const syntheticShapeSamples: Partial<Record<ShapeType, KnownLottieShapeItem>> = {
  sr: {
    ty: "sr",
    sy: 1,
    pt: { a: 0, k: 5 },
    p: { a: 0, k: [0, 0] },
    or: { a: 0, k: 72 },
    os: { a: 0, k: 18 },
    r: { a: 0, k: -18 },
    ir: { a: 0, k: 34 },
    is: { a: 0, k: 24 },
  },
  gs: {
    ty: "gs",
    o: { a: 0, k: 100 },
    w: { a: 0, k: 14 },
    g: {
      p: 3,
      k: { a: 0, k: [0, 0.96, 0.33, 0.26, 0.5, 0.98, 0.83, 0.34, 1, 0.21, 0.52, 0.96] },
    },
    s: { a: 0, k: [-82, -82] },
    e: { a: 0, k: [82, 82] },
    t: 1,
    lc: 2,
    lj: 2,
    ml: 4,
  },
  no: {
    ty: "no",
    bm: 0,
  },
  rp: {
    ty: "rp",
    c: { a: 0, k: 6 },
    o: { a: 0, k: 0 },
    m: 1,
    tr: {
      a: { a: 0, k: [0, 0] },
      p: { a: 0, k: [18, -10] },
      s: { a: 0, k: [88, 88] },
      r: { a: 0, k: 10 },
      o: { a: 0, k: 100 },
      so: { a: 0, k: 100 },
      eo: { a: 0, k: 12 },
    },
  },
  rd: {
    ty: "rd",
    r: { a: 0, k: 26 },
  },
  pb: {
    ty: "pb",
    a: { a: 0, k: 42 },
  },
  tw: {
    ty: "tw",
    a: { a: 0, k: 160 },
    c: { a: 0, k: [0, 0] },
  },
  mm: {
    ty: "mm",
    mm: 1,
  },
  op: {
    ty: "op",
    a: { a: 0, k: 18 },
    lj: 2,
    ml: { a: 0, k: 4 },
  },
  zz: {
    ty: "zz",
    r: { a: 0, k: 7 },
    s: { a: 0, k: 18 },
    pt: { a: 0, k: 2 },
  },
};

const getShapeItems = (shape: KnownLottieShapeItem): KnownLottieShapeItem[] => {
  if (shape.ty === "gr") {
    return shape.it as KnownLottieShapeItem[];
  }

  return [];
};

const collectShapes = (
  shape: KnownLottieShapeItem,
  sampleMap: Map<ShapeType, ShapeSample>,
  origin: string,
) => {
  if (!sampleMap.has(shape.ty)) {
    sampleMap.set(shape.ty, {
      id: `${shape.ty}-${sampleMap.size}`,
      kind: "shape",
      label: shapeTypeLabels[shape.ty],
      origin,
      shape,
    });
  }

  getShapeItems(shape).forEach((childShape, index) => {
    collectShapes(childShape, sampleMap, `${origin} > ${childShape.ty}[${index}]`);
  });
};

const getLayerShapes = (layer: LottieLayer): KnownLottieShapeItem[] => {
  const layerRecord = layer as Record<string, unknown>;

  if (layerRecord.ty !== 4) {
    return [];
  }

  return (layer as LottieShapeLayer).shapes as KnownLottieShapeItem[];
};

const getAssetLayers = (asset: LottieAsset): LottieLayer[] => {
  const assetRecord = asset as Record<string, unknown>;

  if ("layers" in assetRecord && Array.isArray(assetRecord.layers)) {
    return assetRecord.layers as LottieLayer[];
  }

  return [];
};

const collectCompositionShapeSamples = (composition: LottieComposition, sourceLabel: string) => {
  const sampleMap = new Map<ShapeType, ShapeSample>();

  composition.layers.forEach((layer, layerIndex) => {
    getLayerShapes(layer).forEach((shape, shapeIndex) => {
      collectShapes(shape, sampleMap, `${sourceLabel} > layer ${layerIndex + 1} > shape ${shapeIndex + 1}`);
    });
  });

  composition.assets?.forEach((asset, assetIndex) => {
    getAssetLayers(asset).forEach((layer, layerIndex) => {
      getLayerShapes(layer).forEach((shape, shapeIndex) => {
        collectShapes(
          shape,
          sampleMap,
          `${sourceLabel} > asset ${assetIndex + 1} > layer ${layerIndex + 1} > shape ${shapeIndex + 1}`,
        );
      });
    });
  });

  return sampleMap;
};

const getShapeSamples = async () => {
  const jsonFiles = await Promise.all(assetPaths.map((assetPath) => readFile(assetPath, "utf8")));
  const sampleMap = new Map<ShapeType, ShapeSample>();

  jsonFiles.forEach((jsonFile, index) => {
    const composition = parseLottieJson(jsonFile);
    const sourceLabel = path.basename(assetPaths[index] ?? `asset-${index + 1}.json`, ".json");
    const compositionSamples = collectCompositionShapeSamples(composition, sourceLabel);

    compositionSamples.forEach((sample, shapeType) => {
      if (!sampleMap.has(shapeType)) {
        sampleMap.set(shapeType, sample);
      }
    });
  });

  shapeTypeOrder.forEach((shapeType) => {
    if (!sampleMap.has(shapeType)) {
      const syntheticShape = syntheticShapeSamples[shapeType];

      invariant(syntheticShape, `Missing fallback sample for shape type "${shapeType}".`);
      sampleMap.set(shapeType, {
        id: `synthetic-${shapeType}`,
        kind: "shape",
        label: shapeTypeLabels[shapeType],
        origin: "synthetic fallback",
        shape: syntheticShape,
      });
    }
  });

  const shapeSamples = shapeTypeOrder.map((shapeType) => {
    const sample = sampleMap.get(shapeType);

    invariant(sample, `Expected a sample for shape type "${shapeType}".`);
    return sample;
  });

  return [...shapeSamples, syntheticTextSample, syntheticImageSample];
};

const Page = async () => {
  const shapeSamples = await getShapeSamples();

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>phase 2</p>
        <h1 className={styles.title}>Lottie shape rendering</h1>
        <p className={styles.summary}>
          Each modeled shape item, plus synthetic text and image layer references, gets its own
          isolated canvas preview, a branch-specific renderer, and editable controls resolved from
          the first available property value.
        </p>
        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statLabel}>playground items</span>
            <span className={styles.statValue}>{shapeSamples.length}</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>sample assets</span>
            <span className={styles.statValue}>{assetPaths.length}</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>fallbacks used</span>
            <span className={styles.statValue}>
              {shapeSamples.filter((sample) => sample.origin === "synthetic fallback").length}
            </span>
          </div>
        </div>
      </section>
      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2 className={styles.panelTitle}>shape playground</h2>
          <span className={styles.panelBadge}>identity matrix</span>
        </div>
        <p className={styles.panelSummary}>
          Previews are intentionally simple and focus on the raw shape item, text layer, or image
          layer itself rather than full layer composition semantics.
        </p>
        <ShapeRenderingPlayground shapeSamples={shapeSamples} />
      </section>
    </main>
  );
};

export default Page;
