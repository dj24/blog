"use client";

import { useEffect, useState } from "react";
import { compressJsonToDotLottie } from "../_lib/dotlottie";
import { createStressTestLottie, summarizeStressTestLottie } from "../_lib/lottie-stress-test";
import { PlayerComparison } from "../player/_components/player-comparison";
import styles from "./page.module.css";

type ArchiveState =
  | {
      archiveBytes: null;
      archiveUrl: null;
      jsonUrl: string | null;
      message?: undefined;
      status: "loading";
    }
  | {
      archiveBytes: number;
      archiveUrl: string;
      jsonUrl: string;
      message?: undefined;
      status: "ready";
    }
  | {
      archiveBytes: null;
      archiveUrl: null;
      jsonUrl: string;
      message: string;
      status: "error";
    };

const formatKilobytes = (bytes: number) => {
  return `${(bytes / 1024).toFixed(1)} KB`;
};

const sumCounts = (counts: Record<string, number>) => {
  return Object.values(counts).reduce((total, count) => {
    return total + count;
  }, 0);
};

const toLabel = (key: string) => {
  return key.replace(/([A-Z])/g, " $1").toLowerCase();
};

export const LottieStressPageClient = () => {
  const [animation] = useState(() => createStressTestLottie());
  const [summary] = useState(() => summarizeStressTestLottie(animation));
  const [archiveState, setArchiveState] = useState<ArchiveState>({
    archiveBytes: null,
    archiveUrl: null,
    jsonUrl: null,
    status: "loading",
  });

  useEffect(() => {
    let cancelled = false;
    let archiveObjectUrl: string | null = null;
    const jsonObjectUrl = URL.createObjectURL(
      new Blob([JSON.stringify(animation, null, 2)], {
        type: "application/json",
      }),
    );

    setArchiveState({
      archiveBytes: null,
      archiveUrl: null,
      jsonUrl: jsonObjectUrl,
      status: "loading",
    });

    const createArchive = async () => {
      try {
        const archive = await compressJsonToDotLottie(animation, {
          manifest: {
            author: "Codex",
            generator: "blog/lottie-stress-test",
          },
        });

        if (cancelled) {
          return;
        }

        archiveObjectUrl = URL.createObjectURL(
          new Blob([archive], {
            type: "application/zip",
          }),
        );

        setArchiveState({
          archiveBytes: archive.byteLength,
          archiveUrl: archiveObjectUrl,
          jsonUrl: jsonObjectUrl,
          status: "ready",
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        setArchiveState({
          archiveBytes: null,
          archiveUrl: null,
          jsonUrl: jsonObjectUrl,
          message:
            error instanceof Error
              ? error.message
              : "Unable to package the generated stress animation as .lottie.",
          status: "error",
        });
      }
    };

    void createArchive();

    return () => {
      cancelled = true;
      URL.revokeObjectURL(jsonObjectUrl);

      if (archiveObjectUrl) {
        URL.revokeObjectURL(archiveObjectUrl);
      }
    };
  }, [animation]);

  const supportedTotal = sumCounts(summary.supportedCounts);
  const unsupportedTotal = sumCounts(summary.unsupportedCounts);
  const initialFrame = Math.max(0, Math.round(animation.ip));

  return (
    <main className={styles.page}>
      <div className={styles.content}>
        <section className={styles.hero}>
          <span className={styles.eyebrow}>Stress Comparison</span>
          <h1 className={styles.title}>One mixed file, two very different render paths.</h1>
          <p className={styles.summary}>
            This route generates a deterministic 1024 x 1024 Lottie composition at runtime, packages
            it to dotLottie for the browser player, and feeds the raw composition into the custom
            WebGPU renderer for frame-locked comparison.
          </p>
        </section>

        <section className={styles.metrics}>
          <article className={styles.metricCard}>
            <span className={styles.metricLabel}>timeline</span>
            <strong className={styles.metricValue}>
              {animation.op - animation.ip} frames @ {animation.fr} fps
            </strong>
            <p className={styles.metricNote}>
              Markers split the run into supported, mixed, and peak phases.
            </p>
          </article>
          <article className={styles.metricCard}>
            <span className={styles.metricLabel}>canvas</span>
            <strong className={styles.metricValue}>
              {animation.w} x {animation.h}
            </strong>
            <p className={styles.metricNote}>
              Large enough to pressure layout, fills, gradients, and paths.
            </p>
          </article>
          <article className={styles.metricCard}>
            <span className={styles.metricLabel}>supported</span>
            <strong className={styles.metricValue}>{supportedTotal} items</strong>
            <p className={styles.metricNote}>
              Rectangles, ellipses, paths, fills, strokes, groups, and transforms.
            </p>
          </article>
          <article className={styles.metricCard}>
            <span className={styles.metricLabel}>unsupported</span>
            <strong className={styles.metricValue}>{unsupportedTotal} items</strong>
            <p className={styles.metricNote}>
              These are expected to diverge or be skipped by the custom renderer.
            </p>
          </article>
          <article className={styles.metricCard}>
            <span className={styles.metricLabel}>json</span>
            <strong className={styles.metricValue}>
              {formatKilobytes(summary.jsonBytesEstimate)}
            </strong>
            <p className={styles.metricNote}>
              Estimated from the generated composition before packaging.
            </p>
          </article>
          <article className={styles.metricCard}>
            <span className={styles.metricLabel}>dotlottie</span>
            <strong className={styles.metricValue}>
              {archiveState.archiveBytes
                ? formatKilobytes(archiveState.archiveBytes)
                : "packing..."}
            </strong>
            <p className={styles.metricNote}>
              {archiveState.status === "error"
                ? "Packaging failed in this browser."
                : "Compressed in-browser with the existing dotLottie utility."}
            </p>
          </article>
        </section>

        <section className={styles.actionsPanel}>
          <div className={styles.actionsHeader}>
            <div>
              <h2 className={styles.panelTitle}>Downloads</h2>
              <p className={styles.panelNote}>
                Unsupported-region divergence is expected for trim paths, repeaters, round corners,
                offset paths, pucker/bloat, and zig zag modifiers.
              </p>
            </div>
            <span className={styles.status} data-status={archiveState.status}>
              {archiveState.status === "ready"
                ? "archive ready"
                : archiveState.status === "error"
                  ? "archive failed"
                  : "archive loading"}
            </span>
          </div>
          <div className={styles.actionRow}>
            {archiveState.status === "ready" ? (
              <a
                className={styles.downloadLink}
                download="lottie-stress-test.lottie"
                href={archiveState.archiveUrl}
              >
                Download .lottie
              </a>
            ) : (
              <span className={`${styles.downloadLink} ${styles.downloadLinkDisabled}`}>
                Download .lottie
              </span>
            )}
            {archiveState.jsonUrl ? (
              <a
                className={styles.downloadLink}
                download="lottie-stress-test.json"
                href={archiveState.jsonUrl}
              >
                Download .json
              </a>
            ) : (
              <span className={`${styles.downloadLink} ${styles.downloadLinkDisabled}`}>
                Download .json
              </span>
            )}
          </div>
          {archiveState.status === "error" ? (
            <p className={styles.errorNotice}>{archiveState.message}</p>
          ) : null}
        </section>

        {archiveState.status === "ready" ? (
          <PlayerComparison
            animation={animation}
            initialFrame={initialFrame}
            src={archiveState.archiveUrl}
          />
        ) : (
          <section className={styles.placeholderPanel}>
            <div className={styles.placeholderHeader}>
              <h2 className={styles.panelTitle}>Packaging stress archive</h2>
              <span className={styles.status} data-status={archiveState.status}>
                {archiveState.status}
              </span>
            </div>
            <p className={styles.placeholderCopy}>
              The raw composition is ready. The page is packaging the same data into a dotLottie
              blob so the player and the WebGPU renderer can compare identical content.
            </p>
          </section>
        )}

        <section className={styles.detailsLayout}>
          <article className={styles.detailPanel}>
            <div className={styles.detailHeader}>
              <h2 className={styles.panelTitle}>Supported breakdown</h2>
              <span className={styles.detailBadge}>{supportedTotal} total</span>
            </div>
            <dl className={styles.definitionList}>
              {Object.entries(summary.supportedCounts).map(([key, value]) => {
                return (
                  <div key={key} className={styles.definitionRow}>
                    <dt>{toLabel(key)}</dt>
                    <dd>{value}</dd>
                  </div>
                );
              })}
            </dl>
          </article>

          <article className={styles.detailPanel}>
            <div className={styles.detailHeader}>
              <h2 className={styles.panelTitle}>Unsupported breakdown</h2>
              <span className={styles.detailBadge}>{unsupportedTotal} total</span>
            </div>
            <dl className={styles.definitionList}>
              {Object.entries(summary.unsupportedCounts).map(([key, value]) => {
                return (
                  <div key={key} className={styles.definitionRow}>
                    <dt>{toLabel(key)}</dt>
                    <dd>{value}</dd>
                  </div>
                );
              })}
            </dl>
          </article>
        </section>

        <section className={styles.markerPanel}>
          <div className={styles.detailHeader}>
            <h2 className={styles.panelTitle}>Phase markers</h2>
            <span className={styles.detailBadge}>{summary.frameMarkers.length} markers</span>
          </div>
          <div className={styles.markerGrid}>
            {summary.frameMarkers.map((marker) => {
              return (
                <article key={marker.name} className={styles.markerCard}>
                  <span className={styles.metricLabel}>{marker.name}</span>
                  <strong className={styles.metricValue}>frame {marker.frame}</strong>
                  <p className={styles.metricNote}>Duration {marker.duration} frames.</p>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
};
