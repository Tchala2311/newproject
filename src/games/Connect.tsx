import React, { useRef, useState } from 'react';
import { PanResponder, Pressable, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { Game } from '../data/games';
import { GameShell } from './GameShell';
import { GameResult } from './GameResult';
import { colors, fontFamily } from '../theme';

type Props = {
  game: Game;
  onBack: () => void;
  onComplete: (won: boolean, score: number) => void;
};

type Pt = { x: number; y: number; n: number };

// Three difficulty levels of dot layouts
const LAYOUTS: Pt[][] = [
  [
    { x: 0.2, y: 0.2, n: 1 },
    { x: 0.8, y: 0.25, n: 2 },
    { x: 0.5, y: 0.55, n: 3 },
    { x: 0.25, y: 0.85, n: 4 },
    { x: 0.78, y: 0.85, n: 5 },
  ],
  [
    { x: 0.2, y: 0.18, n: 1 },
    { x: 0.78, y: 0.2, n: 2 },
    { x: 0.5, y: 0.4, n: 3 },
    { x: 0.18, y: 0.6, n: 4 },
    { x: 0.82, y: 0.6, n: 5 },
    { x: 0.4, y: 0.85, n: 6 },
  ],
  [
    { x: 0.18, y: 0.15, n: 1 },
    { x: 0.5, y: 0.22, n: 2 },
    { x: 0.82, y: 0.18, n: 3 },
    { x: 0.25, y: 0.45, n: 4 },
    { x: 0.78, y: 0.5, n: 5 },
    { x: 0.5, y: 0.7, n: 6 },
    { x: 0.2, y: 0.85, n: 7 },
  ],
];

function segIntersect(a: Pt, b: Pt, c: Pt, d: Pt) {
  const det = (b.x - a.x) * (d.y - c.y) - (b.y - a.y) * (d.x - c.x);
  if (Math.abs(det) < 1e-9) return false;
  const t = ((c.x - a.x) * (d.y - c.y) - (c.y - a.y) * (d.x - c.x)) / det;
  const u = ((c.x - a.x) * (b.y - a.y) - (c.y - a.y) * (b.x - a.x)) / det;
  return t > 0.001 && t < 0.999 && u > 0.001 && u < 0.999;
}

export function Connect({ game, onBack, onComplete }: Props) {
  const { width } = useWindowDimensions();
  const boardSize = Math.min(width - 32, 360);

  const [level, setLevel] = useState(0);
  const [path, setPath] = useState<Pt[]>([]);
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const [done, setDone] = useState(false);
  const [score, setScore] = useState(0);
  const dotsAbsRef = useRef<Pt[]>([]);
  const boardOriginRef = useRef<{ x: number; y: number } | null>(null);

  const dots = LAYOUTS[level];

  const layoutBoard = (e: any) => {
    boardOriginRef.current = { x: e.nativeEvent.layout.x, y: e.nativeEvent.layout.y };
    dotsAbsRef.current = dots.map((d) => ({ x: d.x * boardSize, y: d.y * boardSize, n: d.n }));
  };

  const findDot = (lx: number, ly: number): Pt | null => {
    for (const d of dotsAbsRef.current) {
      if (Math.hypot(lx - d.x, ly - d.y) < 28) return d;
    }
    return null;
  };

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !done,
      onMoveShouldSetPanResponder: () => !done,
      onPanResponderGrant: (_, g) => {
        const origin = boardOriginRef.current ?? { x: 0, y: 0 };
        const lx = g.x0 - origin.x;
        const ly = g.y0 - origin.y;
        const dot = findDot(lx, ly);
        if (dot && dot.n === 1) {
          setPath([dot]);
          setDrag({ x: lx, y: ly });
        }
      },
      onPanResponderMove: (_, g) => {
        const origin = boardOriginRef.current ?? { x: 0, y: 0 };
        const lx = g.moveX - origin.x;
        const ly = g.moveY - origin.y;
        setDrag({ x: lx, y: ly });
        setPath((prev) => {
          if (prev.length === 0) return prev;
          const dot = findDot(lx, ly);
          if (!dot) return prev;
          if (prev.find((p) => p.n === dot.n)) return prev;
          if (dot.n !== prev[prev.length - 1].n + 1) return prev;
          // No-cross check against existing segments
          const newSeg: [Pt, Pt] = [prev[prev.length - 1], dot];
          for (let i = 0; i < prev.length - 2; i += 1) {
            if (segIntersect(prev[i], prev[i + 1], newSeg[0], newSeg[1])) return prev;
          }
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          const next = [...prev, dot];
          if (next.length === dots.length) {
            const points = 100 + (dots.length - 5) * 50;
            setScore((s) => s + points);
            if (level === LAYOUTS.length - 1) {
              setDone(true);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
              onComplete(true, score + points);
            } else {
              setTimeout(() => {
                setLevel((l) => l + 1);
                setPath([]);
                setDrag(null);
              }, 600);
            }
          }
          return next;
        });
      },
      onPanResponderRelease: () => {
        setDrag(null);
        setPath((prev) => (prev.length === dots.length ? prev : []));
      },
    })
  ).current;

  const reset = () => {
    setLevel(0);
    setPath([]);
    setDrag(null);
    setDone(false);
    setScore(0);
  };

  if (done) {
    return (
      <GameShell game={game} onBack={onBack} score={score} label="Очки">
        <GameResult won score={score} accent={game.accent} onRestart={reset} onBack={onBack} />
      </GameShell>
    );
  }

  return (
    <GameShell game={game} onBack={onBack} score={`${level + 1}/${LAYOUTS.length}`} label="Уровень">
      <Text style={{ fontSize: 12, fontFamily: fontFamily.semibold, color: colors.textMuted, textAlign: 'center' }}>
        Соедини точки по порядку. Линии не должны пересекаться.
      </Text>
      <View
        onLayout={layoutBoard}
        {...responder.panHandlers}
        style={{
          width: boardSize,
          height: boardSize,
          backgroundColor: 'rgba(0,0,0,0.3)',
          borderRadius: 14,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.08)',
          overflow: 'hidden',
        }}
      >
        <Svg width={boardSize} height={boardSize}>
          {/* Drawn segments */}
          {path.map((p, i) => {
            if (i === 0) return null;
            const prev = path[i - 1];
            return (
              <Line
                key={`l-${i}`}
                x1={prev.x * boardSize}
                y1={prev.y * boardSize}
                x2={p.x * boardSize}
                y2={p.y * boardSize}
                stroke={game.accent}
                strokeWidth={4}
                strokeLinecap="round"
              />
            );
          })}
          {/* Drag preview */}
          {path.length > 0 && drag ? (
            <Line
              x1={path[path.length - 1].x * boardSize}
              y1={path[path.length - 1].y * boardSize}
              x2={drag.x}
              y2={drag.y}
              stroke={game.accent}
              strokeWidth={3}
              strokeOpacity={0.5}
              strokeDasharray="4,4"
            />
          ) : null}
          {/* Dots */}
          {dots.map((d) => {
            const visited = !!path.find((p) => p.n === d.n);
            return (
              <Circle
                key={d.n}
                cx={d.x * boardSize}
                cy={d.y * boardSize}
                r={visited ? 16 : 14}
                fill={visited ? game.accent : 'rgba(255,255,255,0.16)'}
                stroke={visited ? '#fff' : 'rgba(255,255,255,0.4)'}
                strokeWidth={visited ? 2 : 1}
              />
            );
          })}
        </Svg>
        {/* Number labels */}
        {dots.map((d) => (
          <View
            key={`n-${d.n}`}
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: d.x * boardSize - 9,
              top: d.y * boardSize - 9,
              width: 18,
              height: 18,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 12, fontFamily: fontFamily.bold, color: path.find((p) => p.n === d.n) ? '#000' : '#fff' }}>
              {d.n}
            </Text>
          </View>
        ))}
      </View>
    </GameShell>
  );
}
