import { Arc } from "./_components/arc/arc";
import { Hanken_Grotesk } from "next/font/google";
import type { Metadata } from "next";
import pearlEarring from "../pearl-earring.jpg";
import { Bayer } from "./_components/bayer/bayer";
import { Card } from "./_components/card/card";
import { DitherSettingsSection } from "./_components/dither-settings-section/dither-settings-section";
import { DownloadButton } from "./_components/download-button/download-button";
import { PreviewCanvas } from "./_components/preview-canvas/preview-canvas";
import { RenderTime } from "./_components/render-time/render-time";
import { Resolution } from "./_components/resolution/resolution";
import { UploadButton } from "./_components/upload-button/upload-button";
import styles from "./page.module.css";

const hankenGrotesk = Hanken_Grotesk({
  variable: "--font-hanken-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ordered Dithering",
  description: "Apply ordered dithering filters to your images.",
  openGraph: {
    title: "Ordered Dithering",
    description: "Apply ordered dithering filters to your images.",
    type: "website",
    url: "/dither",
  },
};

const Page = () => {
  return (
    <>
      <meta content="/dither/icon.svg" property="og:logo" />
      <main className={`${hankenGrotesk.variable} ${styles.page}`}>
        <section className={styles.leftPanel}>
          <div className={styles.previewStats}>
            <Resolution />
            <h2>preview</h2>
            <RenderTime />
          </div>
          <PreviewCanvas defaultImageUrl={pearlEarring.src} />
        </section>
        <section className={styles.rightPanel}>
          <h1 className={styles.pageTitle}>ordered dithering</h1>
          <div className={`${styles.section} ${styles.uploadSection}`}>
            <h2 className={styles.sectionTitle}>upload</h2>
            <div className={styles.uploadCard}>
              <Card>
                <div className={styles.cardRow}>
                  <p>select file</p>
                  <UploadButton />
                </div>
              </Card>
            </div>
          </div>
          <div className={styles.bayerGraphic}>
            <div className={styles.bayerStack}>
              <Bayer tlFilled />
              <Bayer tlFilled brFilled />
              <Bayer tlFilled brFilled trFilled />
              <Bayer trFilled blFilled brFilled tlFilled />
            </div>
          </div>
          <DitherSettingsSection />
          <div aria-hidden className={`${styles.titleWord} ${styles.ditheringWord}`}>
            dithering
          </div>
          <div className={`${styles.section} ${styles.exportSection}`}>
            <h2 className={styles.sectionTitle}>export</h2>
            <div className={styles.jpegCard}>
              <Card>
                <div className={styles.cardRow}>
                  <p>jpeg</p>
                  <DownloadButton format="jpeg" />
                </div>
              </Card>
            </div>
            <div className={styles.pngCard}>
              <Card>
                <div className={styles.cardRow}>
                  <p>png</p>
                  <DownloadButton format="png" />
                </div>
              </Card>
            </div>
          </div>
          <div aria-hidden className={`${styles.titleWord} ${styles.orderedWord}`}>
            ordered
            <Arc />
          </div>
        </section>
      </main>
    </>
  );
};

export default Page;
