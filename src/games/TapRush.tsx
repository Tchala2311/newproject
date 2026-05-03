import React, { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Game } from '../data/games';
import { colors, fontFamily } from '../theme';
import { GameShell } from './GameShell';
import { LevelComplete, shouldShowAdAfter } from './LevelComplete';

type Bubble = { id: number; x: number; y: number; r: number; bomb?: boolean };

const LEVEL_CFG = (level: number) => {
  if (level === 1) return { time: 30, target: 80, count: 6, bombProb: 0 };
  if (level === 2) return { time: 25, target: 110, count: 7, bombProb: 0.1 };
  if (level === 3) return { time: 22, target: 150, count: 8, bombProb: 0.18 };
  if (level === 4) return { time: 20, target: 200, count: 9, bombProb: 0.22 };
  return { time: 18, target: 260, count: 10, bombProb: 0.28 };
};

function makeBubble(id: number, bombProb: number): Bubble {
  return {
    id,
    x: 8 + Math.random() * 74,
    y: 10 + Math.random() * 70,
    r: 22 + Math.random() * 18,
    bomb: Math.random() < bombProb,
  };
}

type Props = { game: Game; onBack: () => void; onComplete: (won: boolean, score: number) => void };

export function TapRush({ game, onBack, onComplete }: Props) {
  const [level, setLevel] = useState(1);
  const cfg = LEVEL_CFG(level);
  const [phase, setPhase] = useState<'playing' | 'complete'>('playing');
  const [bubbles, setBubbles] = useState<Bubble[]>(() => Array.from({ length: cfg.count }, (_, i) => makeBubble(i, cfg.bombProb)));
  const [score, setScore] = useState(0);
  const [timer, setTimer] = useState(cfg.time);
  const [started, setStarted] = useState(false);
  const [lastPassed, setLastPassed] = useState(false);
  const [lastScore, setLastScore] = useState(0);
  const nextId = useRef(100);

  useEffect(() => {
    if (phase !== 'playing' || !started) return undefined;
    if (timer <= 0) {
      const passed = score >= cfg.target;
      setLastPassed(passed);
      setLastScore(score);
      setPhase('complete');
      onComplete(passed, score);
      return undefined;
    }
    const t = setTimeout(() => setTimer((p) => p - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, started, timer, score, cfg.target, onComplete]);

  const reset = () => {
    setBubbles(Array.from({ length: cfg.count }, (_, i) => makeBubble(i, cfg.bombProb)));
    setScore(0);
    setTimer(cfg.time);
    setStarted(false);
    setPhase('playing');
  };

  const startNextLevel = () => {
    const nl = level + 1;
    const nc = LEVEL_CFG(nl);
    setLevel(nl);
    setBubbles(Array.from({ length: nc.count }, (_, i) => makeBubble(i, nc.bombProb)));
    setScore(0);
    setTimer(nc.time);
    setStarted(false);
    setPhase('playing');
  };

  const pop = (id: number) => {
    if (!started) setStarted(true);
    const b = bubbles.find((x) => x.id === id);
    if (!b) return;
    if (b.bomb) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      setScore((s) => Math.max(0, s - 25));
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      setScore((s) => s + 10);
    }
    const newId = nextId.current++;
    setBubbles((prev) => prev.map((p) => (p.id === id ? { ...makeBubble(newId, cfg.bombProb), id: newId } : p)));
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
    <GameShell game={game} onBack={onBack} score={`${score}/${cfg.target}`} label={`Ур. ${level}`} timer={timer} timerMax={cfg.time}>
      <View style={{ width: '100%', flex: 1, position: 'relative' }}>
        {!started ? (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              alignItems: 'center', justifyContent: 'center', zIndex: 5,
            }}
          >
            <View style={{ backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8 }}>
              <Text style={{ fontSize: 14, fontFamily: fontFamily.bold, color: colors.textMuted }}>
                Тапни шар, чтобы начать!
              </Text>
            </View>
          </View>
        ) : null}
        {bubbles.map((b) => (
          <Pressable
            key={b.id}
            onPress={() => pop(b.id)}
            style={{
              position: 'absolute',
              left: `${b.x}%`,
              top: `${b.y}%`,
              width: b.r * 2,
              height: b.r * 2,
              marginLeft: -b.r,
              marginTop: -b.r,
              borderRadius: b.r,
              backgroundColor: b.bomb ? '#1F1F1F' : `${game.accent}cc`,
              borderWidth: 1.5,
              borderColor: b.bomb ? '#FF4D4D' : 'rgba(255,255,255,0.55)',
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: b.bomb ? '#FF4D4D' : game.accent,
              shadowOpacity: 0.6,
              shadowRadius: 14,
              shadowOffset: { width: 0, height: 0 },
            }}
          >
            {b.bomb ? <Text style={{ fontSize: b.r }}>💣</Text> : null}
          </Pressable>
        ))}
      </View>
    </GameShell>
  );
}
