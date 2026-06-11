import styles from "./arc.module.css";

const VIEW_BOX_WIDTH = 200;
const VIEW_BOX_HEIGHT = 200;
const START_X = 8;
const START_Y = 192;
const END_X = 192;
const END_Y = 8;
const RADIUS = 184;
const X_AXIS_ROTATION = 0;
const LARGE_ARC_FLAG = 0;
const SWEEP_FLAG = 0;
const ARC_WIDTH = 60;
const VERTICAL_LINE = `M ${START_X} ${START_Y - ARC_WIDTH} V ${START_Y}`
const BOTTOM_ARC = `A ${RADIUS} ${RADIUS} ${X_AXIS_ROTATION} ${LARGE_ARC_FLAG} ${SWEEP_FLAG} ${END_X} ${END_Y}`
const HORIZONTAL_LINE = `H ${VIEW_BOX_WIDTH - ARC_WIDTH}`
const TOP_ARC = `M ${START_X} ${START_Y - ARC_WIDTH} A ${RADIUS} ${RADIUS} ${X_AXIS_ROTATION} ${LARGE_ARC_FLAG} ${SWEEP_FLAG} ${END_X - ARC_WIDTH} ${END_Y}`

export const Arc = () => {
  return (
    <svg
      aria-hidden
      className={styles.arc}
      viewBox={`0 0 ${VIEW_BOX_WIDTH} ${VIEW_BOX_HEIGHT}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        className={styles.path}
        d={`${VERTICAL_LINE} ${BOTTOM_ARC} ${HORIZONTAL_LINE} ${TOP_ARC}`}
      />
    </svg>
  );
};
