import { Easing } from "react-native";

export const MOTION_DURATION = {
  fast: 180,
  enter: 260,
  shortCounter: 450,
  longCounter: 700,
  breathCycle: 2400,
  reduced: 100,
} as const;

export const MOTION_STAGGER_MS = 60;
export const MOTION_ENTER_OFFSET_Y = 8;

export const easeOutCubic = Easing.bezier(0.22, 1, 0.36, 1);
