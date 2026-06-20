"use client";

import { DotLottieReact, type DotLottie, type FrameEvent } from "@lottiefiles/dotlottie-react";
import { type ChangeEvent, useEffect, useState } from "react";
import styles from "../../page.module.css";

type DotlottiePlayerProps = {
  src: string;
};

const getMaxFrame = (player: DotLottie | null) => {
  if (!player) {
    return 0;
  }

  return Math.max(0, Math.ceil(player.totalFrames - 1));
};

export const DotlottiePlayer = ({ src }: DotlottiePlayerProps) => {
  const [player, setPlayer] = useState<DotLottie | null>(null);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [maxFrame, setMaxFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!player) {
      return;
    }

    const syncFrameBounds = () => {
      const nextMaxFrame = getMaxFrame(player);

      setMaxFrame(nextMaxFrame);
      setCurrentFrame(Math.min(Math.round(player.currentFrame), nextMaxFrame));
    };

    const handleReady = () => {
      player.pause();
      player.setUseFrameInterpolation(false);
      player.setFrame(0);
      syncFrameBounds();
      setIsPlaying(false);
    };

    const handleFrame = ({ currentFrame: nextFrame }: FrameEvent) => {
      setCurrentFrame(Math.min(Math.round(nextFrame), getMaxFrame(player)));
    };

    const handlePlay = () => {
      syncFrameBounds();
      setIsPlaying(true);
    };

    const handlePause = () => {
      syncFrameBounds();
      setIsPlaying(false);
    };

    const handleStop = () => {
      setCurrentFrame(0);
      setIsPlaying(false);
    };

    player.addEventListener("ready", handleReady);
    player.addEventListener("frame", handleFrame);
    player.addEventListener("play", handlePlay);
    player.addEventListener("pause", handlePause);
    player.addEventListener("stop", handleStop);

    if (player.isLoaded) {
      handleReady();
    }

    return () => {
      player.removeEventListener("ready", handleReady);
      player.removeEventListener("frame", handleFrame);
      player.removeEventListener("play", handlePlay);
      player.removeEventListener("pause", handlePause);
      player.removeEventListener("stop", handleStop);
    };
  }, [player]);

  const handleScrub = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFrame = Number(event.target.value);

    setCurrentFrame(nextFrame);
    player?.pause();
    player?.setFrame(nextFrame);
    setIsPlaying(false);
  };

  const handleTogglePlayback = () => {
    if (!player) {
      return;
    }

    if (player.isPlaying) {
      player.pause();
      setIsPlaying(false);

      return;
    }

    player.play();
    setIsPlaying(true);
  };

  return (
    <div className={styles.playerShell}>
      <div className={styles.playerFrame}>
        <DotLottieReact
          aria-label="Square Lottie animation"
          className={styles.playerCanvas}
          dotLottieRefCallback={setPlayer}
          renderConfig={{ autoResize: true }}
          src={src}
        />
      </div>

      <div className={styles.scrubberPanel}>
        <div className={styles.scrubberHeader}>
          <button className={styles.transportButton} onClick={handleTogglePlayback} type="button">
            {isPlaying ? "Pause" : "Play"}
          </button>
          <div className={styles.frameReadout}>
            <span className={styles.frameLabel}>Frame</span>
            <strong className={styles.frameValue}>
              {currentFrame} / {maxFrame}
            </strong>
          </div>
        </div>

        <label className={styles.scrubberLabel} htmlFor="square-frame-scrubber">
          Scrub through every frame
        </label>
        <input
          className={styles.scrubber}
          id="square-frame-scrubber"
          max={maxFrame}
          min={0}
          onChange={handleScrub}
          step={1}
          type="range"
          value={Math.min(currentFrame, maxFrame)}
        />
      </div>
    </div>
  );
};
