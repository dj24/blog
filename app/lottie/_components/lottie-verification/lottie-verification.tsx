"use client";

import { useEffect, useState } from "react";
import {
  compressJsonToDotLottie,
  decompressDotLottie,
  decompressDotLottieToJson,
  readLottieJson,
} from "../../_lib/dotlottie";
import styles from "../../page.module.css";

type VerificationSummary = {
  animationCount: number;
  archiveBytes: number;
  jsonBytes: number;
  decompressionMatches: boolean;
  recompressionMatches: boolean;
  lotMatches: boolean;
};

type VerificationState =
  | {
      status: "loading";
    }
  | {
      status: "unsupported";
      message: string;
    }
  | {
      status: "error";
      message: string;
    }
  | {
      status: "ready";
      summary: VerificationSummary;
    };

const dotLottieAssetUrl = "/lottie/assets/square.lottie";

const checkRawDeflateStreamSupport = () => {
  return (
    typeof CompressionStream !== "undefined" &&
    typeof DecompressionStream !== "undefined" &&
    (() => {
      try {
        new CompressionStream("deflate-raw");
        new DecompressionStream("deflate-raw");

        return true;
      } catch {
        return false;
      }
    })()
  );
};

const getProjectSummary = async (): Promise<VerificationSummary> => {
  const dotLottieResponse = await fetch(dotLottieAssetUrl);

  if (!dotLottieResponse.ok) {
    throw new Error("Unable to fetch the bundled Lottie archive.");
  }

  const dotLottieFile = await dotLottieResponse.arrayBuffer();
  const archive = await decompressDotLottie(dotLottieFile);
  const animationId = archive.manifest.animations[0]?.id ?? "main";
  const animation = await decompressDotLottieToJson(dotLottieFile, animationId);
  const jsonFile = JSON.stringify(animation);
  const recompressed = await compressJsonToDotLottie(animation, {
    animationId,
    manifest: {
      author: archive.manifest.author,
      generator: archive.manifest.generator,
      version: archive.manifest.version,
    },
  });
  const recompressedAnimation = await decompressDotLottieToJson(recompressed);
  const lotAnimation = await readLottieJson("square.lot", jsonFile);

  return {
    animationCount: archive.manifest.animations.length,
    archiveBytes: dotLottieFile.byteLength,
    jsonBytes: new TextEncoder().encode(jsonFile).byteLength,
    decompressionMatches: JSON.stringify(animation) === jsonFile,
    recompressionMatches: JSON.stringify(recompressedAnimation) === jsonFile,
    lotMatches: JSON.stringify(lotAnimation) === jsonFile,
  };
};

const getStatusText = (state: VerificationState) => {
  if (state.status === "ready") {
    const allPassing =
      state.summary.decompressionMatches &&
      state.summary.recompressionMatches &&
      state.summary.lotMatches;

    return allPassing ? "passing" : "failing";
  }

  if (state.status === "loading") {
    return "running";
  }

  return state.status;
};

const getStatusClassName = (state: VerificationState) => {
  if (state.status === "ready") {
    const allPassing =
      state.summary.decompressionMatches &&
      state.summary.recompressionMatches &&
      state.summary.lotMatches;

    return allPassing ? styles.status : `${styles.status} ${styles.statusError}`;
  }

  if (state.status === "loading") {
    return `${styles.status} ${styles.statusLoading}`;
  }

  return `${styles.status} ${styles.statusError}`;
};

const CheckIcon = ({ passing }: { passing: boolean }) => {
  return <span className={styles.checkIcon}>{passing ? "OK" : "NO"}</span>;
};

export const LottieVerification = () => {
  const [state, setState] = useState<VerificationState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    const verifyAssets = async () => {
      if (!checkRawDeflateStreamSupport()) {
        setState({
          status: "unsupported",
          message: "This browser does not support deflate-raw CompressionStream APIs.",
        });
        return;
      }

      try {
        const summary = await getProjectSummary();

        if (!cancelled) {
          setState({ status: "ready", summary });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            status: "error",
            message: error instanceof Error ? error.message : "Unable to verify the assets.",
          });
        }
      }
    };

    void verifyAssets();

    return () => {
      cancelled = true;
    };
  }, []);

  const summary =
    state.status === "ready"
      ? state.summary
      : {
          animationCount: 0,
          archiveBytes: 0,
          jsonBytes: 0,
          decompressionMatches: false,
          recompressionMatches: false,
          lotMatches: false,
        };

  return (
    <>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>phase 1</p>
        <h1 className={styles.title}>Lottie compression</h1>
        <p className={styles.summary}>
          A dependency-free converter for unpacking dotLottie archives into raw animation JSON and
          packing JSON back into a valid dotLottie file in the browser.
        </p>
        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statLabel}>animations</span>
            <span className={styles.statValue}>{summary.animationCount}</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>lottie</span>
            <span className={styles.statValue}>{summary.archiveBytes.toLocaleString()} B</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>json</span>
            <span className={styles.statValue}>{summary.jsonBytes.toLocaleString()} B</span>
          </div>
        </div>
      </section>
      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2 className={styles.panelTitle}>asset verification</h2>
          <span className={getStatusClassName(state)}>{getStatusText(state)}</span>
        </div>
        {state.status === "error" || state.status === "unsupported" ? (
          <p className={styles.notice}>{state.message}</p>
        ) : null}
        <div className={styles.checks}>
          <div className={styles.check}>
            <CheckIcon passing={summary.decompressionMatches} />
            <div>
              <p className={styles.checkTitle}>DecompressionStream</p>
              <p className={styles.checkDescription}>
                {summary.decompressionMatches
                  ? "The browser extracts the bundled .lottie archive into the expected animation JSON."
                  : "Waiting for the browser to extract the bundled .lottie archive."}
              </p>
            </div>
          </div>
          <div className={styles.check}>
            <CheckIcon passing={summary.recompressionMatches} />
            <div>
              <p className={styles.checkTitle}>CompressionStream</p>
              <p className={styles.checkDescription}>
                {summary.recompressionMatches
                  ? "The JSON asset recompresses in the browser and extracts back to the same animation."
                  : "Waiting for the browser to recompress the JSON asset."}
              </p>
            </div>
          </div>
          <div className={styles.check}>
            <CheckIcon passing={summary.lotMatches} />
            <div>
              <p className={styles.checkTitle}>.lot handling</p>
              <p className={styles.checkDescription}>
                {summary.lotMatches
                  ? ".lot is handled as uncompressed JSON, matching the phase note."
                  : "Waiting for .lot raw JSON parsing."}
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};
