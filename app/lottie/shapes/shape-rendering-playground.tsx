"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { match } from "ts-pattern";
import type { LottieComposition } from "../_lib/types/lottie-composition";
import type { LottieShapeLayer } from "../_lib/types/lottie-layer";
import type {
  LottieBezierPathGeometry,
  LottieColor,
  LottieNumberProperty,
  LottieVector2,
  LottieVector2Property,
} from "../_lib/types/lottie-property";
import type { LottieShapeGroup, LottieShapeItem } from "../_lib/types/lottie-shape";
import type { KnownLottieShapeItem, ShapePreviewSample, ShapeType } from "./page";
import styles from "./page.module.css";

type Bounds = {
  maxX: number;
  maxY: number;
  minX: number;
  minY: number;
};

const compositionSize = 96;
const previewInset = 14;
const defaultBounds: Bounds = {
  maxX: 36,
  maxY: 36,
  minX: -36,
  minY: -36,
};

const ShapeLottiePreview = dynamic(
  () => import("./shape-lottie-preview").then((mod) => mod.ShapeLottiePreview),
  {
    loading: () => <div className={styles.previewPlaceholder}>mounting</div>,
    ssr: false,
  },
);

const staticNumber = (value: number): LottieNumberProperty => {
  return {
    a: 0,
    k: value,
  };
};

const staticVector2 = (value: LottieVector2): LottieVector2Property => {
  return {
    a: 0,
    k: value,
  };
};

const staticColor = (value: LottieColor) => {
  return {
    a: 0,
    k: value,
  } as const;
};

const staticPath = (value: LottieBezierPathGeometry) => {
  return {
    a: 0,
    k: value,
  } as const;
};

const resolveNumber = (property: LottieNumberProperty | undefined, fallback: number) => {
  if (!property) {
    return fallback;
  }

  return property.a === 0 ? property.k : property.k[0]?.s ?? fallback;
};

const resolveVector2 = (property: LottieVector2Property | undefined, fallback: LottieVector2) => {
  if (!property) {
    return fallback;
  }

  return property.a === 0 ? property.k : property.k[0]?.s ?? fallback;
};

const resolvePath = (shape: Extract<KnownLottieShapeItem, { ty: "sh" }>) => {
  if (shape.ks.a === 0) {
    return shape.ks.k;
  }

  const firstValue = shape.ks.k[0]?.s;

  return Array.isArray(firstValue) ? firstValue[0] : firstValue;
};

const createSolidFill = (color: LottieColor): LottieShapeItem => {
  return {
    bm: 0,
    c: staticColor(color),
    o: staticNumber(100),
    r: 1,
    ty: "fl",
  } satisfies LottieShapeItem;
};

const createSolidStroke = (color: LottieColor, width: number): LottieShapeItem => {
  return {
    bm: 0,
    c: staticColor(color),
    lc: 2,
    lj: 2,
    ml: 4,
    o: staticNumber(100),
    ty: "st",
    w: staticNumber(width),
  } satisfies LottieShapeItem;
};

const createGradientFill = (): LottieShapeItem => {
  return {
    bm: 0,
    g: {
      k: {
        a: 0,
        k: [0, 0.94, 0.31, 0.22, 0.52, 0.98, 0.78, 0.28, 1, 0.16, 0.45, 0.91],
      },
      p: 3,
    },
    o: staticNumber(100),
    r: 1,
    s: staticVector2([-34, -34]),
    t: 1,
    ty: "gf",
    e: staticVector2([34, 34]),
  } satisfies LottieShapeItem;
};

const createGradientStroke = (): LottieShapeItem => {
  return {
    bm: 0,
    g: {
      k: {
        a: 0,
        k: [0, 0.96, 0.33, 0.26, 0.5, 0.98, 0.83, 0.34, 1, 0.21, 0.52, 0.96],
      },
      p: 3,
    },
    lc: 2,
    lj: 2,
    ml: 4,
    o: staticNumber(100),
    s: staticVector2([-34, -18]),
    t: 1,
    ty: "gs",
    w: staticNumber(7),
    e: staticVector2([34, 18]),
  } satisfies LottieShapeItem;
};

const createBaseRectangle = (): LottieShapeItem => {
  return {
    d: 1,
    p: staticVector2([0, 0]),
    r: staticNumber(10),
    s: staticVector2([58, 44]),
    ty: "rc",
  } satisfies LottieShapeItem;
};

const createBasePolystar = (): LottieShapeItem => {
  return {
    ir: staticNumber(18),
    is: staticNumber(24),
    or: staticNumber(36),
    os: staticNumber(18),
    p: staticVector2([0, 0]),
    pt: staticNumber(5),
    r: staticNumber(-18),
    sy: 1,
    ty: "sr",
  } satisfies LottieShapeItem;
};

const createBaseEllipse = (position: LottieVector2, size: LottieVector2): LottieShapeItem => {
  return {
    d: 1,
    p: staticVector2(position),
    s: staticVector2(size),
    ty: "el",
  } satisfies LottieShapeItem;
};

const createBasePath = (): LottieShapeItem => {
  return {
    d: 1,
    ks: staticPath({
      c: false,
      i: [
        [0, 0],
        [-12, -24],
        [-12, 22],
        [0, 0],
      ],
      o: [
        [12, -22],
        [12, 24],
        [12, -20],
        [0, 0],
      ],
      v: [
        [-34, 12],
        [-12, -28],
        [14, 26],
        [36, -16],
      ],
    }),
    ty: "sh",
  } satisfies LottieShapeItem;
};

const createTransform = ({
  opacity = 100,
  position,
  scale = [100, 100],
}: {
  opacity?: number;
  position: LottieVector2;
  scale?: LottieVector2;
}): LottieShapeItem => {
  return {
    a: staticVector2([0, 0]),
    o: staticNumber(opacity),
    p: staticVector2(position),
    r: staticNumber(0),
    s: staticVector2(scale),
    ty: "tr",
  } satisfies LottieShapeItem;
};

const mergeBounds = (bounds: Bounds[]) => {
  if (bounds.length === 0) {
    return null;
  }

  return bounds.reduce<Bounds>(
    (mergedBounds, currentBounds) => {
      return {
        maxX: Math.max(mergedBounds.maxX, currentBounds.maxX),
        maxY: Math.max(mergedBounds.maxY, currentBounds.maxY),
        minX: Math.min(mergedBounds.minX, currentBounds.minX),
        minY: Math.min(mergedBounds.minY, currentBounds.minY),
      };
    },
    {
      maxX: Number.NEGATIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY,
      minX: Number.POSITIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
    },
  );
};

const isBounds = (bounds: Bounds | null): bounds is Bounds => {
  return bounds !== null;
};

const getShapeBounds = (shape: KnownLottieShapeItem): Bounds | null => {
  return match(shape)
    .with({ ty: "gr" }, (group) => {
      return mergeBounds((group.it as KnownLottieShapeItem[]).map(getShapeBounds).filter(isBounds));
    })
    .with({ ty: "sh" }, (pathShape) => {
      const path = resolvePath(pathShape);

      if (!path || path.v.length === 0) {
        return null;
      }

      return mergeBounds(
        path.v.map(([x, y]) => {
          return {
            maxX: x,
            maxY: y,
            minX: x,
            minY: y,
          };
        }),
      );
    })
    .with({ ty: "rc" }, (rectangle) => {
      const [width, height] = resolveVector2(rectangle.s, [0, 0]);
      const [x, y] = resolveVector2(rectangle.p, [0, 0]);

      return {
        maxX: x + width / 2,
        maxY: y + height / 2,
        minX: x - width / 2,
        minY: y - height / 2,
      };
    })
    .with({ ty: "el" }, (ellipse) => {
      const [width, height] = resolveVector2(ellipse.s, [0, 0]);
      const [x, y] = resolveVector2(ellipse.p, [0, 0]);

      return {
        maxX: x + width / 2,
        maxY: y + height / 2,
        minX: x - width / 2,
        minY: y - height / 2,
      };
    })
    .with({ ty: "sr" }, (polystar) => {
      const radius = resolveNumber(polystar.or, 36);
      const [x, y] = resolveVector2(polystar.p, [0, 0]);

      return {
        maxX: x + radius,
        maxY: y + radius,
        minX: x - radius,
        minY: y - radius,
      };
    })
    .otherwise(() => null);
};

const createFitTransform = (bounds: Bounds): LottieShapeItem => {
  const width = Math.max(1, bounds.maxX - bounds.minX);
  const height = Math.max(1, bounds.maxY - bounds.minY);
  const scale = Math.min(1.35, (compositionSize - previewInset * 2) / Math.max(width, height));
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;

  return createTransform({
    position: [compositionSize / 2 - centerX * scale, compositionSize / 2 - centerY * scale],
    scale: [scale * 100, scale * 100],
  });
};

const wrapPreviewGroup = (
  items: LottieShapeItem[],
  bounds =
    mergeBounds(
      items
        .map((item) => {
          return getShapeBounds(item as KnownLottieShapeItem);
        })
        .filter(isBounds),
    ) ?? defaultBounds,
): LottieShapeGroup => {
  return {
    it: [...items, createFitTransform(bounds)],
    ty: "gr",
  } satisfies LottieShapeGroup;
};

const createPreviewShapes = (shapeType: ShapeType): LottieShapeItem[] => {
  return match(shapeType)
    .with("gr", () => [
      wrapPreviewGroup([
        {
          it: [
            createBaseRectangle(),
            createGradientFill(),
            createBaseEllipse([14, -8], [34, 34]),
            createSolidStroke([0.18, 0.25, 0.46], 4),
            createTransform({ position: [0, 0] }),
          ],
          ty: "gr",
        } satisfies LottieShapeGroup,
      ]),
    ])
    .with("sh", () => [
      wrapPreviewGroup([
        createBasePath(),
        createSolidFill([0.95, 0.64, 0.22]),
        createSolidStroke([0.54, 0.16, 0.1], 4),
      ]),
    ])
    .with("rc", () => [
      wrapPreviewGroup([
        createBaseRectangle(),
        createGradientFill(),
        createSolidStroke([0.18, 0.25, 0.46], 3),
      ]),
    ])
    .with("el", () => [
      wrapPreviewGroup([
        createBaseEllipse([0, 0], [64, 48]),
        createGradientFill(),
        createSolidStroke([0.18, 0.25, 0.46], 3),
      ]),
    ])
    .with("sr", () => [
      wrapPreviewGroup([
        createBasePolystar(),
        createGradientFill(),
        createSolidStroke([0.2, 0.24, 0.37], 3),
      ]),
    ])
    .with("fl", () => [wrapPreviewGroup([createBaseRectangle(), createSolidFill([0.94, 0.6, 0.22])])])
    .with("gf", () => [
      wrapPreviewGroup([
        createBaseRectangle(),
        createGradientFill(),
        createSolidStroke([0.18, 0.25, 0.46], 3),
      ]),
    ])
    .with("st", () => [wrapPreviewGroup([createBasePath(), createSolidStroke([0.54, 0.16, 0.1], 7)])])
    .with("gs", () => [wrapPreviewGroup([createBasePath(), createGradientStroke()])])
    .with("no", () => [
      wrapPreviewGroup([
        createBaseRectangle(),
        {
          bm: 0,
          ty: "no",
        } satisfies LottieShapeItem,
      ]),
    ])
    .with("tm", () => [
      wrapPreviewGroup([
        createBasePath(),
        {
          e: staticNumber(72),
          m: 1,
          o: staticNumber(0),
          s: staticNumber(12),
          ty: "tm",
        } satisfies LottieShapeItem,
        createSolidStroke([0.54, 0.16, 0.1], 7),
      ]),
    ])
    .with("rp", () => [
      wrapPreviewGroup([
        createBaseRectangle(),
        createSolidFill([0.94, 0.6, 0.22]),
        createSolidStroke([0.18, 0.25, 0.46], 3),
        {
          c: staticNumber(4),
          m: 1,
          o: staticNumber(0),
          tr: {
            a: staticVector2([0, 0]),
            eo: staticNumber(24),
            o: staticNumber(100),
            p: staticVector2([12, -8]),
            r: staticNumber(8),
            s: staticVector2([88, 88]),
            so: staticNumber(100),
          },
          ty: "rp",
        } satisfies LottieShapeItem,
      ]),
    ])
    .with("rd", () => [
      wrapPreviewGroup([
        createBaseRectangle(),
        {
          r: staticNumber(18),
          ty: "rd",
        } satisfies LottieShapeItem,
        createSolidFill([0.2, 0.66, 0.46]),
        createSolidStroke([0.1, 0.3, 0.28], 3),
      ]),
    ])
    .with("pb", () => [
      wrapPreviewGroup([
        createBaseEllipse([0, 0], [62, 62]),
        {
          a: staticNumber(42),
          ty: "pb",
        } satisfies LottieShapeItem,
        createGradientFill(),
        createSolidStroke([0.18, 0.25, 0.46], 3),
      ]),
    ])
    .with("tw", () => [
      wrapPreviewGroup([
        createBasePath(),
        {
          a: staticNumber(160),
          c: staticVector2([0, 0]),
          ty: "tw",
        } satisfies LottieShapeItem,
        createSolidStroke([0.54, 0.16, 0.1], 7),
      ]),
    ])
    .with("mm", () => [
      wrapPreviewGroup([
        createBaseEllipse([-12, 0], [46, 46]),
        createBaseRectangle(),
        {
          mm: 1,
          ty: "mm",
        } satisfies LottieShapeItem,
        createSolidFill([0.2, 0.46, 0.84]),
      ]),
    ])
    .with("op", () => [
      wrapPreviewGroup([
        createBasePath(),
        {
          a: staticNumber(12),
          lj: 2,
          ml: staticNumber(4),
          ty: "op",
        } satisfies LottieShapeItem,
        createSolidStroke([0.2, 0.46, 0.84], 7),
      ]),
    ])
    .with("zz", () => [
      wrapPreviewGroup([
        {
          d: 1,
          ks: staticPath({
            c: false,
            i: [
              [0, 0],
              [0, 0],
            ],
            o: [
              [0, 0],
              [0, 0],
            ],
            v: [
              [-34, 0],
              [34, 0],
            ],
          }),
          ty: "sh",
        } satisfies LottieShapeItem,
        {
          pt: staticNumber(2),
          r: staticNumber(7),
          s: staticNumber(18),
          ty: "zz",
        } satisfies LottieShapeItem,
        createSolidStroke([0.54, 0.16, 0.1], 7),
      ]),
    ])
    .with("tr", () => [
      wrapPreviewGroup([
        {
          it: [
            createBaseRectangle(),
            createSolidFill([0.94, 0.6, 0.22]),
            createSolidStroke([0.18, 0.25, 0.46], 3),
            {
              a: staticVector2([0, 0]),
              o: staticNumber(88),
              p: staticVector2([6, -8]),
              r: staticNumber(18),
              s: staticVector2([82, 118]),
              ty: "tr",
            } satisfies LottieShapeItem,
          ],
          ty: "gr",
        } satisfies LottieShapeGroup,
      ]),
    ])
    .exhaustive();
};

const createShapeComposition = (sample: ShapePreviewSample): LottieComposition => {
  const layer: LottieShapeLayer = {
    ddd: 0,
    ind: 1,
    ip: 0,
    ks: {
      a: staticVector2([0, 0]),
      o: staticNumber(100),
      p: staticVector2([0, 0]),
      r: staticNumber(0),
      s: staticVector2([100, 100]),
    },
    nm: sample.label,
    op: 60,
    shapes: createPreviewShapes(sample.shapeType),
    st: 0,
    ty: 4,
  };

  return {
    fr: 60,
    h: compositionSize,
    ip: 0,
    layers: [layer],
    nm: sample.label,
    op: 60,
    v: "5.7.5",
    w: compositionSize,
  };
};

const createLottieDataUrl = (animation: LottieComposition) => {
  return `data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(animation))}`;
};

const ShapeCard = ({ sample }: { sample: ShapePreviewSample }) => {
  const animation = useMemo(() => createShapeComposition(sample), [sample]);
  const src = useMemo(() => createLottieDataUrl(animation), [animation]);

  return (
    <article className={styles.card}>
      <div className={styles.previewFrame}>
        <ShapeLottiePreview animation={animation} label={sample.label} src={src} />
      </div>
      <div className={styles.cardMeta}>
        <div>
          <p className={styles.cardEyebrow}>{sample.shapeType}</p>
          <h3 className={styles.cardTitle}>{sample.label}</h3>
        </div>
        <span className={styles.cardBadge}>{sample.origin}</span>
      </div>
    </article>
  );
};

export const ShapeRenderingPlayground = ({
  shapeSamples,
}: {
  shapeSamples: ShapePreviewSample[];
}) => {
  return (
    <div className={styles.cardGrid}>
      {shapeSamples.map((sample) => {
        return <ShapeCard key={sample.id} sample={sample} />;
      })}
    </div>
  );
};
