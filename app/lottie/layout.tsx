import { connection } from "next/server";
import { redirect } from "next/navigation";
import { LottieSubpageNavigation } from "./_components/lottie-subpage-navigation/lottie-subpage-navigation";
import { isLottieRouteVisible } from "./_lib/lottie-route-visibility";
import styles from "./layout.module.css";

const LottieLayout = async ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  await connection();

  if (!isLottieRouteVisible()) {
    redirect("/");
  }

  return (
    <div className={styles.shell}>
      <div className={styles.navigationBar}>
        <div className={styles.navigationContent}>
          <LottieSubpageNavigation />
        </div>
      </div>
      <div className={styles.pageContent}>{children}</div>
    </div>
  );
};

export default LottieLayout;
