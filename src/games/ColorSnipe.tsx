import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Game } from '../data/games';
import { GameShell } from './GameShell';
import { LevelComplete, shouldShowAdAfter } from './LevelComplete';
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

// Per-level: round time, lie probability (word color != ink), target score.
const LEVEL_CFG = (level: number) => {
  if (level === 1) return { time: 30, lieProb: 0.4, target: 12 };
  if (level === 2) return { time: 25, lieProb: 0.6, target: 18 };
  if (level === 3) return { time: 20, lieProb: 0.8, target: 24 };
  if (level === 4) return { time: 18, lieProb: 0.9, target: 30 };
  return { time: 15, lieProb: 1.0, target: 36 };
};

function pickRound(lieProb: number) {
  const word = COLORS[Math.floor(Math.random() * COLORS.length)];
  const inkSource = Math.random() < lieProb
    ? COLORS.filter((c) => c.name !== word.name)[Math.floor(Math.random() * (COLORS.length - 1))]
    : word;
  const wrongs = COLORS.filter((c) => c.name !== word.name);
  const shuffled = [...wrongs].sort(() => Math.random() - 0.5).slice(0, 3);
  const swatches = [...shuffled, word].sort(() => Math.random() - 0.5);
  return { wordText: word.name, inkColor: inkSource.hex, correct: word.name, swatches };
}

export function ColorSnipe({ game, onBack, onComplete }: Props) {
  const [level, setLevel] = useState(1);
  const cfg = LEVEL_CFG(level);
  const [phase, setPhase] = useState<'playing' | 'complete'>('playing');
  const [round, setRound] = useState(() => pickRound(cfg.lieProb));
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [time, setTime] = useState(cfg.time);
  const [lastPassed, setLastPassed] = useState(false);
  const [lastScore, setLastScore] = useState(0);

  useEffect(() => {
    if (phase !== 'playing') return;
    if (time <= 0) {
      const passed = score >= cfg.target;
      setLastPassed(passed);
      setLastScore(score);
      setPhase('complete');
      onComplete(passed, score);
      return;
    }
    const t = setTimeout(() => setTime((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [time, phase, score, cfg.target, onComplete]);

  const tap = (name: string) => {
    if (phase !== 'playing') return;
    if (name === round.correct) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      setScore((s) => s + 1 + Math.floor(combo / 3));
      setCombo((c) => c + 1);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      setCombo(0);
      setScore((s) => Math.max(0, s - 1));
    }
    setRound(pickRound(cfg.lieProb));
  };

  const reset = () => {
    setRound(pickRound(cfg.lieProb));
    setScore(0);
    setCombo(0);
    setTime(cfg.time);
    setPhase('playing');
  };

  const startNextLevel = () => {
    const nextLevel = level + 1;
    const nextCfg = LEVEL_CFG(nextLevel);
    setLevel(nextLevel);
    setRound(pickRound(nextCfg.lieProb));
    setScore(0);
    setCombo(0);
    setTime(nextCfg.time);
    setPhase('playing');
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

  return (
    <GameShell game={game} onBack={onBack} score={`${score}/${cfg.target}`} label={`Ур. ${level}`} timer={time} timerMax={cfg.time}>
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
