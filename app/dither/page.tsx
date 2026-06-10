import { Barlow_Condensed, Saira } from "next/font/google";
import styles from "./page.module.css";

const saira = Saira({
  variable: "--font-saira",
  subsets: ["latin"],
});

const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  weight: ["400", "700"],
  subsets: ["latin"],
});

const Panel = ({ children }: { children: React.ReactNode }) => {
  return <div style={{ flex: "1" }}>{children}</div>;
};

const Page = () => {
  return (
    <main className={`${saira.variable} ${barlowCondensed.variable} ${styles.page}`}>
      <section className={styles.rightPanel}>
        <Panel>
          <h1 style={{ fontSize: "8vmin", fontWeight: 400, lineHeight: 0.8 }}>UPLOAD</h1>
        </Panel>
        <Panel>
          <h1 style={{ fontSize: "8vmin", fontWeight: 400, lineHeight: 0.8 }}>SETTINGS</h1>{" "}
        </Panel>
        <Panel>
          <h1 style={{ fontSize: "8vmin", fontWeight: 400, lineHeight: 0.8 }}>EXPORT</h1>{" "}
        </Panel>
      </section>
    </main>
  );
};

export default Page;
