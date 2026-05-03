import React, { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Game } from '../data/games';
import { colors, fontFamily } from '../theme';
import { GameShell } from './GameShell';
import { LevelComplete, shouldShowAdAfter } from './LevelComplete';

const ST_W = 240;
const ST_BH = 18;
const STAGE_H = 240;

const LEVEL_CFG = (level: number) => {
  if (level === 1) return { target: 6, baseSpeed: 1.6 };
  if (level === 2) return { target: 8, baseSpeed: 2.0 };
  if (level === 3) return { target: 10, baseSpeed: 2.6 };
  if (level === 4) return { target: 12, baseSpeed: 3.2 };
  return { target: 14, baseSpeed: 3.8 };
};

type Block = { x: number; w: number };
type Props = { game: Game; onBack: () => void; onComplete: (won: boolean, score: number) => void };

export function StackIt({ game, onBack, onComplete }: Props) {
  const [level, setLevel] = useState(1);
  const cfg = LEVEL_CFG(level);
  const [phase, setPhase] = useState<'playing' | 'complete'>('playing');
  const [blocks, setBlocks] = useState<Block[]>([{ x: 0, w: ST_W }]);
  const [cx, setCx] = useState(0);
  const [cw, setCw] = useState(ST_W);
  const dirRef = useRef(1);
  const cxRef = useRef(0);
  const cwRef = useRef(ST_W);
  const phaseRef = useRef(phase);
  const [score, setScore] = useState(0);
  const [lastPassed, setLastPassed] = useState(false);
  const [lastScore, setLastScore] = useState(0);

  useEffect(() => { cxRef.current = cx; }, [cx]);
  useEffect(() => { cwRef.current = cw; }, [cw]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  useEffect(() => {
    if (phase !== 'playing') return undefined;
    let raf: number;
    const speed = cfg.baseSpeed + score * 0.04;
    const loop = () => {
      if (phaseRef.current !== 'playing') return;
      const next = cxRef.current + speed * dirRef.current;
      if (next + cwRef.current > ST_W) dirRef.current = -1;
      else if (next < 0) dirRef.current = 1;
      const clamped = Math.max(0, Math.min(ST_W - cwRef.current, next));
      cxRef.current = clamped;
      setCx(clamped);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase, score, cfg.baseSpeed]);

  const drop = () => {
    if (phase !== 'playing') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const last = blocks[blocks.length - 1];
    const left = Math.max(cx, last.x);
    const right = Math.min(cx + cw, last.x + last.w);
    const newW = right - left;
    if (newW <= 4) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      setLastPassed(false);
      setLastScore(score);
      setPhase('complete');
      onComplete(false, score);
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
      onComplete(true, ns);
    }
  };

  const reset = () => {
    setBlocks([{ x: 0, w: ST_W }]);
    setCx(0);
    setCw(ST_W);
    cxRef.current = 0;
    cwRef.current = ST_W;
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
