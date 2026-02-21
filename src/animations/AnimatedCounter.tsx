import React, { useEffect, useRef, useState } from "react";
import { Animated, Text, type StyleProp, type TextStyle } from "react-native";
import { easeOutCubic, MOTION_DURATION } from "./easing";
import { getCounterDurationMs, sanitizeCounterValue } from "./counterUtils";
import { useReducedMotion } from "./useReducedMotion";

type AnimatedCounterProps = {
  value: number | null | undefined;
  style?: StyleProp<TextStyle>;
  precision?: number;
  minDeltaToAnimate?: number;
  formatter?: (value: number) => string;
  testID?: string;
};

function roundValue(value: number, precision: number) {
  if (precision <= 0) return Math.round(value);
  const mul = 10 ** precision;
  return Math.round(value * mul) / mul;
}

export default function AnimatedCounter({
  value,
  style,
  precision = 0,
  minDeltaToAnimate = 0,
  formatter,
  testID,
}: AnimatedCounterProps) {
  const reducedMotion = useReducedMotion();
  const animated = useRef(new Animated.Value(0)).current;
  const lastValueRef = useRef(0);
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const id = animated.addListener(({ value: next }) => {
      const safe = sanitizeCounterValue(next);
      setDisplayValue(roundValue(safe, precision));
    });
    return () => {
      animated.removeListener(id);
    };
  }, [animated, precision]);

  useEffect(() => {
    const target = sanitizeCounterValue(value);
    const from = lastValueRef.current;
    const delta = Math.abs(target - from);
    const shouldAnimate = !reducedMotion && delta >= minDeltaToAnimate;

    if (!shouldAnimate) {
      animated.stopAnimation();
      animated.setValue(target);
      lastValueRef.current = target;
      return;
    }

    const duration = Math.max(MOTION_DURATION.shortCounter, getCounterDurationMs(from, target));
    const anim = Animated.timing(animated, {
      toValue: target,
      duration,
      easing: easeOutCubic,
      useNativeDriver: false,
    });
    anim.start(() => {
      lastValueRef.current = target;
    });
    return () => {
      anim.stop();
    };
  }, [animated, minDeltaToAnimate, reducedMotion, value]);

  const safeDisplay = sanitizeCounterValue(displayValue);
  const rendered = formatter ? formatter(safeDisplay) : String(roundValue(safeDisplay, precision));
  return (
    <Text testID={testID} style={style}>
      {rendered}
    </Text>
  );
}
