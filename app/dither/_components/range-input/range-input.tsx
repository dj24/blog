import styles from "./range-input.module.css";

const RangeInput = (props: React.InputHTMLAttributes<HTMLInputElement>) => {
  return <input {...props} className={styles.rangeInput} type="range" />;
};

export default RangeInput;
