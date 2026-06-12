import styles from "./square-checkbox.module.css";

type SquareCheckboxProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & {
  type?: "checkbox" | "radio";
};

export const SquareCheckbox = ({
  className,
  type = "checkbox",
  ...props
}: SquareCheckboxProps) => {
  return (
    <input
      {...props}
      className={[styles.squareCheckbox, className].filter(Boolean).join(" ")}
      type={type}
    />
  );
};
