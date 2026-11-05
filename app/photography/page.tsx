import type { Metadata } from "next";
import Image from "next/image";
import { Gallery } from "./gallery";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Photography | Field Notes",
  description: "A collection of photographs from lakes, mountains, and underground.",
};

const photos = [
  {
    src: "lakeside",
    alt: "A wooded green hill and boathouse reflected in a calm lake",
    width: 2048,
    height: 1152,
  },
  {
    src: "mountain-ridge",
    alt: "A sunlit mountain ridge above a sweeping green valley",
    width: 2048,
    height: 1152,
  },
  {
    src: "cavern",
    alt: "Light falling across the rocky walls and still water of a dark cavern",
    width: 1920,
    height: 1280,
  },
  {
    src: "lake-view",
    alt: "A blue lake surrounded by forests and hills beneath a clear sky",
    width: 2048,
    height: 1152,
  },
] as const;

const PhotographyPage = () => (
  <main className={styles.page}>
    <h1 className={styles.srOnly}>Photography</h1>
    <Gallery>
      {photos.map((photo, index) => (
        <Image
          key={photo.src}
          className={styles.photo}
          src={`/photography/${photo.src}.jpg`}
          alt={photo.alt}
          width={photo.width}
          height={photo.height}
          sizes="(max-width: 600px) 90vw, 140vh"
          preload={index === 0}
        />
      ))}
    </Gallery>
  </main>
);

export default PhotographyPage;
