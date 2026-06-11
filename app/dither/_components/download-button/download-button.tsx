import { ActionButton } from "../action-button/action-button";
import styles from "./download-button.module.css";

export const DownloadButton = () => {
  return (
    <ActionButton aria-label="Download file">
      <div className={styles.icon} />
    </ActionButton>
  );
};
