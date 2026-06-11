import styles from "./range-input.module.css";

export const RangeInput = (props: React.InputHTMLAttributes<HTMLInputElement>) => {
  return <input {...props} className={styles.rangeInput} type="range" />;
};
