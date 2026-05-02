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

type State = 'idle' | 'waiting' | 'go' | 'tooEarly' | 'done';

export function Reflex333({ game, onBack, onComplete }: Props) {
  const [state, setState] = useState<State>('idle');
  const [ms, setMs] = useState<number | null>(null);
  const [best, setBest] = useState<number | null>(null);
  const [round, setRound] = useState(0);
  const [scores, setScores] = useState<number[]>([]);
  const goAtRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    if (state === 'waiting') {
      if (timerRef.current) clearTimeout(timerRef.current);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      setState('tooEarly');
      return;
    }
    if (state === 'go') {
      const t = Date.now() - goAtRef.current;
      setMs(t);
      const next = round + 1;
      const newScores = [...scores, t];
      setScores(newScores);
      if (!best || t < best) setBest(t);
      if (next >= 3) {
        const avg = Math.round(newScores.reduce((a, b) => a + b, 0) / newScores.length);
        const won = avg < 350;
        onComplete(won, Math.max(0, 1000 - avg));
        setState('done');
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
    setBest(null);
    setMs(null);
    setState('idle');
  };

  const bg =
    state === 'go' ? '#22C55E' :
    state === 'waiting' ? '#B91C1C' :
    state === 'tooEarly' ? '#7E22CE' :
    'rgba(0,0,0,0.25)';

  const headline =
    state === 'idle' ? 'Тапни чтобы начать' :
    state === 'waiting' ? 'Жди зелёного…' :
    state === 'go' ? 'ТАПАЙ!' :
    state === 'tooEarly' ? 'Слишком рано! Ещё раз.' :
    'Готово';

  const sub =
    state === 'idle' ? `Раунд ${round + 1} / 3` :
    state === 'waiting' ? 'Не дёргайся' :
    state === 'tooEarly' ? 'Тапни чтобы попробовать снова' :
    state === 'go' ? '' :
    'Средний результат';

  return (
    <GameShell
      game={game}
      onBack={onBack}
      score={best ? `${best}мс` : '—'}
      label="Лучшее"
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
        {state !== 'done' ? (
          <>
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
              <View style={{ flexDirection: 'row', gap: 14, marginTop: 18 }}>
                {scores.map((s, i) => (
                  <Text key={i} style={{ fontSize: 14, fontFamily: fontFamily.bold, color: '#fff', fontVariant: ['tabular-nums'] }}>
                    {s}мс
                  </Text>
                ))}
              </View>
            ) : null}
          </>
        ) : (
          <GameResult
            won={Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) < 350}
            score={Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)}
            accent={game.accent}
            onRestart={reset}
            onBack={onBack}
          />
        )}
      </Pressable>
    </GameShell>
  );
}
