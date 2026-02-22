// src/features/eye/engine/stimuli.tsx
// Visual stimuli components: Tumbling E optotype + Astigmatism dial.

import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Rect, G, Line, Circle, Text as SvgText } from 'react-native-svg';

// ── Tumbling E ───────────────────────────────────────────────────────────────

export type EDirection = 'right' | 'left' | 'up' | 'down';
export const E_DIRECTIONS: EDirection[] = ['right', 'left', 'up', 'down'];

export const DIR_ARROW: Record<EDirection, string> = {
  right: '→',
  left: '←',
  up: '↑',
  down: '↓',
};

function dirToRotation(dir: EDirection): number {
  switch (dir) {
    case 'right': return 0;
    case 'down':  return 90;
    case 'left':  return 180;
    case 'up':    return 270;
  }
}

export function randomDirection(): EDirection {
  return E_DIRECTIONS[Math.floor(Math.random() * 4)];
}

// Standard Sloan E: 5-unit grid, each unit = H/5.
// Stroke widths match clinical optotype specification.
export const TumblingE: React.FC<{ sizePt: number; direction: EDirection }> = ({ sizePt, direction }) => {
  const H = Math.max(sizePt, 6); // enforce minimum renderable size
  const s = H / 5;
  const pad = H * 0.2;
  const total = H + pad * 2;
  const rot = dirToRotation(direction);

  return (
    <View style={[styles.optoBg, { width: total, height: total }]}>
      <Svg width={total} height={total}>
        <G transform={`rotate(${rot}, ${total / 2}, ${total / 2}) translate(${pad}, ${pad})`}>
          {/* Left vertical bar */}
          <Rect x={0} y={0} width={s} height={H} fill="#000" />
          {/* Top horizontal */}
          <Rect x={0} y={0} width={H} height={s} fill="#000" />
          {/* Middle horizontal (60% width, at 40% down) */}
          <Rect x={0} y={H * 0.4} width={H * 0.65} height={s} fill="#000" />
          {/* Bottom horizontal */}
          <Rect x={0} y={H - s} width={H} height={s} fill="#000" />
        </G>
      </Svg>
    </View>
  );
};

// ── Astigmatism dial ─────────────────────────────────────────────────────────

// Radial fan of 18 lines (every 10°) on white background.
// User selects the line that appears darkest/sharpest.
// When astigmatism is present, meridians differ in apparent contrast.

export interface AstigDialProps {
  size: number;           // diameter in points
  selectedAxis: number | null;  // 0–179°
  onSelect: (axis: number) => void;
}

const SPOKE_COUNT = 18; // every 10°

export const AstigDial: React.FC<AstigDialProps> = ({ size, selectedAxis, onSelect }) => {
  const r = size / 2;
  const lineR = r * 0.85;

  const spokes = useMemo(() =>
    Array.from({ length: SPOKE_COUNT }, (_, i) => {
      const deg = i * 10; // 0, 10, 20, ... 170
      const rad = (deg * Math.PI) / 180;
      return {
        deg,
        x1: r + Math.cos(rad) * lineR,
        y1: r - Math.sin(rad) * lineR,
        x2: r - Math.cos(rad) * lineR,
        y2: r + Math.sin(rad) * lineR,
      };
    }),
    [r, lineR],
  );

  // Tap hit zone: 30pt circle at each end of spoke
  const hitR = 18;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        {/* White background circle */}
        <Circle cx={r} cy={r} r={r * 0.95} fill="white" />

        {/* Dial spokes */}
        {spokes.map(s => {
          const isSelected = selectedAxis === s.deg;
          return (
            <Line
              key={s.deg}
              x1={s.x1} y1={s.y1}
              x2={s.x2} y2={s.y2}
              stroke={isSelected ? '#6C5CE7' : '#111'}
              strokeWidth={isSelected ? 3 : 1.5}
            />
          );
        })}

        {/* Centre dot */}
        <Circle cx={r} cy={r} r={4} fill="#333" />

        {/* Tap targets — invisible but pressable via onPress on the Svg itself */}
      </Svg>

      {/* Touch targets overlaid as absolute Views */}
      {spokes.map(s => {
        const isSelected = selectedAxis === s.deg;
        return (
          <View
            key={s.deg}
            onTouchEnd={() => onSelect(s.deg)}
            style={[
              styles.hitTarget,
              {
                left: s.x1 - hitR,
                top: s.y1 - hitR,
                width: hitR * 2,
                height: hitR * 2,
                borderRadius: hitR,
                backgroundColor: isSelected ? 'rgba(108,92,231,0.2)' : 'transparent',
              },
            ]}
          />
        );
      })}
    </View>
  );
};

// ── Contrast stimulus ─────────────────────────────────────────────────────────

// Contrast letter stimulus: opacity-based contrast reduction.
export const ContrastE: React.FC<{ sizePt: number; direction: EDirection; contrast: number }> = ({
  sizePt, direction, contrast,
}) => {
  const H = Math.max(sizePt, 20);
  const s = H / 5;
  const pad = H * 0.2;
  const total = H + pad * 2;
  const rot = dirToRotation(direction);

  // Convert contrast (0-1) to actual grey value — darker at high contrast
  const grey = Math.round(255 * (1 - contrast));
  const fill = `rgb(${grey},${grey},${grey})`;

  return (
    <View style={[styles.optoBg, { width: total, height: total }]}>
      <Svg width={total} height={total}>
        <G transform={`rotate(${rot}, ${total / 2}, ${total / 2}) translate(${pad}, ${pad})`}>
          <Rect x={0} y={0} width={s} height={H} fill={fill} />
          <Rect x={0} y={0} width={H} height={s} fill={fill} />
          <Rect x={0} y={H * 0.4} width={H * 0.65} height={s} fill={fill} />
          <Rect x={0} y={H - s} width={H} height={s} fill={fill} />
        </G>
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  optoBg: {
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
  },
  hitTarget: {
    position: 'absolute',
  },
});
