"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { match } from "ts-pattern";
import styles from "./page.module.css";

export const Gallery = ({ children }: { children: ReactNode }) => {
  const galleryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const gallery = galleryRef.current;
    if (!gallery) return;

    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;

      const delta =
        event.deltaY *
        match(event.deltaMode)
          .with(1, () => 16)
          .with(2, () => gallery.clientWidth)
          .otherwise(() => 1);
      const canScroll =
        delta > 0
          ? gallery.scrollLeft < gallery.scrollWidth - gallery.clientWidth - 1
          : gallery.scrollLeft > 0;

      if (!canScroll) return;
      event.preventDefault();
      gallery.scrollLeft += delta;
    };

    gallery.addEventListener("wheel", onWheel, { passive: false });
    return () => gallery.removeEventListener("wheel", onWheel);
  }, []);

  return (
    <div
      ref={galleryRef}
      className={styles.gallery}
      role="region"
      aria-label="Photography gallery"
      aria-describedby="gallery-instructions"
      tabIndex={0}
      onKeyDown={(event) => {
        const gallery = event.currentTarget;
        const left = match(event.key)
          .with("ArrowRight", () => gallery.scrollLeft + gallery.clientWidth * 0.8)
          .with("ArrowLeft", () => gallery.scrollLeft - gallery.clientWidth * 0.8)
          .with("Home", () => 0)
          .with("End", () => gallery.scrollWidth)
          .otherwise(() => null);

        if (left === null) return;
        event.preventDefault();
        gallery.scrollTo({ left, behavior: "instant" });
      }}
    >
      <p id="gallery-instructions" className={styles.srOnly}>
        Scroll or swipe horizontally to explore. Use the left and right arrow keys, or Home and End,
        when the gallery is focused.
      </p>
      {children}
    </div>
  );
};
