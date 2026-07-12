"use client";

import { useEffect, useId, useState } from "react";
import { ActionButton } from "../action-button/action-button";
import styles from "./dither-drawer.module.css";

export const DitherDrawer = ({ children }: { children: React.ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const drawerId = useId();

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", closeOnEscape);

    return () => {
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 1023px)");
    const updateViewport = () => {
      setIsMobile(mediaQuery.matches);
    };

    updateViewport();
    mediaQuery.addEventListener("change", updateViewport);

    return () => {
      mediaQuery.removeEventListener("change", updateViewport);
    };
  }, []);

  return (
    <>
      <div className={styles.menuButton}>
        <ActionButton
          aria-controls={drawerId}
          aria-expanded={isOpen}
          aria-label={isOpen ? "Close controls menu" : "Open controls menu"}
          onClick={() => {
            setIsOpen((currentIsOpen) => !currentIsOpen);
          }}
        >
          <span aria-hidden className={styles.icon} />
        </ActionButton>
      </div>
      <button
        aria-label="Close controls menu"
        className={`${styles.backdrop} ${isOpen ? styles.backdropVisible : ""}`}
        onClick={() => {
          setIsOpen(false);
        }}
        tabIndex={isOpen ? 0 : -1}
        type="button"
      />
      <div
        aria-hidden={isMobile && !isOpen}
        className={`${styles.drawer} ${isOpen ? styles.drawerOpen : ""}`}
        id={drawerId}
        inert={isMobile && !isOpen ? true : undefined}
      >
        {children}
      </div>
    </>
  );
};
