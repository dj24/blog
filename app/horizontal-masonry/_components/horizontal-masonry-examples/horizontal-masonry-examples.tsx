"use client";

import { Grid } from "react-horizontal-masonry";
import styles from "./horizontal-masonry-examples.module.css";

type MasonryItem = {
  label: string;
  ratio: number;
  tone: "ink" | "moss" | "clay" | "sky" | "lemon" | "rose";
};

const galleryItems: MasonryItem[] = [
  { label: "9 / 16", ratio: 9 / 16, tone: "ink" },
  { label: "1", ratio: 1, tone: "moss" },
  { label: "16 / 9", ratio: 16 / 9, tone: "clay" },
  { label: "4 / 5", ratio: 4 / 5, tone: "sky" },
  { label: "21 / 9", ratio: 21 / 9, tone: "lemon" },
  { label: "3 / 4", ratio: 3 / 4, tone: "rose" },
  { label: "5 / 3", ratio: 5 / 3, tone: "moss" },
  { label: "2 / 3", ratio: 2 / 3, tone: "ink" },
  { label: "4 / 3", ratio: 4 / 3, tone: "clay" },
];

const renderItems = (items: MasonryItem[]) => {
  return items.map((item) => (
    <Grid.Item key={`${item.label}-${item.ratio}`} ratio={item.ratio}>
      <div className={`${styles.tile} ${styles[item.tone]}`}>
        <span>{item.label}</span>
      </div>
    </Grid.Item>
  ));
};

export const HorizontalMasonryExamples = () => {
  return (
    <div className={styles.examples}>
      <div className={styles.example}>
        <Grid gap="10px" targetRowAspectRatio={4.6}>
          {renderItems(galleryItems)}
        </Grid>
      </div>
    </div>
  );
};
