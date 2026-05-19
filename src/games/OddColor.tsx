import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, Text, View, useWindowDimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Game } from '../data/games';
import { LevelComplete, shouldShowAdAfter } from './LevelComplete';
import { GameResult } from './GameResult';
import { colors, fontFamily } from '../theme';

type Props = {
  game: Game;
  onBack: () => void;
  onComplete: (won: boolean, score: number, meta?: Record<string, number>) => void;
  initialLevel?: number;
};

function hslToHex(h: number, s: number, l: number): string {
  s /= 100; l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const hex = (x: number) => Math.round(255 * x).toString(16).padStart(2, '0');
  return `#${hex(f(0))}${hex(f(8))}${hex(f(4))}`;
}

function gridForLevel(level: number): { cols: number; rows: number } {
  if (level <= 1) return { cols: 3, rows: 3 };
  if (level <= 2) return { cols: 4, rows: 4 };
  if (level <= 3) return { cols: 4, rows: 5 };
  if (level <= 4) return { cols: 4, rows: 6 };
  if (level <= 5) return { cols: 5, rows: 7 };
  if (level <= 6) return { cols: 5, rows: 8 };
  if (level <= 7) return { cols: 5, rows: 9 };
  if (level <= 8) return { cols: 6, rows: 10 };
  if (level <= 9) return { cols: 6, rows: 11 };
  if (level <= 10) return { cols: 6, rows: 12 };
  if (level <= 11) return { cols: 6, rows: 13 };
  if (level <= 12) return { cols: 6, rows: 14 };
  return { cols: 6, rows: 15 };
}

function diffForLevel(level: number): number {
  return Math.max(6, 55 - (level - 1) * 5);
}

function scoreForLevel(level: number): number {
  return Math.min(200, 50 + level * 15);
}

type Phase = 'playing' | 'wrong' | 'levelComplete' | 'gameOver';

export function OddColor({ game, onBack, onComplete, initialLevel = 1 }: Props) {
  const { width } = useWindowDimensions();
  const [level, setLevel] = useState(initialLevel);
  const [totalScore, setTotalScore] = useState(0);
  const [phase, setPhase] = useState<Phase>('playing');
  const [oddIdx, setOddIdx] = useState(0);
  const [wrongIdx, setWrongIdx] = useState<number | null>(null);
  const [baseHue, setBaseHue] = useState(0);
  const [baseSat, setBaseSat] = useState(70);
  const [baseLit, setBaseLit] = useState(40);

  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Report game-over exactly once when phase transitions to gameOver
  useEffect(() => {
    if (phase === 'gameOver') {
      onComplete(false, totalScore, { level });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const startRound = useCallback((lv: number) => {
    const { cols, rows } = gridForLevel(lv);
    setOddIdx(Math.floor(Math.random() * cols * rows));
    setBaseHue(Math.random() * 360);
    setBaseSat(55 + Math.random() * 25);
    setBaseLit(32 + Math.random() * 22);
    setWrongIdx(null);
    setPhase('playing');
  }, []);

  useEffect(() => { startRound(level); }, [level]);

  const shake = (onDone: () => void) => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start(onDone);
  };

  const handleTap = (idx: number) => {
    if (phase !== 'playing') return;
    if (idx === oddIdx) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      const pts = scoreForLevel(level);
      setTotalScore(s => s + pts);
      setPhase('levelComplete');
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      setWrongIdx(idx);
      setPhase('wrong');
      shake(() => setPhase('gameOver'));
    }
  };

  if (phase === 'gameOver') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
        <GameResult
          won={false}
          score={totalScore}
          accent={game.accent}
          onRestart={() => { setLevel(1); setTotalScore(0); startRound(1); }}
          onBack={onBack}
          game={game}
        />
      </View>
    );
  }

  if (phase === 'levelComplete') {
    return (
      <LevelComplete
        level={level}
        passed
        score={scoreForLevel(level)}
        scoreLabel="Очки"
        accent={game.accent}
        showAd={shouldShowAdAfter(level)}
        onContinue={() => setLevel(l => l + 1)}
        onRetry={() => startRound(level)}
        onBack={onBack}
      />
    );
  }

  const { cols, rows } = gridForLevel(level);
  const diff = diffForLevel(level);
  const gap = 6;
  const padding = 20;
  const cellSize = Math.floor((width - padding * 2 - gap * (cols - 1)) / cols);
  const baseColor = hslToHex(baseHue, baseSat, baseLit);
  const oddColor = hslToHex(baseHue, baseSat, baseLit + diff);

  return (
    <Animated.View
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', transform: [{ translateX: shakeAnim }] }}
    >
      <Text style={{ fontSize: 11, fontFamily: fontFamily.bold, color: colors.textDim, letterSpacing: 1.2, marginBottom: 20 }}>
        УРОВЕНЬ {level} · {totalScore} ОЧК
      </Text>

      <View style={{ gap }}>
        {Array.from({ length: rows }).map((_, row) => (
          <View key={row} style={{ flexDirection: 'row', gap }}>
            {Array.from({ length: cols }).map((_, col) => {
              const idx = row * cols + col;
              const isOdd = idx === oddIdx;
              const isWrong = idx === wrongIdx;
              return (
                <Pressable
                  key={col}
                  onPress={() => handleTap(idx)}
                  style={{
                    width: cellSize,
                    height: cellSize,
                    borderRadius: 10,
                    backgroundColor: isOdd ? oddColor : baseColor,
                    borderWidth: isWrong ? 3 : 0,
                    borderColor: '#FF4D4D',
                  }}
                />
              );
            })}
          </View>
        ))}
      </View>

      <Text style={{ fontSize: 11, fontFamily: fontFamily.medium, color: colors.textFaint, marginTop: 20 }}>
        Найди отличающийся цвет
      </Text>
    </Animated.View>
  );
}
