import styles from "./square-checkbox.module.css";

const SquareCheckbox = () => {
  return <input aria-label="Select card" className={styles.squareCheckbox} type="checkbox" />;
};

export default SquareCheckbox;
