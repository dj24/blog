import { Hanken_Grotesk } from "next/font/google";
import styles from "./page.module.css";

const hankenGrotesk = Hanken_Grotesk({
  variable: "--font-hanken-grotesk",
  subsets: ["latin"],
});

const Panel = ({ children }: { children: React.ReactNode }) => {
  return (
    <div
      style={{
        flex: "1",
        display: "flex",
        flexDirection: "column",
        gap: "var(--dither-spacing)",
        // border: "1px solid red",
        // position: "relative",
      }}
    >
      {children}
    </div>
  );
};

const Bayer = ({
  trFilled,
  tlFilled,
  blFilled,
  brFilled,
}: {
  trFilled?: boolean;
  tlFilled?: boolean;
  blFilled?: boolean;
  brFilled?: boolean;
}) => (
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "repeat(2, 1fr)",
      gridTemplateRows: "repeat(2, 1fr)",
      aspectRatio: "1",
    }}
  >
    <div
      style={{
        borderBottomLeftRadius: "100%",
        background: tlFilled ? "var(--accent)" : "transparent",
      }}
    ></div>
    <div
      style={{
        borderBottomLeftRadius: "100%",
        background: trFilled ? "var(--accent)" : "transparent",
      }}
    ></div>
    <div
      style={{
        borderBottomLeftRadius: "100%",
        background: blFilled ? "var(--accent)" : "transparent",
      }}
    ></div>
    <div
      style={{
        borderBottomLeftRadius: "100%",
        background: brFilled ? "var(--accent)" : "transparent",
      }}
    ></div>
  </div>
);

const SquareCheckbox = () => {
  return <input aria-label="Select card" className={styles.squareCheckbox} type="checkbox" />;
};

const Card = ({ children }: { children?: React.ReactNode }) => {
  return <div className={styles.card}>{children}</div>;
};

const Palette = () => {
  return (
    <div style={{ display: "flex", gap: "calc(var(--dither-spacing) * 0.5)", flex: 1 }}>
      <div style={{ flex: "1", aspectRatio: "1", background: "rgb(10,10,10)" }} />
      <div style={{ flex: "1", aspectRatio: "1", background: "rgb(80,80,80)" }} />
      <div style={{ flex: "1", aspectRatio: "1", background: "rgb(160,160,160)" }} />
      <div style={{ flex: "1", aspectRatio: "1", background: "rgb(220,220,220)" }} />
    </div>
  );
};

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
          {/*<p>This demo implements an ordered dithering effect on an uploaded image via WebGPU.</p>*/}
          <Panel>
            <h2>upload</h2>
            <p>select file</p>
            <div style={{ display: "flex", gap: "var(--dither-spacing)", flex: 1 }}>
              <Card />
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
                  <input type="range" id="contrast" name="contrast" min="0" max="11" />
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
                  <Palette />
                </div>
              </Card>
            </div>
          </Panel>
          <Panel>
            <h2>export</h2>
            <div style={{ display: "flex", gap: "var(--dither-spacing)", flex: 1 }}>
              <Card>
                <p>jpeg</p>
              </Card>
              <Card>
                <p>png</p>
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
