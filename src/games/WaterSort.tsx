import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
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

export function WaterSort({ game, onBack, onComplete, initialLevel }: Props) {
  const [level, setLevel] = useState(initialLevel ?? 1);
  const cfg = LEVEL_CFG(level);
  const [tubes, setTubes] = useState<Tube[]>(() => makeBoard(cfg.colorCount, cfg.buffers));
  const [picked, setPicked] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);
  const [phase, setPhase] = useState<'playing' | 'complete'>('playing');
  const [lastPassed, setLastPassed] = useState(false);
  const [lastScore, setLastScore] = useState(0);

  const tap = (i: number) => {
    if (phase !== 'playing') return;
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
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      const score = Math.max(50, 200 - moves * 2) * level;
      setLastPassed(true);
      setLastScore(score);
      setPhase('complete');
      onComplete(true, score, { level });
    }
  };

  const reset = () => {
    setTubes(makeBoard(cfg.colorCount, cfg.buffers));
    setPicked(null);
    setMoves(0);
    setPhase('playing');
  };

  const startNextLevel = () => {
    const nextLevel = level + 1;
    const nextCfg = LEVEL_CFG(nextLevel);
    setLevel(nextLevel);
    setTubes(makeBoard(nextCfg.colorCount, nextCfg.buffers));
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

  const tubeWidth = cfg.colorCount + cfg.buffers > 6 ? 38 : 50;
  const tubeHeight = TUBE_HEIGHT * 36 + 4;

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
                    height: 36,
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
