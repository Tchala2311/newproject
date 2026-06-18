import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Game } from '../data/games';
import { LevelComplete, shouldShowAdAfter } from './LevelComplete';
import { GameResult } from './GameResult';
import { GameBackButton } from './GameBackButton';
import { fontFamily, colors, SAFE_TOP } from '../theme';

type Props = {
  game: Game;
  onBack: () => void;
  onComplete: (won: boolean, score: number, meta?: Record<string, number>) => void;
  initialLevel?: number;
};

// [row, col] offsets for each shape
const SHAPES: number[][][] = [
  [[0,0],[0,1],[1,0],[1,1]],         // O
  [[0,0],[1,0],[2,0],[3,0]],         // I-vert
  [[0,0],[0,1],[0,2],[0,3]],         // I-horiz
  [[0,0],[1,0],[2,0],[2,1]],         // L
  [[0,1],[1,1],[2,1],[2,0]],         // J
  [[0,0],[1,0],[1,1],[2,1]],         // S
  [[0,1],[1,0],[1,1],[2,0]],         // Z
  [[0,0],[0,1],[1,0]],               // corner TL
  [[0,0],[0,1],[1,1]],               // corner TR
  [[0,0],[1,0],[1,1]],               // corner BL
  [[0,1],[1,0],[1,1]],               // corner BR
  [[0,0],[1,0],[2,0]],               // I3-vert
  [[0,0],[0,1],[0,2]],               // I3-horiz
  [[0,0],[0,1],[1,0],[2,0]],         // L3
  [[0,0],[1,0],[0,1],[0,2]],         // T-top
  [[0,0],[1,0],[2,0],[1,1]],         // T-right
  [[0,1],[1,0],[1,1],[1,2]],         // T-bot
  [[0,0],[1,0],[2,0],[1,-1]],        // T-left (careful with negatives)
];

const PIECE_COLORS = ['#FF6B9D','#FF9F43','#54A0FF','#5F27CD','#00D2D3','#FF6B6B','#FECA57','#48DBFB','#FF9FF3','#1DD1A1'];

type Piece = { shape: number[][]; color: string; id: number };
type Cell = { color: string } | null;
type Phase = 'playing' | 'levelComplete' | 'gameOver';

function gridSize(level: number): { rows: number; cols: number } {
  if (level <= 1) return { rows: 3, cols: 3 };
  if (level <= 2) return { rows: 3, cols: 4 };
  if (level <= 3) return { rows: 4, cols: 4 };
  if (level <= 4) return { rows: 4, cols: 5 };
  if (level <= 5) return { rows: 5, cols: 5 };
  return { rows: Math.min(7, 5 + Math.floor((level - 5) / 2)), cols: Math.min(6, 5 + Math.floor((level - 4) / 3)) };
}

function normalizeShape(shape: number[][]): number[][] {
  const minR = Math.min(...shape.map(([r]) => r));
  const minC = Math.min(...shape.map(([, c]) => c));
  return shape.map(([r, c]) => [r - minR, c - minC]);
}

function canPlace(grid: Cell[][], shape: number[][], row: number, col: number): boolean {
  const rows = grid.length;
  const cols = grid[0].length;
  for (const [dr, dc] of shape) {
    const r = row + dr;
    const c = col + dc;
    if (r < 0 || r >= rows || c < 0 || c >= cols) return false;
    if (grid[r][c] !== null) return false;
  }
  return true;
}

function placeOnGrid(grid: Cell[][], shape: number[][], row: number, col: number, color: string): Cell[][] {
  const next = grid.map(r => [...r]);
  for (const [dr, dc] of shape) {
    next[row + dr][col + dc] = { color };
  }
  return next;
}

function generatePuzzle(rows: number, cols: number): Piece[] {
  // Try to tile the grid completely
  for (let attempt = 0; attempt < 200; attempt++) {
    const grid: (number | null)[][] = Array.from({ length: rows }, () => Array(cols).fill(null));
    const pieces: { shape: number[][]; pieceId: number }[] = [];
    let pieceId = 0;
    let failed = false;

    const allEmpty = () => {
      for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++)
          if (grid[r][c] === null) return [r, c];
      return null;
    };

    while (true) {
      const empty = allEmpty();
      if (!empty) break;
      const [r, c] = empty;

      const shuffled = [...SHAPES].sort(() => Math.random() - 0.5);
      let placed = false;
      for (const shape of shuffled) {
        const norm = normalizeShape(shape);
        // Try different offsets so [r,c] is covered
        for (const [dr, dc] of norm) {
          const sr = r - dr;
          const sc = c - dc;
          if (sr < 0 || sc < 0) continue;
          let fits = true;
          for (const [nr, nc] of norm) {
            const tr = sr + nr;
            const tc = sc + nc;
            if (tr < 0 || tr >= rows || tc < 0 || tc >= cols || grid[tr][tc] !== null) {
              fits = false; break;
            }
          }
          if (fits) {
            for (const [nr, nc] of norm) grid[sr + nr][sc + nc] = pieceId;
            pieces.push({ shape: norm, pieceId });
            pieceId++;
            placed = true;
            break;
          }
        }
        if (placed) break;
      }
      if (!placed) { failed = true; break; }
    }

    if (!failed) {
      return pieces
        .sort(() => Math.random() - 0.5)
        .map(({ shape }, i) => ({
          shape,
          color: PIECE_COLORS[i % PIECE_COLORS.length],
          id: i,
        }));
    }
  }
  // Fallback: single-cell pieces
  const pieces: Piece[] = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      pieces.push({ shape: [[0, 0]], color: PIECE_COLORS[(r * cols + c) % PIECE_COLORS.length], id: r * cols + c });
  return pieces;
}

function isFull(grid: Cell[][]): boolean {
  return grid.every(row => row.every(cell => cell !== null));
}

export function BlockFill({ game, onBack, onComplete, initialLevel = 1 }: Props) {
  const { width } = useWindowDimensions();
  const [level, setLevel] = useState(initialLevel);
  const [score, setScore] = useState(0);
  const [phase, setPhase] = useState<Phase>('playing');
  const [grid, setGrid] = useState<Cell[][]>([]);
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [hoverCell, setHoverCell] = useState<[number, number] | null>(null);
  // Synchronous mirror of `selected` + a completion latch so a fast double-tap
  // can't place the same piece twice or fire onComplete twice.
  const selectedRef = useRef<number | null>(null);
  const completedRef = useRef(false);
  useEffect(() => { selectedRef.current = selected; }, [selected]);

  const { rows, cols } = gridSize(level);
  const padding = 16;
  const cellSize = Math.floor((Math.min(width - padding * 2, 380)) / cols);
  const previewCell = 10;

  const startLevel = useCallback((lv: number) => {
    const { rows, cols } = gridSize(lv);
    const emptyGrid: Cell[][] = Array.from({ length: rows }, () => Array(cols).fill(null));
    const newPieces = generatePuzzle(rows, cols);
    completedRef.current = false;
    selectedRef.current = null;
    setGrid(emptyGrid);
    setPieces(newPieces);
    setSelected(null);
    setHoverCell(null);
    setPhase('playing');
  }, []);

  useEffect(() => { startLevel(level); }, [level]);

  const handleCellPress = (row: number, col: number) => {
    const sel = selectedRef.current;
    if (sel === null || completedRef.current) return;
    const piece = pieces.find(p => p.id === sel);
    if (!piece) return;

    if (!canPlace(grid, piece.shape, row, col)) {
      // Surface the (now red) preview so the player sees why it didn't drop.
      setHoverCell([row, col]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      return;
    }

    // Block re-entry from a second synchronous tap before state commits.
    selectedRef.current = null;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const newGrid = placeOnGrid(grid, piece.shape, row, col, piece.color);
    const newPieces = pieces.filter(p => p.id !== sel);
    setGrid(newGrid);
    setPieces(newPieces);
    setSelected(null);
    setHoverCell(null);

    const pts = piece.shape.length * 10 * level;
    const newScore = score + pts;
    setScore(newScore);

    if (isFull(newGrid)) {
      completedRef.current = true;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setPhase('levelComplete');
      onComplete(true, newScore, { level });
    } else if (newPieces.length === 0 && !isFull(newGrid)) {
      // Ran out of pieces but grid not full
      completedRef.current = true;
      setPhase('gameOver');
      onComplete(false, newScore, { level });
    }
  };

  const selectedPiece = pieces.find(p => p.id === selected) ?? null;

  // Determine highlighted cells for hover
  const highlightCells = new Set<string>();
  const invalidPlacement = hoverCell !== null && selectedPiece !== null && !canPlace(grid, selectedPiece.shape, hoverCell[0], hoverCell[1]);
  if (hoverCell && selectedPiece) {
    for (const [dr, dc] of selectedPiece.shape) {
      highlightCells.add(`${hoverCell[0] + dr},${hoverCell[1] + dc}`);
    }
  }

  if (phase === 'gameOver') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
        <GameResult won={false} score={score} accent={game.accent} onRestart={() => { setScore(0); startLevel(level); }} onBack={onBack} game={game} />
      </View>
    );
  }

  if (phase === 'levelComplete') {
    return (
      <LevelComplete level={level} passed score={score} scoreLabel="Очки" accent={game.accent}
        showAd={shouldShowAdAfter(level)}
        onContinue={() => setLevel(l => l + 1)}
        onRetry={() => { setScore(0); startLevel(level); }}
        onBack={onBack} />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#0D0D0D', alignItems: 'center' }}>
      {/* Header */}
      <View style={{ paddingTop: SAFE_TOP, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
        <GameBackButton onPress={onBack} />
        <View style={{ backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 }}>
          <Text style={{ fontSize: 12, fontFamily: fontFamily.bold, color: '#fff', letterSpacing: 1 }}>УР. {level}</Text>
        </View>
        <View style={{ backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 }}>
          <Text style={{ fontSize: 12, fontFamily: fontFamily.bold, color: game.accent }}>{score} ОЧК</Text>
        </View>
        <Pressable
          onPress={() => { setScore(0); startLevel(level); }}
          style={{ backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 }}
        >
          <Text style={{ fontSize: 12, fontFamily: fontFamily.bold, color: '#EF4444' }}>Сброс</Text>
        </Pressable>
      </View>

      {/* Grid */}
      <View style={{ marginTop: 12 }}>
        {grid.map((rowArr, r) => (
          <View key={r} style={{ flexDirection: 'row' }}>
            {rowArr.map((cell, c) => {
              const key = `${r},${c}`;
              const isHighlighted = highlightCells.has(key);
              const highlightColor = invalidPlacement ? '#EF4444' : '#00FF6A';
              return (
                <Pressable
                  key={c}
                  onPress={() => handleCellPress(r, c)}
                  // onPressIn drives the preview on touch devices (onHoverIn
                  // only fires for pointer/web), so the green/red placement
                  // highlight appears the moment a finger lands on a cell.
                  onPressIn={() => { if (selectedRef.current !== null) setHoverCell([r, c]); }}
                  onHoverIn={() => setHoverCell([r, c])}
                  onHoverOut={() => setHoverCell(null)}
                  style={{
                    width: cellSize,
                    height: cellSize,
                    borderWidth: 1,
                    borderColor: isHighlighted ? highlightColor : 'rgba(255,255,255,0.1)',
                    backgroundColor: isHighlighted
                      ? `${highlightColor}22`
                      : cell
                      ? cell.color
                      : 'rgba(255,255,255,0.03)',
                    margin: 1,
                    borderRadius: 4,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {!cell && !isHighlighted && selectedPiece && (
                    <Text style={{ fontSize: 8, color: 'rgba(255,255,255,0.15)' }}>+</Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>

      {/* Hint */}
      <Text style={{ fontSize: 11, fontFamily: fontFamily.medium, color: colors.textFaint, marginTop: 12 }}>
        {selected !== null ? 'Тапни клетку чтобы поставить фигуру' : 'Выбери фигуру снизу'}
      </Text>

      {/* Pieces tray */}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.85)', paddingVertical: 16, paddingHorizontal: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
          {pieces.map((piece) => {
            const maxR = Math.max(...piece.shape.map(([r]) => r));
            const maxC = Math.max(...piece.shape.map(([, c]) => c));
            const isSelected = selected === piece.id;
            return (
              <Pressable
                key={piece.id}
                onPress={() => setSelected(isSelected ? null : piece.id)}
                style={{
                  borderWidth: 2,
                  borderColor: isSelected ? '#00FF6A' : 'transparent',
                  borderRadius: 8,
                  padding: 6,
                  backgroundColor: isSelected ? 'rgba(0,255,106,0.1)' : 'rgba(255,255,255,0.05)',
                }}
              >
                <View style={{ width: (maxC + 1) * (previewCell + 2), height: (maxR + 1) * (previewCell + 2) }}>
                  {piece.shape.map(([r, c], i) => (
                    <View
                      key={i}
                      style={{
                        position: 'absolute',
                        top: r * (previewCell + 2),
                        left: c * (previewCell + 2),
                        width: previewCell,
                        height: previewCell,
                        borderRadius: 2,
                        backgroundColor: piece.color,
                      }}
                    />
                  ))}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}
