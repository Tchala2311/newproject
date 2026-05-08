import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Game } from '../data/games';
import { GameShell } from './GameShell';
import { LevelComplete, shouldShowAdAfter } from './LevelComplete';
import { colors, fontFamily } from '../theme';

type Props = { game: Game; onBack: () => void; onComplete: (won: boolean, score: number, meta?: Record<string, number>) => void; initialLevel?: number };

const TOTAL_QUESTIONS = 10;
const SECS_PER_Q = (level: number) => Math.max(3, 6 - Math.floor(level / 2));

type Question = { expr: string; answer: number; choices: number[] };

function makeQuestion(level: number): Question {
  const ops = level <= 2 ? ['+', '-'] : level <= 4 ? ['+', '-', '×'] : ['+', '-', '×', '÷'];
  const op = ops[Math.floor(Math.random() * ops.length)];
  let a: number, b: number, answer: number, expr: string;
  if (op === '+') { a = level <= 2 ? rand(1, 10) : rand(5, 20); b = level <= 2 ? rand(1, 10) : rand(5, 20); answer = a + b; expr = `${a} + ${b}`; }
  else if (op === '-') { a = level <= 2 ? rand(5, 15) : rand(10, 30); b = rand(1, a); answer = a - b; expr = `${a} − ${b}`; }
  else if (op === '×') { a = rand(2, level <= 4 ? 9 : 12); b = rand(2, level <= 4 ? 9 : 12); answer = a * b; expr = `${a} × ${b}`; }
  else { b = rand(2, 9); a = b * rand(2, 9); answer = a / b; expr = `${a} ÷ ${b}`; }
  const wrongs = new Set<number>();
  while (wrongs.size < 3) {
    const off = rand(-5, 5) || 1;
    const w = answer + off;
    if (w !== answer && w >= 0) wrongs.add(w);
  }
  const choices = shuffle([answer, ...[...wrongs].slice(0, 3)]);
  return { expr, answer, choices };
}

function rand(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function shuffle<T>(a: T[]): T[] { const r = [...a]; for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; }

export function MathBlitz({ game, onBack, onComplete, initialLevel }: Props) {
  const { width } = useWindowDimensions();
  const btnW = Math.floor((width - 52) / 2);
  const [level, setLevel] = useState(initialLevel ?? 1);
  const [qIdx, setQIdx] = useState(0);
  const [q, setQ] = useState<Question>(() => makeQuestion(initialLevel ?? 1));
  const [correct, setCorrect] = useState(0);
  const [phase, setPhase] = useState<'playing' | 'complete'>('playing');
  const [passed, setPassed] = useState(false);
  const [lastScore, setLastScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(SECS_PER_Q(initialLevel ?? 1));
  const [flash, setFlash] = useState<'right' | 'wrong' | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const correctRef = useRef(0);

  const nextQ = useCallback((wasCorrect: boolean) => {
    if (wasCorrect) { correctRef.current += 1; setCorrect(correctRef.current); }
    const next = qIdx + 1;
    if (next >= TOTAL_QUESTIONS) {
      const p = correctRef.current >= Math.ceil(TOTAL_QUESTIONS * 0.7);
      const score = correctRef.current * 100 * level;
      setLastScore(score);
      setPassed(p);
      setPhase('complete');
      onComplete(p, score, { level, correct: correctRef.current });
      return;
    }
    setQIdx(next);
    setQ(makeQuestion(level));
    setTimeLeft(SECS_PER_Q(level));
    setFlash(null);
  }, [qIdx, level, onComplete]);

  useEffect(() => {
    if (phase !== 'playing') return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { clearInterval(timerRef.current!); setFlash('wrong'); setTimeout(() => nextQ(false), 400); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [q, phase]);

  const answer = (choice: number) => {
    clearInterval(timerRef.current!);
    const ok = choice === q.answer;
    Haptics[ok ? 'notificationAsync' : 'notificationAsync'](ok ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error).catch(() => {});
    setFlash(ok ? 'right' : 'wrong');
    setTimeout(() => nextQ(ok), 350);
  };

  if (phase === 'complete') {
    return <LevelComplete level={level} passed={passed} score={lastScore} scoreLabel="Очки" accent={game.accent}
      showAd={passed && shouldShowAdAfter(level)}
      onContinue={() => { setLevel((l) => l + 1); setQIdx(0); correctRef.current = 0; setCorrect(0); setQ(makeQuestion(level + 1)); setTimeLeft(SECS_PER_Q(level + 1)); setPhase('playing'); }}
      onRetry={() => { setQIdx(0); correctRef.current = 0; setCorrect(0); setQ(makeQuestion(level)); setTimeLeft(SECS_PER_Q(level)); setPhase('playing'); }}
      onBack={onBack} />;
  }

  return (
    <GameShell game={game} onBack={onBack} score={`${qIdx + 1}/${TOTAL_QUESTIONS}`} label={`✓ ${correct}  ⏱ ${timeLeft}с`}>
      <View style={{ alignItems: 'center', width: '100%' }}>
        <View style={{
          width: '100%', paddingVertical: 32, borderRadius: 20, marginBottom: 24, alignItems: 'center',
          backgroundColor: flash === 'right' ? '#16a34a40' : flash === 'wrong' ? '#dc262640' : 'rgba(255,255,255,0.06)',
        }}>
          <Text style={{ fontSize: 36, fontFamily: fontFamily.bold, color: '#fff' }}>{q.expr} = ?</Text>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
          {q.choices.map((c) => (
            <Pressable key={c} onPress={() => answer(c)}
              style={{
                width: btnW, paddingVertical: 20, borderRadius: 14, alignItems: 'center',
                backgroundColor: `${game.accent}18`, borderWidth: 1, borderColor: `${game.accent}50`,
              }}>
              <Text style={{ fontSize: 26, fontFamily: fontFamily.bold, color: game.accent }}>{c}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </GameShell>
  );
}
