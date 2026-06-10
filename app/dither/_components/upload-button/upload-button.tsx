import ActionButton from "../action-button";
import styles from "./upload-button.module.css";

const UploadButton = () => {
  return (
    <ActionButton aria-label="Upload file">
      <div className={styles.icon} />
    </ActionButton>
  );
};

export default UploadButton;
