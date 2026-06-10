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
    <div style={{ background: tlFilled ? "red" : "transparent" }}></div>
    <div style={{ background: trFilled ? "red" : "transparent" }}></div>
    <div style={{ background: blFilled ? "red" : "transparent" }}></div>
    <div style={{ background: brFilled ? "red" : "transparent" }}></div>
  </div>
);

const Card = ({ children }: { children?: React.ReactNode }) => {
  return <div style={{ flex: "1", background: "rgba(0,0,0,0.1)" }}>{children}</div>;
};

const Page = () => {
  return (
    <main className={`${hankenGrotesk.variable} ${styles.page}`}>
      <section className={styles.leftPanel}></section>
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
            <h2>Upload</h2>
            <div style={{ display: "flex", gap: "var(--dither-spacing)", flex: 1 }}>
              <Card />
            </div>
          </Panel>
          <Panel>
            <h2>Settings</h2>
            <div style={{ display: "flex", gap: "var(--dither-spacing)", flex: 1 }}>
              <Card />
              <Card />
            </div>
          </Panel>
          <Panel>
            <h2>Export</h2>
            <div style={{ display: "flex", gap: "var(--dither-spacing)", flex: 1 }}>
              <Card />
              <Card />
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
          <h1>Ordered Dithering</h1>
        </div>
      </section>
    </main>
  );
};

export default Page;
