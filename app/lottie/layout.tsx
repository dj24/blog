import { connection } from "next/server";
import { redirect } from "next/navigation";
import { isLottieRouteVisible } from "./_lib/lottie-route-visibility";

const LottieLayout = async ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  await connection();

  if (!isLottieRouteVisible()) {
    redirect("/");
  }

  return children;
};

export default LottieLayout;
