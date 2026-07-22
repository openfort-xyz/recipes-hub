import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors } from './theme';

interface SparklineProps {
  values: number[];
  width?: number;
  height?: number;
  positive?: boolean;
}

// Minimal single-path sparkline — no axes, no legend, just the trend.
export const Sparkline: React.FC<SparklineProps> = ({ values, width = 280, height = 56, positive = true }) => {
  const path = useMemo(() => {
    if (values.length < 2) return null;

    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const stepX = width / (values.length - 1);

    return values
      .map((value, index) => {
        const x = index * stepX;
        const y = height - ((value - min) / range) * height;
        return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(' ');
  }, [values, width, height]);

  if (!path) {
    return <View style={[styles.placeholder, { width, height }]} />;
  }

  return (
    <Svg width={width} height={height}>
      <Path
        d={path}
        stroke={positive ? colors.accent : colors.negative}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
};

const styles = StyleSheet.create({
  placeholder: {
    borderRadius: 8,
  },
});
