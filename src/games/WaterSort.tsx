import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
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

const TUBE_HEIGHT = 4;
const COLORS = ['#FF4D7A', '#3B82F6', '#22C55E', '#FACC15'];

type Tube = string[]; // bottom-to-top stack

function makeBoard(): Tube[] {
  const all: string[] = [];
  COLORS.forEach((c) => { for (let i = 0; i < TUBE_HEIGHT; i += 1) all.push(c); });
  // shuffle
  for (let i = all.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  const tubes: Tube[] = [];
  for (let i = 0; i < COLORS.length; i += 1) tubes.push(all.slice(i * TUBE_HEIGHT, (i + 1) * TUBE_HEIGHT));
  tubes.push([]); // empty buffer
  tubes.push([]); // second empty buffer
  return tubes;
}

function isSolved(tubes: Tube[]): boolean {
  return tubes.every((t) => t.length === 0 || (t.length === TUBE_HEIGHT && t.every((c) => c === t[0])));
}

export function WaterSort({ game, onBack, onComplete }: Props) {
  const [tubes, setTubes] = useState<Tube[]>(makeBoard);
  const [picked, setPicked] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);
  const [won, setWon] = useState(false);

  const tap = (i: number) => {
    if (won) return;
    if (picked === null) {
      if (tubes[i].length === 0) return;
      setPicked(i);
      Haptics.selectionAsync().catch(() => {});
      return;
    }
    if (picked === i) {
      setPicked(null);
      return;
    }
    const from = tubes[picked];
    const to = tubes[i];
    const top = from[from.length - 1];
    if (!top) { setPicked(null); return; }
    if (to.length >= TUBE_HEIGHT) { setPicked(null); return; }
    if (to.length > 0 && to[to.length - 1] !== top) { setPicked(null); return; }

    // Pour as many same-color as possible
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
      setWon(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      const score = Math.max(50, 200 - moves * 2);
      onComplete(true, score);
    }
  };

  const reset = () => {
    setTubes(makeBoard());
    setPicked(null);
    setMoves(0);
    setWon(false);
  };

  if (won) {
    return (
      <GameShell game={game} onBack={onBack} score={moves} label="Ходов">
        <GameResult won score={Math.max(50, 200 - moves * 2)} accent={game.accent} onRestart={reset} onBack={onBack} />
      </GameShell>
    );
  }

  return (
    <GameShell game={game} onBack={onBack} score={moves} label="Ходов">
      <Text style={{ fontSize: 12, fontFamily: fontFamily.semibold, color: colors.textMuted, textAlign: 'center' }}>
        Перелей жидкость так, чтобы в каждой колбе был один цвет.
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, paddingHorizontal: 8 }}>
        {tubes.map((t, i) => (
          <Pressable key={i} onPress={() => tap(i)}>
            <View
              style={{
                width: 50,
                height: 180,
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
                    height: 40,
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
          <Text style={{ fontSize: 12, fontFamily: fontFamily.bold, color: '#fff' }}>Начать заново</Text>
        </View>
      </Pressable>
    </GameShell>
  );
}
