import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { isBlogPageVisible } from "../_lib/blog-page-visibility";
import HelloWorld from "./hello-world.mdx";
import styles from "./page.module.css";

const HelloWorldPage = async () => {
  await connection();

  if (!isBlogPageVisible()) {
    redirect("/dither");
  }

  return (
    <main className={styles.page}>
      <article className={styles.article}>
        <HelloWorld />
      </article>
      <Link className={styles.backLink} href="/blog">
        Back to blog
      </Link>
    </main>
  );
};

export default HelloWorldPage;
