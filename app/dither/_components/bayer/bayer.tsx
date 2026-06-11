import styles from "./bayer.module.css";

const BayerCell = ({ filled }: { filled?: boolean }) => {
  return <div className={filled ? `${styles.cell} ${styles.filled}` : styles.cell}></div>;
};

export const Bayer = ({
  trFilled,
  tlFilled,
  blFilled,
  brFilled,
}: {
  trFilled?: boolean;
  tlFilled?: boolean;
  blFilled?: boolean;
  brFilled?: boolean;
}) => (
  <div className={styles.bayer}>
    <BayerCell filled={tlFilled} />
    <BayerCell filled={trFilled} />
    <BayerCell filled={blFilled} />
    <BayerCell filled={brFilled} />
  </div>
);
