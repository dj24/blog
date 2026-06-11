import { ActionButton } from "../action-button/action-button";
import styles from "./upload-button.module.css";

export const UploadButton = () => {
  return (
    <ActionButton aria-label="Upload file">
      <div className={styles.icon} />
    </ActionButton>
  );
};
