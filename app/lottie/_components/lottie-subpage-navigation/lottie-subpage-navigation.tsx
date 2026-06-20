"use client";

import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";
import styles from "./lottie-subpage-navigation.module.css";

const lottieSubpages = [
  {
    href: "/lottie",
    label: "Compression",
    segment: null,
  },
  {
    href: "/lottie/player",
    label: "Player",
    segment: "player",
  },
  {
    href: "/lottie/shapes",
    label: "Shapes",
    segment: "shapes",
  },
  {
    href: "/lottie/demo",
    label: "WebGPU Demo",
    segment: "demo",
  },
] as const;

export const LottieSubpageNavigation = () => {
  const selectedSegment = useSelectedLayoutSegment();

  return (
    <nav aria-label="Lottie subpages" className={styles.navigation}>
      {lottieSubpages.map((subpage) => {
        const isActive = selectedSegment === subpage.segment;

        return (
          <Link
            key={subpage.href}
            href={subpage.href}
            aria-current={isActive ? "page" : undefined}
            className={isActive ? `${styles.link} ${styles.linkActive}` : styles.link}
          >
            {subpage.label}
          </Link>
        );
      })}
    </nav>
  );
};
