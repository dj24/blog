"use client";

import { useRef } from "react";
import { useDitherStore } from "../../_state/dither-store";
import { ActionButton } from "../action-button/action-button";
import styles from "./upload-button.module.css";

export const UploadButton = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  const loadPreviewFile = useDitherStore((state) => state.loadPreviewFile);
  const previewStatus = useDitherStore((state) => state.previewStatus);

  return (
    <>
      <input
        ref={inputRef}
        accept="image/*"
        aria-label="Upload image file"
        className={styles.fileInput}
        disabled={previewStatus === "running"}
        onChange={(event) => {
          const file = event.target.files?.[0];

          event.target.value = "";

          if (!file) {
            return;
          }

          void loadPreviewFile(file);
        }}
        type="file"
      />
      <ActionButton
        aria-label="Upload file"
        disabled={previewStatus === "running"}
        onClick={() => {
          inputRef.current?.click();
        }}
      >
        <div className={styles.icon} />
      </ActionButton>
    </>
  );
};
