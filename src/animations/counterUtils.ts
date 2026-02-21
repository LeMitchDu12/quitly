import { MOTION_DURATION } from "./easing";

export function sanitizeCounterValue(input: number | null | undefined) {
  return typeof input === "number" && Number.isFinite(input) ? input : 0;
}

export function getCounterDurationMs(from: number, to: number) {
  const delta = Math.abs(to - from);
  const t = Math.max(0, Math.min(1, delta / 100));
  return Math.round(
    MOTION_DURATION.shortCounter + (MOTION_DURATION.longCounter - MOTION_DURATION.shortCounter) * t
  );
}
