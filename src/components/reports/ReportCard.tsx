import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { theme } from "../../theme";

export default function ReportCard({
  title,
  value,
  subtitle,
  delayMs = 0,
  children,
}: {
  title: string;
  value?: string;
  subtitle?: string;
  delayMs?: number;
  children?: React.ReactNode;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 220, delay: delayMs, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 220, delay: delayMs, useNativeDriver: true }),
    ]).start();
  }, [delayMs, opacity, translateY]);

  return (
    <Animated.View style={[styles.card, { opacity, transform: [{ translateY }] }]}>
      <Text style={styles.title}>{title}</Text>
      {value ? <Text style={styles.value}>{value}</Text> : null}
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    borderRadius: theme.radius.lg,
    padding: 16,
  },
  title: {
    color: theme.colors.textSecondary,
    fontWeight: "700",
    fontSize: 12,
    letterSpacing: 0.2,
  },
  value: {
    marginTop: 8,
    color: theme.colors.textPrimary,
    fontWeight: "900",
    fontSize: 28,
  },
  subtitle: {
    marginTop: 6,
    color: theme.colors.textTertiary,
    fontSize: 12,
  },
});
