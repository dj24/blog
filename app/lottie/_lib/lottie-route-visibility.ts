import { env } from "@/env";
import { match } from "ts-pattern";

const normalizeEnvValue = (value: string | undefined) => {
  return value?.trim().toLowerCase();
};

export const isLottieRouteVisible = () => {
  return match(normalizeEnvValue(env.ENABLE_LOTTIE_ROUTES))
    .with("0", "false", "no", "off", () => false)
    .with("1", "true", "yes", "on", () => true)
    .otherwise(() => true);
};
