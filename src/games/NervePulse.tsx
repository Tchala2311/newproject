import React, { useEffect, useRef, useState } from 'react';
import { PanResponder, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
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

// Each level: longer hold target + skinnier band + faster wobble.
const LEVEL_CFG = (level: number) => {
  if (level === 1) return { time: 30, targetMs: 16000, bandWidth: 36, wobbleMul: 1.0 };
  if (level === 2) return { time: 30, targetMs: 20000, bandWidth: 30, wobbleMul: 1.2 };
  if (level === 3) return { time: 30, targetMs: 23000, bandWidth: 26, wobbleMul: 1.4 };
  if (level === 4) return { time: 30, targetMs: 25000, bandWidth: 22, wobbleMul: 1.7 };
  return { time: 30, targetMs: 27000, bandWidth: 18, wobbleMul: 2.0 };
};

export function NervePulse({ game, onBack, onComplete, initialLevel }: Props) {
  const { width } = useWindowDimensions();
  const board = Math.min(width - 40, 320);
  const cx = board / 2;
  const cy = board / 2;

  const [level, setLevel] = useState(initialLevel ?? 1);
  const cfg = LEVEL_CFG(level);
  const [phase, setPhase] = useState<'playing' | 'complete'>('playing');
  const [time, setTime] = useState(cfg.time);
  const [insideMs, setInsideMs] = useState(0);
  const [touching, setTouching] = useState(false);
  const [pos, setPos] = useState({ x: cx, y: cy });
  const [lastPassed, setLastPassed] = useState(false);
  const [lastScore, setLastScore] = useState(0);
  const startRef = useRef(Date.now());
  const lastTickRef = useRef(Date.now());
  const insideRef = useRef(false);
  const boardOriginRef = useRef<{ x: number; y: number } | null>(null);

  // Wobbling target ring radius — wobble multiplier scales with level
  const ringRadius = (t: number) => {
    const base = 70;
    const wobble = (Math.sin(t * 0.0028) * 12 + Math.cos(t * 0.0019) * 10) * cfg.wobbleMul;
    return base + wobble;
  };

  useEffect(() => {
    if (phase !== 'playing') return;
    const t = setInterval(() => {
      const elapsed = (Date.now() - startRef.current) / 1000;
      const remain = Math.max(0, cfg.time - elapsed);
      setTime(remain);
      if (remain <= 0) {
        const passed = insideMs >= cfg.targetMs;
        const score = Math.round(insideMs / 100) * level;
        setLastPassed(passed);
        setLastScore(score);
        setPhase('complete');
        onComplete(passed, score, { level });
      }
    }, 100);
    return () => clearInterval(t);
  }, [phase, insideMs, onComplete, cfg.time, cfg.targetMs, level]);

  useEffect(() => {
    if (phase !== 'playing') return;
    const t = setInterval(() => {
      const now = Date.now();
      const dt = now - lastTickRef.current;
      lastTickRef.current = now;
      if (touching && insideRef.current) {
        setInsideMs((m) => m + dt);
      }
    }, 50);
    return () => clearInterval(t);
  }, [phase, touching]);

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
        insideRef.current = r < ring && r > ring - cfg.bandWidth;
      },
      onPanResponderMove: (_, g) => {
        const origin = boardOriginRef.current ?? { x: 0, y: 0 };
        const lx = g.moveX - origin.x;
        const ly = g.moveY - origin.y;
        setPos({ x: lx, y: ly });
        const r = Math.hypot(lx - cx, ly - cy);
        const ring = ringRadius(Date.now() - startRef.current);
        const newInside = r < ring && r > ring - cfg.bandWidth;
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
    setTime(cfg.time);
    setInsideMs(0);
    setTouching(false);
    insideRef.current = false;
    setPos({ x: cx, y: cy });
    startRef.current = Date.now();
    lastTickRef.current = Date.now();
    setPhase('playing');
  };

  const startNextLevel = () => {
    const nl = level + 1;
    const nc = LEVEL_CFG(nl);
    setLevel(nl);
    setTime(nc.time);
    setInsideMs(0);
    setTouching(false);
    insideRef.current = false;
    setPos({ x: cx, y: cy });
    startRef.current = Date.now();
    lastTickRef.current = Date.now();
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

  const r = ringRadius(Date.now() - startRef.current);
  const inside = insideRef.current;

  return (
    <GameShell game={game} onBack={onBack} score={`${(insideMs / 1000).toFixed(1)}s`} label={`Ур. ${level}`} timer={time} timerMax={cfg.time}>
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
