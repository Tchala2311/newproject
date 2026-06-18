import React, { useCallback, useEffect, useRef, useState } from 'react';
import { PanResponder, Text, View, useWindowDimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Game } from '../data/games';
import { GameShell } from './GameShell';
import { LevelComplete, shouldShowAdAfter } from './LevelComplete';
import { fontFamily } from '../theme';

type Props = { game: Game; onBack: () => void; onComplete: (won: boolean, score: number, meta?: Record<string, number>) => void; initialLevel?: number };

const BASKET_W = 80;
const BASKET_H = 32;
const ITEM_SIZE = 34;
const GAME_TIME = 40;
const TARGET = (level: number) => 6 + level * 3;
const FALL_SPEED = (level: number) => 2.5 + level * 0.5;
const ITEMS = ['🍎','🍊','🍋','🍇','🍓','🫐','🥝','🍒'];
const BOMB = '💣';

type FallingItem = { id: number; x: number; y: number; emoji: string };
let NEXT_ID = 0;

export function CatchDrop({ game, onBack, onComplete, initialLevel }: Props) {
  const { width, height } = useWindowDimensions();
  const boardW = width - 32;
  const boardH = Math.min(height * 0.58, 520);

  const [level, setLevel] = useState(initialLevel ?? 1);
  const [basketX, setBasketX] = useState(boardW / 2 - BASKET_W / 2);
  const [items, setItems] = useState<FallingItem[]>([]);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [timeLeft, setTimeLeft] = useState(GAME_TIME);
  const [phase, setPhase] = useState<'playing' | 'complete'>('playing');
  const [passed, setPassed] = useState(false);
  const basketXRef = useRef(boardW / 2 - BASKET_W / 2);
  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const timeLeftRef = useRef(GAME_TIME);
  const rafRef = useRef<number | null>(null);
  const gamePhaseRef = useRef<'playing' | 'complete'>('playing');

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderMove: (_, g) => {
      const newX = Math.max(0, Math.min(boardW - BASKET_W, g.moveX - BASKET_W / 2 - 16));
      basketXRef.current = newX;
      setBasketX(newX);
    },
  })).current;

  const startGame = useCallback(() => {
    scoreRef.current = 0; livesRef.current = 3; gamePhaseRef.current = 'playing';
    timeLeftRef.current = GAME_TIME;
    setScore(0); setLives(3); setItems([]); setTimeLeft(GAME_TIME);
  }, []);

  useEffect(() => { startGame(); }, [level]);

  useEffect(() => {
    if (phase !== 'playing') return;
    const interval = setInterval(() => {
      const isBomb = Math.random() < 0.15;
      const emoji = isBomb ? BOMB : ITEMS[Math.floor(Math.random() * ITEMS.length)];
      setItems((prev) => [...prev, { id: ++NEXT_ID, x: Math.random() * (boardW - ITEM_SIZE), y: -ITEM_SIZE, emoji }]);
    }, Math.max(500, 1000 - level * 60));
    return () => clearInterval(interval);
  }, [phase, level, boardW]);

  useEffect(() => {
    if (phase !== 'playing') return;
    let lastTs = 0;
    const loop = (ts: number) => {
      const dt = lastTs ? Math.min(ts - lastTs, 50) : 16.67;
      lastTs = ts;
      setItems((prev) => {
        const speed = FALL_SPEED(level) * (dt / 16.67);
        return prev.map((item) => ({ ...item, y: item.y + speed })).filter((item) => {
          if (item.y > boardH) {
            if (item.emoji !== BOMB) {
              livesRef.current = Math.max(0, livesRef.current - 1);
              setLives(livesRef.current);
              if (livesRef.current <= 0 && gamePhaseRef.current === 'playing') {
                gamePhaseRef.current = 'complete';
                const p = scoreRef.current >= TARGET(level);
                setPassed(p);
                setPhase('complete');
                onComplete(p, scoreRef.current * 50, { level });
              }
            }
            return false;
          }
          const bx = basketXRef.current;
          if (item.y + ITEM_SIZE >= boardH - BASKET_H &&
              item.x + ITEM_SIZE > bx && item.x < bx + BASKET_W) {
            if (item.emoji === BOMB) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
              livesRef.current = Math.max(0, livesRef.current - 1);
              setLives(livesRef.current);
            } else {
              Haptics.selectionAsync().catch(() => {});
              scoreRef.current += 1;
              setScore(scoreRef.current);
            }
            if (livesRef.current <= 0 && gamePhaseRef.current === 'playing') {
              gamePhaseRef.current = 'complete';
              const p = scoreRef.current >= TARGET(level);
              setPassed(p);
              setPhase('complete');
              onComplete(p, scoreRef.current * 50, { level });
            }
            return false;
          }
          return true;
        });
      });
      if (gamePhaseRef.current === 'playing') rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame((ts) => { lastTs = ts; loop(ts); });
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [phase, level, boardH]);

  useEffect(() => {
    if (phase !== 'playing') return;
    const t = setInterval(() => {
      const next = timeLeftRef.current - 1;
      timeLeftRef.current = next;
      setTimeLeft(Math.max(0, next));
      // End the round OUTSIDE the setState updater so onComplete (a parent
      // setState + Supabase write) is never invoked during render.
      if (next <= 0 && gamePhaseRef.current !== 'complete') {
        clearInterval(t);
        gamePhaseRef.current = 'complete';
        const p = scoreRef.current >= TARGET(level);
        setPassed(p);
        setPhase('complete');
        onComplete(p, scoreRef.current * 50, { level });
      }
    }, 1000);
    return () => clearInterval(t);
  }, [phase, level]);

  if (phase === 'complete') {
    return <LevelComplete level={level} passed={passed} score={score * 50} scoreLabel="Очки" accent={game.accent}
      showAd={passed && shouldShowAdAfter(level)}
      onContinue={() => { setLevel((l) => l + 1); setPhase('playing'); }}
      onRetry={() => { startGame(); setPhase('playing'); }}
      onBack={onBack} />;
  }

  return (
    <GameShell game={game} onBack={onBack} score={`${score} 🧺`} label={`❤️ ${lives} · нужно ${TARGET(level)}`} timer={timeLeft} timerMax={GAME_TIME}>
      <View {...panResponder.panHandlers} style={{ width: boardW, height: boardH, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}>
        {items.map((item) => (
          <Text key={item.id} style={{ position: 'absolute', left: item.x, top: item.y, fontSize: ITEM_SIZE }}>{item.emoji}</Text>
        ))}
        <View style={{ position: 'absolute', left: basketX, bottom: 0, width: BASKET_W, height: BASKET_H, borderRadius: 8, backgroundColor: game.accent, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 13, fontFamily: fontFamily.bold, color: '#000' }}>🧺</Text>
        </View>
      </View>
    </GameShell>
  );
}
