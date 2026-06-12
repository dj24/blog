"use client";

import styles from "./range-input.module.css";

type RangeInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type" | "value"
> & {
  onValueChange: (value: number) => void;
  scale?: number;
  value: number;
};

export const RangeInput = ({
  onValueChange,
  scale = 1,
  value,
  ...props
}: RangeInputProps) => {
  const scaledValue = value / scale;

  return (
    <input
      {...props}
      className={styles.rangeInput}
      onChange={(event) => {
        props.onChange?.(event);
        onValueChange(Number(event.currentTarget.value) * scale);
      }}
      type="range"
      value={scaledValue}
    />
  );
};
