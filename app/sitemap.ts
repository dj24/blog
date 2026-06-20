import type { MetadataRoute } from "next";
import { env } from "@/env";

const getBaseUrl = () => {
  const siteUrl =
    env.NEXT_PUBLIC_SITE_URL ??
    env.VERCEL_PROJECT_PRODUCTION_URL ??
    env.VERCEL_URL ??
    "http://localhost:3000";

  return siteUrl.startsWith("http") ? siteUrl : `https://${siteUrl}`;
};

const sitemap = (): MetadataRoute.Sitemap => {
  const baseUrl = getBaseUrl();

  return [
    {
      url: `${baseUrl}/dither`,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/horizontal-masonry`,
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];
};

export default sitemap;
