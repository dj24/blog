"use client";

import dynamic from "next/dynamic";
import styles from "../../page.module.css";

type DotlottiePlayerProps = {
  src: string;
};

const DotlottiePlayerClient = dynamic(
  () => import("./dotlottie-player-client").then((mod) => mod.DotlottiePlayerClient),
  {
    loading: () => (
      <div className={styles.playerShell}>
        <div className={styles.playerFrame} />
        <div className={styles.scrubberPanel} />
      </div>
    ),
    ssr: false,
  },
);

export const DotlottiePlayer = ({ src }: DotlottiePlayerProps) => {
  return <DotlottiePlayerClient src={src} />;
};
