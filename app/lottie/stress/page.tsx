import type { Metadata } from "next";
import { LottieStressPageClient } from "./stress-page-client";

export const metadata: Metadata = {
  title: "Lottie Stress Test",
  description:
    "Generate a deterministic stress-test Lottie animation and compare dotLottie playback with the custom WebGPU renderer.",
};

const Page = () => {
  return <LottieStressPageClient />;
};

export default Page;
