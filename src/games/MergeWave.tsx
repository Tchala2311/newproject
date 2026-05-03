import React, { useEffect, useRef, useState } from 'react';
import { PanResponder, Pressable, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Game } from '../data/games';
import { colors, fontFamily } from '../theme';
import { GameShell } from './GameShell';
import { LevelComplete, shouldShowAdAfter } from './LevelComplete';

// Level scales the target tile to merge to. L1=64, L2=128, L3=256, L4=512, L5=1024.
const LEVEL_TARGET = (level: number) => {
  if (level === 1) return 64;
  if (level === 2) return 128;
  if (level === 3) return 256;
  if (level === 4) return 512;
  return 1024;
};

const SIZE = 4;

type Grid = number[][];

function newGrid(): Grid {
  const g: Grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
  addTile(g);
  addTile(g);
  return g;
}

function addTile(g: Grid) {
  const empty: [number, number][] = [];
  g.forEach((r, y) => r.forEach((v, x) => { if (!v) empty.push([x, y]); }));
  if (!empty.length) return;
  const [x, y] = empty[Math.floor(Math.random() * empty.length)];
  g[y][x] = Math.random() < 0.85 ? 2 : 4;
}

function slideRow(row: number[]): { row: number[]; pts: number } {
  let r = row.filter((x) => x);
  let pts = 0;
  for (let i = 0; i < r.length - 1; i++) {
    if (r[i] === r[i + 1]) {
      r[i] *= 2;
      pts += r[i];
      r[i + 1] = 0;
    }
  }
  r = r.filter((x) => x);
  while (r.length < SIZE) r.push(0);
  return { row: r, pts };
}

type Direction = 'left' | 'right' | 'up' | 'down';

function move(g: Grid, dir: Direction): { grid: Grid; pts: number; changed: boolean } {
  let ng: Grid = g.map((r) => [...r]);
  let pts = 0;
  if (dir === 'left') {
    ng = ng.map((r) => {
      const res = slideRow(r);
      pts += res.pts;
      return res.row;
    });
  } else if (dir === 'right') {
    ng = ng.map((r) => {
      const res = slideRow([...r].reverse());
      pts += res.pts;
      return res.row.reverse();
    });
  } else if (dir === 'up') {
    for (let x = 0; x < SIZE; x++) {
      const col = ng.map((r) => r[x]);
      const res = slideRow(col);
      pts += res.pts;
      res.row.forEach((v, y) => { ng[y][x] = v; });
    }
  } else {
    for (let x = 0; x < SIZE; x++) {
      const col = ng.map((r) => r[x]).reverse();
      const res = slideRow(col);
      pts += res.pts;
      res.row.reverse().forEach((v, y) => { ng[y][x] = v; });
    }
  }
  const changed = ng.some((r, y) => r.some((v, x) => v !== g[y][x]));
  if (changed) addTile(ng);
  return { grid: ng, pts, changed };
}

const TILE_BG: Record<number, string> = {
  0: 'rgba(255,255,255,0.06)',
  2: '#eee4da',
  4: '#ede0c8',
  8: '#f2b179',
  16: '#f59563',
  32: '#f67c5f',
  64: '#f65e3b',
  128: '#edcf72',
  256: '#edcc61',
};

const TILE_TEXT: Record<number, string> = {
  2: '#776e65',
  4: '#776e65',
  8: '#fff',
  16: '#fff',
  32: '#fff',
  64: '#fff',
  128: '#fff',
  256: '#fff',
};

type Props = { game: Game; onBack: () => void; onComplete: (won: boolean, score: number, meta?: Record<string, number>) => void; initialLevel?: number };

export function MergeWave({ game, onBack, onComplete, initialLevel }: Props) {
  const [level, setLevel] = useState(initialLevel ?? 1);
  const target = LEVEL_TARGET(level);
  const [grid, setGrid] = useState<Grid>(newGrid);
  const [score, setScore] = useState(0);
  const [phase, setPhase] = useState<'playing' | 'complete'>('playing');
  const [lastPassed, setLastPassed] = useState(false);
  const [lastScore, setLastScore] = useState(0);
  const gridRef = useRef(grid);
  const phaseRef = useRef(phase);

  useEffect(() => { gridRef.current = grid; }, [grid]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  const apply = (dir: Direction) => {
    if (phaseRef.current !== 'playing') return;
    const { grid: ng, pts, changed } = move(gridRef.current, dir);
    if (!changed) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setGrid(ng);
    setScore((s) => s + pts);
    if (ng.some((r) => r.some((v) => v >= target))) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      const finalScore = (score + pts) * level;
      setLastPassed(true);
      setLastScore(finalScore);
      setPhase('complete');
      onComplete(true, finalScore, { level });
      return;
    }
    const hasMoves = ng.some((r, y) =>
      r.some((v, x) => {
        if (!v) return true;
        if (x < SIZE - 1 && r[x + 1] === v) return true;
        if (y < SIZE - 1 && ng[y + 1][x] === v) return true;
        return false;
      })
    );
    if (!hasMoves) {
      const finalScore = (score + pts) * level;
      setLastPassed(false);
      setLastScore(finalScore);
      setPhase('complete');
      onComplete(false, finalScore, { level });
    }
  };

  const reset = () => {
    setGrid(newGrid());
    setScore(0);
    setPhase('playing');
  };

  const startNextLevel = () => {
    setLevel((l) => l + 1);
    setGrid(newGrid());
    setScore(0);
    setPhase('playing');
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > 12 || Math.abs(gs.dy) > 12,
      onPanResponderRelease: (_, gs) => {
        if (Math.abs(gs.dx) > Math.abs(gs.dy)) apply(gs.dx > 0 ? 'right' : 'left');
        else apply(gs.dy > 0 ? 'down' : 'up');
      },
    })
  ).current;

  const cs = 56;

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
    <GameShell game={game} onBack={onBack} score={score} label={`Цель ${target}`}>
      <>
          <Text style={{ fontSize: 11, color: colors.textDim, fontFamily: fontFamily.semibold }}>
            Уровень {level} · дойди до {target} — свайп или стрелки
          </Text>
          <View
            {...panResponder.panHandlers}
            style={{
              padding: 6,
              backgroundColor: 'rgba(0,0,0,0.22)',
              borderRadius: 12,
              flexDirection: 'row',
              flexWrap: 'wrap',
              width: cs * SIZE + 30,
              gap: 5,
            }}
          >
            {grid.flat().map((v, i) => (
              <View
                key={i}
                style={{
                  width: cs,
                  height: cs,
                  borderRadius: 6,
                  backgroundColor: TILE_BG[v] || TILE_BG[256],
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {v ? (
                  <Text
                    style={{
                      fontSize: v >= 100 ? 18 : 22,
                      fontFamily: fontFamily.bold,
                      color: TILE_TEXT[v] || '#fff',
                    }}
                  >
                    {v}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
          <View style={{ alignItems: 'center', gap: 4 }}>
            <SwipeBtn dir="up" onPress={() => apply('up')} />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <SwipeBtn dir="left" onPress={() => apply('left')} />
              <SwipeBtn dir="down" onPress={() => apply('down')} />
              <SwipeBtn dir="right" onPress={() => apply('right')} />
            </View>
          </View>
      </>
    </GameShell>
  );
}

function SwipeBtn({ dir, onPress }: { dir: Direction; onPress: () => void }) {
  const arrows = { up: '↑', down: '↓', left: '←', right: '→' };
  return (
    <Pressable
      onPress={onPress}
      style={{
        width: 42,
        height: 42,
        borderRadius: 10,
        backgroundColor: colors.glassBg,
        borderWidth: 1,
        borderColor: colors.glassBorder,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontSize: 18, color: colors.text }}>{arrows[dir]}</Text>
    </Pressable>
  );
}
