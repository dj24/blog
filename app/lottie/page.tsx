import type { Metadata } from "next";
import { LottieVerification } from "./_components/lottie-verification/lottie-verification";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Lottie Compression",
  description: "Convert between raw Lottie JSON and dotLottie archives.",
};

const Page = () => {
  return (
    <main className={styles.page}>
      <LottieVerification />
    </main>
  );
};

export default Page;
