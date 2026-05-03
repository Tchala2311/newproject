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
  const { width } = useWindowDimensions();
  const boardSize = Math.min(width - 32, 320);
  const cx = boardSize / 2;
  const cy = boardSize / 2;

  const [level, setLevel] = useState(initialLevel ?? 1);
  const [points, setPoints] = useState<Pt[]>([]);
  const [phase, setPhase] = useState<'playing' | 'complete'>('playing');
  const [lastScore, setLastScore] = useState(0);
  const [lastPassed, setLastPassed] = useState(false);
  const drawing = useRef(false);
  const ptsRef = useRef<Pt[]>([]);
  const boardOriginRef = useRef<{ x: number; y: number } | null>(null);

  const computeScore = (pts: Pt[]) => {
    if (pts.length < 12) return 0;
    const meanX = pts.reduce((s, p) => s + p.x, 0) / pts.length;
    const meanY = pts.reduce((s, p) => s + p.y, 0) / pts.length;
    const radii = pts.map((p) => Math.hypot(p.x - meanX, p.y - meanY));
    const meanR = radii.reduce((s, r) => s + r, 0) / pts.length;
    if (meanR < 30) return 0;
    const variance = radii.reduce((s, r) => s + (r - meanR) ** 2, 0) / pts.length;
    const std = Math.sqrt(variance);
    const raw = Math.max(0, 100 * (1 - std / meanR));
    return Math.min(99.9, raw);
  };

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => phase === 'playing',
      onMoveShouldSetPanResponder: () => phase === 'playing',
      onPanResponderGrant: (_, g) => {
        drawing.current = true;
        ptsRef.current = [{ x: g.x0, y: g.y0 }];
        setPoints(ptsRef.current);
      },
      onPanResponderMove: (_, g) => {
        if (!drawing.current) return;
        ptsRef.current = [...ptsRef.current, { x: g.moveX, y: g.moveY }];
        setPoints(ptsRef.current);
      },
      onPanResponderRelease: () => {
        drawing.current = false;
        const accuracy = computeScore(ptsRef.current);
        const threshold = LEVEL_THRESHOLD(level);
        const passed = accuracy >= threshold;
        const score = Math.round(accuracy * 10 * level);
        setLastScore(score);
        setLastPassed(passed);
        setPhase('complete');
        if (passed) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        else Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        onComplete(passed, score, { level, percent: Math.round(accuracy * 10) / 10 });
      },
    })
  ).current;

  const onLayout = (e: any) => {
    boardOriginRef.current = { x: e.nativeEvent.layout.x, y: e.nativeEvent.layout.y };
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
              points={points.map((p) => `${p.x - (boardOriginRef.current?.x ?? 0)},${p.y - (boardOriginRef.current?.y ?? 0)}`).join(' ')}
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
