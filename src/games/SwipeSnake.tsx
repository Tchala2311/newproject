import React, { useEffect, useRef, useState } from 'react';
import { PanResponder, Text, View, useWindowDimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Game } from '../data/games';
import { GameShell } from './GameShell';
import { GameResult } from './GameResult';
import { colors, fontFamily, radius } from '../theme';

type Props = {
  game: Game;
  onBack: () => void;
  onComplete: (won: boolean, score: number) => void;
};

const COLS = 12;
const ROWS = 18;
const TICK_MS = 140;

type Pt = { x: number; y: number };
type Dir = 'U' | 'D' | 'L' | 'R';

const opp: Record<Dir, Dir> = { U: 'D', D: 'U', L: 'R', R: 'L' };

function spawnFood(snake: Pt[]): Pt {
  while (true) {
    const p = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) };
    if (!snake.some((s) => s.x === p.x && s.y === p.y)) return p;
  }
}

export function SwipeSnake({ game, onBack, onComplete }: Props) {
  const { width } = useWindowDimensions();
  const cell = Math.min(Math.floor((width - 32) / COLS), 22);
  const boardW = cell * COLS;
  const boardH = cell * ROWS;

  const [snake, setSnake] = useState<Pt[]>([{ x: 6, y: 9 }, { x: 5, y: 9 }, { x: 4, y: 9 }]);
  const [dir, setDir] = useState<Dir>('R');
  const dirRef = useRef<Dir>('R');
  const [food, setFood] = useState<Pt>({ x: 9, y: 9 });
  const [done, setDone] = useState(false);
  const wonRef = useRef(false);

  useEffect(() => { dirRef.current = dir; }, [dir]);

  useEffect(() => {
    if (done) return;
    const t = setInterval(() => {
      setSnake((prev) => {
        const head = prev[0];
        const d = dirRef.current;
        const next = {
          x: head.x + (d === 'L' ? -1 : d === 'R' ? 1 : 0),
          y: head.y + (d === 'U' ? -1 : d === 'D' ? 1 : 0),
        };
        if (next.x < 0 || next.x >= COLS || next.y < 0 || next.y >= ROWS) {
          setDone(true);
          onComplete(false, prev.length - 3);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
          return prev;
        }
        if (prev.some((s) => s.x === next.x && s.y === next.y)) {
          setDone(true);
          onComplete(false, prev.length - 3);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
          return prev;
        }
        const ate = next.x === food.x && next.y === food.y;
        const newSnake = [next, ...prev];
        if (!ate) newSnake.pop();
        else {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          setFood(spawnFood(newSnake));
          if (newSnake.length >= 30) {
            wonRef.current = true;
            setDone(true);
            onComplete(true, newSnake.length - 3);
          }
        }
        return newSnake;
      });
    }, TICK_MS);
    return () => clearInterval(t);
  }, [done, food, onComplete]);

  const responder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8 || Math.abs(g.dy) > 8,
      onPanResponderRelease: (_, g) => {
        const horiz = Math.abs(g.dx) > Math.abs(g.dy);
        const next: Dir = horiz ? (g.dx > 0 ? 'R' : 'L') : (g.dy > 0 ? 'D' : 'U');
        if (next !== opp[dirRef.current]) setDir(next);
      },
    })
  ).current;

  const reset = () => {
    setSnake([{ x: 6, y: 9 }, { x: 5, y: 9 }, { x: 4, y: 9 }]);
    setDir('R');
    setFood({ x: 9, y: 9 });
    setDone(false);
    wonRef.current = false;
  };

  if (done) {
    return (
      <GameShell game={game} onBack={onBack} score={snake.length - 3} label="Длина">
        <GameResult won={wonRef.current} score={snake.length - 3} accent={game.accent} onRestart={reset} onBack={onBack} />
      </GameShell>
    );
  }

  return (
    <GameShell game={game} onBack={onBack} score={snake.length - 3} label="Длина">
      <Text style={{ fontSize: 12, fontFamily: fontFamily.semibold, color: colors.textMuted, textAlign: 'center' }}>
        Свайпай в любую сторону. Доберись до длины 30.
      </Text>
      <View
        {...responder.panHandlers}
        style={{
          width: boardW,
          height: boardH,
          backgroundColor: 'rgba(0,0,0,0.3)',
          borderRadius: radius.lg,
          overflow: 'hidden',
        }}
      >
        {snake.map((s, i) => (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: s.x * cell,
              top: s.y * cell,
              width: cell - 1,
              height: cell - 1,
              backgroundColor: i === 0 ? game.accent : `${game.accent}cc`,
              borderRadius: 3,
            }}
          />
        ))}
        <View
          style={{
            position: 'absolute',
            left: food.x * cell + 2,
            top: food.y * cell + 2,
            width: cell - 5,
            height: cell - 5,
            borderRadius: (cell - 5) / 2,
            backgroundColor: '#FF4D7A',
          }}
        />
      </View>
    </GameShell>
  );
}
