import { Arc } from "./_components/arc/arc";
import { Hanken_Grotesk } from "next/font/google";
import pearlEarring from "../pearl-earring.jpg";
import { Bayer } from "./_components/bayer/bayer";
import { Card } from "./_components/card/card";
import { DownloadButton } from "./_components/download-button/download-button";
import { MonochromaticPaletteControl } from "./_components/monochromatic-palette-control/monochromatic-palette-control";
import { Palette } from "./_components/palette/palette";
import { PreviewCanvas } from "./_components/preview-canvas/preview-canvas";
import { RangeInput } from "./_components/range-input/range-input";
import { RenderTime } from "./_components/render-time/render-time";
import { Resolution } from "./_components/resolution/resolution";
import { SquareCheckbox } from "./_components/square-checkbox/square-checkbox";
import { UploadButton } from "./_components/upload-button/upload-button";
import styles from "./page.module.css";

const hankenGrotesk = Hanken_Grotesk({
  variable: "--font-hanken-grotesk",
  subsets: ["latin"],
});

const Page = () => {
  return (
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
        <div className={`${styles.section} ${styles.settingsSection}`}>
          <h2 className={styles.sectionTitle}>settings</h2>
          <div className={styles.monoCard}>
            <Card>
              <div className={styles.cardRow}>
                <p>monochromatic</p>
                <SquareCheckbox />
              </div>
              <div className={styles.cardRow}>
                <p>contrast</p>
                <RangeInput id="contrast" name="contrast" min="0" max="11" />
              </div>
              <div className={styles.cardRow}>
                <p>palette</p>
                <MonochromaticPaletteControl />
              </div>
            </Card>
          </div>
          <div className={styles.polyCard}>
            <Card>
              <div className={styles.cardRow}>
                <p>polychromatic</p>
                <SquareCheckbox />
              </div>
              <div className={styles.cardRow}>
                <p>palette</p>
                <Palette
                  colors={[
                    "rgb(10,10,10)",
                    "rgb(80,80,80)",
                    "rgb(160,160,160)",
                    "rgb(220,220,220)",
                  ]}
                />
              </div>
            </Card>
          </div>
        </div>
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
  );
};

export default Page;
