import React, { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Game } from '../data/games';
import { GameShell } from './GameShell';
import { LevelComplete, shouldShowAdAfter } from './LevelComplete';
import { colors, fontFamily, radius } from '../theme';

type Props = {
  game: Game;
  onBack: () => void;
  onComplete: (won: boolean, score: number, meta?: Record<string, number>) => void;
  initialLevel?: number;
};

const KEYBOARD = [
  'ЙЦУКЕНГШЩЗХЪ',
  'ФЫВАПРОЛДЖЭ',
  'ЯЧСМИТЬБЮ',
];

const RUSSIAN = 'АБВГДЕЁЖЗИКЛМНОПРСТУФХЦЧШЩЫЭЮЯЙЦУЕНГ';

const LEVEL_CFG = (level: number) => {
  if (level === 1) return { fall: 7000, spawn: 1300, missLimit: 8, target: 25 };
  if (level === 2) return { fall: 6200, spawn: 1100, missLimit: 8, target: 35 };
  if (level === 3) return { fall: 5400, spawn: 950, missLimit: 7, target: 50 };
  if (level === 4) return { fall: 4600, spawn: 850, missLimit: 6, target: 60 };
  return { fall: 4000, spawn: 750, missLimit: 5, target: 75 };
};

type Letter = { id: number; ch: string; spawnAt: number; x: number };

export function FallingLetters({ game, onBack, onComplete, initialLevel }: Props) {
  const [level, setLevel] = useState(initialLevel ?? 1);
  const cfg = LEVEL_CFG(level);
  const [phase, setPhase] = useState<'playing' | 'complete'>('playing');
  const [letters, setLetters] = useState<Letter[]>([]);
  const [score, setScore] = useState(0);
  const [missed, setMissed] = useState(0);
  const [lastPassed, setLastPassed] = useState(false);
  const [lastScore, setLastScore] = useState(0);
  const idRef = useRef(0);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (phase !== 'playing') return;
    const t = setInterval(() => setTick((n) => n + 1), 60);
    return () => clearInterval(t);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'playing') return;
    const sp = setInterval(() => {
      setLetters((prev) => [
        ...prev,
        {
          id: idRef.current++,
          ch: RUSSIAN[Math.floor(Math.random() * RUSSIAN.length)],
          spawnAt: Date.now(),
          x: 0.1 + Math.random() * 0.8,
        },
      ]);
    }, cfg.spawn);
    return () => clearInterval(sp);
  }, [phase, cfg.spawn]);

  useEffect(() => {
    if (phase !== 'playing') return;
    setLetters((prev) => {
      const now = Date.now();
      const alive: Letter[] = [];
      let missedNow = 0;
      for (const l of prev) {
        if (now - l.spawnAt > cfg.fall) missedNow += 1;
        else alive.push(l);
      }
      if (missedNow > 0) {
        setMissed((m) => {
          const next = m + missedNow;
          if (next >= cfg.missLimit) {
            const passed = score >= cfg.target;
            setLastPassed(passed);
            setLastScore(score * level);
            setPhase('complete');
            onComplete(passed, score * level, { level });
          }
          return next;
        });
      }
      return alive;
    });
  }, [tick, phase, score, onComplete, cfg.fall, cfg.missLimit, cfg.target, level]);

  // Also pass when target is reached early
  useEffect(() => {
    if (phase !== 'playing' || score < cfg.target) return;
    setLastPassed(true);
    setLastScore(score * level);
    setPhase('complete');
    onComplete(true, score * level, { level });
  }, [score, phase, cfg.target, onComplete, level]);

  const press = (ch: string) => {
    setLetters((prev) => {
      const idx = prev.findIndex((l) => l.ch === ch);
      if (idx === -1) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        return prev;
      }
      const removed = prev[idx];
      const elapsed = Date.now() - removed.spawnAt;
      const speedBonus = Math.max(0, 10 - Math.floor(elapsed / 600));
      setScore((s) => s + 1 + speedBonus);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      return [...prev.slice(0, idx), ...prev.slice(idx + 1)];
    });
  };

  const reset = () => {
    setLetters([]);
    setScore(0);
    setMissed(0);
    setPhase('playing');
  };

  const startNextLevel = () => {
    setLevel((l) => l + 1);
    setLetters([]);
    setScore(0);
    setMissed(0);
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

  const playH = 320;
  const now = Date.now();

  return (
    <GameShell game={game} onBack={onBack} score={`${score}/${cfg.target} · ✕${missed}/${cfg.missLimit}`} label={`Ур. ${level}`}>
      <Text style={{ fontSize: 12, fontFamily: fontFamily.semibold, color: colors.textMuted, textAlign: 'center' }}>
        Нажимай букву на клавиатуре до того, как она упадёт.
      </Text>
      <View style={{ width: '100%', height: playH, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: radius.lg, overflow: 'hidden' }}>
        {letters.map((l) => {
          const progress = (now - l.spawnAt) / cfg.fall;
          if (progress > 1) return null;
          return (
            <View
              key={l.id}
              style={{
                position: 'absolute',
                left: `${l.x * 100}%`,
                top: progress * (playH - 50),
                width: 42,
                height: 42,
                marginLeft: -21,
                borderRadius: 8,
                backgroundColor: progress > 0.7 ? '#FF4D4D' : game.accent,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 20, fontFamily: fontFamily.bold, color: '#000' }}>{l.ch}</Text>
            </View>
          );
        })}
      </View>
      <View style={{ width: '100%', gap: 4 }}>
        {KEYBOARD.map((row) => (
          <View key={row} style={{ flexDirection: 'row', justifyContent: 'center', gap: 3 }}>
            {row.split('').map((ch) => (
              <Pressable
                key={ch}
                onPress={() => press(ch)}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 6,
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.12)',
                  alignItems: 'center',
                  maxWidth: 32,
                }}
              >
                <Text style={{ fontSize: 13, fontFamily: fontFamily.bold, color: '#fff' }}>{ch}</Text>
              </Pressable>
            ))}
          </View>
        ))}
      </View>
    </GameShell>
  );
}
