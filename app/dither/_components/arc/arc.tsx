import styles from "./arc.module.css";

const VIEW_BOX_WIDTH = 200;
const VIEW_BOX_HEIGHT = 200;
const START_X = 8;
const START_Y = 192;
const END_X = 192;
const END_Y = 8;
const OUTER_RADIUS = 184;
const X_AXIS_ROTATION = 0;
const LARGE_ARC_FLAG = 0;
const SWEEP_FLAG = 0;
const ARC_WIDTH = 60;
const INNER_RADIUS = OUTER_RADIUS - ARC_WIDTH;
const INNER_START_X = START_X;
const INNER_START_Y = START_Y - ARC_WIDTH;
const INNER_END_X = END_X - ARC_WIDTH;
const VERTICAL_LINE = `M ${INNER_START_X} ${INNER_START_Y} V ${START_Y}`;
const OUTER_ARC = `A ${OUTER_RADIUS} ${OUTER_RADIUS} ${X_AXIS_ROTATION} ${LARGE_ARC_FLAG} ${SWEEP_FLAG} ${END_X} ${END_Y}`;
const TOP_LINE = `H ${INNER_END_X}`;
const INNER_ARC = `A ${INNER_RADIUS} ${INNER_RADIUS} ${X_AXIS_ROTATION} ${LARGE_ARC_FLAG} ${1 - SWEEP_FLAG} ${INNER_START_X} ${INNER_START_Y}`;
const CLOSE_PATH = "Z";

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
        d={`${VERTICAL_LINE} ${OUTER_ARC} ${TOP_LINE} ${INNER_ARC} ${CLOSE_PATH}`}
      />
    </svg>
  );
};
