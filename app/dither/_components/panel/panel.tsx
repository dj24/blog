import styles from "./panel.module.css";

export const Panel = ({ children }: { children: React.ReactNode }) => {
  return <div className={styles.panel}>{children}</div>;
};
