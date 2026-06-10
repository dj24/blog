import styles from "./card.module.css";

const Card = ({ children }: { children?: React.ReactNode }) => {
  return <div className={styles.card}>{children}</div>;
};

export default Card;
