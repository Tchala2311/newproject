import React, { useEffect, useRef, useState } from 'react';
import { PanResponder, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { Game } from '../data/games';
import { GameShell } from './GameShell';
import { LevelComplete, shouldShowAdAfter } from './LevelComplete';
import { colors, fontFamily } from '../theme';

type Props = {
  game: Game;
  onBack: () => void;
  onComplete: (won: boolean, score: number, meta?: Record<string, number>) => void;
  initialLevel?: number;
};

type Pt = { x: number; y: number; n: number };

// Layout per level — number of dots + arrangement complexity grows.
const LEVEL_LAYOUTS: Pt[][] = [
  [
    { x: 0.2, y: 0.2, n: 1 }, { x: 0.8, y: 0.25, n: 2 }, { x: 0.5, y: 0.55, n: 3 },
    { x: 0.25, y: 0.85, n: 4 }, { x: 0.78, y: 0.85, n: 5 },
  ],
  [
    { x: 0.2, y: 0.18, n: 1 }, { x: 0.78, y: 0.2, n: 2 }, { x: 0.5, y: 0.4, n: 3 },
    { x: 0.18, y: 0.6, n: 4 }, { x: 0.82, y: 0.6, n: 5 }, { x: 0.4, y: 0.85, n: 6 },
  ],
  [
    { x: 0.18, y: 0.15, n: 1 }, { x: 0.5, y: 0.22, n: 2 }, { x: 0.82, y: 0.18, n: 3 },
    { x: 0.25, y: 0.45, n: 4 }, { x: 0.78, y: 0.5, n: 5 }, { x: 0.5, y: 0.7, n: 6 },
    { x: 0.2, y: 0.85, n: 7 },
  ],
  [
    { x: 0.15, y: 0.15, n: 1 }, { x: 0.5, y: 0.18, n: 2 }, { x: 0.85, y: 0.22, n: 3 },
    { x: 0.78, y: 0.5, n: 4 }, { x: 0.85, y: 0.85, n: 5 }, { x: 0.5, y: 0.65, n: 6 },
    { x: 0.18, y: 0.85, n: 7 }, { x: 0.18, y: 0.5, n: 8 },
  ],
  [
    { x: 0.12, y: 0.12, n: 1 }, { x: 0.4, y: 0.18, n: 2 }, { x: 0.7, y: 0.12, n: 3 },
    { x: 0.88, y: 0.4, n: 4 }, { x: 0.7, y: 0.6, n: 5 }, { x: 0.85, y: 0.85, n: 6 },
    { x: 0.5, y: 0.88, n: 7 }, { x: 0.18, y: 0.78, n: 8 }, { x: 0.18, y: 0.45, n: 9 },
  ],
];

const layoutForLevel = (level: number) =>
  LEVEL_LAYOUTS[Math.min(level - 1, LEVEL_LAYOUTS.length - 1)];

function segIntersect(a: Pt, b: Pt, c: Pt, d: Pt) {
  const det = (b.x - a.x) * (d.y - c.y) - (b.y - a.y) * (d.x - c.x);
  if (Math.abs(det) < 1e-9) return false;
  const t = ((c.x - a.x) * (d.y - c.y) - (c.y - a.y) * (d.x - c.x)) / det;
  const u = ((c.x - a.x) * (b.y - a.y) - (c.y - a.y) * (b.x - a.x)) / det;
  return t > 0.001 && t < 0.999 && u > 0.001 && u < 0.999;
}

export function Connect({ game, onBack, onComplete, initialLevel }: Props) {
  const { width } = useWindowDimensions();
  const boardSize = Math.min(width - 32, 360);

  const [level, setLevel] = useState(initialLevel ?? 1);
  const dots = layoutForLevel(level);
  const [path, setPath] = useState<Pt[]>([]);
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const [phase, setPhase] = useState<'playing' | 'complete'>('playing');
  const [lastPassed, setLastPassed] = useState(false);
  const [lastScore, setLastScore] = useState(0);
  const dotsAbsRef = useRef<Pt[]>([]);
  const boardOriginRef = useRef<{ x: number; y: number } | null>(null);
  const boardViewRef = useRef<View>(null);
  const completeRef = useRef<{ points: number } | null>(null);
  // Live mirrors so the once-created PanResponder never reads a stale level /
  // dot layout / phase (it would otherwise be frozen at the level-1 values and
  // break every level after the first).
  const phaseRef = useRef(phase); phaseRef.current = phase;
  const levelRef = useRef(level); levelRef.current = level;
  const dotsRef = useRef(dots); dotsRef.current = dots;

  const layoutBoard = () => {
    boardViewRef.current?.measureInWindow((x, y) => {
      boardOriginRef.current = { x, y };
    });
    dotsAbsRef.current = dots.map((d) => ({ x: d.x * boardSize, y: d.y * boardSize, n: d.n }));
  };

  // onLayout only fires on size changes, not when the dot layout swaps between
  // levels — so refresh the absolute dot positions whenever the level changes.
  useEffect(() => {
    dotsAbsRef.current = dots.map((d) => ({ x: d.x * boardSize, y: d.y * boardSize, n: d.n }));
  }, [level, boardSize]);

  const findDot = (lx: number, ly: number): Pt | null => {
    for (const d of dotsAbsRef.current) {
      if (Math.hypot(lx - d.x, ly - d.y) < 28) return d;
    }
    return null;
  };

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => phaseRef.current === 'playing',
      onMoveShouldSetPanResponder: () => phaseRef.current === 'playing',
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
          const newSeg: [Pt, Pt] = [prev[prev.length - 1], dot];
          for (let i = 0; i < prev.length - 2; i += 1) {
            if (segIntersect(prev[i], prev[i + 1], newSeg[0], newSeg[1])) return prev;
          }
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          const next = [...prev, dot];
          if (next.length === dotsRef.current.length) {
            const points = (100 + (dotsRef.current.length - 5) * 50) * levelRef.current;
            completeRef.current = { points };
            setLastPassed(true);
            setLastScore(points);
            setPhase('complete');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          }
          return next;
        });
      },
      onPanResponderRelease: () => {
        setDrag(null);
        setPath((prev) => (prev.length === dotsRef.current.length ? prev : []));
      },
    })
  ).current;

  useEffect(() => {
    if (phase === 'complete' && completeRef.current) {
      const { points } = completeRef.current;
      completeRef.current = null;
      onComplete(true, points, { level });
    }
  }, [phase]);

  const reset = () => {
    completeRef.current = null;
    setPath([]);
    setDrag(null);
    setPhase('playing');
  };

  const startNextLevel = () => {
    setLevel((l) => l + 1);
    setPath([]);
    setDrag(null);
    setPhase('playing');
  };

  if (phase === 'complete') {
    return (
      <LevelComplete
        level={level}
        passed={lastPassed}
        score={lastScore}
        scoreLabel="Очки"
        accent={game.accent}
        showAd={lastPassed && shouldShowAdAfter(level)}
        onContinue={startNextLevel}
        onRetry={reset}
        onBack={onBack}
      />
    );
  }

  return (
    <GameShell game={game} onBack={onBack} score={`${dots.length} точек`} label={`Ур. ${level}`}>
      <Text style={{ fontSize: 12, fontFamily: fontFamily.semibold, color: colors.textMuted, textAlign: 'center' }}>
        Соедини точки по порядку. Линии не должны пересекаться.
      </Text>
      <View
        ref={boardViewRef}
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
          {path.map((p, i) => {
            if (i === 0) return null;
            const prev = path[i - 1];
            return (
              <Line
                key={`l-${i}`}
                x1={prev.x * boardSize} y1={prev.y * boardSize}
                x2={p.x * boardSize} y2={p.y * boardSize}
                stroke={game.accent} strokeWidth={4} strokeLinecap="round"
              />
            );
          })}
          {path.length > 0 && drag ? (
            <Line
              x1={path[path.length - 1].x * boardSize} y1={path[path.length - 1].y * boardSize}
              x2={drag.x} y2={drag.y}
              stroke={game.accent} strokeWidth={3} strokeOpacity={0.5} strokeDasharray="4,4"
            />
          ) : null}
          {dots.map((d) => {
            const visited = !!path.find((p) => p.n === d.n);
            return (
              <Circle
                key={d.n}
                cx={d.x * boardSize} cy={d.y * boardSize}
                r={visited ? 16 : 14}
                fill={visited ? game.accent : 'rgba(255,255,255,0.16)'}
                stroke={visited ? '#fff' : 'rgba(255,255,255,0.4)'}
                strokeWidth={visited ? 2 : 1}
              />
            );
          })}
        </Svg>
        {dots.map((d) => (
          <View
            key={`n-${d.n}`}
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: d.x * boardSize - 9, top: d.y * boardSize - 9,
              width: 18, height: 18,
              alignItems: 'center', justifyContent: 'center',
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
