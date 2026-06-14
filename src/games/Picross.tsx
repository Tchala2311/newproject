import React, { useMemo, useState } from 'react';
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

const LEVEL_CFG = (level: number) => ({
  size: Math.min(10, 4 + level),
  fillProb: 0.5 + Math.max(0, 0.15 - level * 0.02),
  mistakes: Math.max(2, 6 - level),
});

type Cell = 'empty' | 'filled' | 'crossed';

function genPuzzle(size: number, prob: number): boolean[][] {
  const board: boolean[][] = [];
  for (let y = 0; y < size; y += 1) {
    const r: boolean[] = [];
    for (let x = 0; x < size; x += 1) r.push(Math.random() < prob);
    board.push(r);
  }
  // Ensure at least 1 cell per row & col
  for (let y = 0; y < size; y += 1) if (!board[y].some((v) => v)) board[y][Math.floor(Math.random() * size)] = true;
  for (let x = 0; x < size; x += 1) {
    let any = false;
    for (let y = 0; y < size; y += 1) if (board[y][x]) any = true;
    if (!any) board[Math.floor(Math.random() * size)][x] = true;
  }
  return board;
}

function clues(line: boolean[]): number[] {
  const out: number[] = [];
  let run = 0;
  for (const v of line) {
    if (v) run += 1;
    else if (run > 0) { out.push(run); run = 0; }
  }
  if (run > 0) out.push(run);
  return out.length ? out : [0];
}

// All 0/1 fillings of a line of length `len` whose runs match `clue`.
function lineArrangements(clue: number[], len: number): number[][] {
  const res: number[][] = [];
  const blocks = clue.length === 1 && clue[0] === 0 ? [] : clue;
  const place = (idx: number, acc: number[]) => {
    if (idx === blocks.length) {
      const arr = acc.slice();
      while (arr.length < len) arr.push(0);
      res.push(arr);
      return;
    }
    const blk = blocks[idx];
    // minimum cells still needed for the remaining blocks (+gaps)
    let remainingMin = 0;
    for (let k = idx + 1; k < blocks.length; k += 1) remainingMin += blocks[k] + 1;
    for (let start = acc.length; start + blk + remainingMin <= len; start += 1) {
      const acc2 = acc.slice();
      while (acc2.length < start) acc2.push(0);
      for (let k = 0; k < blk; k += 1) acc2.push(1);
      if (idx < blocks.length - 1) acc2.push(0); // mandatory gap after a non-final block
      place(idx + 1, acc2);
    }
  };
  place(0, []);
  return res;
}

// One line-solving pass: intersect every arrangement consistent with the known
// cells. state cell: 0 unknown, 1 filled, -1 empty. Returns null on contradiction.
function solveLine(clue: number[], cur: number[]): number[] | null {
  const len = cur.length;
  const arrs = lineArrangements(clue, len).filter((a) =>
    a.every((v, idx) => cur[idx] === 0 || (cur[idx] === 1 ? v === 1 : v === 0)),
  );
  if (arrs.length === 0) return null;
  const out = cur.slice();
  for (let idx = 0; idx < len; idx += 1) {
    if (arrs.every((a) => a[idx] === 1)) out[idx] = 1;
    else if (arrs.every((a) => a[idx] === 0)) out[idx] = -1;
  }
  return out;
}

// A puzzle solvable by pure line logic (no guessing) is guaranteed to have a
// unique solution — exactly what a mistake-penalty nonogram needs to be fair.
function isLineSolvable(puzzle: boolean[][]): boolean {
  const size = puzzle.length;
  const rowClues = puzzle.map(clues);
  const colClues: number[][] = [];
  for (let x = 0; x < size; x += 1) {
    const col: boolean[] = [];
    for (let y = 0; y < size; y += 1) col.push(puzzle[y][x]);
    colClues.push(clues(col));
  }
  const state: number[][] = Array.from({ length: size }, () => Array(size).fill(0));
  let changed = true;
  let guard = 0;
  while (changed && guard < size * size * 4) {
    changed = false;
    guard += 1;
    for (let y = 0; y < size; y += 1) {
      const solved = solveLine(rowClues[y], state[y].slice());
      if (!solved) return false;
      for (let x = 0; x < size; x += 1) if (solved[x] !== state[y][x]) { state[y][x] = solved[x]; changed = true; }
    }
    for (let x = 0; x < size; x += 1) {
      const solved = solveLine(colClues[x], state.map((r) => r[x]));
      if (!solved) return false;
      for (let y = 0; y < size; y += 1) if (solved[y] !== state[y][x]) { state[y][x] = solved[y]; changed = true; }
    }
  }
  for (let y = 0; y < size; y += 1) for (let x = 0; x < size; x += 1) if (state[y][x] === 0) return false;
  return true;
}

function genSolvablePuzzle(size: number, prob: number): boolean[][] {
  let board = genPuzzle(size, prob);
  for (let attempt = 0; attempt < 40 && !isLineSolvable(board); attempt += 1) {
    board = genPuzzle(size, prob);
  }
  return board;
}

export function Picross({ game, onBack, onComplete, initialLevel }: Props) {
  const { width, height } = useWindowDimensions();
  const [level, setLevel] = useState(initialLevel ?? 1);
  const cfg = LEVEL_CFG(level);
  const puzzle = useMemo(() => genSolvablePuzzle(cfg.size, cfg.fillProb), [level]);
  const [grid, setGrid] = useState<Cell[][]>(() => Array.from({ length: cfg.size }, () => Array(cfg.size).fill('empty')));
  const [mistakes, setMistakes] = useState(0);
  const [phase, setPhase] = useState<'playing' | 'complete'>('playing');
  const [lastPassed, setLastPassed] = useState(false);
  const [lastScore, setLastScore] = useState(0);
  const [mode, setMode] = useState<'fill' | 'cross'>('fill');

  const rowClues = puzzle.map(clues);
  const colClues: number[][] = [];
  for (let x = 0; x < cfg.size; x += 1) {
    const col: boolean[] = [];
    for (let y = 0; y < cfg.size; y += 1) col.push(puzzle[y][x]);
    colClues.push(clues(col));
  }

  const tap = (x: number, y: number) => {
    if (phase !== 'playing') return;
    const cur = grid[y][x];
    let next: Cell = cur;
    if (mode === 'fill') {
      if (cur === 'filled') next = 'empty';
      else next = 'filled';
    } else {
      if (cur === 'crossed') next = 'empty';
      else next = 'crossed';
    }
    if (next === 'filled' && !puzzle[y][x]) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      const m = mistakes + 1;
      setMistakes(m);
      if (m >= cfg.mistakes) {
        setLastPassed(false);
        setLastScore(0);
        setPhase('complete');
        onComplete(false, 0, { level });
        return;
      }
      // Auto-cross the wrong cell
      next = 'crossed';
    } else {
      Haptics.selectionAsync().catch(() => {});
    }
    const ng = grid.map((r) => [...r]);
    ng[y][x] = next;
    setGrid(ng);
    // Win check: every filled cell of puzzle is marked 'filled'
    let won = true;
    for (let yy = 0; yy < cfg.size && won; yy += 1) {
      for (let xx = 0; xx < cfg.size && won; xx += 1) {
        if (puzzle[yy][xx] && ng[yy][xx] !== 'filled') won = false;
      }
    }
    if (won) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      const score = (cfg.size * cfg.size * 5 - mistakes * 20) * level;
      setLastPassed(true);
      setLastScore(Math.max(50, score));
      setPhase('complete');
      onComplete(true, Math.max(50, score), { level });
    }
  };

  const reset = () => {
    setGrid(Array.from({ length: cfg.size }, () => Array(cfg.size).fill('empty')));
    setMistakes(0);
    setPhase('playing');
  };

  const startNextLevel = () => {
    setLevel((l) => l + 1);
    const nc = LEVEL_CFG(level + 1);
    setGrid(Array.from({ length: nc.size }, () => Array(nc.size).fill('empty')));
    setMistakes(0);
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

  const cell = Math.floor((Math.min(width - 32, height * 0.55)) / (cfg.size + 1));
  const cluePad = cell;

  const cellColor = (c: Cell) =>
    c === 'filled' ? game.accent :
    c === 'crossed' ? 'rgba(255,255,255,0.08)' :
    'rgba(255,255,255,0.04)';

  return (
    <GameShell game={game} onBack={onBack} score={`✕${mistakes}/${cfg.mistakes}`} label={`Ур. ${level}`}>
      <Text style={{ fontSize: 11, fontFamily: fontFamily.semibold, color: colors.textMuted, textAlign: 'center' }}>
        Заполни клетки по числам сбоку и сверху. {cfg.mistakes - mistakes} ошибок осталось.
      </Text>
      <View style={{ flexDirection: 'row' }}>
        {/* Top-left empty corner */}
        <View style={{ width: cluePad, height: cluePad }} />
        {/* Column clues */}
        <View style={{ flexDirection: 'row' }}>
          {colClues.map((cs, x) => (
            <View key={x} style={{ width: cell, height: cluePad, justifyContent: 'flex-end', alignItems: 'center' }}>
              {cs.map((n, i) => (
                <Text key={i} style={{ fontSize: 10, fontFamily: fontFamily.bold, color: '#fff' }}>{n}</Text>
              ))}
            </View>
          ))}
        </View>
      </View>
      <View style={{ flexDirection: 'row' }}>
        {/* Row clues */}
        <View>
          {rowClues.map((rs, y) => (
            <View key={y} style={{ width: cluePad, height: cell, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 3 }}>
              {rs.map((n, i) => (
                <Text key={i} style={{ fontSize: 10, fontFamily: fontFamily.bold, color: '#fff' }}>{n}</Text>
              ))}
            </View>
          ))}
        </View>
        {/* Grid */}
        <View>
          {grid.map((row, y) => (
            <View key={y} style={{ flexDirection: 'row' }}>
              {row.map((c, x) => (
                <Pressable key={x} onPress={() => tap(x, y)}>
                  <View
                    style={{
                      width: cell,
                      height: cell,
                      borderWidth: 1,
                      borderColor: 'rgba(255,255,255,0.15)',
                      backgroundColor: cellColor(c),
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {c === 'crossed' ? <Text style={{ fontSize: cell * 0.4, color: '#FF4D4D' }}>✕</Text> : null}
                  </View>
                </Pressable>
              ))}
            </View>
          ))}
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Pressable
          onPress={() => setMode('fill')}
          style={{
            paddingHorizontal: 14, paddingVertical: 8, borderRadius: 6,
            backgroundColor: mode === 'fill' ? game.accent : 'rgba(255,255,255,0.1)',
          }}
        >
          <Text style={{ fontSize: 12, fontFamily: fontFamily.bold, color: mode === 'fill' ? '#000' : '#fff' }}>■ Заполнить</Text>
        </Pressable>
        <Pressable
          onPress={() => setMode('cross')}
          style={{
            paddingHorizontal: 14, paddingVertical: 8, borderRadius: 6,
            backgroundColor: mode === 'cross' ? game.accent : 'rgba(255,255,255,0.1)',
          }}
        >
          <Text style={{ fontSize: 12, fontFamily: fontFamily.bold, color: mode === 'cross' ? '#000' : '#fff' }}>✕ Пометить</Text>
        </Pressable>
      </View>
    </GameShell>
  );
}
