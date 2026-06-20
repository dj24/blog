"use client";

import { useEffect, useState } from "react";
import { LottieVerification } from "./lottie-verification/lottie-verification";
import { decompressDotLottie } from "../_lib/dotlottie";
import type { LottieAsset } from "../_lib/types/lottie-asset";
import type { LottieComposition } from "../_lib/types/lottie-composition";
import type { LottieLayer } from "../_lib/types/lottie-layer";
import type { LottieShapeItem } from "../_lib/types/lottie-shape";
import type { DotLottieManifest } from "../_lib/types/dotlottie";
import styles from "../page.module.css";

const dotLottieAssetUrl = "/lottie/assets/square.lottie";

const manifestAttributeDescriptions: Record<string, string> = {
  version: "dotLottie manifest schema version.",
  author: "Optional human-readable author name.",
  generator: "Optional tool identifier that generated the archive.",
  animations: "List of animations packaged in the archive.",
};

const compositionAttributeDescriptions: Record<string, string> = {
  v: "Lottie/bodymovin schema version string.",
  fr: "Animation frame rate.",
  ip: "First frame in the composition timeline.",
  op: "Frame after the composition ends.",
  w: "Composition width in pixels.",
  h: "Composition height in pixels.",
  ddd: "Whether the root composition enables 3D layers.",
};

const assetAttributeDescriptions: Record<string, string> = {
  id: "Asset identifier referenced by refId on layers.",
  p: "File name of the image asset.",
  u: "Base directory or URL for the image file.",
  e: "Embedded image flag used by some exporters.",
  w: "Pixel width of the asset.",
  h: "Pixel height of the asset.",
};

const layerAttributeDescriptions: Record<string, string> = {
  ddd: "Whether this layer participates in 3D transforms.",
  ind: "Stable layer identifier used by parenting and mattes.",
  ty: "Discriminator for the kind of layer.",
  sr: "Time stretch factor.",
  ks: "Layer transform bundle.",
  ao: "Auto-orient flag for motion paths.",
  parent: "Parent layer identifier.",
  ip: "First frame where the layer is visible.",
  op: "Frame after the layer stops being visible.",
  st: "Time offset applied to the layer.",
  tt: "Track matte mode applied to this layer.",
  td: "Marks this layer as a matte source for another layer.",
  refId: "Asset identifier referenced from the composition assets array.",
  w: "Referenced precomp width.",
  h: "Referenced precomp height.",
  sw: "Solid width.",
  sh: "Solid height.",
  sc: "Solid color as a CSS-style string.",
  t: "Text payload exported by the authoring tool.",
};

const shapeAttributeDescriptions: Record<string, string> = {
  ty: "Discriminator for the kind of shape item.",
  it: "Ordered child items contained in this group.",
  d: "Drawing direction metadata from the exporter.",
  ks: "Animated bezier path geometry.",
  s: "Size, scale, start percentage, or gradient start point depending on the shape item.",
  p: "Position relative to the parent origin.",
  r: "Rotation, rectangle corner radius, or fill rule depending on the shape item.",
  sy: "Shape mode. Commonly 1 for star and 2 for polygon.",
  pt: "Number of points on the star or polygon.",
  or: "Outer radius.",
  os: "Outer roundness percentage.",
  ir: "Inner radius for star shapes.",
  is: "Inner roundness percentage for star shapes.",
  c: "Fill or stroke color in normalized RGB values.",
  o: "Opacity percentage or offset depending on the shape item.",
  bm: "Blend mode identifier.",
  g: "Encoded gradient color stops.",
  e: "Gradient end point or ending value depending on context.",
  t: "Gradient kind or keyframe frame number depending on context.",
  w: "Stroke width.",
  lc: "Line cap style identifier.",
  lj: "Line join style identifier.",
  ml: "Miter limit used for sharp joins.",
  m: "Trim mode identifier.",
  a: "Anchor point used for rotation and scale.",
};

const shapeTypeLabels: Record<string, string> = {
  el: "ellipse",
  fl: "solid fill",
  gf: "gradient fill",
  gr: "group",
  gs: "gradient stroke",
  mm: "merge paths",
  op: "offset paths",
  pb: "pucker and bloat",
  rc: "rectangle",
  rd: "round corners",
  rp: "repeater",
  sh: "bezier path",
  sr: "polystar",
  st: "solid stroke",
  tm: "trim paths",
  tr: "transform",
  zz: "zig zag",
};

type LottiePageData = {
  animation: LottieComposition;
  animationId: string;
  manifest: DotLottieManifest;
  prettyAnimationJson: string;
};

type LottiePageState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | ({ status: "ready" } & LottiePageData);

const getLottiePageData = async (): Promise<LottiePageData> => {
  const dotLottieResponse = await fetch(dotLottieAssetUrl);

  if (!dotLottieResponse.ok) {
    throw new Error("Unable to fetch the bundled Lottie archive.");
  }

  const dotLottieFile = await dotLottieResponse.arrayBuffer();
  const archive = await decompressDotLottie(dotLottieFile);
  const animationId = archive.manifest.animations[0]?.id ?? "main";
  const animation = archive.animations[animationId];

  if (!animation) {
    throw new Error(`Animation ${animationId} was not found in the bundled square.lottie asset.`);
  }

  console.log(animation);

  return {
    animation,
    animationId,
    manifest: archive.manifest,
    prettyAnimationJson: JSON.stringify(animation, null, 2),
  };
};

const formatValue = (value: unknown) => {
  if (value === undefined) {
    return "undefined";
  }

  if (value === null) {
    return "null";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return "[]";
    }

    if (value.every((item) => typeof item === "number")) {
      return `[${value.join(", ")}]`;
    }

    return `${value.length} items`;
  }

  return JSON.stringify(value, null, 2);
};

const getAttributeEntries = (value: Record<string, unknown>, hiddenKeys: string[] = []) => {
  return Object.entries(value).filter((entry) => {
    const [key, attributeValue] = entry;

    return !hiddenKeys.includes(key) && attributeValue !== undefined;
  });
};

const getAttributeDescription = (key: string, descriptions: Record<string, string>) => {
  return descriptions[key] ?? "Additional exporter-specific field preserved by the parser.";
};

const getShapeTypeLabel = (shapeType: unknown) => {
  if (typeof shapeType !== "string") {
    return "unknown";
  }

  return shapeTypeLabels[shapeType] ?? shapeType;
};

const AttributeList = ({
  attributes,
  descriptions,
}: {
  attributes: Array<[key: string, value: unknown]>;
  descriptions: Record<string, string>;
}) => {
  return (
    <dl className={styles.attributeList}>
      {attributes.map(([key, value]) => {
        return (
          <div key={key} className={styles.attributeRow}>
            <dt className={styles.attributeKey}>
              <span>{key}</span>
              <span className={styles.attributeDescription}>
                {getAttributeDescription(key, descriptions)}
              </span>
            </dt>
            <dd className={styles.attributeValue}>{formatValue(value)}</dd>
          </div>
        );
      })}
    </dl>
  );
};

const SchemaBlock = ({
  title,
  badge,
  children,
  depth = 0,
}: {
  title: string;
  badge: string;
  children: React.ReactNode;
  depth?: number;
}) => {
  return (
    <details className={styles.schemaBlock} data-depth={depth}>
      <summary className={styles.schemaBlockHeader}>
        <h4 className={styles.schemaBlockTitle}>{title}</h4>
        <div className={styles.sectionHeaderMeta}>
          <span className={styles.schemaBlockBadge}>{badge}</span>
          <span className={styles.sectionToggleLabel}>toggle</span>
        </div>
      </summary>
      <div className={styles.schemaBlockBody}>{children}</div>
    </details>
  );
};

const ShapeBlock = ({ shape, depth = 0 }: { shape: LottieShapeItem; depth?: number }) => {
  const shapeRecord = shape as Record<string, unknown>;
  const groupItems = "it" in shapeRecord && Array.isArray(shapeRecord.it) ? shapeRecord.it : [];
  const attributes = getAttributeEntries(shapeRecord, ["it"]);
  const shapeTypeLabel = getShapeTypeLabel(shapeRecord.ty);

  return (
    <SchemaBlock
      title={`shape ${shapeTypeLabel}`}
      badge={groupItems.length > 0 ? `${groupItems.length} children` : "leaf"}
      depth={depth}
    >
      <AttributeList attributes={attributes} descriptions={shapeAttributeDescriptions} />
      {groupItems.length > 0 ? (
        <div className={styles.schemaChildren}>
          {groupItems.map((item, index) => {
            return (
              <ShapeBlock
                key={`${String(shapeRecord.ty)}-${index}`}
                shape={item as LottieShapeItem}
                depth={depth + 1}
              />
            );
          })}
        </div>
      ) : null}
    </SchemaBlock>
  );
};

const LayerBlock = ({ layer }: { layer: LottieLayer }) => {
  const layerRecord = layer as Record<string, unknown>;
  const shapes =
    "shapes" in layerRecord && Array.isArray(layerRecord.shapes) ? layerRecord.shapes : [];
  const attributes = getAttributeEntries(layerRecord, ["shapes"]);

  return (
    <SchemaBlock
      title={`layer ${String(layerRecord.ind ?? "?")} / type ${String(layerRecord.ty ?? "?")}`}
      badge={shapes.length > 0 ? `${shapes.length} shapes` : "no shapes"}
    >
      <AttributeList attributes={attributes} descriptions={layerAttributeDescriptions} />
      {shapes.length > 0 ? (
        <div className={styles.schemaChildren}>
          {shapes.map((shape, index) => {
            return (
              <ShapeBlock
                key={`${String(layerRecord.ind)}-${index}`}
                shape={shape as LottieShapeItem}
              />
            );
          })}
        </div>
      ) : null}
    </SchemaBlock>
  );
};

const AssetBlock = ({ asset, index }: { asset: LottieAsset; index: number }) => {
  const assetRecord = asset as Record<string, unknown>;
  const layers =
    "layers" in assetRecord && Array.isArray(assetRecord.layers) ? assetRecord.layers : [];
  const attributes = getAttributeEntries(assetRecord, ["layers"]);

  return (
    <SchemaBlock
      title={`asset ${index + 1}`}
      badge={layers.length > 0 ? `${layers.length} nested layers` : "leaf"}
    >
      <AttributeList attributes={attributes} descriptions={assetAttributeDescriptions} />
      {layers.length > 0 ? (
        <div className={styles.schemaChildren}>
          {layers.map((layer, layerIndex) => {
            return (
              <LayerBlock key={`asset-${index}-layer-${layerIndex}`} layer={layer as LottieLayer} />
            );
          })}
        </div>
      ) : null}
    </SchemaBlock>
  );
};

const SchemaSection = ({
  title,
  badge,
  children,
}: {
  title: string;
  badge: string;
  children: React.ReactNode;
}) => {
  return (
    <details className={styles.schemaSection}>
      <summary className={styles.schemaSectionHeader}>
        <h3 className={styles.schemaSectionTitle}>{title}</h3>
        <div className={styles.sectionHeaderMeta}>
          <span className={styles.schemaSectionBadge}>{badge}</span>
          <span className={styles.sectionToggleLabel}>toggle</span>
        </div>
      </summary>
      <div className={styles.schemaSectionBody}>{children}</div>
    </details>
  );
};

export const LottiePageClient = () => {
  const [state, setState] = useState<LottiePageState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    const loadPageData = async () => {
      try {
        const pageData = await getLottiePageData();

        if (!cancelled) {
          setState({
            status: "ready",
            ...pageData,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            status: "error",
            message: error instanceof Error ? error.message : "Unable to load Lottie page data.",
          });
        }
      }
    };

    void loadPageData();

    return () => {
      cancelled = true;
    };
  }, []);

  const readyState = state.status === "ready" ? state : null;
  const animation = readyState?.animation;
  const manifest = readyState?.manifest;
  const compositionAttributes = animation
    ? getAttributeEntries(animation, ["assets", "layers"])
    : [];

  return (
    <main className={styles.page}>
      <div className={styles.content}>
        <LottieVerification />
        <section className={styles.dataPanel}>
          <div className={styles.dataHeader}>
            <h2 className={styles.dataTitle}>parsed lottie data</h2>
            <span className={styles.dataBadge}>
              {readyState?.animationId ?? (state.status === "error" ? "error" : "loading")}
            </span>
          </div>
          {state.status === "error" ? <p className={styles.notice}>{state.message}</p> : null}
          {state.status === "loading" ? (
            <p className={styles.notice}>
              Loading the bundled square.lottie archive in the browser...
            </p>
          ) : null}
          {readyState ? (
            <>
              <div className={styles.dataGrid}>
                <details className={styles.dataCard}>
                  <summary className={styles.dataCardHeader}>
                    <h3 className={styles.dataCardTitle}>manifest</h3>
                    <span className={styles.sectionToggleLabel}>toggle</span>
                  </summary>
                  <dl className={styles.definitionList}>
                    <div className={styles.definitionRow}>
                      <dt className={styles.definitionTerm}>version</dt>
                      <dd className={styles.definitionValue}>
                        {manifest.version}
                        <span className={styles.definitionDescription}>
                          {manifestAttributeDescriptions.version}
                        </span>
                      </dd>
                    </div>
                    <div className={styles.definitionRow}>
                      <dt className={styles.definitionTerm}>author</dt>
                      <dd className={styles.definitionValue}>
                        {manifest.author ?? "unknown"}
                        <span className={styles.definitionDescription}>
                          {manifestAttributeDescriptions.author}
                        </span>
                      </dd>
                    </div>
                    <div className={styles.definitionRow}>
                      <dt className={styles.definitionTerm}>generator</dt>
                      <dd className={styles.definitionValue}>
                        {manifest.generator ?? "unknown"}
                        <span className={styles.definitionDescription}>
                          {manifestAttributeDescriptions.generator}
                        </span>
                      </dd>
                    </div>
                    <div className={styles.definitionRow}>
                      <dt className={styles.definitionTerm}>animations</dt>
                      <dd className={styles.definitionValue}>
                        {manifest.animations.length}
                        <span className={styles.definitionDescription}>
                          {manifestAttributeDescriptions.animations}
                        </span>
                      </dd>
                    </div>
                  </dl>
                </details>
                <details className={styles.dataCard}>
                  <summary className={styles.dataCardHeader}>
                    <h3 className={styles.dataCardTitle}>composition</h3>
                    <span className={styles.sectionToggleLabel}>toggle</span>
                  </summary>
                  <dl className={styles.definitionList}>
                    <div className={styles.definitionRow}>
                      <dt className={styles.definitionTerm}>version</dt>
                      <dd className={styles.definitionValue}>
                        {animation.v}
                        <span className={styles.definitionDescription}>
                          {compositionAttributeDescriptions.v}
                        </span>
                      </dd>
                    </div>
                    <div className={styles.definitionRow}>
                      <dt className={styles.definitionTerm}>frame rate</dt>
                      <dd className={styles.definitionValue}>
                        {animation.fr}
                        <span className={styles.definitionDescription}>
                          {compositionAttributeDescriptions.fr}
                        </span>
                      </dd>
                    </div>
                    <div className={styles.definitionRow}>
                      <dt className={styles.definitionTerm}>frame span</dt>
                      <dd className={styles.definitionValue}>
                        {animation.ip} to {animation.op}
                        <span className={styles.definitionDescription}>
                          {compositionAttributeDescriptions.ip}{" "}
                          {compositionAttributeDescriptions.op}
                        </span>
                      </dd>
                    </div>
                    <div className={styles.definitionRow}>
                      <dt className={styles.definitionTerm}>size</dt>
                      <dd className={styles.definitionValue}>
                        {animation.w} x {animation.h}
                        <span className={styles.definitionDescription}>
                          {compositionAttributeDescriptions.w} {compositionAttributeDescriptions.h}
                        </span>
                      </dd>
                    </div>
                    <div className={styles.definitionRow}>
                      <dt className={styles.definitionTerm}>layers</dt>
                      <dd className={styles.definitionValue}>
                        {animation.layers.length}
                        <span className={styles.definitionDescription}>
                          Top-level layer stack for the composition.
                        </span>
                      </dd>
                    </div>
                    <div className={styles.definitionRow}>
                      <dt className={styles.definitionTerm}>assets</dt>
                      <dd className={styles.definitionValue}>
                        {animation.assets?.length ?? 0}
                        <span className={styles.definitionDescription}>
                          Reusable assets such as precomps and images.
                        </span>
                      </dd>
                    </div>
                  </dl>
                </details>
              </div>
              <div className={styles.schemaLayout}>
                <SchemaSection
                  title="composition"
                  badge={`${compositionAttributes.length} attributes`}
                >
                  <SchemaBlock title="root composition" badge={readyState.animationId}>
                    <AttributeList
                      attributes={compositionAttributes}
                      descriptions={compositionAttributeDescriptions}
                    />
                  </SchemaBlock>
                </SchemaSection>
                <SchemaSection title="assets" badge={`${animation.assets?.length ?? 0} items`}>
                  {animation.assets?.length ? (
                    animation.assets.map((asset, index) => {
                      return <AssetBlock key={`asset-${index}`} asset={asset} index={index} />;
                    })
                  ) : (
                    <p className={styles.emptyState}>No asset entries in this composition.</p>
                  )}
                </SchemaSection>
                <SchemaSection title="layers" badge={`${animation.layers.length} items`}>
                  {animation.layers.map((layer, index) => {
                    return <LayerBlock key={`layer-${index}`} layer={layer} />;
                  })}
                </SchemaSection>
                <details className={styles.jsonCard}>
                  <summary className={styles.jsonHeader}>
                    <h3 className={styles.dataCardTitle}>raw animation JSON</h3>
                    <div className={styles.sectionHeaderMeta}>
                      <span className={styles.jsonMeta}>
                        {Object.keys(animation).length} top-level keys
                      </span>
                      <span className={styles.sectionToggleLabel}>toggle</span>
                    </div>
                  </summary>
                  <pre className={styles.jsonBlock}>{readyState.prettyAnimationJson}</pre>
                </details>
              </div>
            </>
          ) : null}
        </section>
      </div>
    </main>
  );
};
