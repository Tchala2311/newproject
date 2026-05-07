import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Game } from '../data/games';
import { colors, fontFamily } from '../theme';
import { GameShell } from './GameShell';
import { GameResult } from './GameResult';

const WORDS = ['ВАЙБ', 'ЛОФИ', 'ИГРА', 'ЛЕНТА', 'ЛУП', 'НЕОН', 'ВЗРЫВ', 'ЗВУК', 'ЧИЛЛ', 'СВЕТ', 'РИТМ', 'СОН'];

function scramble(w: string): (string | null)[] {
  return [...w].sort(() => Math.random() - 0.5);
}

type Props = { game: Game; onBack: () => void; onComplete: (won: boolean, score: number) => void };

type Picked = { letter: string; idx: number };

export function WordBlast({ game, onBack, onComplete }: Props) {
  const [wi, setWi] = useState(0);
  const [score, setScore] = useState(0);
  const [timer, setTimer] = useState(20);
  const [done, setDone] = useState(false);
  const [input, setInput] = useState<Picked[]>([]);
  const [letters, setLetters] = useState<(string | null)[]>(() => scramble(WORDS[0]));
  const shake = useRef(new Animated.Value(0)).current;

  const word = WORDS[wi % WORDS.length];

  useEffect(() => {
    setLetters(scramble(word));
    setInput([]);
  }, [wi, word]);

  useEffect(() => {
    if (done) return undefined;
    const t = setInterval(() => {
      setTimer((p) => {
        if (p <= 1) {
          setDone(true);
          return 0;
        }
        return p - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [done, wi]);

  const firedRef = useRef(false);
  useEffect(() => {
    if (done && !firedRef.current) {
      firedRef.current = true;
      onComplete(score >= 150, score);
    }
  }, [done, score, onComplete]);

  const reset = () => {
    setWi(0);
    setScore(0);
    setTimer(20);
    setDone(false);
    setInput([]);
    firedRef.current = false;
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
      setTimer(20);
    } else if (typed.length === word.length) {
      triggerShake();
      setTimeout(() => {
        setInput([]);
        setLetters(scramble(word));
      }, 300);
    }
  };

  const clear = () => {
    setInput([]);
    setLetters(scramble(word));
  };

  const slotW = Math.min(38, 220 / word.length);
  const shakeX = shake.interpolate({ inputRange: [-1, 1], outputRange: [-6, 6] });

  return (
    <GameShell game={game} onBack={onBack} score={score} label="Очки" timer={timer} timerMax={20}>
      {done ? (
        <GameResult won={score >= 150} score={score} accent={game.accent} onRestart={reset} onBack={onBack} game={game} />
      ) : (
        <>
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
        </>
      )}
    </GameShell>
  );
}
