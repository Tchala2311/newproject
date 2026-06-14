import React, { useRef, useState } from 'react';
import { PanResponder, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';
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

type Pt = { x: number; y: number };

// Threshold (% accuracy) required to pass each level.
const LEVEL_THRESHOLD = (level: number) => {
  if (level === 1) return 65;
  if (level === 2) return 75;
  if (level === 3) return 85;
  if (level === 4) return 92;
  return 95;
};

export function PerfectCircle({ game, onBack, onComplete, initialLevel }: Props) {
  const { width, height } = useWindowDimensions();
  const boardSize = Math.min(width - 32, height * 0.6);
  const cx = boardSize / 2;
  const cy = boardSize / 2;

  const [level, setLevel] = useState(initialLevel ?? 1);
  const [points, setPoints] = useState<Pt[]>([]);
  const [phase, setPhase] = useState<'playing' | 'complete'>('playing');
  const [lastScore, setLastScore] = useState(0);
  const [lastPassed, setLastPassed] = useState(false);
  const drawing = useRef(false);
  const ptsRef = useRef<Pt[]>([]);
  const boardRef = useRef<View>(null);
  const boardOriginRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const levelRef = useRef(level);
  levelRef.current = level;

  const computeScore = (pts: Pt[]) => {
    if (pts.length < 12) return 0;
    const meanX = pts.reduce((s, p) => s + p.x, 0) / pts.length;
    const meanY = pts.reduce((s, p) => s + p.y, 0) / pts.length;
    const radii = pts.map((p) => Math.hypot(p.x - meanX, p.y - meanY));
    const meanR = radii.reduce((s, r) => s + r, 0) / pts.length;
    if (meanR < 30) return 0;
    const variance = radii.reduce((s, r) => s + (r - meanR) ** 2, 0) / pts.length;
    const std = Math.sqrt(variance);

    // Penalise open arcs/C-shapes: find the largest angular gap between consecutive points.
    const angles = pts.map((p) => Math.atan2(p.y - meanY, p.x - meanX));
    const sorted = [...angles].sort((a, b) => a - b);
    let maxGap = sorted[0] + 2 * Math.PI - sorted[sorted.length - 1];
    for (let i = 1; i < sorted.length; i++) {
      maxGap = Math.max(maxGap, sorted[i] - sorted[i - 1]);
    }
    // A gap > 60° (π/3) starts penalising; 180° (π) → score 0.
    const coverageFactor = maxGap < Math.PI / 3
      ? 1
      : Math.max(0, 1 - (maxGap - Math.PI / 3) / (Math.PI * 2 / 3));

    const raw = Math.max(0, 100 * (1 - std / meanR)) * coverageFactor;
    return Math.min(99.9, raw);
  };

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => phase === 'playing',
      onMoveShouldSetPanResponder: () => phase === 'playing',
      onPanResponderGrant: (_, g) => {
        drawing.current = true;
        const ox = boardOriginRef.current.x;
        const oy = boardOriginRef.current.y;
        ptsRef.current = [{ x: g.x0 - ox, y: g.y0 - oy }];
        setPoints(ptsRef.current);
      },
      onPanResponderMove: (_, g) => {
        if (!drawing.current) return;
        const ox = boardOriginRef.current.x;
        const oy = boardOriginRef.current.y;
        ptsRef.current = [...ptsRef.current, { x: g.moveX - ox, y: g.moveY - oy }];
        setPoints(ptsRef.current);
      },
      onPanResponderRelease: () => {
        drawing.current = false;
        const lv = levelRef.current;
        const accuracy = computeScore(ptsRef.current);
        const threshold = LEVEL_THRESHOLD(lv);
        const passed = accuracy >= threshold;
        const score = Math.round(accuracy * 10 * lv);
        setLastScore(score);
        setLastPassed(passed);
        setPhase('complete');
        if (passed) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        else Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        onComplete(passed, score, { level: lv, percent: Math.round(accuracy * 10) / 10 });
      },
    })
  ).current;

  const onLayout = () => {
    // measure() gives screen-absolute pageX/pageY, which is what PanResponder
    // coordinates are relative to. onLayout gives parent-relative offsets and
    // would be wrong whenever the parent itself is offset from the screen.
    boardRef.current?.measure((_x, _y, _w, _h, pageX, pageY) => {
      boardOriginRef.current = { x: pageX, y: pageY };
    });
  };

  const startNextLevel = () => {
    setLevel((l) => l + 1);
    setPoints([]);
    setPhase('playing');
  };

  const retry = () => {
    setPoints([]);
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
        onRetry={retry}
        onBack={onBack}
      />
    );
  }

  return (
    <GameShell game={game} onBack={onBack} score={`Ур. ${level}`} label={`нужно ${LEVEL_THRESHOLD(level)}%`}>
      <Text style={{ fontSize: 12, fontFamily: fontFamily.semibold, color: colors.textMuted, textAlign: 'center', marginBottom: 6 }}>
        Нарисуй круг одним движением.{'\n'}Точность ≥ {LEVEL_THRESHOLD(level)}%
      </Text>
      <View
        ref={boardRef}
        onLayout={onLayout}
        {...responder.panHandlers}
        style={{
          width: boardSize,
          height: boardSize,
          borderRadius: boardSize / 2,
          backgroundColor: 'rgba(0,0,0,0.25)',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.12)',
          overflow: 'hidden',
        }}
      >
        <Svg width={boardSize} height={boardSize}>
          <Circle cx={cx} cy={cy} r={6} fill={game.accent} opacity={0.6} />
          {points.length > 1 ? (
            <Polyline
              points={points.map((p) => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke={game.accent}
              strokeWidth={4}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}
        </Svg>
      </View>
    </GameShell>
  );
}
