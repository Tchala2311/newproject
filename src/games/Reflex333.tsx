import React, { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Game } from '../data/games';
import { GameShell } from './GameShell';
import { LevelComplete, shouldShowAdAfter } from './LevelComplete';
import { fontFamily, radius } from '../theme';

type Props = {
  game: Game;
  onBack: () => void;
  onComplete: (won: boolean, score: number, meta?: Record<string, number>) => void;
  initialLevel?: number;
};

type State = 'idle' | 'waiting' | 'go' | 'tooEarly';

// Level config: rounds and target avg ms.
const LEVEL_CFG = (level: number) => ({
  rounds: Math.min(8, 2 + level),
  targetMs: Math.max(180, 400 - level * 25),
});

export function Reflex333({ game, onBack, onComplete, initialLevel }: Props) {
  const [level, setLevel] = useState(initialLevel ?? 1);
  const [phase, setPhase] = useState<'playing' | 'complete'>('playing');
  const [state, setState] = useState<State>('idle');
  const [ms, setMs] = useState<number | null>(null);
  const [round, setRound] = useState(0);
  const [scores, setScores] = useState<number[]>([]);
  const [lastPassed, setLastPassed] = useState(false);
  const [lastScore, setLastScore] = useState(0);
  const goAtRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cfg = LEVEL_CFG(level);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const start = () => {
    setMs(null);
    setState('waiting');
    const wait = 800 + Math.random() * 2200;
    timerRef.current = setTimeout(() => {
      setState('go');
      goAtRef.current = Date.now();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    }, wait);
  };

  const tap = () => {
    if (state === 'tooEarly') { setState('idle'); return; }
    if (state === 'waiting') {
      if (timerRef.current) clearTimeout(timerRef.current);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      setState('tooEarly');
      return;
    }
    if (state === 'go') {
      const t = Date.now() - goAtRef.current;
      setMs(t);
      const newScores = [...scores, t];
      setScores(newScores);
      const next = round + 1;
      if (next >= cfg.rounds) {
        const avg = Math.round(newScores.reduce((a, b) => a + b, 0) / newScores.length);
        const passed = avg <= cfg.targetMs;
        const score = Math.max(0, (cfg.targetMs * 2 - avg) * level);
        setLastPassed(passed);
        setLastScore(score);
        setPhase('complete');
        onComplete(passed, score, { level, ms: avg });
      } else {
        setRound(next);
        setState('idle');
      }
      return;
    }
    if (state === 'idle') start();
  };

  const reset = () => {
    setRound(0);
    setScores([]);
    setMs(null);
    setState('idle');
    setPhase('playing');
  };

  const startNextLevel = () => {
    setLevel((l) => l + 1);
    reset();
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

  const bg =
    state === 'go' ? '#22C55E' :
    state === 'waiting' ? '#B91C1C' :
    state === 'tooEarly' ? '#7E22CE' :
    'rgba(0,0,0,0.25)';

  const headline =
    state === 'idle' ? 'Тапни чтобы начать' :
    state === 'waiting' ? 'Жди зелёного…' :
    state === 'go' ? 'ТАПАЙ!' :
    'Слишком рано! Ещё раз.';

  const sub =
    state === 'idle' ? `Раунд ${round + 1} / ${cfg.rounds} · цель ≤ ${cfg.targetMs}мс` :
    state === 'waiting' ? 'Не дёргайся' :
    state === 'tooEarly' ? 'Тапни, чтобы попробовать снова' :
    '';

  return (
    <GameShell
      game={game}
      onBack={onBack}
      score={`Ур. ${level}`}
      label={`цель ≤${cfg.targetMs}мс`}
    >
      <Pressable
        onPress={tap}
        style={{
          flex: 1,
          width: '100%',
          borderRadius: radius.xl,
          backgroundColor: bg,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
      >
        <Text style={{ fontSize: 28, fontFamily: fontFamily.bold, color: '#fff', textAlign: 'center' }}>
          {headline}
        </Text>
        {sub ? (
          <Text style={{ fontSize: 14, fontFamily: fontFamily.medium, color: 'rgba(255,255,255,0.85)', marginTop: 8, textAlign: 'center' }}>
            {sub}
          </Text>
        ) : null}
        {ms !== null && state === 'idle' ? (
          <Text style={{ fontSize: 56, fontFamily: fontFamily.bold, color: '#fff', marginTop: 12, fontVariant: ['tabular-nums'] }}>
            {ms}мс
          </Text>
        ) : null}
        {scores.length > 0 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 18, justifyContent: 'center' }}>
            {scores.map((s, i) => (
              <Text key={i} style={{ fontSize: 14, fontFamily: fontFamily.bold, color: '#fff', fontVariant: ['tabular-nums'] }}>
                {s}мс
              </Text>
            ))}
          </View>
        ) : null}
      </Pressable>
    </GameShell>
  );
}
