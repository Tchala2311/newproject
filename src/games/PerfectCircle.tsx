import React, { useRef, useState } from 'react';
import { Animated, PanResponder, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';
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

type Pt = { x: number; y: number };

export function PerfectCircle({ game, onBack, onComplete }: Props) {
  const { width } = useWindowDimensions();
  const boardSize = Math.min(width - 32, 320);
  const cx = boardSize / 2;
  const cy = boardSize / 2;

  const [points, setPoints] = useState<Pt[]>([]);
  const [score, setScore] = useState<number | null>(null);
  const drawing = useRef(false);
  const ptsRef = useRef<Pt[]>([]);

  const computeScore = (pts: Pt[]) => {
    if (pts.length < 12) return 0;
    const meanX = pts.reduce((s, p) => s + p.x, 0) / pts.length;
    const meanY = pts.reduce((s, p) => s + p.y, 0) / pts.length;
    const radii = pts.map((p) => Math.hypot(p.x - meanX, p.y - meanY));
    const meanR = radii.reduce((s, r) => s + r, 0) / pts.length;
    if (meanR < 30) return 0;
    const variance = radii.reduce((s, r) => s + (r - meanR) ** 2, 0) / pts.length;
    const std = Math.sqrt(variance);
    // Score = 100 * (1 - std/meanR), clamped 0-99.9
    const raw = Math.max(0, 100 * (1 - std / meanR));
    return Math.min(99.9, raw);
  };

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (_, g) => {
        drawing.current = true;
        ptsRef.current = [{ x: g.x0 - 0, y: g.y0 - 0 }];
        setPoints(ptsRef.current);
        setScore(null);
      },
      onPanResponderMove: (_, g) => {
        if (!drawing.current) return;
        ptsRef.current = [...ptsRef.current, { x: g.moveX - 0, y: g.moveY - 0 }];
        setPoints(ptsRef.current);
      },
      onPanResponderRelease: () => {
        drawing.current = false;
        const s = computeScore(ptsRef.current);
        setScore(s);
        if (s >= 95) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        else if (s >= 80) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        onComplete(s >= 80, Math.round(s * 10));
      },
    })
  ).current;

  const reset = () => {
    setPoints([]);
    setScore(null);
  };

  // Convert absolute touch to local board coords
  const boardOriginRef = useRef<{ x: number; y: number } | null>(null);
  const onLayout = (e: any) => {
    boardOriginRef.current = { x: e.nativeEvent.layout.x, y: e.nativeEvent.layout.y };
  };

  return (
    <GameShell game={game} onBack={onBack} score={score !== null ? `${score.toFixed(1)}%` : '—'} label="Точность">
      <Text style={{ fontSize: 12, fontFamily: fontFamily.semibold, color: colors.textMuted, textAlign: 'center', marginBottom: 6 }}>
        Нарисуй идеальный круг одним движением.{'\n'}Не отрывая палец.
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

      {score !== null ? (
        <View style={{ alignItems: 'center', marginTop: 4, gap: 6 }}>
          <Text style={{ fontSize: 36, fontFamily: fontFamily.bold, color: game.accent }}>
            {score >= 95 ? '🎯' : score >= 80 ? '👍' : '😅'} {score.toFixed(1)}%
          </Text>
          <GameResult won={score >= 80} score={Math.round(score * 10)} accent={game.accent} onRestart={reset} onBack={onBack} />
        </View>
      ) : null}
    </GameShell>
  );
}
