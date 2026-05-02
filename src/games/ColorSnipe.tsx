import React, { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Game } from '../data/games';
import { GameShell } from './GameShell';
import { GameResult } from './GameResult';
import { colors, fontFamily, radius } from '../theme';

type Props = {
  game: Game;
  onBack: () => void;
  onComplete: (won: boolean, score: number) => void;
};

const COLORS = [
  { name: 'красный', hex: '#FF4D4D' },
  { name: 'синий', hex: '#3B82F6' },
  { name: 'зелёный', hex: '#22C55E' },
  { name: 'жёлтый', hex: '#FACC15' },
  { name: 'фиолетовый', hex: '#A855F7' },
];

const ROUND_TIME = 30;

function pickRound() {
  // Word and ink color sometimes match (low difficulty), sometimes lie (Stroop)
  const word = COLORS[Math.floor(Math.random() * COLORS.length)];
  const inkColor = Math.random() < 0.3 ? word : COLORS[Math.floor(Math.random() * COLORS.length)];
  // Always 4 swatches, one of which is the WORD's name
  const correct = word;
  const wrongs = COLORS.filter((c) => c.name !== correct.name);
  const shuffled = [...wrongs].sort(() => Math.random() - 0.5).slice(0, 3);
  const swatches = [...shuffled, correct].sort(() => Math.random() - 0.5);
  return { wordText: word.name, inkColor: inkColor.hex, correct: correct.name, swatches };
}

export function ColorSnipe({ game, onBack, onComplete }: Props) {
  const [round, setRound] = useState(() => pickRound());
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [time, setTime] = useState(ROUND_TIME);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (done) return;
    if (time <= 0) {
      setDone(true);
      onComplete(score >= 15, score);
      return;
    }
    const t = setTimeout(() => setTime((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [time, done, score, onComplete]);

  const tap = (name: string) => {
    if (done) return;
    if (name === round.correct) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      setScore((s) => s + 1 + Math.floor(combo / 3));
      setCombo((c) => c + 1);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      setCombo(0);
      setScore((s) => Math.max(0, s - 1));
    }
    setRound(pickRound());
  };

  const reset = () => {
    setScore(0);
    setCombo(0);
    setTime(ROUND_TIME);
    setDone(false);
    setRound(pickRound());
  };

  if (done) {
    return (
      <GameShell game={game} onBack={onBack} score={score} label="Очки">
        <GameResult won={score >= 15} score={score} accent={game.accent} onRestart={reset} onBack={onBack} />
      </GameShell>
    );
  }

  return (
    <GameShell game={game} onBack={onBack} score={score} label="Очки" timer={time} timerMax={ROUND_TIME}>
      <Text style={{ fontSize: 12, fontFamily: fontFamily.semibold, color: colors.textMuted, textAlign: 'center' }}>
        Тапни цвет, который написан словом — игнорируй цвет букв.
      </Text>
      <View
        style={{
          width: '100%',
          paddingVertical: 42,
          borderRadius: radius.xl,
          backgroundColor: 'rgba(0,0,0,0.3)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text
          style={{
            fontSize: 56,
            fontFamily: fontFamily.bold,
            color: round.inkColor,
            letterSpacing: -1,
            textShadowColor: 'rgba(0,0,0,0.45)',
            textShadowOffset: { width: 0, height: 2 },
            textShadowRadius: 8,
          }}
        >
          {round.wordText.toUpperCase()}
        </Text>
        {combo >= 3 ? (
          <Text style={{ fontSize: 14, fontFamily: fontFamily.bold, color: '#FFB454', marginTop: 8 }}>
            🔥 x{combo} комбо!
          </Text>
        ) : null}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, paddingHorizontal: 4 }}>
        {round.swatches.map((c) => (
          <Pressable
            key={c.name}
            onPress={() => tap(c.name)}
            style={{
              flexBasis: '47%',
              height: 56,
              borderRadius: radius.lg,
              backgroundColor: c.hex,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 14, fontFamily: fontFamily.bold, color: '#fff', textShadowColor: 'rgba(0,0,0,0.45)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 }}>
              {c.name}
            </Text>
          </Pressable>
        ))}
      </View>
    </GameShell>
  );
}
