import { Hanken_Grotesk } from "next/font/google";
import Bayer from "./_components/bayer";
import Card from "./_components/card";
import DownloadButton from "./_components/download-button";
import Palette from "./_components/palette";
import Panel from "./_components/panel";
import RangeInput from "./_components/range-input";
import SquareCheckbox from "./_components/square-checkbox";
import UploadButton from "./_components/upload-button";
import styles from "./page.module.css";

const hankenGrotesk = Hanken_Grotesk({
  variable: "--font-hanken-grotesk",
  subsets: ["latin"],
});

const Page = () => {
  return (
    <main className={`${hankenGrotesk.variable} ${styles.page}`}>
      <section className={styles.leftPanel}>
        <h2>preview</h2>
      </section>
      <section className={styles.rightPanel}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--dither-spacing)",
            flex: 1,
          }}
        >
          <Panel>
            <h2>upload</h2>
            <div style={{ display: "flex", gap: "var(--dither-spacing)", flex: 1 }}>
              <Card>
                <div
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
                >
                  <p>select file</p>
                  <UploadButton />
                </div>
              </Card>
            </div>
          </Panel>
          <Panel>
            <h2>settings</h2>
            <div style={{ display: "flex", gap: "var(--dither-spacing)", flex: 1 }}>
              <Card>
                <div
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
                >
                  <p>monochromatic</p>
                  <SquareCheckbox />
                </div>
                <div
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
                >
                  <p>contrast</p>
                  <RangeInput id="contrast" name="contrast" min="0" max="11" />
                </div>
              </Card>
              <Card>
                <div
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
                >
                  <p>polychromatic</p>
                  <SquareCheckbox />
                </div>
                <div
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
                >
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
          </Panel>
          <Panel>
            <h2>export</h2>
            <div style={{ display: "flex", gap: "var(--dither-spacing)", flex: 1 }}>
              <Card>
                <div
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
                >
                  <p>jpeg</p>
                  <DownloadButton />
                </div>
              </Card>
              <Card>
                <div
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
                >
                  <p>png</p>
                  <DownloadButton />
                </div>
              </Card>
            </div>
          </Panel>
        </div>
        <div
          style={{
            display: "flex",
            gap: "var(--dither-spacing)",
            flexDirection: "column",
            justifyContent: "end",
          }}
        >
          <div>
            <Bayer tlFilled />
            <Bayer tlFilled brFilled />
            <Bayer tlFilled brFilled trFilled />
            <Bayer trFilled blFilled brFilled tlFilled />
          </div>
          <h1>
            ordered <span>dithering</span>
          </h1>
        </div>
      </section>
    </main>
  );
};

export default Page;
