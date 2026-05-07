import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, PanResponder, Text, View, useWindowDimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Game } from '../data/games';
import { GameShell } from './GameShell';
import { LevelComplete, shouldShowAdAfter } from './LevelComplete';
import { fontFamily } from '../theme';

type Props = { game: Game; onBack: () => void; onComplete: (won: boolean, score: number, meta?: Record<string, number>) => void; initialLevel?: number };

type Category = { label: string; emoji: string; items: string[] };

const CATEGORIES: Category[] = [
  { label: 'Животные', emoji: '🐾', items: ['🐶','🐱','🦊','🐸','🐧','🦁','🐨','🦋'] },
  { label: 'Еда', emoji: '🍔', items: ['🍕','🍎','🍊','🍣','🍦','🥕','🍇','🥑'] },
  { label: 'Транспорт', emoji: '🚗', items: ['🚗','✈️','🚢','🚂','🛵','🚁','🛸','🚲'] },
  { label: 'Природа', emoji: '🌿', items: ['🌸','🌊','⛰️','🌵','🍄','❄️','☀️','🌙'] },
];

const TOTAL = 12;

type Card = { emoji: string; category: string };

function buildDeck(): Card[] {
  const deck: Card[] = [];
  while (deck.length < TOTAL) {
    const cat = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
    const item = cat.items[Math.floor(Math.random() * cat.items.length)];
    deck.push({ emoji: item, category: cat.label });
  }
  return deck;
}

export function SpeedSort({ game, onBack, onComplete, initialLevel }: Props) {
  const { width } = useWindowDimensions();
  const [level, setLevel] = useState(initialLevel ?? 1);
  const [deck, setDeck] = useState<Card[]>(() => buildDeck());
  const [idx, setIdx] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [phase, setPhase] = useState<'playing' | 'complete'>('playing');
  const [passed, setPassed] = useState(false);
  const [lastScore, setLastScore] = useState(0);
  const [hint, setHint] = useState<string | null>(null);
  const pan = useRef(new Animated.ValueXY()).current;
  const correctRef = useRef(0);

  const currentCard = deck[idx];
  // For this card, which direction is correct?
  const leftCat = CATEGORIES[0];
  const rightCat = CATEGORIES[1];

  const nextCard = useCallback((isCorrect: boolean) => {
    if (isCorrect) { correctRef.current += 1; setCorrect(correctRef.current); }
    pan.setValue({ x: 0, y: 0 });
    setHint(null);
    const next = idx + 1;
    if (next >= deck.length) {
      const p = correctRef.current >= Math.ceil(deck.length * 0.7);
      const score = correctRef.current * 80 * level;
      setLastScore(score);
      setPassed(p);
      setPhase('complete');
      onComplete(p, score, { level, correct: correctRef.current });
      return;
    }
    setIdx(next);
  }, [idx, deck.length, level, pan, onComplete]);

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderMove: Animated.event([null, { dx: pan.x }], { useNativeDriver: false }),
    onPanResponderRelease: (_, g) => {
      if (Math.abs(g.dx) < 60) { Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start(); return; }
      const swipedLeft = g.dx < 0;
      Animated.timing(pan, { toValue: { x: swipedLeft ? -400 : 400, y: 0 }, duration: 180, useNativeDriver: false }).start(() => {
        // For simplicity: left = Animals, right = Food
        // Correct if the card's category matches the swipe direction
        const card = deck[idx];
        const isCorrect = (swipedLeft && card.category === leftCat.label) || (!swipedLeft && card.category === rightCat.label);
        Haptics[isCorrect ? 'notificationAsync' : 'notificationAsync'](isCorrect ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error).catch(() => {});
        nextCard(isCorrect);
      });
    },
  })).current;

  const restart = useCallback(() => {
    correctRef.current = 0;
    setCorrect(0);
    setIdx(0);
    setDeck(buildDeck());
    setPhase('playing');
  }, []);

  if (phase === 'complete') {
    return <LevelComplete level={level} passed={passed} score={lastScore} scoreLabel="Очки" accent={game.accent}
      showAd={passed && shouldShowAdAfter(level)}
      onContinue={() => { setLevel((l) => l + 1); correctRef.current = 0; setCorrect(0); setIdx(0); setDeck(buildDeck()); setPhase('playing'); }}
      onRetry={restart}
      onBack={onBack} />;
  }

  return (
    <GameShell game={game} onBack={onBack} score={`${correct}/${deck.length}`} label={`Ур. ${level}`}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: Math.min(width - 32, 300), marginBottom: 12 }}>
        <View style={{ alignItems: 'center', flex: 1 }}>
          <Text style={{ fontSize: 28 }}>{leftCat.emoji}</Text>
          <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', fontFamily: fontFamily.semibold }}>← {leftCat.label}</Text>
        </View>
        <View style={{ alignItems: 'center', flex: 1 }}>
          <Text style={{ fontSize: 28 }}>{rightCat.emoji}</Text>
          <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', fontFamily: fontFamily.semibold }}>{rightCat.label} →</Text>
        </View>
      </View>
      <Animated.View {...panResponder.panHandlers} style={{
        transform: [{ translateX: pan.x }, { rotate: pan.x.interpolate({ inputRange: [-150, 150], outputRange: ['-15deg', '15deg'] }) }],
        width: 160, height: 160, borderRadius: 24, backgroundColor: `${game.accent}22`,
        borderWidth: 2, borderColor: `${game.accent}60`, alignItems: 'center', justifyContent: 'center',
      }}>
        <Text style={{ fontSize: 72 }}>{currentCard?.emoji}</Text>
      </Animated.View>
      <Text style={{ marginTop: 12, fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: fontFamily.semibold }}>
        Свайп влево или вправо
      </Text>
    </GameShell>
  );
}
