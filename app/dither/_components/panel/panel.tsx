import styles from "./panel.module.css";

const Panel = ({ children }: { children: React.ReactNode }) => {
  return <div className={styles.panel}>{children}</div>;
};

export default Panel;
