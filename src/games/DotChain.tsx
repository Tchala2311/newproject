import React, { useCallback, useRef, useState } from 'react';
import { PanResponder, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { Game } from '../data/games';
import { GameShell } from './GameShell';
import { LevelComplete, shouldShowAdAfter } from './LevelComplete';
import { GameResult } from './GameResult';
import { colors, fontFamily, radius } from '../theme';

type Props = {
  game: Game;
  onBack: () => void;
  onComplete: (won: boolean, score: number, meta?: Record<string, number>) => void;
  initialLevel?: number;
};

type DotInfo = { r: number; c: number; color: string };
type Puzzle = { grid: number; dots: DotInfo[] };

const PUZZLES: Puzzle[] = [
  // Level 1 – 4×4, 4 pairs
  {
    grid: 4,
    dots: [
      { r: 0, c: 0, color: '#EF4444' }, { r: 3, c: 3, color: '#EF4444' },
      { r: 0, c: 3, color: '#3B82F6' }, { r: 3, c: 0, color: '#3B82F6' },
      { r: 0, c: 1, color: '#22C55E' }, { r: 2, c: 3, color: '#22C55E' },
      { r: 1, c: 0, color: '#EAB308' }, { r: 3, c: 2, color: '#EAB308' },
    ],
  },
  // Level 2 – 4×4, 4 pairs (different layout)
  {
    grid: 4,
    dots: [
      { r: 0, c: 1, color: '#EF4444' }, { r: 3, c: 1, color: '#EF4444' },
      { r: 0, c: 3, color: '#3B82F6' }, { r: 2, c: 0, color: '#3B82F6' },
      { r: 1, c: 1, color: '#22C55E' }, { r: 3, c: 3, color: '#22C55E' },
      { r: 0, c: 0, color: '#F97316' }, { r: 2, c: 3, color: '#F97316' },
    ],
  },
  // Level 3 – 5×5, 5 pairs
  {
    grid: 5,
    dots: [
      { r: 0, c: 0, color: '#EF4444' }, { r: 4, c: 4, color: '#EF4444' },
      { r: 0, c: 4, color: '#3B82F6' }, { r: 4, c: 0, color: '#3B82F6' },
      { r: 0, c: 2, color: '#22C55E' }, { r: 4, c: 2, color: '#22C55E' },
      { r: 2, c: 0, color: '#EAB308' }, { r: 2, c: 4, color: '#EAB308' },
      { r: 1, c: 2, color: '#F97316' }, { r: 3, c: 2, color: '#F97316' },
    ],
  },
  // Level 4 – 5×5, 5 pairs
  {
    grid: 5,
    dots: [
      { r: 0, c: 0, color: '#EF4444' }, { r: 2, c: 4, color: '#EF4444' },
      { r: 0, c: 2, color: '#A855F7' }, { r: 4, c: 2, color: '#A855F7' },
      { r: 1, c: 0, color: '#22C55E' }, { r: 4, c: 4, color: '#22C55E' },
      { r: 0, c: 4, color: '#EAB308' }, { r: 3, c: 0, color: '#EAB308' },
      { r: 2, c: 2, color: '#06B6D4' }, { r: 4, c: 0, color: '#06B6D4' },
    ],
  },
  // Level 5 – 6×6, 6 pairs
  {
    grid: 6,
    dots: [
      { r: 0, c: 0, color: '#EF4444' }, { r: 5, c: 5, color: '#EF4444' },
      { r: 0, c: 5, color: '#3B82F6' }, { r: 5, c: 0, color: '#3B82F6' },
      { r: 0, c: 2, color: '#22C55E' }, { r: 5, c: 3, color: '#22C55E' },
      { r: 2, c: 0, color: '#EAB308' }, { r: 3, c: 5, color: '#EAB308' },
      { r: 1, c: 3, color: '#F97316' }, { r: 4, c: 2, color: '#F97316' },
      { r: 2, c: 5, color: '#A855F7' }, { r: 5, c: 1, color: '#A855F7' },
    ],
  },
  // Level 6 – 6×6, 6 pairs
  {
    grid: 6,
    dots: [
      { r: 0, c: 1, color: '#EF4444' }, { r: 5, c: 4, color: '#EF4444' },
      { r: 0, c: 4, color: '#3B82F6' }, { r: 5, c: 1, color: '#3B82F6' },
      { r: 1, c: 0, color: '#22C55E' }, { r: 4, c: 5, color: '#22C55E' },
      { r: 1, c: 5, color: '#EAB308' }, { r: 4, c: 0, color: '#EAB308' },
      { r: 0, c: 0, color: '#06B6D4' }, { r: 2, c: 3, color: '#06B6D4' },
      { r: 3, c: 2, color: '#EC4899' }, { r: 5, c: 5, color: '#EC4899' },
    ],
  },
  // Level 7 – 6×6, 6 pairs
  {
    grid: 6,
    dots: [
      { r: 0, c: 0, color: '#EF4444' }, { r: 3, c: 3, color: '#EF4444' },
      { r: 0, c: 5, color: '#3B82F6' }, { r: 5, c: 0, color: '#3B82F6' },
      { r: 0, c: 2, color: '#22C55E' }, { r: 5, c: 5, color: '#22C55E' },
      { r: 2, c: 0, color: '#EAB308' }, { r: 2, c: 5, color: '#EAB308' },
      { r: 4, c: 1, color: '#F97316' }, { r: 4, c: 4, color: '#F97316' },
      { r: 1, c: 3, color: '#A855F7' }, { r: 5, c: 2, color: '#A855F7' },
    ],
  },
  // Level 8 – 6×6, 7 pairs
  {
    grid: 6,
    dots: [
      { r: 0, c: 0, color: '#EF4444' }, { r: 5, c: 5, color: '#EF4444' },
      { r: 0, c: 5, color: '#3B82F6' }, { r: 5, c: 0, color: '#3B82F6' },
      { r: 0, c: 3, color: '#22C55E' }, { r: 4, c: 0, color: '#22C55E' },
      { r: 1, c: 1, color: '#EAB308' }, { r: 4, c: 4, color: '#EAB308' },
      { r: 0, c: 1, color: '#F97316' }, { r: 3, c: 5, color: '#F97316' },
      { r: 2, c: 2, color: '#A855F7' }, { r: 5, c: 3, color: '#A855F7' },
      { r: 1, c: 4, color: '#06B6D4' }, { r: 5, c: 2, color: '#06B6D4' },
    ],
  },
  // Level 9 – 6×6, 7 pairs
  {
    grid: 6,
    dots: [
      { r: 0, c: 0, color: '#EF4444' }, { r: 5, c: 4, color: '#EF4444' },
      { r: 0, c: 4, color: '#3B82F6' }, { r: 5, c: 0, color: '#3B82F6' },
      { r: 0, c: 2, color: '#22C55E' }, { r: 3, c: 5, color: '#22C55E' },
      { r: 1, c: 1, color: '#EAB308' }, { r: 4, c: 3, color: '#EAB308' },
      { r: 2, c: 0, color: '#F97316' }, { r: 5, c: 5, color: '#F97316' },
      { r: 1, c: 5, color: '#A855F7' }, { r: 4, c: 0, color: '#A855F7' },
      { r: 2, c: 3, color: '#EC4899' }, { r: 5, c: 2, color: '#EC4899' },
    ],
  },
  // Level 10 – 6×6, 8 pairs
  {
    grid: 6,
    dots: [
      { r: 0, c: 0, color: '#EF4444' }, { r: 5, c: 5, color: '#EF4444' },
      { r: 0, c: 5, color: '#3B82F6' }, { r: 5, c: 0, color: '#3B82F6' },
      { r: 0, c: 2, color: '#22C55E' }, { r: 4, c: 5, color: '#22C55E' },
      { r: 2, c: 0, color: '#EAB308' }, { r: 5, c: 3, color: '#EAB308' },
      { r: 0, c: 4, color: '#F97316' }, { r: 3, c: 0, color: '#F97316' },
      { r: 1, c: 2, color: '#A855F7' }, { r: 4, c: 3, color: '#A855F7' },
      { r: 2, c: 4, color: '#06B6D4' }, { r: 5, c: 1, color: '#06B6D4' },
      { r: 3, c: 3, color: '#EC4899' }, { r: 5, c: 4, color: '#EC4899' },
    ],
  },
];

function getPuzzle(level: number): Puzzle {
  return PUZZLES[Math.min(level - 1, PUZZLES.length - 1)];
}

// paths[color] = list of {r,c} cells in order
type PathMap = Record<string, Array<{ r: number; c: number }>>;

function cellKey(r: number, c: number): string {
  return `${r},${c}`;
}

function pathToSvgD(cells: Array<{ r: number; c: number }>, cellSize: number): string {
  if (cells.length < 2) return '';
  const cx = (cell: { r: number; c: number }) => cell.c * cellSize + cellSize / 2;
  const cy = (cell: { r: number; c: number }) => cell.r * cellSize + cellSize / 2;
  return cells.map((cell, i) => `${i === 0 ? 'M' : 'L'}${cx(cell)},${cy(cell)}`).join(' ');
}

export function DotChain({ game, onBack, onComplete, initialLevel }: Props) {
  const { width, height } = useWindowDimensions();
  const [level, setLevel] = useState(initialLevel ?? 1);
  const [score, setScore] = useState(0);
  const [phase, setPhase] = useState<'playing' | 'levelComplete' | 'gameOver'>('playing');
  const [passed, setPassed] = useState(false);
  const [lastLevelScore, setLastLevelScore] = useState(0);

  const puzzle = getPuzzle(level);
  const N = puzzle.grid;

  // Mutable refs so PanResponder (created once) always sees latest values
  const levelRef = useRef(level);
  const scoreRef = useRef(0);
  const dotMapLiveRef = useRef<Record<string, string>>({});
  const NCellRef = useRef(N);
  const cellSizeLiveRef = useRef(0);

  // Map from dot key to color for quick lookup
  const dotColorMap = useRef<Record<string, string>>({});
  const initDotMap = useCallback((p: Puzzle) => {
    const m: Record<string, string> = {};
    for (const d of p.dots) m[cellKey(d.r, d.c)] = d.color;
    return m;
  }, []);

  // paths drawn by the player
  const [paths, setPaths] = useState<PathMap>({});
  const pathsRef = useRef<PathMap>({});

  // currently active drawing: { color, cells }
  const activeRef = useRef<{ color: string; cells: Array<{ r: number; c: number }> } | null>(null);

  // grid layout
  const gridPad = 16;
  const gridSize = Math.min(width - gridPad * 2, height * 0.55);
  const cellSize = gridSize / N;

  const dotMap = initDotMap(puzzle);

  // Keep refs in sync with latest state/derived values
  levelRef.current = level;
  scoreRef.current = score;
  dotMapLiveRef.current = dotMap;
  NCellRef.current = N;
  cellSizeLiveRef.current = cellSize;

  const resetLevel = useCallback(() => {
    pathsRef.current = {};
    setPaths({});
    activeRef.current = null;
  }, []);

  // Check win: all cells covered, all pairs connected
  const checkWin = useCallback(
    (currentPaths: PathMap, p: Puzzle): boolean => {
      const n = p.grid;
      const covered = new Set<string>();
      for (const cells of Object.values(currentPaths)) {
        for (const c of cells) covered.add(cellKey(c.r, c.c));
      }
      if (covered.size !== n * n) return false;
      // Each color must have exactly 2 endpoints matching the dot positions
      const pairs: Record<string, DotInfo[]> = {};
      for (const d of p.dots) {
        if (!pairs[d.color]) pairs[d.color] = [];
        pairs[d.color].push(d);
      }
      for (const [color, endDots] of Object.entries(pairs)) {
        const path = currentPaths[color];
        if (!path || path.length < 2) return false;
        const start = path[0];
        const end = path[path.length - 1];
        const matchA =
          endDots.some((d) => d.r === start.r && d.c === start.c) &&
          endDots.some((d) => d.r === end.r && d.c === end.c);
        if (!matchA) return false;
      }
      return true;
    },
    [],
  );

  const getCellAt = useCallback(
    (x: number, y: number): { r: number; c: number } | null => {
      const c = Math.floor(x / cellSize);
      const r = Math.floor(y / cellSize);
      if (r < 0 || r >= N || c < 0 || c >= N) return null;
      return { r, c };
    },
    [cellSize, N],
  );

  const gridRef = useRef<View>(null);
  const gridOrigin = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { pageX, pageY } = evt.nativeEvent;
        const ox = pageX - gridOrigin.current.x;
        const oy = pageY - gridOrigin.current.y;
        // Use live refs so stale PanResponder closure always gets current values
        const cs = cellSizeLiveRef.current;
        const n = NCellRef.current;
        const c = Math.floor(ox / cs);
        const r = Math.floor(oy / cs);
        const cell = (r < 0 || r >= n || c < 0 || c >= n) ? null : { r, c };
        if (!cell) return;
        const key = cellKey(cell.r, cell.c);
        const dotColorValue = dotMapLiveRef.current[key];
        if (!dotColorValue) {
          // Tap on existing path cell – clear that path to allow redraw
          for (const [color, cells] of Object.entries(pathsRef.current)) {
            if (cells.some((c) => c.r === cell.r && c.c === cell.c)) {
              const next = { ...pathsRef.current };
              delete next[color];
              pathsRef.current = next;
              setPaths({ ...next });
              activeRef.current = { color, cells: [] };
              return;
            }
          }
          return;
        }
        // Start new path from this dot, clearing any existing path of that color
        Haptics.selectionAsync().catch(() => {});
        const next = { ...pathsRef.current };
        delete next[dotColorValue];
        // Also clear any other path that passed through this cell
        for (const [color, cells] of Object.entries(next)) {
          if (cells.some((c) => c.r === cell.r && c.c === cell.c)) {
            delete next[color];
          }
        }
        pathsRef.current = next;
        activeRef.current = { color: dotColorValue, cells: [cell] };
        setPaths({ ...next, [dotColorValue]: [cell] });
      },
      onPanResponderMove: (evt) => {
        if (!activeRef.current) return;
        const { pageX, pageY } = evt.nativeEvent;
        const ox = pageX - gridOrigin.current.x;
        const oy = pageY - gridOrigin.current.y;
        const cs = cellSizeLiveRef.current;
        const n = NCellRef.current;
        const col = Math.floor(ox / cs);
        const row = Math.floor(oy / cs);
        const cell = (row < 0 || row >= n || col < 0 || col >= n) ? null : { r: row, c: col };
        if (!cell) return;
        const active = activeRef.current;
        const existing = active.cells;
        const last = existing[existing.length - 1];
        if (last && last.r === cell.r && last.c === cell.c) return;

        // Backtrack if stepping onto second-to-last cell
        if (existing.length >= 2) {
          const prev = existing[existing.length - 2];
          if (prev.r === cell.r && prev.c === cell.c) {
            active.cells = existing.slice(0, -1);
            const next = { ...pathsRef.current, [active.color]: [...active.cells] };
            pathsRef.current = next;
            setPaths({ ...next });
            return;
          }
        }

        // Check adjacency
        if (last && Math.abs(cell.r - last.r) + Math.abs(cell.c - last.c) !== 1) return;

        const cellk = cellKey(cell.r, cell.c);

        // Check if cell is occupied by another path
        for (const [color, cells] of Object.entries(pathsRef.current)) {
          if (color === active.color) continue;
          if (cells.some((c) => c.r === cell.r && c.c === cell.c)) {
            // Clear the blocking path
            const next = { ...pathsRef.current };
            delete next[color];
            pathsRef.current = next;
            break;
          }
        }

        // Stop if we hit a dot of a different color
        const hitDotColor = dotMapLiveRef.current[cellk];
        if (hitDotColor && hitDotColor !== active.color) return;

        active.cells = [...active.cells, cell];
        const next = { ...pathsRef.current, [active.color]: [...active.cells] };
        pathsRef.current = next;
        setPaths({ ...next });

        // If reached matching endpoint
        if (hitDotColor === active.color && active.cells.length >= 2) {
          Haptics.selectionAsync().catch(() => {});
          activeRef.current = null;
          if (checkWin(pathsRef.current, getPuzzle(levelRef.current))) {
            const lv = levelRef.current;
            const lvScore = lv * 300;
            const newScore = scoreRef.current + lvScore;
            scoreRef.current = newScore;
            setScore(newScore);
            setLastLevelScore(lvScore);
            setPassed(true);
            setPhase('levelComplete');
            onComplete(true, newScore, { level: lv });
          }
        }
      },
      onPanResponderRelease: () => {
        activeRef.current = null;
      },
    }),
  ).current;

  if (phase === 'levelComplete') {
    return (
      <LevelComplete
        level={level}
        passed={passed}
        score={lastLevelScore}
        scoreLabel="Очки"
        accent={game.accent}
        showAd={passed && shouldShowAdAfter(level)}
        onContinue={() => {
          const nextLevel = level + 1;
          setLevel(nextLevel);
          setPhase('playing');
          resetLevel();
        }}
        onRetry={() => {
          setPhase('playing');
          resetLevel();
        }}
        onBack={onBack}
      />
    );
  }

  const pairs: Record<string, DotInfo[]> = {};
  for (const d of puzzle.dots) {
    if (!pairs[d.color]) pairs[d.color] = [];
    pairs[d.color].push(d);
  }

  // Cells occupied by any path (for fill highlighting)
  const occupiedCells = new Set<string>();
  for (const cells of Object.values(paths)) {
    for (const c of cells) occupiedCells.add(cellKey(c.r, c.c));
  }

  const totalCells = N * N;
  const filledCount = occupiedCells.size;

  return (
    <GameShell game={game} onBack={onBack} score={score} label={`Ур. ${level}`}>
      <Text
        style={{
          fontSize: 13,
          fontFamily: fontFamily.semibold,
          color: 'rgba(255,255,255,0.6)',
          marginBottom: 4,
        }}
      >
        Соедини точки
      </Text>
      <Text
        style={{
          fontSize: 11,
          fontFamily: fontFamily.semibold,
          color: 'rgba(255,255,255,0.4)',
          marginBottom: 12,
        }}
      >
        {filledCount} / {totalCells} клеток
      </Text>

      <View
        ref={gridRef}
        onLayout={() => {
          gridRef.current?.measure((_x, _y, _w, _h, px, py) => {
            gridOrigin.current = { x: px, y: py };
          });
        }}
        style={{
          width: gridSize,
          height: gridSize,
          borderRadius: radius.md,
          overflow: 'hidden',
          backgroundColor: 'rgba(0,0,0,0.35)',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.1)',
        }}
        {...panResponder.panHandlers}
      >
        <Svg width={gridSize} height={gridSize}>
          {/* Grid lines */}
          {Array.from({ length: N + 1 }, (_, i) => (
            <React.Fragment key={`grid-${i}`}>
              <Line
                x1={i * cellSize}
                y1={0}
                x2={i * cellSize}
                y2={gridSize}
                stroke="rgba(255,255,255,0.08)"
                strokeWidth={1}
              />
              <Line
                x1={0}
                y1={i * cellSize}
                x2={gridSize}
                y2={i * cellSize}
                stroke="rgba(255,255,255,0.08)"
                strokeWidth={1}
              />
            </React.Fragment>
          ))}

          {/* Filled cell backgrounds */}
          {Array.from(occupiedCells).map((key) => {
            const [rs, cs] = key.split(',').map(Number);
            // Find which color owns this cell
            let cellColor = 'rgba(255,255,255,0.05)';
            for (const [color, cells] of Object.entries(paths)) {
              if (cells.some((c) => c.r === rs && c.c === cs)) {
                cellColor = color + '22';
                break;
              }
            }
            return (
              <React.Fragment key={`fill-${key}`}>
                <Rect
                  x={cs * cellSize + 1}
                  y={rs * cellSize + 1}
                  width={cellSize - 2}
                  height={cellSize - 2}
                  fill={cellColor}
                />
              </React.Fragment>
            );
          })}

          {/* Drawn paths */}
          {Object.entries(paths).map(([color, cells]) => {
            if (cells.length < 2) return null;
            const d = pathToSvgD(cells, cellSize);
            return (
              <Path
                key={`path-${color}`}
                d={d}
                stroke={color}
                strokeWidth={cellSize * 0.38}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                opacity={0.85}
              />
            );
          })}

          {/* Dots */}
          {puzzle.dots.map((dot, i) => {
            const cx = dot.c * cellSize + cellSize / 2;
            const cy = dot.r * cellSize + cellSize / 2;
            const r = cellSize * 0.28;
            const isConnected = (() => {
              const path = paths[dot.color];
              if (!path || path.length < 2) return false;
              const start = path[0];
              const end = path[path.length - 1];
              const matchPair = pairs[dot.color];
              return (
                matchPair &&
                matchPair.some((d) => d.r === start.r && d.c === start.c) &&
                matchPair.some((d) => d.r === end.r && d.c === end.c)
              );
            })();
            return (
              <React.Fragment key={`dot-${i}`}>
                <Circle cx={cx} cy={cy} r={r + 3} fill={dot.color} opacity={0.25} />
                <Circle cx={cx} cy={cy} r={r} fill={dot.color} />
                {isConnected && <Circle cx={cx} cy={cy} r={r * 0.45} fill="#fff" opacity={0.9} />}
              </React.Fragment>
            );
          })}
        </Svg>
      </View>
    </GameShell>
  );
}
