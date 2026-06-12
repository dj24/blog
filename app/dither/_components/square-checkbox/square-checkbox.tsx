import styles from "./square-checkbox.module.css";

type SquareCheckboxProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">;

export const SquareCheckbox = ({ className, ...props }: SquareCheckboxProps) => {
  return (
    <input
      {...props}
      className={[styles.squareCheckbox, className].filter(Boolean).join(" ")}
      type="checkbox"
    />
  );
};
