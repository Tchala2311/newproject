import React from 'react';
import Svg, { Circle, Line, Rect, Polygon, G } from 'react-native-svg';
import { PatternType } from '../data/games';

type Props = {
  type: PatternType;
  accent: string;
  size?: number;
};

// Decorative SVG pattern behind the game card preview. Mirrors the design's
// six pattern variants so each game has a recognizable silhouette.
export function BgPattern({ type, accent, size = 280 }: Props) {
  const opacity = 0.18;

  if (type === 'circles') {
    return (
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} opacity={opacity}>
        {[1, 2, 3, 4].map((i) => (
          <Circle
            key={i}
            cx={size / 2}
            cy={size / 2}
            r={i * 46}
            fill="none"
            stroke={accent}
            strokeWidth={1.5}
            opacity={1 - i * 0.18}
          />
        ))}
        <Circle cx={size / 2} cy={size / 2} r={16} fill={accent} opacity={0.6} />
      </Svg>
    );
  }

  if (type === 'dots') {
    const cells: React.ReactNode[] = [];
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 6; c++) {
        cells.push(
          <Circle
            key={`${r}-${c}`}
            cx={26 + c * 48}
            cy={26 + r * 48}
            r={(r + c) % 3 === 0 ? 9 : 3.5}
            fill={accent}
            opacity={0.5 + ((r + c) % 3) * 0.15}
          />
        );
      }
    }
    return (
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} opacity={opacity}>
        {cells}
      </Svg>
    );
  }

  if (type === 'grid') {
    const lines: React.ReactNode[] = [];
    for (let i = 0; i < 7; i++) {
      lines.push(
        <Line key={`v${i}`} x1={i * 46} y1={0} x2={i * 46} y2={size} stroke={accent} strokeWidth={1} />,
        <Line key={`h${i}`} x1={0} y1={i * 46} x2={size} y2={i * 46} stroke={accent} strokeWidth={1} />
      );
    }
    return (
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} opacity={opacity}>
        {lines}
        <Rect x={88} y={88} width={104} height={104} rx={8} fill={accent} opacity={0.25} />
      </Svg>
    );
  }

  if (type === 'lines') {
    return (
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} opacity={opacity}>
        {[0, 36, 72, 108, 144, 180, 216].map((y, i) => (
          <Rect
            key={i}
            x={36}
            y={y + 18}
            width={208 - i * 10}
            height={22}
            rx={5}
            fill={accent}
            opacity={0.3 + i * 0.05}
          />
        ))}
      </Svg>
    );
  }

  if (type === 'hex') {
    const hexes: [number, number][] = [
      [140, 80],
      [96, 148],
      [184, 148],
      [140, 216],
      [52, 216],
      [228, 216],
    ];
    return (
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} opacity={opacity}>
        {hexes.map(([x, y], i) => (
          <Polygon
            key={i}
            points={`${x},${y - 26} ${x + 22},${y - 13} ${x + 22},${y + 13} ${x},${y + 26} ${x - 22},${y + 13} ${x - 22},${y - 13}`}
            fill={accent}
            opacity={0.35 + i * 0.05}
          />
        ))}
      </Svg>
    );
  }

  if (type === 'pixel') {
    const cells: React.ReactNode[] = [];
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if ((r + c) % 3 === 0) {
          cells.push(
            <Rect
              key={`${r}-${c}`}
              x={c * 30}
              y={r * 30}
              width={26}
              height={26}
              rx={3}
              fill={accent}
              opacity={0.25 + ((r * c) % 5) * 0.08}
            />
          );
        }
      }
    }
    return (
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} opacity={opacity}>
        <G>{cells}</G>
      </Svg>
    );
  }

  return null;
}
