import styles from "./square-checkbox.module.css";

export const SquareCheckbox = () => {
  return <input aria-label="Select card" className={styles.squareCheckbox} type="checkbox" />;
};
