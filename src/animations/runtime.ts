// Central place for animation runtime selection.
// Reanimated can be plugged later without changing screen-level callsites.
export type AnimationEngine = "animated" | "reanimated";

function detectEngine(): AnimationEngine {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require("react-native-reanimated");
    return "reanimated";
  } catch {
    return "animated";
  }
}

export const ANIMATION_ENGINE: AnimationEngine = detectEngine();
