import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, Text, View, useWindowDimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Game } from '../data/games';
import { GameShell } from './GameShell';
import { LevelComplete, shouldShowAdAfter } from './LevelComplete';
import { fontFamily } from '../theme';

type Props = { game: Game; onBack: () => void; onComplete: (won: boolean, score: number, meta?: Record<string, number>) => void; initialLevel?: number };

const GAME_TIME = 30;
const TARGET = (level: number) => 8 + level * 3;
const BALLOON_EMOJIS = ['🎈', '🟠', '🔵', '🟣', '🟢', '🟡'];

type Balloon = { id: number; x: number; emoji: string; anim: Animated.Value; size: number };

let UID = 0;

export function BalloonPop({ game, onBack, onComplete, initialLevel }: Props) {
  const { width, height: screenH } = useWindowDimensions();
  const boardH = Math.min(screenH * 0.45, 340);
  const [level, setLevel] = useState(initialLevel ?? 1);
  const [balloons, setBalloons] = useState<Balloon[]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_TIME);
  const [phase, setPhase] = useState<'playing' | 'complete'>('playing');
  const [passed, setPassed] = useState(false);
  const scoreRef = useRef(0);
  const spawnRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const spawnBalloon = useCallback(() => {
    const id = ++UID;
    const x = Math.random() * (width - 80) + 16;
    const emoji = BALLOON_EMOJIS[Math.floor(Math.random() * BALLOON_EMOJIS.length)];
    const size = 40 + Math.floor(Math.random() * 26);
    const anim = new Animated.Value(boardH);
    const dur = 2500 - level * 200 + Math.random() * 800;
    setBalloons((prev) => [...prev.slice(-12), { id, x, emoji, anim, size }]);
    Animated.timing(anim, { toValue: -size - 20, duration: Math.max(1400, dur), useNativeDriver: true }).start(({ finished }) => {
      if (finished) setBalloons((prev) => prev.filter((b) => b.id !== id));
    });
  }, [level, width, boardH]);

  const startGame = useCallback(() => {
    setBalloons([]);
    scoreRef.current = 0;
    setScore(0);
    setTimeLeft(GAME_TIME);
  }, []);

  useEffect(() => { startGame(); }, [level]);

  useEffect(() => {
    if (phase !== 'playing') return;
    const interval = 900 - level * 60;
    spawnRef.current = setInterval(spawnBalloon, Math.max(400, interval));
    return () => clearInterval(spawnRef.current!);
  }, [phase, level, spawnBalloon]);

  useEffect(() => {
    if (phase !== 'playing') return;
    const t = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(t);
          const p = scoreRef.current >= TARGET(level);
          setPassed(p);
          setPhase('complete');
          onComplete(p, scoreRef.current * 40, { level });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [phase, level]);

  const pop = (id: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setBalloons((prev) => prev.filter((b) => b.id !== id));
    scoreRef.current += 1;
    setScore(scoreRef.current);
  };

  if (phase === 'complete') {
    return <LevelComplete level={level} passed={passed} score={score * 40} scoreLabel="Очки" accent={game.accent}
      showAd={passed && shouldShowAdAfter(level)}
      onContinue={() => { setLevel((l) => l + 1); setPhase('playing'); }}
      onRetry={() => { startGame(); setPhase('playing'); }}
      onBack={onBack} />;
  }

  return (
    <GameShell game={game} onBack={onBack} score={`${score} 🎈`} label={`⏱ ${timeLeft}с · нужно ${TARGET(level)}`}>
      <View style={{ width, height: boardH, overflow: 'hidden' }}>
        {balloons.map((b) => (
          <Animated.View key={b.id} style={{ position: 'absolute', left: b.x, transform: [{ translateY: b.anim }] }}>
            <Pressable onPress={() => pop(b.id)} hitSlop={10}>
              <Text style={{ fontSize: b.size }}>{b.emoji}</Text>
            </Pressable>
          </Animated.View>
        ))}
      </View>
    </GameShell>
  );
}
