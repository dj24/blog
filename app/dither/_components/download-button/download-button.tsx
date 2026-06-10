import ActionButton from "../action-button";
import styles from "./download-button.module.css";

const DownloadButton = () => {
  return (
    <ActionButton aria-label="Download file">
      <div className={styles.icon} />
    </ActionButton>
  );
};

export default DownloadButton;
