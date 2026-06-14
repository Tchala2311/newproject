import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Game } from '../data/games';
import { GameShell } from './GameShell';
import { LevelComplete, shouldShowAdAfter } from './LevelComplete';
import { colors, fontFamily } from '../theme';

type Props = { game: Game; onBack: () => void; onComplete: (won: boolean, score: number, meta?: Record<string, number>) => void; initialLevel?: number };

const GRID = 4; // 4×4 = 16 numbers
const TIME_LIMIT = (level: number) => Math.max(10, 30 - (level - 1) * 3);

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function NumberOrder({ game, onBack, onComplete, initialLevel }: Props) {
  const { width, height } = useWindowDimensions();
  const cellSize = Math.floor(Math.min(width - 32, height * 0.58) / GRID);
  const [level, setLevel] = useState(initialLevel ?? 1);
  const [numbers, setNumbers] = useState<number[]>(() => shuffle(Array.from({ length: GRID * GRID }, (_, i) => i + 1)));
  const [nextExpected, setNextExpected] = useState(1);
  const [elapsed, setElapsed] = useState(0);
  const [phase, setPhase] = useState<'playing' | 'complete'>('playing');
  const [passed, setPassed] = useState(false);
  const [lastScore, setLastScore] = useState(0);
  const startTs = useRef(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completedRef = useRef(false);
  const limit = TIME_LIMIT(level);

  const startGame = useCallback(() => {
    completedRef.current = false;
    setNumbers(shuffle(Array.from({ length: GRID * GRID }, (_, i) => i + 1)));
    setNextExpected(1);
    setElapsed(0);
    startTs.current = Date.now();
  }, []);

  useEffect(() => { startGame(); }, [level]);

  useEffect(() => {
    if (phase !== 'playing') return;
    timerRef.current = setInterval(() => {
      const secs = Math.floor((Date.now() - startTs.current) / 1000);
      setElapsed(secs);
      if (secs >= limit) {
        clearInterval(timerRef.current!);
        if (completedRef.current) return;
        completedRef.current = true;
        const score = 0;
        setLastScore(score);
        setPassed(false);
        setPhase('complete');
        onComplete(false, score, { level });
      }
    }, 250);
    return () => clearInterval(timerRef.current!);
  }, [phase, level, limit]);

  const tap = (n: number) => {
    if (phase !== 'playing' || n !== nextExpected) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      return;
    }
    Haptics.selectionAsync().catch(() => {});
    if (n === GRID * GRID) {
      clearInterval(timerRef.current!);
      if (completedRef.current) return;
      completedRef.current = true;
      const secs = Math.floor((Date.now() - startTs.current) / 1000);
      const score = Math.max(50, Math.round((limit - secs) / limit * 800) + level * 50);
      setLastScore(score);
      setPassed(true);
      setPhase('complete');
      onComplete(true, score, { level });
    } else {
      setNextExpected(n + 1);
    }
  };

  if (phase === 'complete') {
    return (
      <LevelComplete level={level} passed={passed} score={lastScore} scoreLabel="Очки" accent={game.accent}
        showAd={passed && shouldShowAdAfter(level)}
        onContinue={() => { setLevel((l) => l + 1); setPhase('playing'); }}
        onRetry={() => { startGame(); setPhase('playing'); }}
        onBack={onBack} />
    );
  }

  const remaining = Math.max(0, limit - elapsed);

  return (
    <GameShell game={game} onBack={onBack} score={`${remaining}с`} label={`Ур. ${level} · следующий: ${nextExpected}`}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', width: cellSize * GRID }}>
        {numbers.map((n) => {
          const done = n < nextExpected;
          return (
            <Pressable key={n} onPress={() => tap(n)}
              style={{
                width: cellSize - 4, height: cellSize - 4, margin: 2,
                borderRadius: 10, alignItems: 'center', justifyContent: 'center',
                backgroundColor: done ? `${game.accent}30` : `${game.accent}18`,
                borderWidth: 1,
                borderColor: done ? `${game.accent}60` : `${game.accent}40`,
              }}>
              <Text style={{ fontSize: 18, fontFamily: fontFamily.bold, color: done ? `${game.accent}60` : game.accent }}>
                {done ? '✓' : n}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </GameShell>
  );
}
