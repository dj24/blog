import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

const booleanLikeSchema = z.enum(["0", "1", "false", "true", "no", "yes", "off", "on"]);

export const env = createEnv({
  server: {
    ANALYZE: booleanLikeSchema.optional(),
    ENABLE_LOTTIE_ROUTES: booleanLikeSchema.optional(),
    VERCEL_PROJECT_PRODUCTION_URL: z.string().min(1).optional(),
    VERCEL_URL: z.string().min(1).optional(),
  },
  client: {
    NEXT_PUBLIC_SITE_URL: z.url().optional(),
  },
  experimental__runtimeEnv: {
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  },
});
