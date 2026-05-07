import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Game } from '../data/games';
import { colors, fontFamily } from '../theme';
import { GameShell } from './GameShell';
import { GameResult } from './GameResult';

const CF_COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6', '#1abc9c'];
const CF_SIZE = 7;
const CF_MAX = 20;

function makeGrid(): number[][] {
  return Array.from({ length: CF_SIZE }, () =>
    Array.from({ length: CF_SIZE }, () => Math.floor(Math.random() * CF_COLORS.length))
  );
}

function floodFill(grid: number[][], tx: number, ty: number, newC: number): number[][] {
  const oldC = grid[ty][tx];
  if (oldC === newC) return grid;
  const g = grid.map((r) => [...r]);
  const stack: [number, number][] = [[tx, ty]];
  while (stack.length) {
    const [x, y] = stack.pop()!;
    if (x < 0 || x >= CF_SIZE || y < 0 || y >= CF_SIZE || g[y][x] !== oldC) continue;
    g[y][x] = newC;
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  return g;
}

type Props = { game: Game; onBack: () => void; onComplete: (won: boolean, score: number) => void };

export function ColorFlood({ game, onBack, onComplete }: Props) {
  const [grid, setGrid] = useState<number[][]>(makeGrid);
  const [moves, setMoves] = useState(0);
  const [done, setDone] = useState(false);
  const [won, setWon] = useState(false);

  const movesLeft = CF_MAX - moves;
  const cellSize = Math.floor(220 / CF_SIZE);

  const reset = () => {
    setGrid(makeGrid());
    setMoves(0);
    setDone(false);
    setWon(false);
  };

  const pick = (ci: number) => {
    if (done) return;
    Haptics.selectionAsync().catch(() => {});
    const ng = floodFill(grid, 0, 0, ci);
    const nm = moves + 1;
    setGrid(ng);
    setMoves(nm);
    const allSame = ng.every((r) => r.every((c) => c === ci));
    if (allSame) {
      const score = movesLeft * 10;
      setDone(true);
      setWon(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      onComplete(true, score);
    } else if (nm >= CF_MAX) {
      setDone(true);
      setWon(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      onComplete(false, 0);
    }
  };

  return (
    <GameShell game={game} onBack={onBack} score={movesLeft} label="Ходов">
      {done ? (
        <GameResult
          won={won}
          score={won ? movesLeft * 10 : 0}
          accent={game.accent}
          onRestart={reset}
          onBack={onBack}
          game={game}
        />
      ) : (
        <>
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              width: cellSize * CF_SIZE,
              borderRadius: 10,
              overflow: 'hidden',
              gap: 2,
            }}
          >
            {grid.flat().map((c, i) => {
              const x = i % CF_SIZE;
              const y = Math.floor(i / CF_SIZE);
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
            {CF_COLORS.map((c, i) => {
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
        </>
      )}
    </GameShell>
  );
}
