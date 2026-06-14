import React, { useRef, useState } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Game } from '../data/games';
import { colors, fontFamily } from '../theme';
import { GameShell } from './GameShell';
import { LevelComplete, shouldShowAdAfter } from './LevelComplete';

const CF_COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6', '#1abc9c'];

const LEVEL_CFG = (level: number) => ({
  size: Math.min(12, 5 + level),
  max: Math.min(34, 20 + level * 2),
  palette: Math.min(6, 4 + Math.floor(level / 2)),
});

function makeGrid(size: number, palette: number): number[][] {
  return Array.from({ length: size }, () =>
    Array.from({ length: size }, () => Math.floor(Math.random() * palette))
  );
}

function floodFill(grid: number[][], tx: number, ty: number, newC: number): number[][] {
  const oldC = grid[ty][tx];
  if (oldC === newC) return grid;
  const size = grid.length;
  const g = grid.map((r) => [...r]);
  const stack: [number, number][] = [[tx, ty]];
  while (stack.length) {
    const [x, y] = stack.pop()!;
    if (x < 0 || x >= size || y < 0 || y >= size || g[y][x] !== oldC) continue;
    g[y][x] = newC;
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  return g;
}

type Props = { game: Game; onBack: () => void; onComplete: (won: boolean, score: number, meta?: Record<string, number>) => void; initialLevel?: number };

export function ColorFlood({ game, onBack, onComplete, initialLevel }: Props) {
  const { width, height } = useWindowDimensions();
  const [level, setLevel] = useState(initialLevel ?? 1);
  const cfg = LEVEL_CFG(level);
  const [grid, setGrid] = useState<number[][]>(() => makeGrid(cfg.size, cfg.palette));
  const [moves, setMoves] = useState(0);
  const [phase, setPhase] = useState<'playing' | 'complete'>('playing');
  const [lastPassed, setLastPassed] = useState(false);
  const [lastScore, setLastScore] = useState(0);
  const completedRef = useRef(false);

  const movesLeft = cfg.max - moves;
  const boardSize = Math.min(width - 32, height * 0.52);
  const cellSize = Math.floor(boardSize / cfg.size);

  const reset = () => {
    completedRef.current = false;
    setGrid(makeGrid(cfg.size, cfg.palette));
    setMoves(0);
    setPhase('playing');
  };

  const startNextLevel = () => {
    const nl = level + 1;
    const nc = LEVEL_CFG(nl);
    completedRef.current = false;
    setLevel(nl);
    setGrid(makeGrid(nc.size, nc.palette));
    setMoves(0);
    setPhase('playing');
  };

  const pick = (ci: number) => {
    if (phase !== 'playing' || completedRef.current) return;
    Haptics.selectionAsync().catch(() => {});
    const ng = floodFill(grid, 0, 0, ci);
    const nm = moves + 1;
    setGrid(ng);
    setMoves(nm);
    const allSame = ng.every((r) => r.every((c) => c === ci));
    if (allSame) {
      completedRef.current = true;
      // A win on the very last allowed move would otherwise score 0; floor it
      // so finishing always rewards something proportional to the level.
      const score = Math.max(10 * level, (cfg.max - nm) * 10 * level);
      setLastPassed(true);
      setLastScore(score);
      setPhase('complete');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      onComplete(true, score, { level });
    } else if (nm >= cfg.max) {
      completedRef.current = true;
      setLastPassed(false);
      setLastScore(0);
      setPhase('complete');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      onComplete(false, 0, { level });
    }
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
    <GameShell game={game} onBack={onBack} score={`${movesLeft}/${cfg.max}`} label={`Ур. ${level}`}>
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          width: cellSize * cfg.size + 2,
          borderRadius: 10,
          overflow: 'hidden',
          gap: 2,
        }}
      >
        {grid.flat().map((c, i) => {
          const x = i % cfg.size;
          const y = Math.floor(i / cfg.size);
          const isAnchor = x === 0 && y === 0;
          return (
            <View
              key={i}
              style={{
                width: cellSize,
                height: cellSize,
                backgroundColor: CF_COLORS[c],
                borderWidth: isAnchor ? 2 : 0,
                borderColor: 'rgba(255,255,255,0.85)',
              }}
            />
          );
        })}
      </View>
      <Text style={{ fontSize: 11, color: colors.textDim, fontFamily: fontFamily.semibold }}>
        Закрась всё поле одним цветом
      </Text>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {CF_COLORS.slice(0, cfg.palette).map((c, i) => {
          const active = grid[0][0] === i;
          return (
            <Pressable
              key={i}
              onPress={() => pick(i)}
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: c,
                borderWidth: active ? 3 : 0,
                borderColor: 'white',
                transform: [{ scale: active ? 1.15 : 1 }],
              }}
            />
          );
        })}
      </View>
    </GameShell>
  );
}
