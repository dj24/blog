import { match } from "ts-pattern";
import type {
  LottieBezierPathGeometry,
  LottieBezierPathGeometryProperty,
  LottieColor,
  LottieColorProperty,
  LottieGradientStopValuesProperty,
  LottieNumberProperty,
  LottieVector2,
  LottieVector2Property,
} from "./types/lottie-property";
import type { LottieComposition, LottieMarker } from "./types/lottie-composition";
import type { LottieShapeLayer } from "./types/lottie-layer";
import type { LottieShapeItem } from "./types/lottie-shape";

type SupportedCounts = {
  ellipses: number;
  gradientFills: number;
  gradientStrokes: number;
  groups: number;
  paths: number;
  rectangles: number;
  shapeLayers: number;
  solidFills: number;
  solidStrokes: number;
  transforms: number;
};

type UnsupportedCounts = {
  offsetPaths: number;
  polygons: number;
  puckerBloat: number;
  repeaters: number;
  roundCorners: number;
  stars: number;
  trimPaths: number;
  zigZag: number;
};

type StressTestSummary = {
  frameMarkers: Array<{
    duration: number;
    frame: number;
    name: string;
  }>;
  jsonBytesEstimate: number;
  supportedCounts: SupportedCounts;
  unsupportedCounts: UnsupportedCounts;
};

const compositionWidth = 1024;
const compositionHeight = 1024;
const compositionFrameRate = 60;
const supportedPhaseStart = 0;
const mixedPhaseStart = 60;
const peakPhaseStart = 120;
const compositionFrameCount = 180;
const lastFrame = compositionFrameCount - 1;

const supportedPalette: readonly LottieColor[] = [
  [0.937, 0.314, 0.243],
  [0.145, 0.541, 0.957],
  [0.129, 0.698, 0.478],
  [0.969, 0.604, 0.227],
  [0.42, 0.325, 0.933],
  [0.09, 0.172, 0.364],
];

const unsupportedPalette: readonly LottieColor[] = [
  [0.776, 0.231, 0.356],
  [0.176, 0.376, 0.89],
  [0.176, 0.635, 0.596],
  [0.961, 0.671, 0.204],
];

const normalizeNumber = (value: number) => {
  return Object.is(value, -0) ? 0 : value;
};

const normalizeVector2 = (value: LottieVector2): LottieVector2 => {
  return [normalizeNumber(value[0]), normalizeNumber(value[1])];
};

const staticNumber = (value: number): LottieNumberProperty => {
  return {
    a: 0,
    k: normalizeNumber(value),
  };
};

const staticVector2 = (value: LottieVector2): LottieVector2Property => {
  return {
    a: 0,
    k: normalizeVector2(value),
  };
};

const staticColor = (value: LottieColor): LottieColorProperty => {
  return {
    a: 0,
    k: value,
  };
};

const staticGradientStops = (value: number[]): LottieGradientStopValuesProperty => {
  return {
    a: 0,
    k: value,
  };
};

const staticPath = (value: LottieBezierPathGeometry): LottieBezierPathGeometryProperty => {
  return {
    a: 0,
    k: value,
  };
};

const animatedNumber = (
  keyframes: Array<{
    e?: number;
    h?: number;
    s: number;
    t: number;
  }>,
): LottieNumberProperty => {
  return {
    a: 1,
    k: keyframes.map((keyframe) => {
      return {
        s: normalizeNumber(keyframe.s),
        t: keyframe.t,
        ...(keyframe.e === undefined ? {} : { e: normalizeNumber(keyframe.e) }),
        ...(keyframe.h === undefined ? {} : { h: keyframe.h }),
      };
    }),
  };
};

const animatedVector2 = (
  keyframes: Array<{
    e?: LottieVector2;
    h?: number;
    s: LottieVector2;
    t: number;
  }>,
): LottieVector2Property => {
  return {
    a: 1,
    k: keyframes.map((keyframe) => {
      return {
        s: normalizeVector2(keyframe.s),
        t: keyframe.t,
        ...(keyframe.e === undefined ? {} : { e: normalizeVector2(keyframe.e) }),
        ...(keyframe.h === undefined ? {} : { h: keyframe.h }),
      };
    }),
  };
};

const createGradientStops = (colors: readonly [LottieColor, LottieColor, LottieColor]) => {
  return [
    0,
    colors[0][0],
    colors[0][1],
    colors[0][2],
    0.5,
    colors[1][0],
    colors[1][1],
    colors[1][2],
    1,
    colors[2][0],
    colors[2][1],
    colors[2][2],
  ];
};

const createLinearGradientFill = ({
  colors,
  end,
  start,
}: {
  colors: readonly [LottieColor, LottieColor, LottieColor];
  end: LottieVector2;
  start: LottieVector2;
}) => {
  return {
    bm: 0,
    g: {
      k: staticGradientStops(createGradientStops(colors)),
      p: 3,
    },
    nm: "gradient fill",
    o: staticNumber(100),
    r: 1,
    s: staticVector2(start),
    t: 1,
    ty: "gf",
    e: staticVector2(end),
  } as const;
};

const createSolidFill = (color: LottieColor) => {
  return {
    bm: 0,
    c: staticColor(color),
    nm: "solid fill",
    o: staticNumber(100),
    r: 1,
    ty: "fl",
  } as const;
};

const createSolidStroke = ({ color, width }: { color: LottieColor; width: number }) => {
  return {
    bm: 0,
    c: staticColor(color),
    lc: 2,
    lj: 2,
    ml: 4,
    nm: "solid stroke",
    o: staticNumber(100),
    ty: "st",
    w: staticNumber(width),
  } as const;
};

const createGradientStroke = ({
  colors,
  end,
  start,
  width,
}: {
  colors: readonly [LottieColor, LottieColor, LottieColor];
  end: LottieVector2;
  start: LottieVector2;
  width: number;
}) => {
  return {
    bm: 0,
    g: {
      k: staticGradientStops(createGradientStops(colors)),
      p: 3,
    },
    lc: 2,
    lj: 2,
    ml: 4,
    nm: "gradient stroke",
    o: staticNumber(100),
    s: staticVector2(start),
    t: 1,
    ty: "gs",
    w: staticNumber(width),
    e: staticVector2(end),
  } as const;
};

const createTransform = ({
  anchor = [0, 0],
  opacity = 100,
  position,
  rotation = 0,
  scale = [100, 100],
}: {
  anchor?: LottieVector2;
  opacity?: number;
  position: LottieNumberProperty | LottieVector2Property;
  rotation?: LottieNumberProperty | number;
  scale?: LottieVector2;
}) => {
  return {
    a: staticVector2(anchor),
    nm: "transform",
    o: staticNumber(opacity),
    p: typeof position === "object" && "a" in position ? position : staticVector2([0, 0]),
    r: typeof rotation === "number" ? staticNumber(rotation) : rotation,
    s: staticVector2(scale),
    ty: "tr",
  } as const;
};

const createShapeLayer = ({
  index,
  inFrame = supportedPhaseStart,
  name,
  outFrame = compositionFrameCount,
  position = [0, 0],
  rotation = 0,
  shapes,
}: {
  inFrame?: number;
  index: number;
  name: string;
  outFrame?: number;
  position?: LottieVector2;
  rotation?: number;
  shapes: LottieShapeItem[];
}) => {
  return {
    ddd: 0,
    ind: index,
    ip: inFrame,
    ks: {
      a: staticVector2([0, 0]),
      o: staticNumber(100),
      p: staticVector2(position),
      r: staticNumber(rotation),
      s: staticVector2([100, 100]),
    },
    nm: name,
    op: outFrame,
    shapes,
    st: 0,
    ty: 4,
  } satisfies LottieShapeLayer;
};

const createLoopedPosition = ({
  center,
  xOffset,
  yOffset,
}: {
  center: LottieVector2;
  xOffset: number;
  yOffset: number;
}) => {
  return animatedVector2([
    {
      e: [center[0] + xOffset * 0.35, center[1] - yOffset * 0.2],
      s: center,
      t: supportedPhaseStart,
    },
    {
      e: [center[0] - xOffset * 0.25, center[1] + yOffset * 0.55],
      s: [center[0] + xOffset * 0.35, center[1] - yOffset * 0.2],
      t: mixedPhaseStart,
    },
    {
      e: [center[0] + xOffset, center[1] - yOffset],
      s: [center[0] - xOffset * 0.25, center[1] + yOffset * 0.55],
      t: peakPhaseStart,
    },
    {
      s: [center[0] + xOffset, center[1] - yOffset],
      t: lastFrame,
    },
  ]);
};

const createLoopedRotation = ({ amount, start }: { amount: number; start: number }) => {
  return animatedNumber([
    {
      e: start + amount * 0.35,
      s: start,
      t: supportedPhaseStart,
    },
    {
      e: start - amount * 0.15,
      s: start + amount * 0.35,
      t: mixedPhaseStart,
    },
    {
      e: start + amount,
      s: start - amount * 0.15,
      t: peakPhaseStart,
    },
    {
      s: start + amount,
      t: lastFrame,
    },
  ]);
};

const createWavePathGeometry = ({
  closed,
  height,
  width,
}: {
  closed: boolean;
  height: number;
  width: number;
}) => {
  const halfWidth = width / 2;
  const halfHeight = height / 2;

  return {
    c: closed,
    i: [
      [0, 0],
      [-width * 0.12, -height * 0.3],
      [-width * 0.12, height * 0.28],
      [-width * 0.12, -height * 0.24],
    ],
    o: [
      [width * 0.12, -height * 0.24],
      [width * 0.12, height * 0.3],
      [width * 0.12, -height * 0.2],
      [0, 0],
    ],
    v: [
      [-halfWidth, 0],
      [-width * 0.16, -halfHeight],
      [width * 0.2, halfHeight],
      [halfWidth, -height * 0.08],
    ],
  } satisfies LottieBezierPathGeometry;
};

const createRectangleGridGroups = () => {
  return Array.from({ length: 20 }, (_, index) => {
    const column = index % 5;
    const row = Math.floor(index / 5);
    const center: LottieVector2 = [126 + column * 148, 126 + row * 118];
    const width = 60 + (index % 4) * 16;
    const height = 40 + (row % 3) * 18;
    const paletteOffset = index % supportedPalette.length;
    const colors = [
      supportedPalette[paletteOffset] ?? supportedPalette[0],
      supportedPalette[(paletteOffset + 1) % supportedPalette.length] ?? supportedPalette[1],
      supportedPalette[(paletteOffset + 2) % supportedPalette.length] ?? supportedPalette[2],
    ] as const;
    const fill =
      index % 2 === 0
        ? createSolidFill(colors[0])
        : createLinearGradientFill({
            colors,
            end: [width / 2, height / 2],
            start: [-width / 2, -height / 2],
          });
    const stroke =
      index % 3 === 0
        ? createGradientStroke({
            colors: [colors[2], colors[0], colors[1]],
            end: [width / 2, 0],
            start: [-width / 2, 0],
            width: 4 + (index % 4),
          })
        : createSolidStroke({
            color: colors[2],
            width: 3 + (index % 5),
          });

    return {
      it: [
        {
          d: 1,
          nm: `rectangle ${index + 1}`,
          p: staticVector2([0, 0]),
          r: staticNumber(8 + (index % 4) * 5),
          s: staticVector2([width, height]),
          ty: "rc",
        },
        fill,
        stroke,
        createTransform({
          position: createLoopedPosition({
            center,
            xOffset: 12 + column * 2,
            yOffset: 10 + row * 2,
          }),
          rotation: createLoopedRotation({
            amount: 6 + (index % 4) * 4,
            start: index % 2 === 0 ? 0 : 4,
          }),
          scale: [100 + (index % 2) * 8, 100 + (index % 3) * 6],
        }),
      ],
      nm: `supported rectangle group ${index + 1}`,
      ty: "gr",
    } as const satisfies LottieShapeItem;
  });
};

const createEllipseGridGroups = () => {
  return Array.from({ length: 16 }, (_, index) => {
    const column = index % 4;
    const row = Math.floor(index / 4);
    const center: LottieVector2 = [664 + column * 86, 146 + row * 110];
    const width = 58 + (index % 3) * 18;
    const height = 44 + (row % 3) * 16;
    const paletteOffset = (index + 2) % supportedPalette.length;
    const colors = [
      supportedPalette[paletteOffset] ?? supportedPalette[0],
      supportedPalette[(paletteOffset + 2) % supportedPalette.length] ?? supportedPalette[1],
      supportedPalette[(paletteOffset + 4) % supportedPalette.length] ?? supportedPalette[2],
    ] as const;

    return {
      it: [
        {
          d: 1,
          nm: `ellipse ${index + 1}`,
          p: staticVector2([0, 0]),
          s: staticVector2([width, height]),
          ty: "el",
        },
        index % 2 === 0
          ? createLinearGradientFill({
              colors,
              end: [width / 2, 0],
              start: [-width / 2, 0],
            })
          : createSolidFill(colors[1]),
        createSolidStroke({
          color: colors[2],
          width: 2 + (index % 4),
        }),
        createTransform({
          position: createLoopedPosition({
            center,
            xOffset: 9 + column * 3,
            yOffset: 14 + row * 2,
          }),
          rotation: createLoopedRotation({
            amount: 12 + (index % 5) * 3,
            start: index % 2 === 0 ? 0 : -8,
          }),
          scale: [96 + (index % 4) * 4, 96 + ((index + 1) % 4) * 4],
        }),
      ],
      nm: `supported ellipse group ${index + 1}`,
      ty: "gr",
    } as const satisfies LottieShapeItem;
  });
};

const createPathGroups = () => {
  return Array.from({ length: 12 }, (_, index) => {
    const column = index % 4;
    const row = Math.floor(index / 4);
    const center: LottieVector2 = [188 + column * 190, 566 + row * 132];
    const width = 96 + (index % 3) * 22;
    const height = 46 + (row % 2) * 16;
    const colors = [
      supportedPalette[(index + 1) % supportedPalette.length] ?? supportedPalette[0],
      supportedPalette[(index + 3) % supportedPalette.length] ?? supportedPalette[1],
      supportedPalette[(index + 5) % supportedPalette.length] ?? supportedPalette[2],
    ] as const;

    return {
      it: [
        {
          d: 1,
          ks: staticPath(
            createWavePathGeometry({
              closed: index % 2 === 0,
              height,
              width,
            }),
          ),
          nm: `path ${index + 1}`,
          ty: "sh",
        },
        createGradientStroke({
          colors,
          end: [width / 2, height / 4],
          start: [-width / 2, -height / 4],
          width: 6 + (index % 4),
        }),
        createTransform({
          position: createLoopedPosition({
            center,
            xOffset: 18 + column * 2,
            yOffset: 12 + row * 3,
          }),
          rotation: createLoopedRotation({
            amount: 18 + (index % 4) * 5,
            start: row % 2 === 0 ? -12 : 12,
          }),
        }),
      ],
      nm: `supported path group ${index + 1}`,
      ty: "gr",
    } as const satisfies LottieShapeItem;
  });
};

const createNestedOrbitGroups = () => {
  return Array.from({ length: 6 }, (_, index) => {
    const center: LottieVector2 = [606 + (index % 3) * 132, 614 + Math.floor(index / 3) * 156];
    const colors = [
      supportedPalette[index % supportedPalette.length] ?? supportedPalette[0],
      supportedPalette[(index + 1) % supportedPalette.length] ?? supportedPalette[1],
      supportedPalette[(index + 2) % supportedPalette.length] ?? supportedPalette[2],
    ] as const;

    return {
      it: [
        {
          it: [
            {
              d: 1,
              nm: `orbit rectangle ${index + 1}`,
              p: staticVector2([-34, 0]),
              r: staticNumber(18),
              s: staticVector2([82, 44]),
              ty: "rc",
            },
            createSolidFill(colors[0]),
            createGradientStroke({
              colors,
              end: [44, 0],
              start: [-44, 0],
              width: 4,
            }),
            createTransform({
              position: staticVector2([0, 0]),
              rotation: createLoopedRotation({
                amount: 26 + index * 4,
                start: index * 6,
              }),
            }),
          ],
          nm: `inner rectangle cluster ${index + 1}`,
          ty: "gr",
        },
        {
          it: [
            {
              d: 1,
              nm: `orbit ellipse ${index + 1}`,
              p: staticVector2([42, 18]),
              s: staticVector2([72, 72]),
              ty: "el",
            },
            createLinearGradientFill({
              colors: [colors[2], colors[1], colors[0]],
              end: [36, 36],
              start: [-36, -36],
            }),
            createSolidStroke({
              color: colors[1],
              width: 5,
            }),
            createTransform({
              position: staticVector2([0, 0]),
              rotation: createLoopedRotation({
                amount: -24 - index * 3,
                start: -index * 8,
              }),
            }),
          ],
          nm: `inner ellipse cluster ${index + 1}`,
          ty: "gr",
        },
        createTransform({
          position: createLoopedPosition({
            center,
            xOffset: 22 + index * 2,
            yOffset: 18 + index * 2,
          }),
          rotation: createLoopedRotation({
            amount: 22 + index * 4,
            start: index * 10,
          }),
        }),
      ],
      nm: `nested supported orbit ${index + 1}`,
      ty: "gr",
    } as const satisfies LottieShapeItem;
  });
};

const createPeakOverlayGroups = () => {
  return Array.from({ length: 9 }, (_, index) => {
    const column = index % 3;
    const row = Math.floor(index / 3);
    const center: LottieVector2 = [322 + column * 190, 846 + row * 74];
    const colors = [
      supportedPalette[(index + 4) % supportedPalette.length] ?? supportedPalette[0],
      supportedPalette[(index + 5) % supportedPalette.length] ?? supportedPalette[1],
      supportedPalette[index % supportedPalette.length] ?? supportedPalette[2],
    ] as const;

    return {
      it: [
        {
          d: 1,
          nm: `peak rectangle ${index + 1}`,
          p: staticVector2([0, 0]),
          r: staticNumber(10),
          s: staticVector2([72, 22 + row * 6]),
          ty: "rc",
        },
        createLinearGradientFill({
          colors,
          end: [36, 0],
          start: [-36, 0],
        }),
        createSolidStroke({
          color: colors[2],
          width: 3,
        }),
        createTransform({
          position: createLoopedPosition({
            center,
            xOffset: 34 + column * 4,
            yOffset: 10 + row * 3,
          }),
          rotation: createLoopedRotation({
            amount: 32 + index * 2,
            start: index * 4,
          }),
          scale: [108, 108],
        }),
      ],
      nm: `peak overlay group ${index + 1}`,
      ty: "gr",
    } as const satisfies LottieShapeItem;
  });
};

const createUnsupportedStarGroups = () => {
  return Array.from({ length: 10 }, (_, index) => {
    const column = index % 5;
    const row = Math.floor(index / 5);
    const center: LottieVector2 = [140 + column * 168, 878 + row * 116];
    const colors = [
      unsupportedPalette[index % unsupportedPalette.length] ?? unsupportedPalette[0],
      unsupportedPalette[(index + 1) % unsupportedPalette.length] ?? unsupportedPalette[1],
      unsupportedPalette[(index + 2) % unsupportedPalette.length] ?? unsupportedPalette[2],
    ] as const;
    const isPolygon = index % 2 === 1;

    const polystar = {
      nm: isPolygon ? `polygon ${index + 1}` : `star ${index + 1}`,
      or: staticNumber(38 + (index % 4) * 8),
      os: staticNumber(16 + (index % 3) * 4),
      p: staticVector2([0, 0]),
      pt: staticNumber(isPolygon ? 6 + (index % 3) : 5 + (index % 3)),
      r: createLoopedRotation({
        amount: 40 + index * 3,
        start: index * 10,
      }),
      sy: isPolygon ? 2 : 1,
      ty: "sr",
      ...(isPolygon
        ? {}
        : {
            ir: staticNumber(22 + (index % 3) * 6),
            is: staticNumber(18 + (index % 4) * 4),
          }),
    } as const;

    return {
      it: [
        polystar,
        createLinearGradientFill({
          colors,
          end: [44, 0],
          start: [-44, 0],
        }),
        createSolidStroke({
          color: colors[2],
          width: 3,
        }),
        createTransform({
          position: createLoopedPosition({
            center,
            xOffset: 24 + column * 2,
            yOffset: 18 + row * 2,
          }),
        }),
      ],
      nm: `unsupported star polygon group ${index + 1}`,
      ty: "gr",
    } as const satisfies LottieShapeItem;
  });
};

const createUnsupportedModifierGroups = () => {
  const modifierCenters: readonly LottieVector2[] = [
    [706, 832],
    [826, 826],
    [946, 836],
    [704, 948],
    [826, 948],
    [944, 946],
  ];

  return modifierCenters.map((center, index) => {
    const colors = [
      unsupportedPalette[index % unsupportedPalette.length] ?? unsupportedPalette[0],
      unsupportedPalette[(index + 2) % unsupportedPalette.length] ?? unsupportedPalette[1],
      unsupportedPalette[(index + 3) % unsupportedPalette.length] ?? unsupportedPalette[2],
    ] as const;
    const basePath = {
      d: 1,
      ks: staticPath(
        createWavePathGeometry({
          closed: index % 2 === 0,
          height: 52,
          width: 92,
        }),
      ),
      nm: `unsupported path ${index + 1}`,
      ty: "sh",
    } as const;

    const modifier = match(index)
      .with(0, () => {
        return {
          e: animatedNumber([
            { e: 100, s: 28, t: mixedPhaseStart },
            { e: 52, s: 100, t: peakPhaseStart },
            { s: 52, t: lastFrame },
          ]),
          m: 1,
          nm: "trim paths",
          o: staticNumber(0),
          s: staticNumber(0),
          ty: "tm",
        } as const;
      })
      .with(1, () => {
        return {
          c: staticNumber(6),
          m: 1,
          nm: "repeater",
          o: staticNumber(0),
          tr: {
            a: staticVector2([0, 0]),
            eo: staticNumber(100),
            o: staticNumber(100),
            p: staticVector2([16, -10]),
            r: staticNumber(10),
            s: staticVector2([90, 90]),
            so: staticNumber(100),
          },
          ty: "rp",
        } as const;
      })
      .with(2, () => {
        return {
          nm: "round corners",
          r: staticNumber(18),
          ty: "rd",
        } as const;
      })
      .with(3, () => {
        return {
          jm: 2,
          m: 2,
          nm: "offset path",
          ty: "op",
          a: staticNumber(14),
        } as const;
      })
      .with(4, () => {
        return {
          a: staticNumber(-48),
          nm: "pucker bloat",
          ty: "pb",
        } as const;
      })
      .otherwise(() => {
        return {
          nm: "zig zag",
          r: staticNumber(6),
          s: staticNumber(14),
          pt: staticNumber(2),
          ty: "zz",
        } as const;
      });

    return {
      it: [
        basePath,
        index % 2 === 0
          ? createGradientStroke({
              colors,
              end: [48, 0],
              start: [-48, 0],
              width: 6,
            })
          : createSolidStroke({
              color: colors[1],
              width: 6,
            }),
        modifier,
        createTransform({
          position: createLoopedPosition({
            center,
            xOffset: 18 + index * 2,
            yOffset: 8 + index,
          }),
          rotation: createLoopedRotation({
            amount: 18 + index * 2,
            start: index * 5,
          }),
        }),
      ],
      nm: `unsupported modifier group ${index + 1}`,
      ty: "gr",
    } as const satisfies LottieShapeItem;
  });
};

const createPhaseMarkers = (): LottieMarker[] => {
  return [
    {
      cm: "supported",
      dr: mixedPhaseStart - supportedPhaseStart,
      tm: supportedPhaseStart,
    },
    {
      cm: "mixed",
      dr: peakPhaseStart - mixedPhaseStart,
      tm: mixedPhaseStart,
    },
    {
      cm: "peak",
      dr: compositionFrameCount - peakPhaseStart,
      tm: peakPhaseStart,
    },
  ];
};

const createStressTestLayers = () => {
  return [
    createShapeLayer({
      index: 1,
      name: "supported rectangles",
      shapes: createRectangleGridGroups(),
    }),
    createShapeLayer({
      index: 2,
      name: "supported ellipses",
      shapes: createEllipseGridGroups(),
    }),
    createShapeLayer({
      index: 3,
      name: "supported paths",
      shapes: createPathGroups(),
    }),
    createShapeLayer({
      index: 4,
      name: "supported nested orbit",
      shapes: createNestedOrbitGroups(),
    }),
    createShapeLayer({
      inFrame: mixedPhaseStart,
      index: 5,
      name: "unsupported stars and polygons",
      shapes: createUnsupportedStarGroups(),
    }),
    createShapeLayer({
      inFrame: mixedPhaseStart,
      index: 6,
      name: "unsupported modifiers",
      shapes: createUnsupportedModifierGroups(),
    }),
    createShapeLayer({
      inFrame: peakPhaseStart,
      index: 7,
      name: "peak overlay",
      shapes: createPeakOverlayGroups(),
    }),
  ] satisfies LottieShapeLayer[];
};

export const createStressTestLottie = (): LottieComposition => {
  return {
    fr: compositionFrameRate,
    h: compositionHeight,
    ip: supportedPhaseStart,
    layers: createStressTestLayers(),
    markers: createPhaseMarkers(),
    nm: "Stress Test Comparison",
    op: compositionFrameCount,
    v: "5.7.5",
    w: compositionWidth,
  };
};

const createSupportedCounts = (): SupportedCounts => {
  return {
    ellipses: 0,
    gradientFills: 0,
    gradientStrokes: 0,
    groups: 0,
    paths: 0,
    rectangles: 0,
    shapeLayers: 0,
    solidFills: 0,
    solidStrokes: 0,
    transforms: 0,
  };
};

const createUnsupportedCounts = (): UnsupportedCounts => {
  return {
    offsetPaths: 0,
    polygons: 0,
    puckerBloat: 0,
    repeaters: 0,
    roundCorners: 0,
    stars: 0,
    trimPaths: 0,
    zigZag: 0,
  };
};

const isShapeLayer = (layer: unknown): layer is LottieShapeLayer => {
  return (
    typeof layer === "object" &&
    layer !== null &&
    "ty" in layer &&
    layer.ty === 4 &&
    "shapes" in layer &&
    Array.isArray(layer.shapes)
  );
};

const hasShapeType = (shape: unknown): shape is { it?: unknown[]; sy?: number; ty: string } => {
  return (
    typeof shape === "object" && shape !== null && "ty" in shape && typeof shape.ty === "string"
  );
};

const countShapeItem = ({
  shape,
  supportedCounts,
  unsupportedCounts,
}: {
  shape: unknown;
  supportedCounts: SupportedCounts;
  unsupportedCounts: UnsupportedCounts;
}) => {
  if (!hasShapeType(shape)) {
    return;
  }

  match(shape.ty)
    .with("gr", () => {
      supportedCounts.groups += 1;

      if (!Array.isArray(shape.it)) {
        return;
      }

      shape.it.forEach((item) => {
        countShapeItem({
          shape: item,
          supportedCounts,
          unsupportedCounts,
        });
      });
    })
    .with("rc", () => {
      supportedCounts.rectangles += 1;
    })
    .with("el", () => {
      supportedCounts.ellipses += 1;
    })
    .with("sh", () => {
      supportedCounts.paths += 1;
    })
    .with("fl", () => {
      supportedCounts.solidFills += 1;
    })
    .with("gf", () => {
      supportedCounts.gradientFills += 1;
    })
    .with("st", () => {
      supportedCounts.solidStrokes += 1;
    })
    .with("gs", () => {
      supportedCounts.gradientStrokes += 1;
    })
    .with("tr", () => {
      supportedCounts.transforms += 1;
    })
    .with("sr", () => {
      if (shape.sy === 2) {
        unsupportedCounts.polygons += 1;

        return;
      }

      unsupportedCounts.stars += 1;
    })
    .with("tm", () => {
      unsupportedCounts.trimPaths += 1;
    })
    .with("rp", () => {
      unsupportedCounts.repeaters += 1;
    })
    .with("rd", () => {
      unsupportedCounts.roundCorners += 1;
    })
    .with("pb", () => {
      unsupportedCounts.puckerBloat += 1;
    })
    .with("op", () => {
      unsupportedCounts.offsetPaths += 1;
    })
    .with("zz", () => {
      unsupportedCounts.zigZag += 1;
    })
    .otherwise(() => {
      return undefined;
    });
};

export const summarizeStressTestLottie = (animation: LottieComposition): StressTestSummary => {
  const supportedCounts = createSupportedCounts();
  const unsupportedCounts = createUnsupportedCounts();

  animation.layers.forEach((layer) => {
    if (!isShapeLayer(layer)) {
      return;
    }

    supportedCounts.shapeLayers += 1;
    layer.shapes.forEach((shape) => {
      countShapeItem({
        shape,
        supportedCounts,
        unsupportedCounts,
      });
    });
  });

  return {
    frameMarkers: (animation.markers ?? []).map((marker) => {
      return {
        duration: marker.dr,
        frame: marker.tm,
        name: marker.cm,
      };
    }),
    jsonBytesEstimate: new TextEncoder().encode(JSON.stringify(animation)).byteLength,
    supportedCounts,
    unsupportedCounts,
  };
};
