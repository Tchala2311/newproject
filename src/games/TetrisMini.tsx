import React, { useEffect, useRef, useState } from 'react';
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

const COLS = 7;
const ROWS = 14;

const PIECES: Record<string, { cells: number[][][]; color: string }> = {
  I: { cells: [[[1, 1, 1, 1]], [[1], [1], [1], [1]]], color: '#22D3EE' },
  O: { cells: [[[1, 1], [1, 1]]], color: '#FACC15' },
  T: { cells: [[[1, 1, 1], [0, 1, 0]], [[1, 0], [1, 1], [1, 0]], [[0, 1, 0], [1, 1, 1]], [[0, 1], [1, 1], [0, 1]]], color: '#A855F7' },
  L: { cells: [[[1, 0], [1, 0], [1, 1]], [[1, 1, 1], [1, 0, 0]], [[1, 1], [0, 1], [0, 1]], [[0, 0, 1], [1, 1, 1]]], color: '#F97316' },
  S: { cells: [[[0, 1, 1], [1, 1, 0]], [[1, 0], [1, 1], [0, 1]]], color: '#22C55E' },
};

const PIECE_KEYS = Object.keys(PIECES);

const LEVEL_CFG = (level: number) => ({
  tickMs: Math.max(150, 800 - level * 80),
  target: 4 + level * 4,
});

type Cell = string | null;
type Board = Cell[][];

function emptyBoard(): Board {
  return Array.from({ length: ROWS }, () => Array<Cell>(COLS).fill(null));
}

function spawnPiece() {
  const k = PIECE_KEYS[Math.floor(Math.random() * PIECE_KEYS.length)];
  return { kind: k, rot: 0, x: 2, y: 0 };
}

function pieceCells(p: { kind: string; rot: number }): number[][] {
  const opts = PIECES[p.kind].cells;
  return opts[p.rot % opts.length];
}

function collides(board: Board, p: { kind: string; rot: number; x: number; y: number }): boolean {
  const m = pieceCells(p);
  for (let yy = 0; yy < m.length; yy += 1) {
    for (let xx = 0; xx < m[0].length; xx += 1) {
      if (!m[yy][xx]) continue;
      const bx = p.x + xx;
      const by = p.y + yy;
      if (bx < 0 || bx >= COLS || by >= ROWS) return true;
      if (by >= 0 && board[by][bx] !== null) return true;
    }
  }
  return false;
}

function merge(board: Board, p: { kind: string; rot: number; x: number; y: number }): Board {
  const m = pieceCells(p);
  const next = board.map((r) => [...r]);
  const color = PIECES[p.kind].color;
  for (let yy = 0; yy < m.length; yy += 1) {
    for (let xx = 0; xx < m[0].length; xx += 1) {
      if (!m[yy][xx]) continue;
      const bx = p.x + xx;
      const by = p.y + yy;
      if (by >= 0 && by < ROWS && bx >= 0 && bx < COLS) next[by][bx] = color;
    }
  }
  return next;
}

function clearLines(board: Board): { board: Board; lines: number } {
  const next: Board = [];
  let lines = 0;
  for (const row of board) {
    if (row.every((c) => c !== null)) lines += 1;
    else next.push(row);
  }
  while (next.length < ROWS) next.unshift(Array<Cell>(COLS).fill(null));
  return { board: next, lines };
}

export function TetrisMini({ game, onBack, onComplete, initialLevel }: Props) {
  const { width, height } = useWindowDimensions();
  const [level, setLevel] = useState(initialLevel ?? 1);
  const cfg = LEVEL_CFG(level);
  const cell = Math.min(Math.floor((width - 80) / COLS), Math.floor((height * 0.62) / ROWS));

  const [board, setBoard] = useState<Board>(emptyBoard);
  const [piece, setPiece] = useState(() => spawnPiece());
  const [score, setScore] = useState(0);
  const [linesCleared, setLinesCleared] = useState(0);
  const [phase, setPhase] = useState<'playing' | 'complete'>('playing');
  const [lastPassed, setLastPassed] = useState(false);
  const [lastScore, setLastScore] = useState(0);
  const phaseRef = useRef(phase);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  // Tick
  useEffect(() => {
    if (phase !== 'playing') return;
    const t = setInterval(() => {
      if (phaseRef.current !== 'playing') return;
      setPiece((p) => {
        const next = { ...p, y: p.y + 1 };
        if (collides(board, next)) {
          // Lock piece
          const merged = merge(board, p);
          const { board: cleared, lines } = clearLines(merged);
          setBoard(cleared);
          setLinesCleared((l) => {
            const nl = l + lines;
            if (nl >= cfg.target) {
              setLastPassed(true);
              setLastScore(score + lines * 100 * level);
              setPhase('complete');
              onComplete(true, score + lines * 100 * level, { level, lines: linesCleared + lines });
            }
            return nl;
          });
          if (lines > 0) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
            setScore((s) => s + lines * 100 * level);
          }
          const nextPiece = spawnPiece();
          if (collides(cleared, nextPiece)) {
            setLastPassed(false);
            setLastScore(score + lines * 100 * level);
            setPhase('complete');
            onComplete(false, score + lines * 100 * level, { level });
          }
          return nextPiece;
        }
        return next;
      });
    }, cfg.tickMs);
    return () => clearInterval(t);
  }, [phase, board, cfg.tickMs, cfg.target, score, level, onComplete]);

  const move = (dx: number) => {
    if (phase !== 'playing') return;
    Haptics.selectionAsync().catch(() => {});
    setPiece((p) => {
      const next = { ...p, x: p.x + dx };
      return collides(board, next) ? p : next;
    });
  };

  const rotate = () => {
    if (phase !== 'playing') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setPiece((p) => {
      const next = { ...p, rot: p.rot + 1 };
      return collides(board, next) ? p : next;
    });
  };

  const drop = () => {
    if (phase !== 'playing') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setPiece((p) => {
      let next = p;
      while (!collides(board, { ...next, y: next.y + 1 })) next = { ...next, y: next.y + 1 };
      return next;
    });
  };

  const reset = () => {
    setBoard(emptyBoard());
    setPiece(spawnPiece());
    setScore(0);
    setLinesCleared(0);
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

  // Render board with active piece overlaid
  const display = board.map((r) => [...r]);
  const m = pieceCells(piece);
  const color = PIECES[piece.kind].color;
  for (let yy = 0; yy < m.length; yy += 1) for (let xx = 0; xx < m[0].length; xx += 1) {
    if (!m[yy][xx]) continue;
    const bx = piece.x + xx;
    const by = piece.y + yy;
    if (by >= 0 && by < ROWS && bx >= 0 && bx < COLS) display[by][bx] = color;
  }

  return (
    <GameShell game={game} onBack={onBack} score={`${linesCleared}/${cfg.target} линий`} label={`Ур. ${level}`}>
      <View style={{ width: cell * COLS + 8, padding: 4, backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 8 }}>
        {display.map((row, y) => (
          <View key={y} style={{ flexDirection: 'row' }}>
            {row.map((c, x) => (
              <View
                key={x}
                style={{
                  width: cell,
                  height: cell,
                  backgroundColor: c ?? 'rgba(255,255,255,0.04)',
                  borderWidth: c ? 1 : 0,
                  borderColor: 'rgba(255,255,255,0.15)',
                }}
              />
            ))}
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Btn label="←" onPress={() => move(-1)} />
        <Btn label="↻" onPress={rotate} />
        <Btn label="→" onPress={() => move(1)} />
        <Btn label="⤓" onPress={drop} accent={game.accent} />
      </View>
    </GameShell>
  );
}

function Btn({ label, onPress, accent }: { label: string; onPress: () => void; accent?: string }) {
  return (
    <Pressable onPress={onPress}>
      <View
        style={{
          width: 56,
          height: 48,
          borderRadius: 8,
          backgroundColor: accent ?? 'rgba(255,255,255,0.1)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: 22, color: accent ? '#000' : '#fff', fontFamily: fontFamily.bold }}>{label}</Text>
      </View>
    </Pressable>
  );
}
