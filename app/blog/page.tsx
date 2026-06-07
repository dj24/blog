import Link from "next/link";
import styles from "./page.module.css";

const posts = [
  {
    title: "Designing a calmer publishing workflow",
    summary:
      "A few notes on creating space for ideas before they become polished posts.",
  },
  {
    title: "Why small blogs still matter",
    summary:
      "Independent writing gives projects a voice, a point of view, and a home on the web.",
  },
  {
    title: "Shipping simple pages with intention",
    summary:
      "A lightweight route can still feel considered when typography, spacing, and hierarchy are doing their job.",
  },
];

const BlogPage = () => {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p className={styles.kicker}>Blog</p>
        <h1>Latest writing and experiments.</h1>
        <p className={styles.description}>
          A clean `/blog` route with room to grow into a real post index later.
        </p>
        <Link className={styles.backLink} href="/">
          Back home
        </Link>
      </header>

      <section className={styles.grid}>
        {posts.map((post) => (
          <article className={styles.card} key={post.title}>
            <h2>{post.title}</h2>
            <p>{post.summary}</p>
          </article>
        ))}
      </section>
    </main>
  );
};

export default BlogPage;
