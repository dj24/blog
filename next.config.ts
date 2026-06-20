import bundleAnalyzer from "@next/bundle-analyzer";
import type { NextConfig } from "next";
import { env } from "./env";

const nextConfig: NextConfig = {
  /* config options here */
};

const withBundleAnalyzer = bundleAnalyzer({
  enabled: env.ANALYZE === "true" || env.ANALYZE === "1" || env.ANALYZE === "yes" || env.ANALYZE === "on",
  openAnalyzer: false,
});

export default withBundleAnalyzer(nextConfig);
