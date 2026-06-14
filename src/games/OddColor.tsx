import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, Text, View, useWindowDimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Game } from '../data/games';
import { LevelComplete, shouldShowAdAfter } from './LevelComplete';
import { GameResult } from './GameResult';
import { GameShell } from './GameShell';
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
  const totalScoreRef = useRef(0);
  const reportedRef = useRef(false);
  const lockRef = useRef(false);

  // Keep totalScoreRef fresh BEFORE the phase-watcher below reads it (effects
  // run in declaration order, so this commits the latest score first).
  useEffect(() => { totalScoreRef.current = totalScore; }, [totalScore]);

  // Report completion exactly once per round for BOTH outcomes. Previously a
  // win (phase 'levelComplete') never called onComplete at all, so level wins
  // were never logged / scored / counted toward achievements.
  useEffect(() => {
    if (phase === 'gameOver' || phase === 'levelComplete') {
      if (reportedRef.current) return;
      reportedRef.current = true;
      onComplete(phase === 'levelComplete', totalScoreRef.current, { level });
    } else {
      reportedRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const startRound = useCallback((lv: number) => {
    const { cols, rows } = gridForLevel(lv);
    setOddIdx(Math.floor(Math.random() * cols * rows));
    setBaseHue(Math.random() * 360);
    setBaseSat(55 + Math.random() * 25);
    // Clamp baseLit so baseLit + diff stays in [5, 95] — prevents hslToHex overflow
    const d = diffForLevel(lv);
    const maxLit = Math.min(70, 95 - d);
    const minLit = Math.max(10, maxLit - 30);
    setBaseLit(minLit + Math.random() * (maxLit - minLit));
    setWrongIdx(null);
    lockRef.current = false;
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
    if (phase !== 'playing' || lockRef.current) return;
    if (idx === oddIdx) {
      lockRef.current = true;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      const pts = scoreForLevel(level);
      const newTotal = totalScore + pts;
      totalScoreRef.current = newTotal;
      setTotalScore(newTotal);
      setPhase('levelComplete');
    } else {
      lockRef.current = true;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      setWrongIdx(idx);
      setPhase('wrong');
      shake(() => setPhase('gameOver'));
    }
  };

  if (phase === 'gameOver') {
    return (
      <GameShell game={game} onBack={onBack} score={totalScore} label={`Ур. ${level}`}>
        <GameResult
          won={false}
          score={totalScore}
          accent={game.accent}
          onRestart={() => { setLevel(1); setTotalScore(0); startRound(1); }}
          onBack={onBack}
          game={game}
        />
      </GameShell>
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
    <GameShell game={game} onBack={onBack} score={totalScore} label={`Ур. ${level}`}>
      <Animated.View
        style={{ alignItems: 'center', justifyContent: 'center', flex: 1, transform: [{ translateX: shakeAnim }] }}
      >
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
    </GameShell>
  );
}
