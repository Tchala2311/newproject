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

function pickCatPair(): [Category, Category] {
  const shuffled = [...CATEGORIES].sort(() => Math.random() - 0.5);
  return [shuffled[0], shuffled[1]];
}

function buildDeck(left: Category, right: Category): Card[] {
  const both = [left, right];
  const deck: Card[] = [];
  while (deck.length < TOTAL) {
    const cat = both[Math.floor(Math.random() * 2)];
    const item = cat.items[Math.floor(Math.random() * cat.items.length)];
    if (!deck.find((c) => c.emoji === item)) deck.push({ emoji: item, category: cat.label });
  }
  return deck;
}

function newRound(): { leftCat: Category; rightCat: Category; deck: Card[] } {
  const [leftCat, rightCat] = pickCatPair();
  return { leftCat, rightCat, deck: buildDeck(leftCat, rightCat) };
}

export function SpeedSort({ game, onBack, onComplete, initialLevel }: Props) {
  const { width } = useWindowDimensions();
  const [level, setLevel] = useState(initialLevel ?? 1);
  const [round, setRound] = useState(() => newRound());
  const [idx, setIdx] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [phase, setPhase] = useState<'playing' | 'complete'>('playing');
  const [passed, setPassed] = useState(false);
  const [lastScore, setLastScore] = useState(0);
  const pan = useRef(new Animated.ValueXY()).current;
  const correctRef = useRef(0);

  // Keep a ref to the current round so panResponder always reads fresh values.
  const roundRef = useRef(round);
  const idxRef = useRef(0);
  useEffect(() => { roundRef.current = round; }, [round]);
  useEffect(() => { idxRef.current = idx; }, [idx]);

  const nextCard = useCallback((isCorrect: boolean) => {
    if (isCorrect) { correctRef.current += 1; setCorrect(correctRef.current); }
    pan.setValue({ x: 0, y: 0 });
    const next = idxRef.current + 1;
    if (next >= roundRef.current.deck.length) {
      const p = correctRef.current >= Math.ceil(roundRef.current.deck.length * 0.7);
      const score = correctRef.current * 80 * level;
      setLastScore(score);
      setPassed(p);
      setPhase('complete');
      onComplete(p, score, { level, correct: correctRef.current });
      return;
    }
    setIdx(next);
  }, [level, pan, onComplete]);

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderMove: Animated.event([null, { dx: pan.x }], { useNativeDriver: false }),
    onPanResponderRelease: (_, g) => {
      if (Math.abs(g.dx) < 60) {
        Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
        return;
      }
      const swipedLeft = g.dx < 0;
      Animated.timing(pan, { toValue: { x: swipedLeft ? -400 : 400, y: 0 }, duration: 180, useNativeDriver: false }).start(() => {
        const { deck, leftCat, rightCat } = roundRef.current;
        const card = deck[idxRef.current];
        const isCorrect = swipedLeft
          ? card.category === leftCat.label
          : card.category === rightCat.label;
        if (isCorrect) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        }
        nextCard(isCorrect);
      });
    },
  })).current;

  const startNewRound = useCallback((nextLevel: number) => {
    correctRef.current = 0;
    setCorrect(0);
    setIdx(0);
    const r = newRound();
    setRound(r);
    roundRef.current = r;
    idxRef.current = 0;
    setPhase('playing');
  }, []);

  const restart = useCallback(() => {
    startNewRound(level);
  }, [level, startNewRound]);

  const { leftCat, rightCat, deck } = round;
  const currentCard = deck[idx];

  if (phase === 'complete') {
    return <LevelComplete level={level} passed={passed} score={lastScore} scoreLabel="Очки" accent={game.accent}
      showAd={passed && shouldShowAdAfter(level)}
      onContinue={() => { const nl = level + 1; setLevel(nl); startNewRound(nl); }}
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
        width: Math.min(width * 0.55, 220), height: Math.min(width * 0.55, 220), borderRadius: 24, backgroundColor: `${game.accent}22`,
        borderWidth: 2, borderColor: `${game.accent}60`, alignItems: 'center', justifyContent: 'center',
      }}>
        <Text style={{ fontSize: Math.min(width * 0.22, 88) }}>{currentCard?.emoji}</Text>
      </Animated.View>
      <Text style={{ marginTop: 12, fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: fontFamily.semibold }}>
        Свайп влево или вправо
      </Text>
    </GameShell>
  );
}
