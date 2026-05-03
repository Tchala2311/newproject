import React, { useEffect, useRef, useState } from 'react';
import { PanResponder, Text, View, useWindowDimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Game } from '../data/games';
import { GameShell } from './GameShell';
import { LevelComplete, shouldShowAdAfter } from './LevelComplete';
import { colors, fontFamily, radius } from '../theme';

type Props = {
  game: Game;
  onBack: () => void;
  onComplete: (won: boolean, score: number, meta?: Record<string, number>) => void;
  initialLevel?: number;
};

const COLS = 12;
const ROWS = 18;

type Pt = { x: number; y: number };
type Dir = 'U' | 'D' | 'L' | 'R';

const opp: Record<Dir, Dir> = { U: 'D', D: 'U', L: 'R', R: 'L' };

const LEVEL_CFG = (level: number) => {
  if (level === 1) return { tickMs: 160, target: 12 };
  if (level === 2) return { tickMs: 140, target: 18 };
  if (level === 3) return { tickMs: 120, target: 24 };
  if (level === 4) return { tickMs: 100, target: 30 };
  return { tickMs: 85, target: 36 };
};

function spawnFood(snake: Pt[]): Pt {
  while (true) {
    const p = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) };
    if (!snake.some((s) => s.x === p.x && s.y === p.y)) return p;
  }
}

export function SwipeSnake({ game, onBack, onComplete, initialLevel }: Props) {
  const { width } = useWindowDimensions();
  const cell = Math.min(Math.floor((width - 32) / COLS), 22);
  const boardW = cell * COLS;
  const boardH = cell * ROWS;

  const [level, setLevel] = useState(initialLevel ?? 1);
  const cfg = LEVEL_CFG(level);
  const [phase, setPhase] = useState<'playing' | 'complete'>('playing');
  const [snake, setSnake] = useState<Pt[]>([{ x: 6, y: 9 }, { x: 5, y: 9 }, { x: 4, y: 9 }]);
  const [dir, setDir] = useState<Dir>('R');
  const dirRef = useRef<Dir>('R');
  const [food, setFood] = useState<Pt>({ x: 9, y: 9 });
  const [lastPassed, setLastPassed] = useState(false);
  const [lastScore, setLastScore] = useState(0);

  useEffect(() => { dirRef.current = dir; }, [dir]);

  useEffect(() => {
    if (phase !== 'playing') return;
    const t = setInterval(() => {
      setSnake((prev) => {
        const head = prev[0];
        const d = dirRef.current;
        const next = {
          x: head.x + (d === 'L' ? -1 : d === 'R' ? 1 : 0),
          y: head.y + (d === 'U' ? -1 : d === 'D' ? 1 : 0),
        };
        if (next.x < 0 || next.x >= COLS || next.y < 0 || next.y >= ROWS ||
            prev.some((s) => s.x === next.x && s.y === next.y)) {
          const len = prev.length - 3;
          setLastPassed(false);
          setLastScore(len * level);
          setPhase('complete');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
          onComplete(false, len * level, { level });
          return prev;
        }
        const ate = next.x === food.x && next.y === food.y;
        const newSnake = [next, ...prev];
        if (!ate) newSnake.pop();
        else {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          setFood(spawnFood(newSnake));
          const len = newSnake.length - 3;
          if (len >= cfg.target) {
            setLastPassed(true);
            setLastScore(len * level * 10);
            setPhase('complete');
            onComplete(true, len * level * 10, { level });
          }
        }
        return newSnake;
      });
    }, cfg.tickMs);
    return () => clearInterval(t);
  }, [phase, food, onComplete, cfg.tickMs, cfg.target, level]);

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

  return (
    <GameShell game={game} onBack={onBack} score={`${snake.length - 3}/${cfg.target}`} label={`Ур. ${level}`}>
      <Text style={{ fontSize: 12, fontFamily: fontFamily.semibold, color: colors.textMuted, textAlign: 'center' }}>
        Свайпай в любую сторону. Цель — длина {cfg.target}.
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
