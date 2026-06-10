import styles from "./action-button.module.css";

const ActionButton = ({
  "aria-label": ariaLabel,
  children,
}: {
  "aria-label": string;
  children: React.ReactNode;
}) => {
  return (
    <button aria-label={ariaLabel} className={styles.actionButton} type="button">
      {children}
    </button>
  );
};

export default ActionButton;
