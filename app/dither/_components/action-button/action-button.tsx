import styles from "./action-button.module.css";

export const ActionButton = ({
  "aria-label": ariaLabel,
  children,
  disabled = false,
  onClick,
}: {
  "aria-label": string;
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
}) => {
  return (
    <button
      aria-label={ariaLabel}
      className={styles.actionButton}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
};
