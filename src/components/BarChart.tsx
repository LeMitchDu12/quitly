import React from "react";
import { View } from "react-native";
import Svg, { Rect } from "react-native-svg";
import { theme } from "../theme";

export default function BarChart({
  width = 320,
  height = 170,
  data,
}: {
  width?: number;
  height?: number;
  data: number[];
}) {
  if (data.length === 0) return <View style={{ height }} />;

  const max = Math.max(...data, 1);
  const pad = 12;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  const gap = 3;
  const barW = Math.max(2, (innerW - gap * (data.length - 1)) / data.length);

  return (
    <Svg width={width} height={height}>
      {data.map((value, i) => {
        const ratio = Math.max(0, value) / max;
        const h = ratio <= 0 ? 0 : Math.max(3, ratio * innerH);
        const x = pad + i * (barW + gap);
        const y = pad + innerH - h;

        return (
          <Rect
            key={`bar-${i}`}
            x={x}
            y={y}
            width={barW}
            height={h}
            rx={2}
            fill={theme.colors.primary}
            opacity={value > 0 ? 0.95 : 0.12}
          />
        );
      })}
    </Svg>
  );
}
