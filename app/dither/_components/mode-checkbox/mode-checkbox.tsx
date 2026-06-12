"use client";

import type { DitherMode } from "../../_state/dither-store";
import { useDitherStore } from "../../_state/dither-store";
import { SquareCheckbox } from "../square-checkbox/square-checkbox";

export const ModeCheckbox = ({ label, mode }: { label: string; mode: DitherMode }) => {
  const selectedMode = useDitherStore((state) => state.settings.mode);
  const setMode = useDitherStore((state) => state.setMode);

  return (
    <SquareCheckbox
      aria-label={label}
      checked={selectedMode === mode}
      onChange={() => {
        void setMode(mode);
      }}
    />
  );
};
