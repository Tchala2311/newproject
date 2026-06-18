import React, { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Game } from '../data/games';
import { colors, fontFamily } from '../theme';
import { GameShell } from './GameShell';
import { LevelComplete, shouldShowAdAfter } from './LevelComplete';

const ST_BH = 22;

const LEVEL_CFG = (level: number) => ({
  target: 4 + level * 2,
  baseSpeed: Math.min(7, 1.2 + level * 0.5),
});

type Block = { x: number; w: number };
type Props = { game: Game; onBack: () => void; onComplete: (won: boolean, score: number, meta?: Record<string, number>) => void; initialLevel?: number };

export function StackIt({ game, onBack, onComplete, initialLevel }: Props) {
  const { width, height } = useWindowDimensions();
  const ST_W = Math.min(width - 32, 380);
  const STAGE_H = Math.min(height * 0.54, 500);

  const [level, setLevel] = useState(initialLevel ?? 1);
  const cfg = LEVEL_CFG(level);
  const [phase, setPhase] = useState<'playing' | 'complete'>('playing');
  const [blocks, setBlocks] = useState<Block[]>([{ x: 0, w: ST_W }]);
  const [cx, setCx] = useState(0);
  const [cw, setCw] = useState(ST_W);
  const dirRef = useRef(1);
  const cxRef = useRef(0);
  const cwRef = useRef(ST_W);
  const phaseRef = useRef(phase);
  const stWRef = useRef(ST_W);
  const speedRef = useRef(0);
  const [score, setScore] = useState(0);
  const [lastPassed, setLastPassed] = useState(false);
  const [lastScore, setLastScore] = useState(0);

  // Keep stWRef updated if dimensions change (e.g., orientation)
  stWRef.current = ST_W;
  // Speed grows with score; read from a ref inside the loop so the RAF doesn't
  // have to restart (and stutter) on every drop. Cap at 9 px/frame so the slider
  // never moves faster than a human can reliably time a clean drop (luck-based).
  speedRef.current = Math.min(9, cfg.baseSpeed + score * 0.04);

  useEffect(() => { cxRef.current = cx; }, [cx]);
  useEffect(() => { cwRef.current = cw; }, [cw]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  useEffect(() => {
    if (phase !== 'playing') return undefined;
    let raf: number;
    let lastTs = 0;
    const loop = (ts: number) => {
      if (phaseRef.current !== 'playing') return;
      const dt = lastTs ? Math.min(ts - lastTs, 50) : 16.67;
      lastTs = ts;
      const stW = stWRef.current;
      const next = cxRef.current + speedRef.current * (dt / 16.67) * dirRef.current;
      if (next + cwRef.current > stW) dirRef.current = -1;
      else if (next < 0) dirRef.current = 1;
      const clamped = Math.max(0, Math.min(stW - cwRef.current, next));
      cxRef.current = clamped;
      setCx(clamped);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  const drop = () => {
    if (phase !== 'playing') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const last = blocks[blocks.length - 1];
    const left = Math.max(cxRef.current, last.x);
    const right = Math.min(cxRef.current + cwRef.current, last.x + last.w);
    const newW = right - left;
    // Fail only on a true miss (<=4px overlap). The real difficulty fix is the
    // speed cap above; keeping this threshold low stays forgiving.
    if (newW <= 4) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      setLastPassed(false);
      setLastScore(score);
      setPhase('complete');
      onComplete(false, score, { level });
      return;
    }
    const nb = { x: left, w: newW };
    const next = [...blocks, nb];
    setBlocks(next);
    setCx(left);
    setCw(newW);
    cxRef.current = left;
    cwRef.current = newW;
    const ns = score + 10 * level;
    setScore(ns);
    if (next.length > cfg.target) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setLastPassed(true);
      setLastScore(ns);
      setPhase('complete');
      onComplete(true, ns, { level });
    }
  };

  const reset = () => {
    const stW = stWRef.current;
    setBlocks([{ x: 0, w: stW }]);
    setCx(0);
    setCw(stW);
    cxRef.current = 0;
    cwRef.current = stW;
    dirRef.current = 1;
    setScore(0);
    setPhase('playing');
  };

  const startNextLevel = () => {
    setLevel((l) => l + 1);
    reset();
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

  const visible = blocks.slice(-9);

  return (
    <GameShell game={game} onBack={onBack} score={`${blocks.length - 1}/${cfg.target}`} label={`Ур. ${level}`}>
      <Text style={{ fontSize: 11, color: colors.textDim, fontFamily: fontFamily.semibold, textAlign: 'center' }}>
        ТАПНИ ЧТОБЫ УРОНИТЬ — осталось слоёв: {Math.max(0, cfg.target - blocks.length + 1)}
      </Text>
      <Pressable onPress={drop}>
        <View
          style={{
            width: ST_W,
            height: STAGE_H,
            backgroundColor: 'rgba(0,0,0,0.22)',
            borderRadius: 12,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              position: 'absolute',
              top: 8,
              left: cx,
              width: cw,
              height: ST_BH,
              borderRadius: 4,
              backgroundColor: game.accent,
            }}
          />
          {visible.map((b, i) => (
            <View
              key={i}
              style={{
                position: 'absolute',
                left: b.x,
                bottom: i * (ST_BH + 2),
                width: b.w,
                height: ST_BH,
                borderRadius: 4,
                backgroundColor: `rgba(255,255,255,${0.18 + i * 0.06})`,
              }}
            />
          ))}
        </View>
      </Pressable>
    </GameShell>
  );
}
