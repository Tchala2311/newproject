import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Game } from '../data/games';
import { GameShell } from './GameShell';
import { LevelComplete, shouldShowAdAfter } from './LevelComplete';
import { fontFamily } from '../theme';

type Props = { game: Game; onBack: () => void; onComplete: (won: boolean, score: number, meta?: Record<string, number>) => void; initialLevel?: number };

const PAIRS_PER_LEVEL = (level: number) => Math.min(4 + level * 2, 12); // 6 → 8 → 10 → 12
const SYMBOLS = ['🐶','🐱','🦊','🐸','🐙','🦋','🌸','⭐','🍎','🍕','🎸','🏆','🚀','🌈','🎯','💎'];

type Card = { id: number; symbol: string; flipped: boolean; matched: boolean; anim: Animated.Value };

function buildDeck(pairsCount: number): Card[] {
  const syms = SYMBOLS.slice(0, pairsCount);
  const cards = [...syms, ...syms].map((symbol, i) => ({
    id: i, symbol, flipped: false, matched: false, anim: new Animated.Value(0),
  }));
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

export function FlipDuo({ game, onBack, onComplete, initialLevel }: Props) {
  const [level, setLevel] = useState(initialLevel ?? 1);
  const [cards, setCards] = useState<Card[]>(() => buildDeck(PAIRS_PER_LEVEL(initialLevel ?? 1)));
  const [selected, setSelected] = useState<number[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [phase, setPhase] = useState<'playing' | 'complete'>('playing');
  const [passed, setPassed] = useState(false);
  const [lastScore, setLastScore] = useState(0);
  const matchedRef = useRef(0);
  const lockRef = useRef(false);
  const pairsCount = PAIRS_PER_LEVEL(level);
  const cols = pairsCount <= 6 ? 3 : 4;
  const cardSize = pairsCount <= 6 ? 80 : 68;

  const flipCard = (c: Card, toValue: number) =>
    new Promise<void>((res) => Animated.timing(c.anim, { toValue, duration: 180, useNativeDriver: true }).start(() => res()));

  const tap = useCallback(async (id: number) => {
    if (lockRef.current) return;
    setCards((prev) => {
      const c = prev[id];
      if (c.flipped || c.matched) return prev;
      flipCard(c, 1);
      return prev.map((x) => x.id === id ? { ...x, flipped: true } : x);
    });
    setSelected((prev) => {
      const next = [...prev, id];
      if (next.length === 2) {
        lockRef.current = true;
        setTimeout(async () => {
          setCards((deck) => {
            const [a, b] = [deck[next[0]], deck[next[1]]];
            if (a.symbol === b.symbol) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
              matchedRef.current += 1;
              const updated = deck.map((c) => next.includes(c.id) ? { ...c, matched: true } : c);
              if (matchedRef.current >= pairsCount) {
                const p = true;
                const score = Math.max(100, 1000 - mistakes * 60) * level;
                setPassed(p);
                setLastScore(score);
                setPhase('complete');
                onComplete(p, score, { level });
              }
              lockRef.current = false;
              return updated;
            } else {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
              setMistakes((m) => m + 1);
              deck[next[0]].anim.setValue(1); deck[next[1]].anim.setValue(1);
              Animated.parallel([
                Animated.timing(deck[next[0]].anim, { toValue: 0, duration: 180, useNativeDriver: true }),
                Animated.timing(deck[next[1]].anim, { toValue: 0, duration: 180, useNativeDriver: true }),
              ]).start();
              lockRef.current = false;
              return deck.map((c) => next.includes(c.id) ? { ...c, flipped: false } : c);
            }
          });
          setSelected([]);
        }, 600);
      }
      return next.length >= 2 ? [] : next;
    });
  }, [pairsCount, mistakes, level, onComplete]);

  const restart = useCallback(() => {
    matchedRef.current = 0;
    lockRef.current = false;
    setMistakes(0);
    setSelected([]);
    setCards(buildDeck(PAIRS_PER_LEVEL(level)));
    setPhase('playing');
  }, [level]);

  if (phase === 'complete') {
    return <LevelComplete level={level} passed={passed} score={lastScore} scoreLabel="Очки" accent={game.accent}
      showAd={passed && shouldShowAdAfter(level)}
      onContinue={() => { setLevel((l) => { const nl = l + 1; matchedRef.current = 0; lockRef.current = false; setMistakes(0); setSelected([]); setCards(buildDeck(PAIRS_PER_LEVEL(nl))); return nl; }); setPhase('playing'); }}
      onRetry={restart}
      onBack={onBack} />;
  }

  return (
    <GameShell game={game} onBack={onBack} score={`${matchedRef.current}/${pairsCount}`} label={`❌ ${mistakes}`}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', width: (cardSize + 8) * cols, justifyContent: 'center' }}>
        {cards.map((c) => {
          const rotateY = c.anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
          return (
            <Pressable key={c.id} onPress={() => tap(c.id)}
              style={{ width: cardSize, height: cardSize, margin: 4, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
                backgroundColor: c.matched ? `${game.accent}20` : 'rgba(255,255,255,0.06)',
                borderWidth: 1, borderColor: c.matched ? `${game.accent}60` : 'rgba(255,255,255,0.12)',
              }}>
              <Animated.Text style={{ fontSize: cardSize * 0.44, transform: [{ rotateY }] }}>
                {c.flipped || c.matched ? c.symbol : '❓'}
              </Animated.Text>
            </Pressable>
          );
        })}
      </View>
    </GameShell>
  );
}
