import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Game } from '../data/games';
import { GameShell } from './GameShell';
import { LevelComplete, shouldShowAdAfter } from './LevelComplete';
import { fontFamily } from '../theme';

type Props = { game: Game; onBack: () => void; onComplete: (won: boolean, score: number, meta?: Record<string, number>) => void; initialLevel?: number };

const COLORS = ['#EF4444', '#22C55E', '#3B82F6', '#EAB308'];
const LABELS = ['🔴', '🟢', '🔵', '🟡'];

type Phase = 'showing' | 'input' | 'complete';

export function SimonSays({ game, onBack, onComplete, initialLevel }: Props) {
  const { width, height } = useWindowDimensions();
  const gridSize = Math.min(width - 32, height * 0.54);
  const btnSize = Math.floor((gridSize - 12) / 2);
  const [level, setLevel] = useState(initialLevel ?? 1);
  // sequence length = level + 2 (starts at 3)
  const [sequence, setSequence] = useState<number[]>([]);
  const [lit, setLit] = useState<number | null>(null);
  const [userSeq, setUserSeq] = useState<number[]>([]);
  const [phase, setPhase] = useState<Phase>('showing');
  const [passed, setPassed] = useState(false);
  const [lastScore, setLastScore] = useState(0);
  const [status, setStatus] = useState('Запоминай…');

  // Every showSequence run gets a generation id; pending timeouts check it and
  // abort if a newer run (retry / level change / unmount) has started. Without
  // this, an old timeout chain keeps firing setLit/setPhase and corrupts the
  // next round's state.
  const showGenRef = useRef(0);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const completedRef = useRef(false);

  const clearShowTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  const buildSequence = useCallback((lv: number) => {
    const len = lv + 2;
    return Array.from({ length: len }, () => Math.floor(Math.random() * 4));
  }, []);

  const showSequence = useCallback((seq: number[]) => {
    clearShowTimers();
    completedRef.current = false;
    const gen = ++showGenRef.current;
    const push = (fn: () => void, ms: number) => {
      timersRef.current.push(setTimeout(() => { if (gen === showGenRef.current) fn(); }, ms));
    };
    setStatus('Запоминай…');
    setPhase('showing');
    setUserSeq([]);
    let i = 0;
    const tick = () => {
      if (gen !== showGenRef.current) return;
      if (i >= seq.length) { setLit(null); push(() => { setPhase('input'); setStatus('Повтори!'); }, 400); return; }
      setLit(null);
      push(() => { setLit(seq[i]); Haptics.selectionAsync().catch(() => {}); i++; push(tick, 600); }, 200);
    };
    push(tick, 500);
  }, [clearShowTimers]);

  useEffect(() => {
    const seq = buildSequence(level);
    setSequence(seq);
    showSequence(seq);
  }, [level]);

  // Stop any pending light-up timers when the component unmounts.
  useEffect(() => clearShowTimers, [clearShowTimers]);

  const tap = (idx: number) => {
    if (phase !== 'input' || completedRef.current) return;
    Haptics.selectionAsync().catch(() => {});
    setLit(idx);
    setTimeout(() => setLit(null), 150);
    const next = [...userSeq, idx];
    const pos = next.length - 1;
    if (next[pos] !== sequence[pos]) {
      completedRef.current = true;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      setStatus('Ошибка! 😬');
      const score = Math.max(0, (level - 1)) * 100;
      setLastScore(score);
      setPassed(false);
      setPhase('complete');
      onComplete(false, score, { level });
      return;
    }
    setUserSeq(next);
    if (next.length === sequence.length) {
      completedRef.current = true;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setStatus('Отлично! 🎉');
      const score = level * 200;
      setLastScore(score);
      setPassed(true);
      setPhase('complete');
      onComplete(true, score, { level });
    }
  };

  if (phase === 'complete') {
    return <LevelComplete level={level} passed={passed} score={lastScore} scoreLabel="Очки" accent={game.accent}
      showAd={passed && shouldShowAdAfter(level)}
      onContinue={() => { setLevel((l) => l + 1); }}
      onRetry={() => { const seq = buildSequence(level); setSequence(seq); showSequence(seq); }}
      onBack={onBack} />;
  }

  return (
    <GameShell game={game} onBack={onBack} score={`Ур. ${level}`} label={`длина: ${sequence.length}`}>
      <Text style={{ fontSize: 13, fontFamily: fontFamily.semibold, color: 'rgba(255,255,255,0.6)', marginBottom: 24 }}>{status}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', width: gridSize, gap: 12, justifyContent: 'center' }}>
        {COLORS.map((color, i) => (
          <Pressable key={i} onPress={() => tap(i)}
            style={{
              width: btnSize, height: btnSize, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
              backgroundColor: lit === i ? color : `${color}30`,
              borderWidth: 2, borderColor: lit === i ? color : `${color}60`,
              transform: [{ scale: lit === i ? 1.08 : 1 }],
            }}>
            <Text style={{ fontSize: btnSize * 0.4 }}>{LABELS[i]}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={{ marginTop: 20, fontSize: 12, fontFamily: fontFamily.semibold, color: 'rgba(255,255,255,0.4)' }}>
        {phase === 'input' ? `${userSeq.length} / ${sequence.length}` : ''}
      </Text>
    </GameShell>
  );
}
