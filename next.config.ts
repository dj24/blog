import bundleAnalyzer from "@next/bundle-analyzer";
import createMDX from "@next/mdx";
import type { NextConfig } from "next";
import { env } from "./env";

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.wgsl": {
        loaders: ["./wgsl-loader.cjs"],
        as: "*.js",
      },
    },
  },
};

const withBundleAnalyzer = bundleAnalyzer({
  enabled:
    env.ANALYZE === "true" || env.ANALYZE === "1" || env.ANALYZE === "yes" || env.ANALYZE === "on",
  openAnalyzer: false,
});

const withMDX = createMDX({
  options: {
    rehypePlugins: [
      ["rehype-pretty-code", { theme: "github-dark-default" }],
      "rehype-slug",
      [
        "rehype-toc",
        {
          headings: ["h2", "h3"],
          cssClasses: {
            toc: "table-of-contents",
            list: "table-of-contents-list",
            listItem: "table-of-contents-item",
            link: "table-of-contents-link",
          },
        },
      ],
    ],
  },
});

export default withBundleAnalyzer(withMDX(nextConfig));
