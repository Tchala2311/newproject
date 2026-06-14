import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Game } from '../data/games';
import { colors, fontFamily } from '../theme';
import { GameShell } from './GameShell';
import { LevelComplete, shouldShowAdAfter } from './LevelComplete';

// Larger pools per level so words don't recycle within a single round.
// All entries are 3-7 letter Russian nouns/adjectives in dictionary form.
const WORD_POOLS: string[][] = [
  // L1 — short (3-4 letters)
  ['ЛУП', 'СОН', 'ИГРА', 'РИТМ', 'СВЕТ', 'ЛЕД', 'ДОМ', 'СОК', 'КОТ', 'НЕБО',
   'ДУШ', 'ЛУГ', 'РОЗА', 'СЕТЬ', 'ВЕС', 'СЫР', 'НИТЬ', 'ЛИСТ', 'ВОДА', 'ЛЕС'],
  // L2 — 4-5 letters, casual
  ['ВАЙБ', 'ЛОФИ', 'ЗВУК', 'ЧИЛЛ', 'НЕОН', 'ЛЕНТА', 'ТРАВА', 'ВЕТКА',
   'ВОЛНА', 'СТЕНА', 'СЛОВО', 'СТРАХ', 'РУЧКА', 'ЛАМПА', 'КНИГА', 'СУМКА',
   'РЕЧКА', 'ОЗЕРО', 'ВЕСНА', 'ОСЕНЬ'],
  // L3 — 5 letters, harder vocab
  ['ВЗРЫВ', 'СВЕТА', 'ВРЕМЯ', 'ВОЛНА', 'СНЕГА', 'ПЛАМЯ', 'ВЕТЕР', 'ШТОРМ',
   'ВИХРЬ', 'ДОЖДЬ', 'ЗАКАТ', 'ЗАМОК', 'СВЕЧА', 'МЕЧТЫ', 'ТУЧКА', 'ГОРОД',
   'УЛИЦА', 'ВАГОН', 'ПОЕЗД', 'ВИШНЯ'],
  // L4 — 6 letters
  ['ОБЛАКО', 'ПАМЯТЬ', 'СОЛНЦЕ', 'ЛУЖИЦА', 'РУЧЕЁК', 'СНЕЖОК', 'МОРОЗЫ',
   'БЕРЁЗА', 'РАДУГИ', 'ВЕЧЕРА', 'НОЧНОЙ', 'ПЕСНЕЙ', 'СЕМЬЯМ', 'ТАЙНИК',
   'СЕРДЦЕ', 'ВЗГЛЯД'],
  // L5+ — 7-8 letters, hardest
  ['ЭНЕРГИЯ', 'ЗЕРКАЛО', 'ГРАНИЦА', 'СТАНЦИЯ', 'СВОБОДА', 'РЕАЛЬНО',
   'ОТЛИЧНО', 'СЕКРЕТЫ', 'ПРЕЛЕСТЬ', 'ЛАВАНДА', 'ИСТОРИЯ', 'ПОЛЕВЫЕ',
   'КРАСИВО'],
].map((arr) => arr.filter((w) => /^[А-ЯЁ]{3,8}$/.test(w)));

const LEVEL_CFG = (level: number) => {
  const idx = Math.min(level - 1, WORD_POOLS.length - 1);
  return {
    time: Math.max(12, 27 - level * 2),
    target: 200 + level * 120,
    words: WORD_POOLS[idx],
  };
};

function scramble(w: string): (string | null)[] {
  return [...w].sort(() => Math.random() - 0.5);
}

type Props = { game: Game; onBack: () => void; onComplete: (won: boolean, score: number, meta?: Record<string, number>) => void; initialLevel?: number };
type Picked = { letter: string; idx: number };

export function WordBlast({ game, onBack, onComplete, initialLevel }: Props) {
  const [level, setLevel] = useState(initialLevel ?? 1);
  const cfg = LEVEL_CFG(level);
  const [phase, setPhase] = useState<'playing' | 'complete'>('playing');
  const [wi, setWi] = useState(0);
  const [score, setScore] = useState(0);
  const [timer, setTimer] = useState(cfg.time);
  const [input, setInput] = useState<Picked[]>([]);
  const [letters, setLetters] = useState<(string | null)[]>(() => scramble(cfg.words[0]));
  const [lastPassed, setLastPassed] = useState(false);
  const [lastScore, setLastScore] = useState(0);
  const shake = useRef(new Animated.Value(0)).current;
  const completedRef = useRef(false);
  const wrongTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const word = cfg.words[wi % cfg.words.length];

  useEffect(() => {
    setLetters(scramble(word));
    setInput([]);
  }, [wi, word]);

  useEffect(() => {
    if (phase !== 'playing') return undefined;
    if (timer <= 0) {
      if (completedRef.current) return undefined;
      completedRef.current = true;
      const passed = score >= cfg.target;
      setLastPassed(passed);
      setLastScore(score);
      setPhase('complete');
      onComplete(passed, score, { level });
      return undefined;
    }
    const t = setTimeout(() => setTimer((p) => p - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, timer, score, cfg.target, onComplete]);

  // Cancel the pending "wrong word" reshuffle if we unmount mid-animation.
  useEffect(() => () => { if (wrongTimeoutRef.current) clearTimeout(wrongTimeoutRef.current); }, []);

  const reset = () => {
    completedRef.current = false;
    setWi(0);
    setScore(0);
    setTimer(cfg.time);
    setInput([]);
    setLetters(scramble(cfg.words[0]));
    setPhase('playing');
  };

  const startNextLevel = () => {
    const nl = level + 1;
    const nc = LEVEL_CFG(nl);
    completedRef.current = false;
    setLevel(nl);
    setWi(0);
    setScore(0);
    setTimer(nc.time);
    setInput([]);
    setLetters(scramble(nc.words[0]));
    setPhase('playing');
  };

  const triggerShake = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    Animated.sequence([
      Animated.timing(shake, { toValue: 1, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -1, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 1, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const tap = (i: number) => {
    if (letters[i] === null) return;
    Haptics.selectionAsync().catch(() => {});
    const ni = [...input, { letter: letters[i] as string, idx: i }];
    const nl = letters.map((l, idx) => (idx === i ? null : l));
    setInput(ni);
    setLetters(nl);
    const typed = ni.map((x) => x.letter).join('');
    if (typed === word) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setScore((s) => s + 100 + timer * 5);
      setWi((w) => w + 1);
      setTimer(cfg.time);
    } else if (typed.length === word.length) {
      triggerShake();
      wrongTimeoutRef.current = setTimeout(() => {
        setInput([]);
        setLetters(scramble(word));
      }, 300);
    }
  };

  const clear = () => {
    setInput([]);
    setLetters(scramble(word));
  };

  if (phase === 'complete') {
    return (
      <LevelComplete
        level={level}
        passed={lastPassed}
        score={lastScore}
        scoreLabel="Очки"
        accent={game.accent}
        showAd={lastPassed && shouldShowAdAfter(level)}
        onContinue={startNextLevel}
        onRetry={reset}
        onBack={onBack}
      />
    );
  }

  const slotW = Math.min(38, 220 / word.length);
  const shakeX = shake.interpolate({ inputRange: [-1, 1], outputRange: [-6, 6] });

  return (
    <GameShell game={game} onBack={onBack} score={`${score}/${cfg.target}`} label={`Ур. ${level}`} timer={timer} timerMax={cfg.time}>
      <Text style={{ fontSize: 11, color: colors.textDim, fontFamily: fontFamily.semibold, letterSpacing: 0.6 }}>
        СЛОВО #{wi + 1}
      </Text>

      <View style={{ flexDirection: 'row', gap: 6 }}>
        {word.split('').map((_, i) => (
          <View
            key={i}
            style={{
              width: slotW,
              height: 48,
              borderRadius: 8,
              backgroundColor: input[i] ? colors.glassBgStrong : colors.glassBg,
              borderWidth: 1,
              borderColor: input[i] ? colors.glassBorderStrong : colors.glassBorder,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 20, fontFamily: fontFamily.bold, color: colors.text }}>
              {input[i]?.letter ?? ''}
            </Text>
          </View>
        ))}
      </View>

      <Animated.View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 8,
          justifyContent: 'center',
          transform: [{ translateX: shakeX }],
        }}
      >
        {letters.map((l, i) =>
          l !== null ? (
            <Pressable
              key={i}
              onPress={() => tap(i)}
              style={{
                width: 48,
                height: 56,
                borderRadius: 10,
                backgroundColor: colors.glassBg,
                borderWidth: 1,
                borderColor: colors.glassBorder,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 22, fontFamily: fontFamily.bold, color: colors.text }}>{l}</Text>
            </Pressable>
          ) : (
            <View key={i} style={{ width: 48, height: 56 }} />
          )
        )}
      </Animated.View>

      {input.length > 0 ? (
        <Pressable onPress={clear}>
          <Text style={{ fontSize: 12, color: colors.textDim, fontFamily: fontFamily.semibold }}>Очистить ↺</Text>
        </Pressable>
      ) : null}
    </GameShell>
  );
}
