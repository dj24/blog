"use client";

import { useEffect, useId, useRef, useState } from "react";
import { match } from "ts-pattern";
import type {
  LottieBezierPathGeometry,
  LottieBezierPathGeometryProperty,
  LottieColorProperty,
  LottieGradientStopValuesProperty,
  LottieNumberProperty,
  LottieVector2,
  LottieVector2Property,
} from "../_lib/types/lottie-property";
import type {
  KnownLottieShapeItem,
  PlaygroundImageSample,
  PlaygroundTextSample,
  ShapeSample,
} from "./page";
import styles from "./page.module.css";

type EditableShape =
  | {
      ty: "gr";
      it: EditableShape[];
    }
  | {
      ty: "sh";
      d?: number;
      ks: LottieBezierPathGeometry;
    }
  | {
      ty: "rc";
      d?: number;
      s: LottieVector2;
      p: LottieVector2;
      r: number;
    }
  | {
      ty: "el";
      d?: number;
      s: LottieVector2;
      p: LottieVector2;
    }
  | {
      ty: "sr";
      sy?: number;
      pt: number;
      p: LottieVector2;
      or: number;
      os: number;
      r: number;
      ir?: number;
      is?: number;
    }
  | {
      ty: "fl";
      c: [number, number, number];
      o: number;
      r?: number;
      bm?: number;
    }
  | {
      ty: "gf";
      o: number;
      r?: number;
      bm?: number;
      g: {
        p: number;
        k: number[];
      };
      s: LottieVector2;
      e: LottieVector2;
      t?: number;
    }
  | {
      ty: "st";
      c: [number, number, number];
      o: number;
      w: number;
      lc?: number;
      lj?: number;
      ml?: number;
      bm?: number;
    }
  | {
      ty: "gs";
      o: number;
      w: number;
      g: {
        p: number;
        k: number[];
      };
      s: LottieVector2;
      e: LottieVector2;
      t?: number;
      lc?: number;
      lj?: number;
      ml?: number;
      bm?: number;
    }
  | {
      ty: "no";
      bm?: number;
    }
  | {
      ty: "tm";
      s: number;
      e: number;
      o: number;
      m?: number;
    }
  | {
      ty: "rp";
      c: number;
      o: number;
      m?: number;
      tr: {
        a?: LottieVector2;
        p?: LottieVector2;
        s?: LottieVector2;
        r?: number;
        o?: number;
        sk?: number;
        sa?: number;
        so?: number;
        eo?: number;
      };
    }
  | {
      ty: "rd";
      r: number;
    }
  | {
      ty: "pb";
      a: number;
    }
  | {
      ty: "tw";
      a: number;
      c: LottieVector2;
    }
  | {
      ty: "mm";
      mm: number;
    }
  | {
      ty: "op";
      a: number;
      lj?: number;
      ml?: number;
    }
  | {
      ty: "zz";
      r: number;
      s: number;
      pt: number;
    }
  | {
      ty: "tr";
      p?: LottieVector2;
      a?: LottieVector2;
      s?: LottieVector2;
      r?: number;
      o?: number;
    };

type EditableTextLayer = PlaygroundTextSample;
type EditableImageLayer = PlaygroundImageSample;
type EditablePlaygroundItem = EditableShape | EditableTextLayer | EditableImageLayer;

const canvasSize = 240;
const previewCenter = canvasSize / 2;
const previewRectSize = 120;

const resolveNumberProperty = (property: LottieNumberProperty): number => {
  return property.a === 0 ? property.k : property.k[0]?.s ?? 0;
};

const resolveVector2Property = (property: LottieVector2Property): LottieVector2 => {
  return property.a === 0 ? property.k : property.k[0]?.s ?? [0, 0];
};

const resolveColorProperty = (property: LottieColorProperty): [number, number, number] => {
  return property.a === 0 ? property.k : property.k[0]?.s ?? [0, 0, 0];
};

const resolveGradientProperty = (property: LottieGradientStopValuesProperty): number[] => {
  return property.a === 0 ? property.k : property.k[0]?.s ?? [];
};

const resolveBezierGeometry = (property: LottieBezierPathGeometryProperty): LottieBezierPathGeometry => {
  return property.a === 0
    ? property.k
    : property.k[0]?.s ?? {
        c: false,
        v: [],
        i: [],
        o: [],
      };
};

const normalizeShape = (shape: KnownLottieShapeItem): EditableShape => {
  return match(shape)
    .with({ ty: "gr" }, (group) => ({
      ty: "gr",
      it: (group.it as KnownLottieShapeItem[]).map(normalizeShape),
    }) as EditableShape)
    .with({ ty: "sh" }, (pathShape) => ({
      ty: "sh",
      d: pathShape.d,
      ks: resolveBezierGeometry(pathShape.ks),
    }) as EditableShape)
    .with({ ty: "rc" }, (rectangle) => ({
      ty: "rc",
      d: rectangle.d,
      s: resolveVector2Property(rectangle.s),
      p: resolveVector2Property(rectangle.p),
      r: resolveNumberProperty(rectangle.r),
    }) as EditableShape)
    .with({ ty: "el" }, (ellipse) => ({
      ty: "el",
      d: ellipse.d,
      s: resolveVector2Property(ellipse.s),
      p: resolveVector2Property(ellipse.p),
    }) as EditableShape)
    .with({ ty: "sr" }, (polystar) => ({
      ty: "sr",
      sy: polystar.sy,
      pt: resolveNumberProperty(polystar.pt),
      p: resolveVector2Property(polystar.p),
      or: resolveNumberProperty(polystar.or),
      os: resolveNumberProperty(polystar.os),
      r: resolveNumberProperty(polystar.r),
      ir: polystar.ir ? resolveNumberProperty(polystar.ir) : undefined,
      is: polystar.is ? resolveNumberProperty(polystar.is) : undefined,
    }) as EditableShape)
    .with({ ty: "fl" }, (fill) => ({
      ty: "fl",
      c: resolveColorProperty(fill.c),
      o: resolveNumberProperty(fill.o),
      r: fill.r,
      bm: fill.bm,
    }) as EditableShape)
    .with({ ty: "gf" }, (gradientFill) => ({
      ty: "gf",
      o: resolveNumberProperty(gradientFill.o),
      r: gradientFill.r,
      bm: gradientFill.bm,
      g: {
        p: gradientFill.g.p,
        k: resolveGradientProperty(gradientFill.g.k),
      },
      s: resolveVector2Property(gradientFill.s),
      e: resolveVector2Property(gradientFill.e),
      t: gradientFill.t,
    }) as EditableShape)
    .with({ ty: "st" }, (stroke) => ({
      ty: "st",
      c: resolveColorProperty(stroke.c),
      o: resolveNumberProperty(stroke.o),
      w: resolveNumberProperty(stroke.w),
      lc: stroke.lc,
      lj: stroke.lj,
      ml: stroke.ml,
      bm: stroke.bm,
    }) as EditableShape)
    .with({ ty: "gs" }, (gradientStroke) => ({
      ty: "gs",
      o: resolveNumberProperty(gradientStroke.o),
      w: resolveNumberProperty(gradientStroke.w),
      g: {
        p: gradientStroke.g.p,
        k: resolveGradientProperty(gradientStroke.g.k),
      },
      s: resolveVector2Property(gradientStroke.s),
      e: resolveVector2Property(gradientStroke.e),
      t: gradientStroke.t,
      lc: gradientStroke.lc,
      lj: gradientStroke.lj,
      ml: gradientStroke.ml,
      bm: gradientStroke.bm,
    }) as EditableShape)
    .with({ ty: "no" }, (noStyle) => ({
      ty: "no",
      bm: noStyle.bm,
    }) as EditableShape)
    .with({ ty: "tm" }, (trim) => ({
      ty: "tm",
      s: resolveNumberProperty(trim.s),
      e: resolveNumberProperty(trim.e),
      o: resolveNumberProperty(trim.o),
      m: trim.m,
    }) as EditableShape)
    .with({ ty: "rp" }, (repeater) => ({
      ty: "rp",
      c: resolveNumberProperty(repeater.c),
      o: resolveNumberProperty(repeater.o),
      m: repeater.m,
      tr: {
        a: repeater.tr.a ? resolveVector2Property(repeater.tr.a) : undefined,
        p: repeater.tr.p ? resolveVector2Property(repeater.tr.p) : undefined,
        s: repeater.tr.s ? resolveVector2Property(repeater.tr.s) : undefined,
        r: repeater.tr.r ? resolveNumberProperty(repeater.tr.r) : undefined,
        o: repeater.tr.o ? resolveNumberProperty(repeater.tr.o) : undefined,
        sk: repeater.tr.sk ? resolveNumberProperty(repeater.tr.sk) : undefined,
        sa: repeater.tr.sa ? resolveNumberProperty(repeater.tr.sa) : undefined,
        so: repeater.tr.so ? resolveNumberProperty(repeater.tr.so) : undefined,
        eo: repeater.tr.eo ? resolveNumberProperty(repeater.tr.eo) : undefined,
      },
    }) as EditableShape)
    .with({ ty: "rd" }, (roundedCorners) => ({
      ty: "rd",
      r: resolveNumberProperty(roundedCorners.r),
    }) as EditableShape)
    .with({ ty: "pb" }, (puckerBloat) => ({
      ty: "pb",
      a: resolveNumberProperty(puckerBloat.a),
    }) as EditableShape)
    .with({ ty: "tw" }, (twist) => ({
      ty: "tw",
      a: resolveNumberProperty(twist.a),
      c: resolveVector2Property(twist.c),
    }) as EditableShape)
    .with({ ty: "mm" }, (merge) => ({
      ty: "mm",
      mm: merge.mm,
    }) as EditableShape)
    .with({ ty: "op" }, (offsetPath) => ({
      ty: "op",
      a: resolveNumberProperty(offsetPath.a),
      lj: offsetPath.lj,
      ml: offsetPath.ml ? resolveNumberProperty(offsetPath.ml) : undefined,
    }) as EditableShape)
    .with({ ty: "zz" }, (zigZag) => ({
      ty: "zz",
      r: resolveNumberProperty(zigZag.r),
      s: resolveNumberProperty(zigZag.s),
      pt: resolveNumberProperty(zigZag.pt),
    }) as EditableShape)
    .with({ ty: "tr" }, (transform) => ({
      ty: "tr",
      p: transform.p ? resolveVector2Property(transform.p) : undefined,
      a: transform.a ? resolveVector2Property(transform.a) : undefined,
      s: transform.s ? resolveVector2Property(transform.s) : undefined,
      r: transform.r ? resolveNumberProperty(transform.r) : undefined,
      o: transform.o ? resolveNumberProperty(transform.o) : undefined,
    }) as EditableShape)
    .exhaustive();
};

const normalizePlaygroundItem = (sample: ShapeSample): EditablePlaygroundItem => {
  return match(sample)
    .with({ kind: "shape" }, ({ shape }) => normalizeShape(shape))
    .with({ kind: "text" }, ({ textLayer }) => textLayer)
    .with({ kind: "image" }, ({ imageLayer }) => imageLayer)
    .exhaustive();
};

const toCssColor = ([red, green, blue]: [number, number, number], opacity = 100) => {
  return `rgba(${Math.round(red * 255)}, ${Math.round(green * 255)}, ${Math.round(blue * 255)}, ${opacity / 100})`;
};

const clamp = (value: number, min: number, max: number) => {
  return Math.min(max, Math.max(min, value));
};

const buildGradientStops = (values: number[], stopCount: number) => {
  const safeStopCount = Math.max(1, stopCount);

  return Array.from({ length: safeStopCount }, (_, index) => {
    const offset = values[index * 4] ?? index / Math.max(1, safeStopCount - 1);
    const red = values[index * 4 + 1] ?? 0;
    const green = values[index * 4 + 2] ?? 0;
    const blue = values[index * 4 + 3] ?? 0;

    return {
      offset: clamp(offset, 0, 1),
      color: toCssColor([red, green, blue]),
    };
  });
};

const createGradient = (
  context: CanvasRenderingContext2D,
  gradientShape: Extract<EditableShape, { ty: "gf" | "gs" }>,
) => {
  const startX = previewCenter + gradientShape.s[0];
  const startY = previewCenter + gradientShape.s[1];
  const endX = previewCenter + gradientShape.e[0];
  const endY = previewCenter + gradientShape.e[1];
  const gradient =
    gradientShape.t === 2
      ? context.createRadialGradient(startX, startY, 8, endX, endY, 96)
      : context.createLinearGradient(startX, startY, endX, endY);

  buildGradientStops(gradientShape.g.k, gradientShape.g.p).forEach((stop) => {
    gradient.addColorStop(stop.offset, stop.color);
  });

  return gradient;
};

const drawAxis = (context: CanvasRenderingContext2D) => {
  context.save();
  context.strokeStyle = "rgba(100, 86, 66, 0.18)";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(previewCenter, 20);
  context.lineTo(previewCenter, canvasSize - 20);
  context.moveTo(20, previewCenter);
  context.lineTo(canvasSize - 20, previewCenter);
  context.stroke();
  context.restore();
};

const drawRoundedRectPath = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) => {
  context.beginPath();
  context.roundRect(x, y, width, height, clamp(radius, 0, Math.min(width, height) / 2));
};

const drawPathGeometry = (context: CanvasRenderingContext2D, geometry: LottieBezierPathGeometry) => {
  if (geometry.v.length === 0) {
    return;
  }

  const [firstX, firstY] = geometry.v[0] ?? [0, 0];
  context.beginPath();
  context.moveTo(previewCenter + firstX, previewCenter + firstY);

  for (let index = 0; index < geometry.v.length - 1; index += 1) {
    const currentVertex = geometry.v[index] ?? [0, 0];
    const nextVertex = geometry.v[index + 1] ?? [0, 0];
    const outgoing = geometry.o[index] ?? [0, 0];
    const incoming = geometry.i[index + 1] ?? [0, 0];

    context.bezierCurveTo(
      previewCenter + currentVertex[0] + outgoing[0],
      previewCenter + currentVertex[1] + outgoing[1],
      previewCenter + nextVertex[0] + incoming[0],
      previewCenter + nextVertex[1] + incoming[1],
      previewCenter + nextVertex[0],
      previewCenter + nextVertex[1],
    );
  }

  if (geometry.c && geometry.v.length > 1) {
    const lastIndex = geometry.v.length - 1;
    const lastVertex = geometry.v[lastIndex] ?? [0, 0];
    const outgoing = geometry.o[lastIndex] ?? [0, 0];
    const incoming = geometry.i[0] ?? [0, 0];

    context.bezierCurveTo(
      previewCenter + lastVertex[0] + outgoing[0],
      previewCenter + lastVertex[1] + outgoing[1],
      previewCenter + firstX + incoming[0],
      previewCenter + firstY + incoming[1],
      previewCenter + firstX,
      previewCenter + firstY,
    );
    context.closePath();
  }
};

const drawPolystarPath = (
  context: CanvasRenderingContext2D,
  shape: Extract<EditableShape, { ty: "sr" }>,
) => {
  const isPolygon = shape.sy === 2;
  const outerPoints = Math.max(3, Math.round(shape.pt));
  const totalPoints = isPolygon ? outerPoints : outerPoints * 2;
  const rotation = (shape.r * Math.PI) / 180 - Math.PI / 2;

  context.beginPath();

  Array.from({ length: totalPoints }, (_, index) => index).forEach((pointIndex) => {
    const useOuterRadius = isPolygon || pointIndex % 2 === 0;
    const radius = useOuterRadius ? shape.or : shape.ir ?? shape.or / 2;
    const angle = rotation + (pointIndex / totalPoints) * Math.PI * 2;
    const x = previewCenter + shape.p[0] + Math.cos(angle) * radius;
    const y = previewCenter + shape.p[1] + Math.sin(angle) * radius;

    if (pointIndex === 0) {
      context.moveTo(x, y);
      return;
    }

    context.lineTo(x, y);
  });

  context.closePath();
};

const drawSampleLinePath = (context: CanvasRenderingContext2D) => {
  context.beginPath();
  context.moveTo(44, 168);
  context.bezierCurveTo(88, 60, 144, 228, 196, 88);
};

const drawTrimArc = (
  context: CanvasRenderingContext2D,
  trim: Extract<EditableShape, { ty: "tm" }>,
) => {
  const start = ((trim.s + trim.o) / 100) * Math.PI * 2 - Math.PI / 2;
  const end = ((trim.e + trim.o) / 100) * Math.PI * 2 - Math.PI / 2;

  context.beginPath();
  context.arc(previewCenter, previewCenter, 76, start, end);
};

const drawRepeaterPreview = (
  context: CanvasRenderingContext2D,
  repeater: Extract<EditableShape, { ty: "rp" }>,
) => {
  const copies = Math.max(1, Math.round(repeater.c));
  const offset = repeater.o;
  const stepX = repeater.tr.p?.[0] ?? 16;
  const stepY = repeater.tr.p?.[1] ?? -10;
  const rotation = ((repeater.tr.r ?? 0) * Math.PI) / 180;
  const scaleX = (repeater.tr.s?.[0] ?? 100) / 100;
  const scaleY = (repeater.tr.s?.[1] ?? 100) / 100;
  const startOpacity = repeater.tr.so ?? 100;
  const endOpacity = repeater.tr.eo ?? 20;

  Array.from({ length: copies }, (_, index) => index).forEach((copyIndex) => {
    const progress = copies === 1 ? 0 : copyIndex / (copies - 1);
    const opacity = startOpacity + (endOpacity - startOpacity) * progress;

    context.save();
    context.translate(
      previewCenter + (copyIndex + offset) * stepX,
      previewCenter + (copyIndex + offset) * stepY,
    );
    context.rotate(rotation * copyIndex);
    context.scale(scaleX ** copyIndex, scaleY ** copyIndex);
    context.globalAlpha = opacity / 100;
    drawRoundedRectPath(context, -30, -20, 60, 40, 12);
    context.fillStyle = "rgba(61, 64, 91, 0.20)";
    context.strokeStyle = "#3d405b";
    context.lineWidth = 2;
    context.fill();
    context.stroke();
    context.restore();
  });
};

const drawTwistPreview = (
  context: CanvasRenderingContext2D,
  twist: Extract<EditableShape, { ty: "tw" }>,
) => {
  const spokes = 6;
  const maxRadius = 72;

  context.save();
  context.strokeStyle = "#355070";
  context.lineWidth = 3;

  Array.from({ length: spokes }, (_, index) => index).forEach((spokeIndex) => {
    const baseAngle = (spokeIndex / spokes) * Math.PI * 2;
    context.beginPath();

    Array.from({ length: 13 }, (_, step) => step).forEach((stepIndex) => {
      const progress = stepIndex / 12;
      const radius = progress * maxRadius;
      const angle = baseAngle + (((twist.a * progress) / 180) * Math.PI) / 2;
      const x = previewCenter + twist.c[0] + Math.cos(angle) * radius;
      const y = previewCenter + twist.c[1] + Math.sin(angle) * radius;

      if (stepIndex === 0) {
        context.moveTo(x, y);
        return;
      }

      context.lineTo(x, y);
    });

    context.stroke();
  });

  context.restore();
};

const drawZigZagPreview = (
  context: CanvasRenderingContext2D,
  zigZag: Extract<EditableShape, { ty: "zz" }>,
) => {
  const ridges = Math.max(2, Math.round(zigZag.r));
  const amplitude = zigZag.s;

  context.beginPath();

  Array.from({ length: ridges + 1 }, (_, index) => index).forEach((ridgeIndex) => {
    const x = 36 + (ridgeIndex / ridges) * 168;
    const y = previewCenter + (ridgeIndex % 2 === 0 ? -amplitude / 2 : amplitude / 2);

    if (ridgeIndex === 0) {
      context.moveTo(x, y);
      return;
    }

    if (zigZag.pt >= 2) {
      const previousX = 36 + ((ridgeIndex - 1) / ridges) * 168;
      const midpoint = (previousX + x) / 2;
      context.quadraticCurveTo(midpoint, y, x, y);
      return;
    }

    context.lineTo(x, y);
  });
};

const renderShapePreview = (context: CanvasRenderingContext2D, shape: EditableShape) => {
  match(shape)
    .with({ ty: "gr" }, (group) => {
      if (group.it.length === 0) {
        context.fillStyle = "#645642";
        context.font = "600 14px monospace";
        context.fillText("empty group", 78, previewCenter);
        return;
      }

      group.it.forEach((child) => {
        renderShapePreview(context, child);
      });
    })
    .with({ ty: "sh" }, (pathShape) => {
      drawPathGeometry(context, pathShape.ks);
      context.fillStyle = "rgba(163, 48, 31, 0.18)";
      context.strokeStyle = "#a3301f";
      context.lineWidth = 3;
      context.fill();
      context.stroke();
    })
    .with({ ty: "rc" }, (rectangle) => {
      drawRoundedRectPath(
        context,
        previewCenter + rectangle.p[0] - rectangle.s[0] / 2,
        previewCenter + rectangle.p[1] - rectangle.s[1] / 2,
        rectangle.s[0],
        rectangle.s[1],
        rectangle.r,
      );
      context.fillStyle = "rgba(237, 174, 73, 0.28)";
      context.strokeStyle = "#bc6c25";
      context.lineWidth = 3;
      context.fill();
      context.stroke();
    })
    .with({ ty: "el" }, (ellipse) => {
      context.beginPath();
      context.ellipse(
        previewCenter + ellipse.p[0],
        previewCenter + ellipse.p[1],
        ellipse.s[0] / 2,
        ellipse.s[1] / 2,
        0,
        0,
        Math.PI * 2,
      );
      context.fillStyle = "rgba(82, 183, 136, 0.24)";
      context.strokeStyle = "#2d6a4f";
      context.lineWidth = 3;
      context.fill();
      context.stroke();
    })
    .with({ ty: "sr" }, (polystar) => {
      drawPolystarPath(context, polystar);
      context.fillStyle = "rgba(105, 48, 195, 0.18)";
      context.strokeStyle = "#5a189a";
      context.lineWidth = 3;
      context.fill();
      context.stroke();
    })
    .with({ ty: "fl" }, (fill) => {
      drawRoundedRectPath(context, 56, 56, 128, 128, 20);
      context.fillStyle = toCssColor(fill.c, fill.o);
      context.fill(fill.r === 2 ? "evenodd" : "nonzero");
    })
    .with({ ty: "gf" }, (gradientFill) => {
      drawRoundedRectPath(context, 44, 44, 152, 152, 28);
      context.fillStyle = createGradient(context, gradientFill);
      context.globalAlpha = gradientFill.o / 100;
      context.fill(gradientFill.r === 2 ? "evenodd" : "nonzero");
      context.globalAlpha = 1;
    })
    .with({ ty: "st" }, (stroke) => {
      drawSampleLinePath(context);
      context.strokeStyle = toCssColor(stroke.c, stroke.o);
      context.lineWidth = stroke.w;
      context.lineCap = stroke.lc === 3 ? "square" : stroke.lc === 2 ? "round" : "butt";
      context.lineJoin = stroke.lj === 3 ? "bevel" : stroke.lj === 2 ? "round" : "miter";
      context.miterLimit = stroke.ml ?? 4;
      context.stroke();
    })
    .with({ ty: "gs" }, (gradientStroke) => {
      drawSampleLinePath(context);
      context.strokeStyle = createGradient(context, gradientStroke);
      context.globalAlpha = gradientStroke.o / 100;
      context.lineWidth = gradientStroke.w;
      context.lineCap = gradientStroke.lc === 3 ? "square" : gradientStroke.lc === 2 ? "round" : "butt";
      context.lineJoin = gradientStroke.lj === 3 ? "bevel" : gradientStroke.lj === 2 ? "round" : "miter";
      context.miterLimit = gradientStroke.ml ?? 4;
      context.stroke();
      context.globalAlpha = 1;
    })
    .with({ ty: "no" }, () => {
      drawRoundedRectPath(context, 48, 48, 144, 144, 26);
      context.setLineDash([8, 8]);
      context.strokeStyle = "#9c6644";
      context.lineWidth = 2;
      context.stroke();
      context.setLineDash([]);
      context.fillStyle = "#9c6644";
      context.font = "600 14px monospace";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText("no fill / no stroke", previewCenter, previewCenter);
    })
    .with({ ty: "tm" }, (trim) => {
      context.strokeStyle = "rgba(212, 163, 115, 0.28)";
      context.lineWidth = 18;
      context.beginPath();
      context.arc(previewCenter, previewCenter, 76, 0, Math.PI * 2);
      context.stroke();
      context.strokeStyle = "#7f5539";
      drawTrimArc(context, trim);
      context.stroke();
    })
    .with({ ty: "rp" }, (repeater) => {
      drawRepeaterPreview(context, repeater);
    })
    .with({ ty: "rd" }, (roundedCorners) => {
      drawRoundedRectPath(context, 48, 48, 144, 144, roundedCorners.r);
      context.fillStyle = "rgba(77, 144, 142, 0.22)";
      context.strokeStyle = "#4d908e";
      context.lineWidth = 3;
      context.fill();
      context.stroke();
    })
    .with({ ty: "pb" }, (puckerBloat) => {
      drawPolystarPath(context, {
        ty: "sr",
        sy: 1,
        pt: 8,
        p: [0, 0],
        or: 48 + puckerBloat.a / 3,
        os: 0,
        r: -14,
        ir: clamp(54 - puckerBloat.a / 2, 10, 60),
        is: 0,
      });
      context.fillStyle = "rgba(69, 123, 157, 0.20)";
      context.strokeStyle = "#457b9d";
      context.lineWidth = 3;
      context.fill();
      context.stroke();
    })
    .with({ ty: "tw" }, (twist) => {
      drawTwistPreview(context, twist);
    })
    .with({ ty: "mm" }, (merge) => {
      context.fillStyle = "rgba(230, 57, 70, 0.22)";
      context.beginPath();
      context.arc(96, 120, 44, 0, Math.PI * 2);
      context.arc(144, 120, 44, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = "#9d0208";
      context.lineWidth = 2;
      context.stroke();
      context.fillStyle = "#9d0208";
      context.font = "600 13px monospace";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(`mode ${merge.mm}`, previewCenter, 196);
    })
    .with({ ty: "op" }, (offsetPath) => {
      Array.from({ length: 3 }, (_, index) => index).forEach((ringIndex) => {
        drawRoundedRectPath(
          context,
          66 - ringIndex * (offsetPath.a / 3),
          66 - ringIndex * (offsetPath.a / 3),
          108 + ringIndex * ((offsetPath.a / 3) * 2),
          108 + ringIndex * ((offsetPath.a / 3) * 2),
          20,
        );
        context.strokeStyle = ringIndex === 0 ? "#6d597a" : "rgba(109, 89, 122, 0.45)";
        context.lineWidth = 3;
        context.lineJoin = offsetPath.lj === 3 ? "bevel" : offsetPath.lj === 2 ? "round" : "miter";
        context.miterLimit = offsetPath.ml ?? 4;
        context.stroke();
      });
    })
    .with({ ty: "zz" }, (zigZag) => {
      drawZigZagPreview(context, zigZag);
      context.strokeStyle = "#4361ee";
      context.lineWidth = 4;
      context.lineJoin = zigZag.pt >= 2 ? "round" : "miter";
      context.stroke();
    })
    .with({ ty: "tr" }, (transform) => {
      context.save();
      context.translate(previewCenter + (transform.p?.[0] ?? 0), previewCenter + (transform.p?.[1] ?? 0));
      context.rotate(((transform.r ?? 0) * Math.PI) / 180);
      context.scale((transform.s?.[0] ?? 100) / 100, (transform.s?.[1] ?? 100) / 100);
      context.translate(-(transform.a?.[0] ?? 0), -(transform.a?.[1] ?? 0));
      context.globalAlpha = (transform.o ?? 100) / 100;
      drawRoundedRectPath(context, -previewRectSize / 2, -previewRectSize / 2, previewRectSize, previewRectSize, 18);
      context.fillStyle = "rgba(230, 57, 70, 0.24)";
      context.strokeStyle = "#9d0208";
      context.lineWidth = 3;
      context.fill();
      context.stroke();
      context.restore();
    })
    .exhaustive();
};

const renderTextPreview = (
  context: CanvasRenderingContext2D,
  textLayer: EditableTextLayer,
) => {
  context.save();
  context.font = `600 ${textLayer.fontSize}px ${textLayer.fontFamily}`;
  context.fillStyle = toCssColor(textLayer.color, textLayer.opacity);
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(
    textLayer.text,
    previewCenter + textLayer.position[0],
    previewCenter + textLayer.position[1],
    canvasSize - 32,
  );
  context.restore();
};

const drawImageFallback = (context: CanvasRenderingContext2D) => {
  drawRoundedRectPath(context, 44, 66, 152, 108, 24);
  context.fillStyle = "rgba(56, 102, 65, 0.12)";
  context.strokeStyle = "#386641";
  context.lineWidth = 2;
  context.fill();
  context.stroke();
  context.fillStyle = "#386641";
  context.font = "600 14px monospace";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText("image unavailable", previewCenter, previewCenter);
};

const renderImagePreview = (
  context: CanvasRenderingContext2D,
  imageLayer: EditableImageLayer,
  imageElement: HTMLImageElement,
) => {
  const width = clamp(imageLayer.width, 24, canvasSize - 24);
  const height = clamp(imageLayer.height, 24, canvasSize - 24);
  const x = previewCenter + imageLayer.position[0] - width / 2;
  const y = previewCenter + imageLayer.position[1] - height / 2;

  context.save();
  drawRoundedRectPath(context, x, y, width, height, 20);
  context.clip();
  context.globalAlpha = imageLayer.opacity / 100;
  context.drawImage(imageElement, x, y, width, height);
  context.restore();

  context.save();
  drawRoundedRectPath(context, x, y, width, height, 20);
  context.strokeStyle = "rgba(56, 102, 65, 0.45)";
  context.lineWidth = 2;
  context.stroke();
  context.restore();
};

const drawPreviewBackground = (context: CanvasRenderingContext2D) => {
  context.clearRect(0, 0, canvasSize, canvasSize);
  context.fillStyle = "#fffaf0";
  context.fillRect(0, 0, canvasSize, canvasSize);
  drawAxis(context);
};

const loadPreviewImage = (src: string) => {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      resolve(image);
    };
    image.onerror = () => {
      reject(new Error(`Unable to load preview image: ${src}`));
    };
    image.src = src;
  });
};

const PreviewCanvas = ({ item }: { item: EditablePlaygroundItem }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    let cancelled = false;

    const renderPreview = async () => {
      drawPreviewBackground(context);

      await match(item)
        .with({ ty: "image" }, async (imageLayer) => {
          try {
            const imageElement = await loadPreviewImage(imageLayer.src);

            if (cancelled) {
              return;
            }

            drawPreviewBackground(context);
            renderImagePreview(context, imageLayer, imageElement);
          } catch {
            if (cancelled) {
              return;
            }

            drawPreviewBackground(context);
            drawImageFallback(context);
          }
        })
        .with({ ty: "text" }, async (textLayer) => {
          renderTextPreview(context, textLayer);
        })
        .otherwise(async (shape) => {
          renderShapePreview(context, shape);
        });
    };

    void renderPreview();

    return () => {
      cancelled = true;
    };
  }, [item]);

  return (
    <canvas
      ref={canvasRef}
      width={canvasSize}
      height={canvasSize}
      className={styles.previewCanvas}
    />
  );
};

const Field = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => {
  return (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      {children}
    </label>
  );
};

const NumberField = ({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (nextValue: number) => void;
}) => {
  const fieldId = useId();

  return (
    <Field label={label}>
      <input
        id={fieldId}
        className={styles.input}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => {
          onChange(Number(event.currentTarget.value));
        }}
      />
      <span className={styles.fieldValue}>{value.toFixed(step < 1 ? 2 : 0)}</span>
    </Field>
  );
};

const ToggleField = ({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) => {
  return (
    <Field label={label}>
      <input
        className={styles.checkbox}
        type="checkbox"
        checked={checked}
        onChange={(event) => {
          onChange(event.currentTarget.checked);
        }}
      />
      <span className={styles.fieldValue}>{checked ? "on" : "off"}</span>
    </Field>
  );
};

const ColorField = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: [number, number, number];
  onChange: (nextValue: [number, number, number]) => void;
}) => {
  const hexValue = `#${value
    .map((channel) => Math.round(channel * 255).toString(16).padStart(2, "0"))
    .join("")}`;

  return (
    <Field label={label}>
      <input
        className={styles.colorInput}
        type="color"
        value={hexValue}
        onChange={(event) => {
          const parsedValue = event.currentTarget.value;
          onChange([
            Number.parseInt(parsedValue.slice(1, 3), 16) / 255,
            Number.parseInt(parsedValue.slice(3, 5), 16) / 255,
            Number.parseInt(parsedValue.slice(5, 7), 16) / 255,
          ]);
        }}
      />
      <span className={styles.fieldValue}>{hexValue}</span>
    </Field>
  );
};

const TextField = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (nextValue: string) => void;
}) => {
  return (
    <Field label={label}>
      <input
        className={styles.input}
        type="text"
        value={value}
        onChange={(event) => {
          onChange(event.currentTarget.value);
        }}
      />
      <span className={styles.fieldValue}>{value.length} chars</span>
    </Field>
  );
};

const Vector2Fields = ({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: LottieVector2;
  min: number;
  max: number;
  step?: number;
  onChange: (nextValue: LottieVector2) => void;
}) => {
  return (
    <>
      <NumberField
        label={`${label} x`}
        value={value[0]}
        min={min}
        max={max}
        step={step}
        onChange={(nextValue) => {
          onChange([nextValue, value[1]]);
        }}
      />
      <NumberField
        label={`${label} y`}
        value={value[1]}
        min={min}
        max={max}
        step={step}
        onChange={(nextValue) => {
          onChange([value[0], nextValue]);
        }}
      />
    </>
  );
};

const GradientStopsReadout = ({
  stopCount,
  values,
}: {
  stopCount: number;
  values: number[];
}) => {
  return (
    <div className={styles.readout}>
      {buildGradientStops(values, stopCount).map((stop, index) => {
        return (
          <div key={`${stop.offset}-${index}`} className={styles.stopRow}>
            <span className={styles.stopSwatch} style={{ background: stop.color }} />
            <span className={styles.stopText}>
              stop {index + 1}: {(stop.offset * 100).toFixed(0)}%
            </span>
          </div>
        );
      })}
    </div>
  );
};

const ShapeControls = ({
  shape,
  setShape,
}: {
  shape: EditableShape;
  setShape: (nextValue: EditableShape) => void;
}) => {
  return match(shape)
    .with({ ty: "gr" }, (group) => (
      <div className={styles.metaList}>
        <div className={styles.metaRow}>
          <span className={styles.metaLabel}>children</span>
          <span className={styles.metaValue}>{group.it.length}</span>
        </div>
        <div className={styles.metaRow}>
          <span className={styles.metaLabel}>types</span>
          <span className={styles.metaValue}>{group.it.map((item) => item.ty).join(", ")}</span>
        </div>
      </div>
    ))
    .with({ ty: "sh" }, (pathShape) => (
      <>
        <ToggleField
          label="ks closed"
          checked={pathShape.ks.c}
          onChange={(checked) => {
            setShape({ ...pathShape, ks: { ...pathShape.ks, c: checked } });
          }}
        />
        <div className={styles.metaList}>
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>ks vertices</span>
            <span className={styles.metaValue}>{pathShape.ks.v.length}</span>
          </div>
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>d direction</span>
            <span className={styles.metaValue}>{pathShape.d ?? "n/a"}</span>
          </div>
        </div>
      </>
    ))
    .with({ ty: "rc" }, (rectangle) => (
      <>
        <Vector2Fields
          label="s size"
          value={rectangle.s}
          min={20}
          max={180}
          onChange={(nextValue) => {
            setShape({ ...rectangle, s: nextValue });
          }}
        />
        <Vector2Fields
          label="p position"
          value={rectangle.p}
          min={-90}
          max={90}
          onChange={(nextValue) => {
            setShape({ ...rectangle, p: nextValue });
          }}
        />
        <NumberField
          label="r radius"
          value={rectangle.r}
          min={0}
          max={80}
          onChange={(nextValue) => {
            setShape({ ...rectangle, r: nextValue });
          }}
        />
      </>
    ))
    .with({ ty: "el" }, (ellipse) => (
      <>
        <Vector2Fields
          label="s size"
          value={ellipse.s}
          min={20}
          max={180}
          onChange={(nextValue) => {
            setShape({ ...ellipse, s: nextValue });
          }}
        />
        <Vector2Fields
          label="p position"
          value={ellipse.p}
          min={-90}
          max={90}
          onChange={(nextValue) => {
            setShape({ ...ellipse, p: nextValue });
          }}
        />
      </>
    ))
    .with({ ty: "sr" }, (polystar) => (
      <>
        <NumberField
          label="sy mode"
          value={polystar.sy ?? 1}
          min={1}
          max={2}
          onChange={(nextValue) => {
            setShape({ ...polystar, sy: nextValue });
          }}
        />
        <NumberField
          label="pt points"
          value={polystar.pt}
          min={3}
          max={12}
          step={1}
          onChange={(nextValue) => {
            setShape({ ...polystar, pt: nextValue });
          }}
        />
        <Vector2Fields
          label="p position"
          value={polystar.p}
          min={-90}
          max={90}
          onChange={(nextValue) => {
            setShape({ ...polystar, p: nextValue });
          }}
        />
        <NumberField
          label="or outer radius"
          value={polystar.or}
          min={20}
          max={96}
          onChange={(nextValue) => {
            setShape({ ...polystar, or: nextValue });
          }}
        />
        <NumberField
          label="ir inner radius"
          value={polystar.ir ?? 36}
          min={8}
          max={80}
          onChange={(nextValue) => {
            setShape({ ...polystar, ir: nextValue });
          }}
        />
        <NumberField
          label="r rotation"
          value={polystar.r}
          min={-180}
          max={180}
          onChange={(nextValue) => {
            setShape({ ...polystar, r: nextValue });
          }}
        />
      </>
    ))
    .with({ ty: "fl" }, (fill) => (
      <>
        <ColorField
          label="c color"
          value={fill.c}
          onChange={(nextValue) => {
            setShape({ ...fill, c: nextValue });
          }}
        />
        <NumberField
          label="o opacity"
          value={fill.o}
          min={0}
          max={100}
          onChange={(nextValue) => {
            setShape({ ...fill, o: nextValue });
          }}
        />
        <NumberField
          label="r fill rule"
          value={fill.r ?? 1}
          min={1}
          max={2}
          onChange={(nextValue) => {
            setShape({ ...fill, r: nextValue });
          }}
        />
      </>
    ))
    .with({ ty: "gf" }, (gradientFill) => (
      <>
        <NumberField
          label="o opacity"
          value={gradientFill.o}
          min={0}
          max={100}
          onChange={(nextValue) => {
            setShape({ ...gradientFill, o: nextValue });
          }}
        />
        <Vector2Fields
          label="s start"
          value={gradientFill.s}
          min={-110}
          max={110}
          onChange={(nextValue) => {
            setShape({ ...gradientFill, s: nextValue });
          }}
        />
        <Vector2Fields
          label="e end"
          value={gradientFill.e}
          min={-110}
          max={110}
          onChange={(nextValue) => {
            setShape({ ...gradientFill, e: nextValue });
          }}
        />
        <NumberField
          label="t gradient kind"
          value={gradientFill.t ?? 1}
          min={1}
          max={2}
          onChange={(nextValue) => {
            setShape({ ...gradientFill, t: nextValue });
          }}
        />
        <GradientStopsReadout stopCount={gradientFill.g.p} values={gradientFill.g.k} />
      </>
    ))
    .with({ ty: "st" }, (stroke) => (
      <>
        <ColorField
          label="c color"
          value={stroke.c}
          onChange={(nextValue) => {
            setShape({ ...stroke, c: nextValue });
          }}
        />
        <NumberField
          label="o opacity"
          value={stroke.o}
          min={0}
          max={100}
          onChange={(nextValue) => {
            setShape({ ...stroke, o: nextValue });
          }}
        />
        <NumberField
          label="w width"
          value={stroke.w}
          min={1}
          max={36}
          onChange={(nextValue) => {
            setShape({ ...stroke, w: nextValue });
          }}
        />
      </>
    ))
    .with({ ty: "gs" }, (gradientStroke) => (
      <>
        <NumberField
          label="o opacity"
          value={gradientStroke.o}
          min={0}
          max={100}
          onChange={(nextValue) => {
            setShape({ ...gradientStroke, o: nextValue });
          }}
        />
        <NumberField
          label="w width"
          value={gradientStroke.w}
          min={1}
          max={36}
          onChange={(nextValue) => {
            setShape({ ...gradientStroke, w: nextValue });
          }}
        />
        <Vector2Fields
          label="s start"
          value={gradientStroke.s}
          min={-110}
          max={110}
          onChange={(nextValue) => {
            setShape({ ...gradientStroke, s: nextValue });
          }}
        />
        <Vector2Fields
          label="e end"
          value={gradientStroke.e}
          min={-110}
          max={110}
          onChange={(nextValue) => {
            setShape({ ...gradientStroke, e: nextValue });
          }}
        />
        <GradientStopsReadout stopCount={gradientStroke.g.p} values={gradientStroke.g.k} />
      </>
    ))
    .with({ ty: "no" }, (noStyle) => (
      <div className={styles.metaList}>
        <div className={styles.metaRow}>
          <span className={styles.metaLabel}>style</span>
          <span className={styles.metaValue}>no fill or stroke</span>
        </div>
        <div className={styles.metaRow}>
          <span className={styles.metaLabel}>bm blend mode</span>
          <span className={styles.metaValue}>{noStyle.bm ?? "n/a"}</span>
        </div>
      </div>
    ))
    .with({ ty: "tm" }, (trim) => (
      <>
        <NumberField
          label="s start"
          value={trim.s}
          min={0}
          max={100}
          onChange={(nextValue) => {
            setShape({ ...trim, s: nextValue });
          }}
        />
        <NumberField
          label="e end"
          value={trim.e}
          min={0}
          max={100}
          onChange={(nextValue) => {
            setShape({ ...trim, e: nextValue });
          }}
        />
        <NumberField
          label="o offset"
          value={trim.o}
          min={-100}
          max={100}
          onChange={(nextValue) => {
            setShape({ ...trim, o: nextValue });
          }}
        />
      </>
    ))
    .with({ ty: "rp" }, (repeater) => (
      <>
        <NumberField
          label="c copies"
          value={repeater.c}
          min={1}
          max={10}
          onChange={(nextValue) => {
            setShape({ ...repeater, c: nextValue });
          }}
        />
        <NumberField
          label="o offset"
          value={repeater.o}
          min={-3}
          max={3}
          onChange={(nextValue) => {
            setShape({ ...repeater, o: nextValue });
          }}
        />
        <Vector2Fields
          label="tr position"
          value={repeater.tr.p ?? [16, -10]}
          min={-40}
          max={40}
          onChange={(nextValue) => {
            setShape({ ...repeater, tr: { ...repeater.tr, p: nextValue } });
          }}
        />
        <Vector2Fields
          label="tr scale"
          value={repeater.tr.s ?? [100, 100]}
          min={40}
          max={140}
          onChange={(nextValue) => {
            setShape({ ...repeater, tr: { ...repeater.tr, s: nextValue } });
          }}
        />
        <NumberField
          label="tr rotation"
          value={repeater.tr.r ?? 0}
          min={-45}
          max={45}
          onChange={(nextValue) => {
            setShape({ ...repeater, tr: { ...repeater.tr, r: nextValue } });
          }}
        />
      </>
    ))
    .with({ ty: "rd" }, (roundedCorners) => (
      <NumberField
        label="r radius"
        value={roundedCorners.r}
        min={0}
        max={72}
        onChange={(nextValue) => {
          setShape({ ...roundedCorners, r: nextValue });
        }}
      />
    ))
    .with({ ty: "pb" }, (puckerBloat) => (
      <NumberField
        label="a amount"
        value={puckerBloat.a}
        min={-100}
        max={100}
        onChange={(nextValue) => {
          setShape({ ...puckerBloat, a: nextValue });
        }}
      />
    ))
    .with({ ty: "tw" }, (twist) => (
      <>
        <NumberField
          label="a angle"
          value={twist.a}
          min={-360}
          max={360}
          onChange={(nextValue) => {
            setShape({ ...twist, a: nextValue });
          }}
        />
        <Vector2Fields
          label="c center"
          value={twist.c}
          min={-60}
          max={60}
          onChange={(nextValue) => {
            setShape({ ...twist, c: nextValue });
          }}
        />
      </>
    ))
    .with({ ty: "mm" }, (merge) => (
      <NumberField
        label="mm mode"
        value={merge.mm}
        min={1}
        max={5}
        onChange={(nextValue) => {
          setShape({ ...merge, mm: nextValue });
        }}
      />
    ))
    .with({ ty: "op" }, (offsetPath) => (
      <>
        <NumberField
          label="a amount"
          value={offsetPath.a}
          min={0}
          max={36}
          onChange={(nextValue) => {
            setShape({ ...offsetPath, a: nextValue });
          }}
        />
        <NumberField
          label="lj join"
          value={offsetPath.lj ?? 1}
          min={1}
          max={3}
          onChange={(nextValue) => {
            setShape({ ...offsetPath, lj: nextValue });
          }}
        />
        <NumberField
          label="ml miter"
          value={offsetPath.ml ?? 4}
          min={1}
          max={12}
          onChange={(nextValue) => {
            setShape({ ...offsetPath, ml: nextValue });
          }}
        />
      </>
    ))
    .with({ ty: "zz" }, (zigZag) => (
      <>
        <NumberField
          label="r frequency"
          value={zigZag.r}
          min={2}
          max={16}
          onChange={(nextValue) => {
            setShape({ ...zigZag, r: nextValue });
          }}
        />
        <NumberField
          label="s amplitude"
          value={zigZag.s}
          min={4}
          max={40}
          onChange={(nextValue) => {
            setShape({ ...zigZag, s: nextValue });
          }}
        />
        <NumberField
          label="pt point type"
          value={zigZag.pt}
          min={1}
          max={2}
          onChange={(nextValue) => {
            setShape({ ...zigZag, pt: nextValue });
          }}
        />
      </>
    ))
    .with({ ty: "tr" }, (transform) => (
      <>
        <Vector2Fields
          label="p position"
          value={transform.p ?? [0, 0]}
          min={-90}
          max={90}
          onChange={(nextValue) => {
            setShape({ ...transform, p: nextValue });
          }}
        />
        <Vector2Fields
          label="a anchor"
          value={transform.a ?? [0, 0]}
          min={-60}
          max={60}
          onChange={(nextValue) => {
            setShape({ ...transform, a: nextValue });
          }}
        />
        <Vector2Fields
          label="s scale"
          value={transform.s ?? [100, 100]}
          min={20}
          max={180}
          onChange={(nextValue) => {
            setShape({ ...transform, s: nextValue });
          }}
        />
        <NumberField
          label="r rotation"
          value={transform.r ?? 0}
          min={-180}
          max={180}
          onChange={(nextValue) => {
            setShape({ ...transform, r: nextValue });
          }}
        />
        <NumberField
          label="o opacity"
          value={transform.o ?? 100}
          min={0}
          max={100}
          onChange={(nextValue) => {
            setShape({ ...transform, o: nextValue });
          }}
        />
      </>
    ))
    .exhaustive();
};

const TextControls = ({
  textLayer,
  setTextLayer,
}: {
  textLayer: EditableTextLayer;
  setTextLayer: (nextValue: EditableTextLayer) => void;
}) => {
  return (
    <>
      <TextField
        label="t content"
        value={textLayer.text}
        onChange={(nextValue) => {
          setTextLayer({ ...textLayer, text: nextValue });
        }}
      />
      <NumberField
        label="s font size"
        value={textLayer.fontSize}
        min={20}
        max={96}
        onChange={(nextValue) => {
          setTextLayer({ ...textLayer, fontSize: nextValue });
        }}
      />
      <Vector2Fields
        label="p position"
        value={textLayer.position}
        min={-90}
        max={90}
        onChange={(nextValue) => {
          setTextLayer({ ...textLayer, position: nextValue });
        }}
      />
      <ColorField
        label="c color"
        value={textLayer.color}
        onChange={(nextValue) => {
          setTextLayer({ ...textLayer, color: nextValue });
        }}
      />
      <NumberField
        label="o opacity"
        value={textLayer.opacity}
        min={0}
        max={100}
        onChange={(nextValue) => {
          setTextLayer({ ...textLayer, opacity: nextValue });
        }}
      />
      <div className={styles.metaList}>
        <div className={styles.metaRow}>
          <span className={styles.metaLabel}>font family</span>
          <span className={styles.metaValue}>{textLayer.fontFamily}</span>
        </div>
      </div>
    </>
  );
};

const ImageControls = ({
  imageLayer,
  setImageLayer,
}: {
  imageLayer: EditableImageLayer;
  setImageLayer: (nextValue: EditableImageLayer) => void;
}) => {
  return (
    <>
      <NumberField
        label="w width"
        value={imageLayer.width}
        min={24}
        max={200}
        onChange={(nextValue) => {
          setImageLayer({ ...imageLayer, width: nextValue });
        }}
      />
      <NumberField
        label="h height"
        value={imageLayer.height}
        min={24}
        max={200}
        onChange={(nextValue) => {
          setImageLayer({ ...imageLayer, height: nextValue });
        }}
      />
      <Vector2Fields
        label="p position"
        value={imageLayer.position}
        min={-90}
        max={90}
        onChange={(nextValue) => {
          setImageLayer({ ...imageLayer, position: nextValue });
        }}
      />
      <NumberField
        label="o opacity"
        value={imageLayer.opacity}
        min={0}
        max={100}
        onChange={(nextValue) => {
          setImageLayer({ ...imageLayer, opacity: nextValue });
        }}
      />
      <div className={styles.metaList}>
        <div className={styles.metaRow}>
          <span className={styles.metaLabel}>alt</span>
          <span className={styles.metaValue}>{imageLayer.alt}</span>
        </div>
      </div>
    </>
  );
};

const PlaygroundControls = ({
  item,
  setItem,
}: {
  item: EditablePlaygroundItem;
  setItem: React.Dispatch<React.SetStateAction<EditablePlaygroundItem>>;
}) => {
  return match(item)
    .with({ ty: "text" }, (textLayer) => (
      <TextControls
        textLayer={textLayer}
        setTextLayer={(nextValue) => {
          setItem(nextValue);
        }}
      />
    ))
    .with({ ty: "image" }, (imageLayer) => (
      <ImageControls
        imageLayer={imageLayer}
        setImageLayer={(nextValue) => {
          setItem(nextValue);
        }}
      />
    ))
    .otherwise((shape) => (
      <ShapeControls
        shape={shape}
        setShape={(nextValue) => {
          setItem(nextValue);
        }}
      />
    ));
};

const ShapeCard = ({ sample }: { sample: ShapeSample }) => {
  const [item, setItem] = useState<EditablePlaygroundItem>(() => normalizePlaygroundItem(sample));

  return (
    <article className={styles.card}>
      <div className={styles.cardHeader}>
        <div>
          <p className={styles.cardEyebrow}>{item.ty}</p>
          <h3 className={styles.cardTitle}>{sample.label}</h3>
        </div>
        <span className={styles.cardBadge}>{sample.origin}</span>
      </div>
      <div className={styles.cardBody}>
        <PreviewCanvas item={item} />
        <div className={styles.controls}>
          <PlaygroundControls item={item} setItem={setItem} />
        </div>
      </div>
    </article>
  );
};

export const ShapeRenderingPlayground = ({ shapeSamples }: { shapeSamples: ShapeSample[] }) => {
  return (
    <div className={styles.cardGrid}>
      {shapeSamples.map((sample) => {
        return <ShapeCard key={sample.id} sample={sample} />;
      })}
    </div>
  );
};
