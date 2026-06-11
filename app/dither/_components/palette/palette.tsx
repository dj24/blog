import styles from "./palette.module.css";

export const Palette = ({ colors }: { colors: string[] }) => {
  return (
    <div className={styles.palette}>
      {colors.map((color, index) => (
        <div key={`${color}-${index}`} className={styles.swatch} style={{ background: color }} />
      ))}
    </div>
  );
};
