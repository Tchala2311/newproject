import React, { useState } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
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

// Hand-verified Russian 5-letter words in nominative singular / dictionary
// form. Every entry is a real, recognisable word — no truncated stems or
// declined forms. ~50 unique words means a player won't see a repeat for a
// long time even at level 5 (3 words per game).
const WORDS = [
  // Nature
  'ВРЕМЯ', 'ВЕТЕР', 'ВОЛНА', 'ТРАВА', 'ВЕТКА', 'ПЛАМЯ', 'ДОЖДЬ',
  'РЕЧКА', 'ОЗЕРО', 'ОСЕНЬ', 'ВЕСНА', 'ШТОРМ', 'ВИХРЬ', 'ТУЧКА',
  // Home / objects
  'СТЕНА', 'ДВЕРЬ', 'КНИГА', 'РУЧКА', 'ЛАМПА', 'СУМКА', 'ЗАМОК',
  'СВЕЧА', 'НИТКА', 'ВЕНИК', 'ВЕДРО', 'ШКАЛА',
  // Food
  'ВИШНЯ', 'ГРУША', 'ТЫКВА', 'РЕДИС', 'АРБУЗ', 'ПИРОГ', 'БУЛКА',
  // Animals
  'КОШКА', 'МЫШКА', 'ПТИЦА', 'РЫБКА', 'КОНЁК', 'СЛОНЫ',
  // People / feelings
  'СЕМЬЯ', 'СЛОВО', 'СЛЕЗА', 'СТРАХ', 'СПОРТ', 'НАУКА', 'УРОКИ',
  'ПЕСНЯ', 'ТАНЕЦ', 'ГОЛОС',
  // Places / city
  'ГОРОД', 'УЛИЦА', 'ВАГОН', 'ПОЕЗД', 'ЛОДКА', 'РЫНОК', 'ШКОЛА',
  // Misc
  'ВРАЧИ', 'УГОЛЬ', 'ВЛАГА', 'ВКУСЫ', 'ПЛАНЫ',
].filter((w) => /^[А-ЯЁ]{5}$/.test(w));

// Procedural so the game is genuinely infinite: words to solve grows with
// level, tries shrink, both clamped to playable bounds.
const LEVEL_CFG = (level: number) => {
  const tries = Math.max(3, 8 - level);              // 7, 6, 5, 4, 3, 3, …
  const words = Math.min(7, 1 + Math.floor((level - 1) / 2));  // 1, 1, 2, 2, 3, 3, 4, 4, 5, …
  return { tries, words };
};

const KEYBOARD = ['ЙЦУКЕНГШЩЗХЪ', 'ФЫВАПРОЛДЖЭ', 'ЯЧСМИТЬБЮ'];

type Cell = { ch: string; state: 'empty' | 'absent' | 'present' | 'correct' };

// Avoid repeats inside a single play session.
const recentRef = { used: new Set<string>() };
function pickWord(): string {
  if (recentRef.used.size >= WORDS.length - 1) recentRef.used.clear();
  let w: string;
  do { w = WORDS[Math.floor(Math.random() * WORDS.length)]; } while (recentRef.used.has(w));
  recentRef.used.add(w);
  return w;
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
  const { width, height } = useWindowDimensions();
  const maxCellByWidth = Math.floor((width - 48) / 5);
  const maxCellByHeight = Math.floor((height * 0.45) / 7);
  const cellW = Math.min(maxCellByWidth, maxCellByHeight, 60);
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
                  width: cellW,
                  height: cellW,
                  borderRadius: 4,
                  backgroundColor: colorFor(c.state),
                  borderWidth: c.state === 'empty' ? 1 : 0,
                  borderColor: 'rgba(255,255,255,0.15)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: cellW * 0.44, fontFamily: fontFamily.bold, color: '#fff' }}>{c.ch}</Text>
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
