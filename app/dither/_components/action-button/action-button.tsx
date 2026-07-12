import styles from "./action-button.module.css";

export const ActionButton = ({
  "aria-controls": ariaControls,
  "aria-expanded": ariaExpanded,
  "aria-label": ariaLabel,
  children,
  disabled = false,
  onClick,
}: {
  "aria-controls"?: string;
  "aria-expanded"?: boolean;
  "aria-label": string;
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
}) => {
  return (
    <button
      aria-controls={ariaControls}
      aria-expanded={ariaExpanded}
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
