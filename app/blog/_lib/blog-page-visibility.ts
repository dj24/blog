import { env } from "@/env";
import { match } from "ts-pattern";

const normalizeEnvValue = (value: string | undefined) => {
  return value?.trim().toLowerCase();
};

export const isBlogPageVisible = () => {
  return match(normalizeEnvValue(env.ENABLE_BLOG_PAGE))
    .with("0", "false", "no", "off", () => false)
    .otherwise(() => true);
};
