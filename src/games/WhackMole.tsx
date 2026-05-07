import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Game } from '../data/games';
import { GameShell } from './GameShell';
import { LevelComplete, shouldShowAdAfter } from './LevelComplete';
import { fontFamily } from '../theme';

type Props = { game: Game; onBack: () => void; onComplete: (won: boolean, score: number, meta?: Record<string, number>) => void; initialLevel?: number };

const COLS = 3;
const ROWS = 3;
const CELLS = COLS * ROWS;
const GAME_TIME = 30;
const MOLE_DURATION = (level: number) => Math.max(500, 900 - level * 60);
const TARGET_SCORE = (level: number) => 5 + level * 2;

export function WhackMole({ game, onBack, onComplete, initialLevel }: Props) {
  const { width } = useWindowDimensions();
  const cellSize = Math.floor((Math.min(width - 40, 300)) / COLS);
  const [level, setLevel] = useState(initialLevel ?? 1);
  const [moles, setMoles] = useState<boolean[]>(Array(CELLS).fill(false));
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_TIME);
  const [phase, setPhase] = useState<'playing' | 'complete'>('playing');
  const [passed, setPassed] = useState(false);
  const scoreRef = useRef(0);
  const moleTimers = useRef<(ReturnType<typeof setTimeout> | null)[]>(Array(CELLS).fill(null));

  const popMole = useCallback(() => {
    const available = Array.from({ length: CELLS }, (_, i) => i);
    const idx = available[Math.floor(Math.random() * available.length)];
    setMoles((prev) => { const n = [...prev]; n[idx] = true; return n; });
    moleTimers.current[idx] = setTimeout(() => {
      setMoles((prev) => { const n = [...prev]; n[idx] = false; return n; });
    }, MOLE_DURATION(level));
  }, [level]);

  const startGame = useCallback(() => {
    scoreRef.current = 0;
    setScore(0);
    setTimeLeft(GAME_TIME);
    setMoles(Array(CELLS).fill(false));
  }, []);

  useEffect(() => { startGame(); }, [level]);

  // Spawn moles on interval
  useEffect(() => {
    if (phase !== 'playing') return;
    const interval = setInterval(popMole, Math.max(700, 1200 - level * 80));
    return () => clearInterval(interval);
  }, [phase, level, popMole]);

  // Countdown timer
  useEffect(() => {
    if (phase !== 'playing') return;
    const t = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(t);
          const p = scoreRef.current >= TARGET_SCORE(level);
          setPassed(p);
          setPhase('complete');
          onComplete(p, scoreRef.current * 50, { level, hits: scoreRef.current });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [phase, level]);

  const whack = (idx: number) => {
    if (!moles[idx]) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setMoles((prev) => { const n = [...prev]; n[idx] = false; return n; });
    scoreRef.current += 1;
    setScore(scoreRef.current);
    if (moleTimers.current[idx]) { clearTimeout(moleTimers.current[idx]!); moleTimers.current[idx] = null; }
  };

  if (phase === 'complete') {
    return <LevelComplete level={level} passed={passed} score={score * 50} scoreLabel="Очки" accent={game.accent}
      showAd={passed && shouldShowAdAfter(level)}
      onContinue={() => { setLevel((l) => l + 1); setPhase('playing'); }}
      onRetry={() => { startGame(); setPhase('playing'); }}
      onBack={onBack} />;
  }

  return (
    <GameShell game={game} onBack={onBack} score={`${score} 🥊`} label={`⏱ ${timeLeft}с · нужно ${TARGET_SCORE(level)}`}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', width: cellSize * COLS, justifyContent: 'center' }}>
        {moles.map((active, i) => (
          <Pressable key={i} onPress={() => whack(i)}
            style={{
              width: cellSize - 8, height: cellSize - 8, margin: 4,
              borderRadius: (cellSize - 8) / 2, alignItems: 'center', justifyContent: 'center',
              backgroundColor: active ? '#92400E' : 'rgba(255,255,255,0.06)',
              borderWidth: 2, borderColor: active ? '#FCD34D' : 'rgba(255,255,255,0.1)',
              transform: [{ scale: active ? 1 : 0.85 }],
            }}>
            <Text style={{ fontSize: active ? 36 : 20 }}>{active ? '🐾' : '⭕'}</Text>
          </Pressable>
        ))}
      </View>
    </GameShell>
  );
}
