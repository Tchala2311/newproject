import React, { useRef, useState } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
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

const TUBE_HEIGHT = 4;
const ALL_COLORS = ['#FF4D7A', '#3B82F6', '#22C55E', '#FACC15', '#A855F7', '#F97316', '#0EA5E9'];

type Tube = string[];

// (colors, buffers): higher levels = more colors, fewer empty buffer tubes.
const LEVEL_CFG = (level: number) => ({
  colorCount: Math.min(7, 3 + level),
  buffers: level >= 4 ? 1 : 2,
});

function makeBoard(colorCount: number, buffers: number): Tube[] {
  const palette = ALL_COLORS.slice(0, colorCount);
  const all: string[] = [];
  palette.forEach((c) => { for (let i = 0; i < TUBE_HEIGHT; i += 1) all.push(c); });
  for (let i = all.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  const tubes: Tube[] = [];
  for (let i = 0; i < palette.length; i += 1) tubes.push(all.slice(i * TUBE_HEIGHT, (i + 1) * TUBE_HEIGHT));
  for (let i = 0; i < buffers; i += 1) tubes.push([]);
  return tubes;
}

function isSolved(tubes: Tube[]): boolean {
  return tubes.every((t) => t.length === 0 || (t.length === TUBE_HEIGHT && t.every((c) => c === t[0])));
}

// How many same-colour units can pour from `from`'s top onto `to`.
function pourCount(from: Tube, to: Tube): number {
  if (from.length === 0 || to.length >= TUBE_HEIGHT) return 0;
  const top = from[from.length - 1];
  if (to.length > 0 && to[to.length - 1] !== top) return 0;
  let run = 0;
  for (let k = from.length - 1; k >= 0 && from[k] === top; k -= 1) run += 1;
  return Math.min(run, TUBE_HEIGHT - to.length);
}

function applyPour(tubes: Tube[], i: number, j: number, count: number): Tube[] {
  const top = tubes[i][tubes[i].length - 1];
  return tubes.map((t, idx) => {
    if (idx === i) return t.slice(0, t.length - count);
    if (idx === j) return [...t, ...Array(count).fill(top)];
    return t;
  });
}

// Permutation-invariant key so equivalent states aren't re-explored.
function stateKey(tubes: Tube[]): string {
  return tubes.map((t) => t.join('')).sort().join('/');
}

// DFS solver with a node cap. Returns false if unsolvable OR if the cap is hit
// (we then just deal a different board), which keeps board generation bounded.
function isSolvable(start: Tube[]): boolean {
  const visited = new Set<string>();
  const stack: Tube[][] = [start];
  let nodes = 0;
  const MAX_NODES = 60000;
  while (stack.length) {
    if (nodes++ > MAX_NODES) return false;
    const cur = stack.pop()!;
    if (isSolved(cur)) return true;
    const key = stateKey(cur);
    if (visited.has(key)) continue;
    visited.add(key);
    const n = cur.length;
    for (let i = 0; i < n; i += 1) {
      const from = cur[i];
      if (from.length === 0) continue;
      // Relocating an already-uniform tube into an empty one is never required
      // to solve and only fans out the search — skip it.
      const uniformWhole = from.every((c) => c === from[0]);
      for (let j = 0; j < n; j += 1) {
        if (i === j) continue;
        const count = pourCount(from, cur[j]);
        if (count <= 0) continue;
        if (uniformWhole && cur[j].length === 0) continue;
        const nextState = applyPour(cur, i, j, count);
        if (!visited.has(stateKey(nextState))) stack.push(nextState);
      }
    }
  }
  return false;
}

// Deal only boards that are actually solvable so a player can never get stuck.
function makeSolvableBoard(colorCount: number, buffers: number): Tube[] {
  let board = makeBoard(colorCount, buffers);
  for (let attempt = 0; attempt < 40 && !isSolvable(board); attempt += 1) {
    board = makeBoard(colorCount, buffers);
  }
  return board;
}

export function WaterSort({ game, onBack, onComplete, initialLevel }: Props) {
  const { width, height } = useWindowDimensions();
  const [level, setLevel] = useState(initialLevel ?? 1);
  const cfg = LEVEL_CFG(level);
  const [tubes, setTubes] = useState<Tube[]>(() => makeSolvableBoard(cfg.colorCount, cfg.buffers));
  const [picked, setPicked] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);
  const [phase, setPhase] = useState<'playing' | 'complete'>('playing');
  const [lastPassed, setLastPassed] = useState(false);
  const [lastScore, setLastScore] = useState(0);
  const completedRef = useRef(false);

  const tap = (i: number) => {
    if (phase !== 'playing' || completedRef.current) return;
    if (picked === null) {
      if (tubes[i].length === 0) return;
      setPicked(i);
      Haptics.selectionAsync().catch(() => {});
      return;
    }
    if (picked === i) { setPicked(null); return; }
    const from = tubes[picked];
    const to = tubes[i];
    const top = from[from.length - 1];
    if (!top || to.length >= TUBE_HEIGHT || (to.length > 0 && to[to.length - 1] !== top)) {
      setPicked(null); return;
    }
    let count = 0;
    while (
      from.length - 1 - count >= 0 &&
      from[from.length - 1 - count] === top &&
      to.length + count < TUBE_HEIGHT
    ) count += 1;
    const next = tubes.map((t, idx) => {
      if (idx === picked) return t.slice(0, t.length - count);
      if (idx === i) return [...t, ...Array(count).fill(top)];
      return t;
    });
    setTubes(next);
    setMoves((m) => m + 1);
    setPicked(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (isSolved(next)) {
      completedRef.current = true;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      const score = Math.max(50, 200 - moves * 2) * level;
      setLastPassed(true);
      setLastScore(score);
      setPhase('complete');
      onComplete(true, score, { level });
    }
  };

  const reset = () => {
    completedRef.current = false;
    setTubes(makeSolvableBoard(cfg.colorCount, cfg.buffers));
    setPicked(null);
    setMoves(0);
    setPhase('playing');
  };

  const startNextLevel = () => {
    const nextLevel = level + 1;
    const nextCfg = LEVEL_CFG(nextLevel);
    completedRef.current = false;
    setLevel(nextLevel);
    setTubes(makeSolvableBoard(nextCfg.colorCount, nextCfg.buffers));
    setPicked(null);
    setMoves(0);
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

  const totalTubes = cfg.colorCount + cfg.buffers;
  const maxTubeW = Math.floor((width - 32) / Math.min(totalTubes, 5)) - 10;
  const tubeWidth = Math.min(maxTubeW, totalTubes > 6 ? 54 : 68);
  const segH = Math.floor(Math.min(height * 0.55, 400) / TUBE_HEIGHT);
  const tubeHeight = TUBE_HEIGHT * segH + 4;

  return (
    <GameShell game={game} onBack={onBack} score={moves} label={`Ур. ${level}`}>
      <Text style={{ fontSize: 12, fontFamily: fontFamily.semibold, color: colors.textMuted, textAlign: 'center' }}>
        Перелей жидкость так, чтобы в каждой колбе был один цвет.
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, paddingHorizontal: 8 }}>
        {tubes.map((t, i) => (
          <Pressable key={i} onPress={() => tap(i)}>
            <View
              style={{
                width: tubeWidth,
                height: tubeHeight,
                borderWidth: 2,
                borderColor: picked === i ? game.accent : 'rgba(255,255,255,0.4)',
                borderTopWidth: 0,
                borderRadius: 8,
                borderTopLeftRadius: 0,
                borderTopRightRadius: 0,
                backgroundColor: 'rgba(0,0,0,0.2)',
                justifyContent: 'flex-end',
                overflow: 'hidden',
                transform: picked === i ? [{ translateY: -10 }] : [],
              }}
            >
              {t.map((c, j) => (
                <View
                  key={j}
                  style={{
                    height: segH,
                    backgroundColor: c,
                    borderTopWidth: j === t.length - 1 ? 1 : 0,
                    borderTopColor: 'rgba(255,255,255,0.25)',
                  }}
                />
              ))}
            </View>
          </Pressable>
        ))}
      </View>
      <Pressable onPress={reset}>
        <View style={{ paddingHorizontal: 18, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.08)' }}>
          <Text style={{ fontSize: 12, fontFamily: fontFamily.bold, color: '#fff' }}>Перезапуск уровня</Text>
        </View>
      </Pressable>
    </GameShell>
  );
}
