import React, { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Game } from '../data/games';
import { colors, fontFamily } from '../theme';
import { GameShell } from './GameShell';
import { GameResult } from './GameResult';

type Bubble = { id: number; x: number; y: number; r: number };

function makeBubble(id: number): Bubble {
  return {
    id,
    x: 8 + Math.random() * 74,
    y: 10 + Math.random() * 70,
    r: 22 + Math.random() * 18,
  };
}

type Props = { game: Game; onBack: () => void; onComplete: (won: boolean, score: number) => void };

export function TapRush({ game, onBack, onComplete }: Props) {
  const [bubbles, setBubbles] = useState<Bubble[]>(() => Array.from({ length: 6 }, (_, i) => makeBubble(i)));
  const [score, setScore] = useState(0);
  const [timer, setTimer] = useState(30);
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);
  const nextId = useRef(10);

  useEffect(() => {
    if (!started || done) return undefined;
    const t = setInterval(() => {
      setTimer((p) => {
        if (p <= 1) {
          setDone(true);
          return 0;
        }
        return p - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [started, done]);

  const firedRef = useRef(false);
  useEffect(() => {
    if (done && !firedRef.current) {
      firedRef.current = true;
      onComplete(score >= 100, score);
    }
  }, [done, score, onComplete]);

  const reset = () => {
    setBubbles(Array.from({ length: 6 }, (_, i) => makeBubble(i)));
    setScore(0);
    setTimer(30);
    setStarted(false);
    setDone(false);
    firedRef.current = false;
  };

  const pop = (id: number) => {
    if (!started) setStarted(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setBubbles((prev) => {
      const b = prev.find((b) => b.id === id);
      if (!b) return prev;
      const newId = nextId.current++;
      return prev.map((p) => (p.id === id ? { ...makeBubble(newId), id: newId } : p));
    });
    setScore((s) => s + 10);
  };

  return (
    <GameShell game={game} onBack={onBack} score={score} label="Очки" timer={timer} timerMax={30}>
      {done ? (
        <GameResult won={score >= 100} score={score} accent={game.accent} onRestart={reset} onBack={onBack} game={game} />
      ) : (
        <View style={{ width: '100%', flex: 1, position: 'relative' }}>
          {!started ? (
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 5,
              }}
            >
              <View
                style={{
                  backgroundColor: 'rgba(0,0,0,0.3)',
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                }}
              >
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
                backgroundColor: `${game.accent}cc`,
                borderWidth: 1.5,
                borderColor: 'rgba(255,255,255,0.55)',
                shadowColor: game.accent,
                shadowOpacity: 0.6,
                shadowRadius: 14,
                shadowOffset: { width: 0, height: 0 },
              }}
            />
          ))}
        </View>
      )}
    </GameShell>
  );
}
