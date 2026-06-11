import styles from "./card.module.css";

export const Card = ({ children }: { children?: React.ReactNode }) => {
  return <div className={styles.card}>{children}</div>;
};
