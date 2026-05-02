import React, { useEffect, useRef, useState } from 'react';
import { PanResponder, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
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

const ROUND_TIME = 30;

export function NervePulse({ game, onBack, onComplete }: Props) {
  const { width } = useWindowDimensions();
  const board = Math.min(width - 40, 320);
  const cx = board / 2;
  const cy = board / 2;

  const [time, setTime] = useState(ROUND_TIME);
  const [done, setDone] = useState(false);
  const [insideMs, setInsideMs] = useState(0);
  const [touching, setTouching] = useState(false);
  const [pos, setPos] = useState({ x: cx, y: cy });
  const startRef = useRef(Date.now());
  const lastTickRef = useRef(Date.now());
  const insideRef = useRef(false);
  const boardOriginRef = useRef<{ x: number; y: number } | null>(null);

  // Wobbling target ring radius
  const ringRadius = (t: number) => {
    const base = 70;
    const wobble = Math.sin(t * 0.0028) * 12 + Math.cos(t * 0.0019) * 10;
    return base + wobble;
  };

  useEffect(() => {
    if (done) return;
    const t = setInterval(() => {
      const elapsed = (Date.now() - startRef.current) / 1000;
      const remain = Math.max(0, ROUND_TIME - elapsed);
      setTime(remain);
      if (remain <= 0) {
        setDone(true);
        const score = Math.round(insideMs / 100);
        onComplete(insideMs >= 18000, score);
      }
    }, 100);
    return () => clearInterval(t);
  }, [done, insideMs, onComplete]);

  // Track inside-ring duration via 50ms ticks
  useEffect(() => {
    if (done) return;
    const t = setInterval(() => {
      const now = Date.now();
      const dt = now - lastTickRef.current;
      lastTickRef.current = now;
      if (touching && insideRef.current) {
        setInsideMs((m) => m + dt);
      }
    }, 50);
    return () => clearInterval(t);
  }, [done, touching]);

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (_, g) => {
        setTouching(true);
        const origin = boardOriginRef.current ?? { x: 0, y: 0 };
        const lx = g.x0 - origin.x;
        const ly = g.y0 - origin.y;
        setPos({ x: lx, y: ly });
        const r = Math.hypot(lx - cx, ly - cy);
        const ring = ringRadius(Date.now() - startRef.current);
        insideRef.current = r < ring && r > ring - 32;
      },
      onPanResponderMove: (_, g) => {
        const origin = boardOriginRef.current ?? { x: 0, y: 0 };
        const lx = g.moveX - origin.x;
        const ly = g.moveY - origin.y;
        setPos({ x: lx, y: ly });
        const r = Math.hypot(lx - cx, ly - cy);
        const ring = ringRadius(Date.now() - startRef.current);
        const newInside = r < ring && r > ring - 32;
        if (newInside !== insideRef.current) {
          if (!newInside) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          insideRef.current = newInside;
        }
      },
      onPanResponderRelease: () => {
        setTouching(false);
        insideRef.current = false;
      },
    })
  ).current;

  const onLayout = (e: any) => {
    boardOriginRef.current = { x: e.nativeEvent.layout.x, y: e.nativeEvent.layout.y };
  };

  const reset = () => {
    setTime(ROUND_TIME);
    setDone(false);
    setInsideMs(0);
    setTouching(false);
    insideRef.current = false;
    setPos({ x: cx, y: cy });
    startRef.current = Date.now();
    lastTickRef.current = Date.now();
  };

  if (done) {
    const score = Math.round(insideMs / 100);
    return (
      <GameShell game={game} onBack={onBack} score={score} label="Очки">
        <GameResult won={insideMs >= 18000} score={score} accent={game.accent} onRestart={reset} onBack={onBack} />
      </GameShell>
    );
  }

  const r = ringRadius(Date.now() - startRef.current);
  const inside = insideRef.current;

  return (
    <GameShell game={game} onBack={onBack} score={Math.round(insideMs / 100)} label="Очки" timer={time} timerMax={ROUND_TIME}>
      <Text style={{ fontSize: 12, fontFamily: fontFamily.semibold, color: colors.textMuted, textAlign: 'center' }}>
        Удерживай палец внутри пульсирующего кольца.
      </Text>
      <View
        onLayout={onLayout}
        {...responder.panHandlers}
        style={{
          width: board,
          height: board,
          borderRadius: board / 2,
          backgroundColor: inside ? 'rgba(34,197,94,0.12)' : 'rgba(0,0,0,0.3)',
          borderWidth: 1,
          borderColor: inside ? '#22C55E' : 'rgba(255,255,255,0.1)',
        }}
      >
        <Svg width={board} height={board} pointerEvents="none">
          <Circle cx={cx} cy={cy} r={r} stroke={inside ? '#22C55E' : game.accent} strokeWidth={4} fill="none" />
          <Circle cx={cx} cy={cy} r={r - 32} stroke={inside ? '#22C55E' : game.accent} strokeWidth={2} strokeOpacity={0.5} fill="none" />
          {touching ? (
            <Circle cx={pos.x} cy={pos.y} r={10} fill="#fff" />
          ) : null}
        </Svg>
      </View>
    </GameShell>
  );
}
