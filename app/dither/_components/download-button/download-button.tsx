"use client";

import { ActionButton } from "../action-button/action-button";
import { useDitherStore } from "../../_state/dither-store";
import styles from "./download-button.module.css";

export const DownloadButton = ({ format }: { format: "jpeg" | "png" }) => {
  const exportPreview = useDitherStore((state) => state.exportPreview);
  const previewStatus = useDitherStore((state) => state.previewStatus);

  return (
    <ActionButton
      aria-label={`Download ${format} file`}
      disabled={previewStatus !== "ready"}
      onClick={() => {
        void exportPreview(format);
      }}
    >
      <div className={styles.icon} />
    </ActionButton>
  );
};
