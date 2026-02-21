import React, { useEffect, useRef } from "react";
import { Animated, type StyleProp, type ViewStyle } from "react-native";
import { MOTION_DURATION, MOTION_ENTER_OFFSET_Y, easeOutCubic } from "./easing";
import { useReducedMotion } from "./useReducedMotion";

type FadeInProps = {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  distance?: number;
  style?: StyleProp<ViewStyle>;
  reducedMotion?: boolean;
};

export default function FadeIn({
  children,
  delay = 0,
  duration = MOTION_DURATION.enter,
  distance = MOTION_ENTER_OFFSET_Y,
  style,
  reducedMotion,
}: FadeInProps) {
  const reducedMotionPref = useReducedMotion();
  const shouldReduce = reducedMotion ?? reducedMotionPref;
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(distance)).current;

  useEffect(() => {
    const finalDelay = shouldReduce ? 0 : delay;
    const finalDuration = shouldReduce ? MOTION_DURATION.reduced : duration;
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: finalDuration,
        delay: finalDelay,
        easing: easeOutCubic,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: finalDuration,
        delay: finalDelay,
        easing: easeOutCubic,
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay, distance, duration, opacity, shouldReduce, translateY]);

  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}
