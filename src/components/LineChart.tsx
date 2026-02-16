import React from "react";
import { View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { theme } from "../theme";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function LineChart({
  width = 320,
  height = 180,
  data,
}: {
  width?: number;
  height?: number;
  data: number[];
}) {
  if (data.length < 2) return <View style={{ height }} />;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const pad = 12;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;

  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * innerW;
    const t = (v - min) / range;
    const y = pad + (1 - clamp(t, 0, 1)) * innerH;
    return { x, y };
  });

  const d = pts
    .map((p, i) => (i === 0 ? `M ${p.x.toFixed(2)} ${p.y.toFixed(2)}` : `L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`))
    .join(" ");

  return (
    <Svg width={width} height={height}>
      <Path d={d} stroke={theme.colors.primary} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
