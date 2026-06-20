import type { Metadata } from "next";
import { LottiePageClient } from "./_components/lottie-page-client";

export const metadata: Metadata = {
  title: "Lottie Compression",
  description: "Convert between raw Lottie JSON and dotLottie archives.",
};

const Page = () => {
  return <LottiePageClient />;
};

export default Page;
