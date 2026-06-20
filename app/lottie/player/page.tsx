import type { Metadata } from "next";
import { readFile } from "node:fs/promises";
import path from "node:path";
import invariant from "tiny-invariant";
import { DotlottiePlayer } from "./_components/dotlottie-player/dotlottie-player";
import { decompressDotLottie } from "../_lib/dotlottie";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Lottie Player",
  description:
    "Scrub through the square dotLottie asset frame by frame with a package-backed player.",
};

const assetPath = path.join(process.cwd(), "app", "lottie", "_assets", "square.lottie");
const publicAssetPath = "/lottie/assets/square.lottie";

const formatKilobytes = (bytes: number) => {
  return `${(bytes / 1024).toFixed(1)} KB`;
};

const PlayerPage = async () => {
  const archiveBuffer = await readFile(assetPath);
  const archive = await decompressDotLottie(archiveBuffer);
  const animationId = archive.manifest.animations[0]?.id ?? "main";
  const animation = archive.animations[animationId];

  invariant(animation, `Animation "${animationId}" was not found in square.lottie.`);

  const facts = [
    {
      label: "Container",
      note: "Fetched by the browser player directly from the public asset URL.",
      value: "dotLottie",
    },
    {
      label: "Dimensions",
      note: "Read from the embedded composition metadata.",
      value: `${animation.w} x ${animation.h}`,
    },
    {
      label: "Frame Rate",
      note: "The packaged animation timeline speed.",
      value: `${animation.fr} fps`,
    },
    {
      label: "Archive Size",
      note: "Compressed `.lottie` bundle size currently checked into the repo.",
      value: formatKilobytes(archiveBuffer.byteLength),
    },
  ] as const;

  return (
    <main className={styles.page}>
      <div className={styles.content}>
        <header className={styles.hero}>
          <span className={styles.eyebrow}>Lottie Player</span>
          <h1 className={styles.title}>Square, ready for frame-by-frame inspection.</h1>
          <p className={styles.summary}>
            This page uses <code>@lottiefiles/dotlottie-react</code> to load the repo&apos;s
            <code> square.lottie</code> asset, pauses it by default, and gives you a scrubber for
            checking exact frames without custom runtime glue.
          </p>
        </header>

        <section className={styles.layout}>
          <article className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>Scrubber</h2>
              <span className={`${styles.status} ${styles.statusPaused}`}>Paused By Default</span>
            </div>
            <DotlottiePlayer src={publicAssetPath} />
          </article>

          <aside className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>Asset Facts</h2>
              <span className={styles.status}>Square</span>
            </div>
            <div className={styles.facts}>
              {facts.map((fact) => {
                return (
                  <section key={fact.label} className={styles.fact}>
                    <span className={styles.factLabel}>{fact.label}</span>
                    <strong className={styles.factValue}>{fact.value}</strong>
                    <p className={styles.factNote}>{fact.note}</p>
                  </section>
                );
              })}
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
};

export default PlayerPage;
