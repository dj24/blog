import type { Metadata } from "next";
import { codeToHtml } from "shiki";
import { HorizontalMasonryExamples } from "./_components/horizontal-masonry-examples/horizontal-masonry-examples";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "React Horizontal Masonry",
  description: "Examples and API notes for react-horizontal-masonry.",
};

const usageCode = `import { Grid } from "react-horizontal-masonry";

export const Gallery = () => {
  return (
    <Grid gap="10px" targetRowAspectRatio={5}>
      <Grid.Item ratio={9 / 16}>Portrait</Grid.Item>
      <Grid.Item ratio={21 / 9}>Wide banner</Grid.Item>
      <Grid.Item ratio={1}>Square</Grid.Item>
      <Grid.Item ratio={16 / 9}>Landscape</Grid.Item>
    </Grid>
  );
};`;

const installCode = "bun add react-horizontal-masonry";

const exampleCode = `import { Grid } from "react-horizontal-masonry";

export const Example = () => {
  return (
    <Grid gap="10px" targetRowAspectRatio={4.6}>
      <Grid.Item ratio={9 / 16}>9 / 16</Grid.Item>
      <Grid.Item ratio={1}>1</Grid.Item>
      <Grid.Item ratio={16 / 9}>16 / 9</Grid.Item>
      <Grid.Item ratio={4 / 5}>4 / 5</Grid.Item>
      <Grid.Item ratio={21 / 9}>21 / 9</Grid.Item>
      <Grid.Item ratio={3 / 4}>3 / 4</Grid.Item>
      <Grid.Item ratio={5 / 3}>5 / 3</Grid.Item>
      <Grid.Item ratio={2 / 3}>2 / 3</Grid.Item>
      <Grid.Item ratio={4 / 3}>4 / 3</Grid.Item>
    </Grid>
  );
};`;

const highlightCode = async (code: string, language: "tsx" | "bash") =>
  codeToHtml(code, {
    lang: language,
    theme: "github-dark-default",
  });

const GitHubIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 1.5a10.5 10.5 0 0 0-3.32 20.46c.53.1.72-.23.72-.5v-1.95c-2.94.64-3.56-1.25-3.56-1.25-.48-1.2-1.16-1.53-1.16-1.53-.95-.64.07-.63.07-.63 1.05.08 1.6 1.07 1.6 1.07.94 1.6 2.46 1.14 3.06.87.1-.67.36-1.14.66-1.4-2.35-.27-4.82-1.16-4.82-5.2 0-1.15.41-2.1 1.08-2.84-.1-.27-.47-1.36.1-2.84 0 0 .9-.28 2.93 1.08a10.2 10.2 0 0 1 5.34 0c2.03-1.36 2.93-1.08 2.93-1.08.57 1.48.2 2.57.1 2.84.67.74 1.08 1.69 1.08 2.84 0 4.04-2.47 4.92-4.83 5.18.38.33.72.98.72 1.98v2.94c0 .27.19.6.73.5A10.5 10.5 0 0 0 12 1.5Z" />
  </svg>
);

const NpmIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor">
    <path d="M2 7.5v9h10.01V18H22V7.5H2Zm18 9h-2.98v-6h-1.49v6h-2.97v-6H11.1v6H4.98v-6H20v6Z" />
  </svg>
);

const Page = async () => {
  const [exampleCodeHtml, installCodeHtml, usageCodeHtml] = await Promise.all([
    highlightCode(exampleCode, "tsx"),
    highlightCode(installCode, "bash"),
    highlightCode(usageCode, "tsx"),
  ]);

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <h1>Horizontal Masonry</h1>
        <p className={styles.summary}>
          A tiny layout component that groups items into horizontal rows using each item&apos;s
          aspect ratio.
        </p>
        <nav aria-label="Page sections" className={styles.nav}>
          <a
            aria-label="View react-horizontal-masonry on npm"
            className={styles.iconLink}
            href="https://www.npmjs.com/package/react-horizontal-masonry"
          >
            <NpmIcon />
          </a>
          <a
            aria-label="View react-horizontal-masonry on GitHub"
            className={styles.iconLink}
            href="https://github.com/dj24/react-horizontal-masonry"
          >
            <GitHubIcon />
          </a>
        </nav>
        <div className={styles.code} dangerouslySetInnerHTML={{ __html: installCodeHtml }} />
      </header>

      <section id="examples" className={styles.section}>
        <div className={styles.sectionBody}>
          <h2>Examples</h2>
          <p>
            Items fill each row proportionally. Wider ratios take more space; taller ratios take
            less.
          </p>
          <HorizontalMasonryExamples />
          <div className={styles.code} dangerouslySetInnerHTML={{ __html: exampleCodeHtml }} />
        </div>
      </section>

      <section id="api" className={styles.section}>
        <div className={styles.sectionBody}>
          <h2>API</h2>
          <div className={styles.apiGrid}>
            <div>
              <h3>Grid</h3>
              <dl>
                <dt>gap</dt>
                <dd>Required CSS gap value, such as &quot;10px&quot; or &quot;1rem&quot;.</dd>
                <dt>targetRowAspectRatio</dt>
                <dd>Required row target, expressed as width divided by height.</dd>
                <dt>children</dt>
                <dd>Direct Grid.Item children.</dd>
              </dl>
            </div>
            <div>
              <h3>Grid.Item</h3>
              <dl>
                <dt>ratio</dt>
                <dd>Required item aspect ratio, expressed as width divided by height.</dd>
                <dt>children</dt>
                <dd>Whatever content should appear inside the masonry item.</dd>
              </dl>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Page;
