import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Game } from '../data/games';
import { GameShell } from './GameShell';
import { LevelComplete, shouldShowAdAfter } from './LevelComplete';
import { colors, fontFamily } from '../theme';

type Props = {
  game: Game;
  onBack: () => void;
  onComplete: (won: boolean, score: number, meta?: Record<string, number>) => void;
  initialLevel?: number;
};

// Compact Russian 5-letter pool. Real prod would load from a real dictionary.
const POOL = [
  'СВЕТА', 'ВЕТЕР', 'ВОЛНА', 'СТЕНА', 'ЗВЕЗД', 'ВРЕМЯ',
  'ЛУНА', 'СОЛНЦ', 'ТРАВА', 'РОДИН', 'СВЕЖА', 'СТРАХ',
  'РАДОС', 'СЛОВО', 'СМЕХА', 'СНЕГА', 'ВЕТКА', 'ПЛАМЯ',
  'ОБЛАК', 'ВОДОИ', 'ДОЖДЬ', 'ВОЗДХ', 'ЯЗЫКИ', 'ЖИЗНЬ',
];

const LEVEL_CFG = (level: number) => {
  if (level === 1) return { tries: 7, words: 1 };  // 1 word, 7 guesses (very forgiving)
  if (level === 2) return { tries: 6, words: 1 };  // classic
  if (level === 3) return { tries: 6, words: 2 };  // 2 words to win
  if (level === 4) return { tries: 5, words: 2 };
  return { tries: 4, words: 3 };
};

const KEYBOARD = ['ЙЦУКЕНГШЩЗХЪ', 'ФЫВАПРОЛДЖЭ', 'ЯЧСМИТЬБЮ'];

type Cell = { ch: string; state: 'empty' | 'absent' | 'present' | 'correct' };

function pickWord(): string {
  return POOL[Math.floor(Math.random() * POOL.length)];
}

function judgeRow(guess: string, target: string): Cell[] {
  const out: Cell[] = guess.split('').map((ch) => ({ ch, state: 'absent' }));
  const remain: Record<string, number> = {};
  target.split('').forEach((ch, i) => {
    if (guess[i] === ch) out[i].state = 'correct';
    else remain[ch] = (remain[ch] ?? 0) + 1;
  });
  out.forEach((c, i) => {
    if (c.state === 'correct') return;
    if ((remain[c.ch] ?? 0) > 0) {
      c.state = 'present';
      remain[c.ch] -= 1;
    }
  });
  return out;
}

export function Wordle5({ game, onBack, onComplete, initialLevel }: Props) {
  const [level, setLevel] = useState(initialLevel ?? 1);
  const cfg = LEVEL_CFG(level);
  const [target, setTarget] = useState(() => pickWord());
  const [solvedCount, setSolvedCount] = useState(0);
  const [rows, setRows] = useState<Cell[][]>([]);
  const [current, setCurrent] = useState('');
  const [phase, setPhase] = useState<'playing' | 'complete'>('playing');
  const [lastPassed, setLastPassed] = useState(false);
  const [lastScore, setLastScore] = useState(0);

  const press = (ch: string) => {
    if (phase !== 'playing' || current.length >= 5) return;
    setCurrent((c) => c + ch);
    Haptics.selectionAsync().catch(() => {});
  };

  const back = () => {
    if (phase !== 'playing') return;
    setCurrent((c) => c.slice(0, -1));
  };

  const submit = () => {
    if (phase !== 'playing' || current.length !== 5) return;
    const judged = judgeRow(current, target);
    const newRows = [...rows, judged];
    setRows(newRows);
    setCurrent('');
    if (current === target) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      const newSolved = solvedCount + 1;
      if (newSolved >= cfg.words) {
        const score = (cfg.tries - newRows.length + 1) * 50 * level;
        setLastPassed(true);
        setLastScore(score);
        setPhase('complete');
        onComplete(true, score, { level, attempts: newRows.length });
      } else {
        setSolvedCount(newSolved);
        setTarget(pickWord());
        setRows([]);
      }
      return;
    }
    if (newRows.length >= cfg.tries) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      setLastPassed(false);
      setLastScore(solvedCount * 50 * level);
      setPhase('complete');
      onComplete(false, solvedCount * 50 * level, { level });
    }
  };

  const reset = () => {
    setTarget(pickWord());
    setSolvedCount(0);
    setRows([]);
    setCurrent('');
    setPhase('playing');
  };

  const startNextLevel = () => {
    setLevel((l) => l + 1);
    setTarget(pickWord());
    setSolvedCount(0);
    setRows([]);
    setCurrent('');
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

  // Build full grid: solved rows + current input + empty rows
  const display: Cell[][] = [];
  rows.forEach((r) => display.push(r));
  if (display.length < cfg.tries) {
    const cur: Cell[] = [];
    for (let i = 0; i < 5; i += 1) cur.push({ ch: current[i] ?? '', state: 'empty' });
    display.push(cur);
    while (display.length < cfg.tries) display.push([{ ch: '', state: 'empty' }, { ch: '', state: 'empty' }, { ch: '', state: 'empty' }, { ch: '', state: 'empty' }, { ch: '', state: 'empty' }]);
  }

  // Letter usage hints for keyboard
  const letterHint: Record<string, Cell['state']> = {};
  rows.flat().forEach((c) => {
    const prev = letterHint[c.ch];
    if (c.state === 'correct') letterHint[c.ch] = 'correct';
    else if (c.state === 'present' && prev !== 'correct') letterHint[c.ch] = 'present';
    else if (!prev) letterHint[c.ch] = c.state;
  });

  const colorFor = (s: Cell['state']) =>
    s === 'correct' ? '#22C55E' :
    s === 'present' ? '#FACC15' :
    s === 'absent' ? '#3F3F46' : 'rgba(255,255,255,0.06)';

  return (
    <GameShell game={game} onBack={onBack} score={`${solvedCount + 1}/${cfg.words}`} label={`Ур. ${level} · ${cfg.tries} попыток`}>
      <Text style={{ fontSize: 11, fontFamily: fontFamily.semibold, color: colors.textMuted, textAlign: 'center' }}>
        Угадай слово из 5 букв. Зелёный — на месте. Жёлтый — есть, но не там.
      </Text>
      <View style={{ gap: 4 }}>
        {display.map((r, ri) => (
          <View key={ri} style={{ flexDirection: 'row', gap: 4 }}>
            {r.map((c, ci) => (
              <View
                key={ci}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 4,
                  backgroundColor: colorFor(c.state),
                  borderWidth: c.state === 'empty' ? 1 : 0,
                  borderColor: 'rgba(255,255,255,0.15)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 20, fontFamily: fontFamily.bold, color: '#fff' }}>{c.ch}</Text>
              </View>
            ))}
          </View>
        ))}
      </View>
      <View style={{ width: '100%', gap: 4, marginTop: 4 }}>
        {KEYBOARD.map((row, ri) => (
          <View key={ri} style={{ flexDirection: 'row', justifyContent: 'center', gap: 3 }}>
            {ri === 2 ? (
              <Pressable onPress={submit} style={{ paddingHorizontal: 8, paddingVertical: 12, borderRadius: 6, backgroundColor: 'rgba(34,197,94,0.6)', justifyContent: 'center' }}>
                <Text style={{ fontSize: 11, fontFamily: fontFamily.bold, color: '#fff' }}>ВВОД</Text>
              </Pressable>
            ) : null}
            {row.split('').map((ch) => {
              const hint = letterHint[ch];
              return (
                <Pressable
                  key={ch}
                  onPress={() => press(ch)}
                  style={{
                    paddingHorizontal: 5,
                    paddingVertical: 12,
                    borderRadius: 6,
                    backgroundColor: hint ? colorFor(hint) : 'rgba(255,255,255,0.08)',
                    minWidth: 24,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ fontSize: 13, fontFamily: fontFamily.bold, color: '#fff' }}>{ch}</Text>
                </Pressable>
              );
            })}
            {ri === 2 ? (
              <Pressable onPress={back} style={{ paddingHorizontal: 8, paddingVertical: 12, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center' }}>
                <Text style={{ fontSize: 13, fontFamily: fontFamily.bold, color: '#fff' }}>⌫</Text>
              </Pressable>
            ) : null}
          </View>
        ))}
      </View>
    </GameShell>
  );
}
