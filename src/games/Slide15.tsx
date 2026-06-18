import React, { useRef, useState } from 'react';
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

const LEVEL_CFG = (level: number) => {
  const size = level <= 2 ? 3 : level <= 4 ? 4 : 5;     // 3x3, 4x4, 5x5+
  const shuffles = 12 + level * 12;
  const target = 20 + level * 25;
  return { size, shuffles, target };
};

type Board = number[][];

function solved(size: number): Board {
  const b: Board = [];
  for (let y = 0; y < size; y += 1) {
    const r: number[] = [];
    for (let x = 0; x < size; x += 1) r.push(y * size + x + 1);
    b.push(r);
  }
  b[size - 1][size - 1] = 0;
  return b;
}

function findEmpty(b: Board): { x: number; y: number } {
  const size = b.length;
  for (let y = 0; y < size; y += 1) for (let x = 0; x < size; x += 1) if (b[y][x] === 0) return { x, y };
  return { x: 0, y: 0 };
}

function clone(b: Board): Board { return b.map((r) => [...r]); }

function shuffle(size: number, n: number): Board {
  let b = solved(size);
  let prev = -1;
  for (let i = 0; i < n; i += 1) {
    const e = findEmpty(b);
    const opts: Array<[number, number, number]> = [];
    if (e.x > 0) opts.push([e.x - 1, e.y, 0]);
    if (e.x < size - 1) opts.push([e.x + 1, e.y, 1]);
    if (e.y > 0) opts.push([e.x, e.y - 1, 2]);
    if (e.y < size - 1) opts.push([e.x, e.y + 1, 3]);
    const filtered = opts.filter((o) => (o[2] ^ 1) !== prev);
    const choice = filtered.length ? filtered[Math.floor(Math.random() * filtered.length)] : opts[0];
    [b[e.y][e.x], b[choice[1]][choice[0]]] = [b[choice[1]][choice[0]], b[e.y][e.x]];
    prev = choice[2];
  }
  // Ensure not already solved
  if (isSolved(b)) return shuffle(size, n);
  return b;
}

function isSolved(b: Board): boolean {
  const size = b.length;
  for (let y = 0; y < size; y += 1) for (let x = 0; x < size; x += 1) {
    const want = y * size + x + 1;
    if (y === size - 1 && x === size - 1) { if (b[y][x] !== 0) return false; }
    else if (b[y][x] !== want) return false;
  }
  return true;
}

export function Slide15({ game, onBack, onComplete, initialLevel }: Props) {
  const { width, height } = useWindowDimensions();
  const [level, setLevel] = useState(initialLevel ?? 1);
  const cfg = LEVEL_CFG(level);
  const [board, setBoard] = useState<Board>(() => shuffle(cfg.size, cfg.shuffles));
  const [moves, setMoves] = useState(0);
  const [history, setHistory] = useState<Board[]>([]);
  const [phase, setPhase] = useState<'playing' | 'complete'>('playing');
  const [lastPassed, setLastPassed] = useState(false);
  const [lastScore, setLastScore] = useState(0);
  const completedRef = useRef(false);

  const cell = Math.floor(Math.min(width - 32, height * 0.58) / cfg.size);

  const tap = (x: number, y: number) => {
    if (phase !== 'playing' || completedRef.current) return;
    const empty = findEmpty(board);
    const dx = Math.abs(empty.x - x);
    const dy = Math.abs(empty.y - y);
    if (dx + dy !== 1) return;
    const next = clone(board);
    [next[y][x], next[empty.y][empty.x]] = [next[empty.y][empty.x], next[y][x]];
    setHistory((h) => [...h, board]);
    setBoard(next);
    setMoves((m) => m + 1);
    Haptics.selectionAsync().catch(() => {});
    if (isSolved(next)) {
      completedRef.current = true;
      const passed = moves + 1 <= cfg.target;
      const score = Math.max(50, (cfg.target - moves) * 10) * level;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setLastPassed(passed);
      setLastScore(score);
      setPhase('complete');
      onComplete(passed, score, { level });
    }
  };

  const undo = () => {
    if (phase !== 'playing' || completedRef.current || history.length === 0) return;
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setBoard(prev);
    setMoves((m) => Math.max(0, m - 1));
    Haptics.selectionAsync().catch(() => {});
  };

  const reset = () => {
    completedRef.current = false;
    setBoard(shuffle(cfg.size, cfg.shuffles));
    setMoves(0);
    setHistory([]);
    setPhase('playing');
  };

  const startNextLevel = () => {
    const nl = level + 1;
    const nc = LEVEL_CFG(nl);
    completedRef.current = false;
    setLevel(nl);
    setBoard(shuffle(nc.size, nc.shuffles));
    setMoves(0);
    setHistory([]);
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
    <GameShell game={game} onBack={onBack} score={`${moves}/${cfg.target}`} label={`Ур. ${level}`}>
      <Text style={{ fontSize: 12, fontFamily: fontFamily.semibold, color: colors.textMuted, textAlign: 'center' }}>
        Расставь числа по порядку. Тапай плитки рядом с пустой.
      </Text>
      <View style={{ width: cell * cfg.size, height: cell * cfg.size, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 12, padding: 4 }}>
        {board.map((row, y) => (
          <View key={y} style={{ flexDirection: 'row' }}>
            {row.map((v, x) => (
              <Pressable key={`${x}-${y}`} onPress={() => tap(x, y)} disabled={v === 0}>
                <View
                  style={{
                    width: cell - 8,
                    height: cell - 8,
                    margin: 4,
                    borderRadius: 8,
                    backgroundColor: v === 0 ? 'transparent' : game.accent,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {v !== 0 ? (
                    <Text style={{ fontSize: cell * 0.4, fontFamily: fontFamily.bold, color: '#000' }}>{v}</Text>
                  ) : null}
                </View>
              </Pressable>
            ))}
          </View>
        ))}
      </View>
      <Pressable
        onPress={undo}
        disabled={history.length === 0}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingHorizontal: 22,
          paddingVertical: 12,
          borderRadius: 12,
          backgroundColor: history.length === 0 ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.14)',
          borderWidth: 1,
          borderColor: colors.glassBorder,
          opacity: history.length === 0 ? 0.45 : 1,
        }}
      >
        <Text style={{ fontSize: 18 }}>↩︎</Text>
        <Text style={{ fontSize: 14, fontFamily: fontFamily.semibold, color: colors.text }}>Отменить ход</Text>
      </Pressable>
    </GameShell>
  );
}
