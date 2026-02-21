import { Animated } from "react-native";
import { MOTION_DURATION, easeOutCubic } from "./easing";

export function createPressableScale() {
  const scale = new Animated.Value(1);
  const pressIn = () =>
    Animated.timing(scale, {
      toValue: 0.98,
      duration: 90,
      easing: easeOutCubic,
      useNativeDriver: true,
    }).start();
  const pressOut = () =>
    Animated.timing(scale, {
      toValue: 1,
      duration: MOTION_DURATION.fast,
      easing: easeOutCubic,
      useNativeDriver: true,
    }).start();

  return { scale, pressIn, pressOut };
}
