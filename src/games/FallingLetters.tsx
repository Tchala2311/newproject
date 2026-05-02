import React, { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Game } from '../data/games';
import { GameShell } from './GameShell';
import { GameResult } from './GameResult';
import { colors, fontFamily, radius } from '../theme';

type Props = {
  game: Game;
  onBack: () => void;
  onComplete: (won: boolean, score: number) => void;
};

const KEYBOARD = [
  'ЙЦУКЕНГШЩЗХЪ',
  'ФЫВАПРОЛДЖЭ',
  'ЯЧСМИТЬБЮ',
];

const FALL_TIME = 6500;
const SPAWN_INTERVAL = 1100;
const ROUND_LIMIT = 8; // missed letters

type Letter = {
  id: number;
  ch: string;
  spawnAt: number;
  x: number;
};

const RUSSIAN = 'АБВГДЕЁЖЗИКЛМНОПРСТУФХЦЧШЩЫЭЮЯЙЦУЕНГ';

export function FallingLetters({ game, onBack, onComplete }: Props) {
  const { width } = useWindowDimensions();
  const [letters, setLetters] = useState<Letter[]>([]);
  const [score, setScore] = useState(0);
  const [missed, setMissed] = useState(0);
  const [done, setDone] = useState(false);
  const idRef = useRef(0);
  const startRef = useRef(Date.now());
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (done) return;
    const t = setInterval(() => setTick((n) => n + 1), 60);
    return () => clearInterval(t);
  }, [done]);

  useEffect(() => {
    if (done) return;
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
    }, SPAWN_INTERVAL);
    return () => clearInterval(sp);
  }, [done]);

  // Auto-miss falling letters
  useEffect(() => {
    if (done) return;
    setLetters((prev) => {
      const now = Date.now();
      const alive: Letter[] = [];
      let missedNow = 0;
      for (const l of prev) {
        if (now - l.spawnAt > FALL_TIME) missedNow += 1;
        else alive.push(l);
      }
      if (missedNow > 0) {
        setMissed((m) => {
          const next = m + missedNow;
          if (next >= ROUND_LIMIT) {
            setDone(true);
            onComplete(score >= 20, score);
          }
          return next;
        });
      }
      return alive;
    });
  }, [tick, done, score, onComplete]);

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
    setDone(false);
    startRef.current = Date.now();
  };

  if (done) {
    return (
      <GameShell game={game} onBack={onBack} score={score} label="Очки">
        <GameResult won={score >= 20} score={score} accent={game.accent} onRestart={reset} onBack={onBack} />
      </GameShell>
    );
  }

  const playH = 320;
  const now = Date.now();

  return (
    <GameShell game={game} onBack={onBack} score={`${score} · ✕${missed}/${ROUND_LIMIT}`} label="Очки/Промах">
      <Text style={{ fontSize: 12, fontFamily: fontFamily.semibold, color: colors.textMuted, textAlign: 'center' }}>
        Нажимай букву на клавиатуре до того, как она упадёт.
      </Text>
      <View style={{ width: '100%', height: playH, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: radius.lg, overflow: 'hidden' }}>
        {letters.map((l) => {
          const progress = (now - l.spawnAt) / FALL_TIME;
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
