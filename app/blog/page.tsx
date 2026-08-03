import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { isBlogPageVisible } from "./_lib/blog-page-visibility";
import styles from "./page.module.css";

const posts = [
  {
    title: "Hello, world!",
    summary: "The first post on this blog, and a small starting point for what comes next.",
    href: "/blog/hello-world",
  },
];

const BlogPage = async () => {
  await connection();

  if (!isBlogPageVisible()) {
    redirect("/dither");
  }

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

      <section aria-label="Posts" className={styles.grid}>
        {posts.map((post) => (
          <article key={post.title}>
            <Link className={styles.card} href={post.href}>
              <h2>{post.title}</h2>
              <p>{post.summary}</p>
            </Link>
          </article>
        ))}
      </section>
    </main>
  );
};

export default BlogPage;
