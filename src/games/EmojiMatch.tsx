import React, { useEffect, useState } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
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

const EMOJIS = ['🦊', '🐼', '🦄', '🐙', '🦖', '🐧', '🦉', '🐝'];
const ROUND_TIME = 60;

type Tile = {
  idx: number;
  emoji: string;
  flipped: boolean;
  matched: boolean;
};

function makeBoard(): Tile[] {
  const pool = [...EMOJIS, ...EMOJIS];
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.map((e, i) => ({ idx: i, emoji: e, flipped: false, matched: false }));
}

export function EmojiMatch({ game, onBack, onComplete }: Props) {
  const { width } = useWindowDimensions();
  const cols = 4;
  const cell = Math.min(70, (width - 60) / cols);

  const [tiles, setTiles] = useState<Tile[]>(makeBoard);
  const [first, setFirst] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);
  const [time, setTime] = useState(ROUND_TIME);
  const [done, setDone] = useState(false);
  const [won, setWon] = useState(false);
  const [lock, setLock] = useState(false);

  useEffect(() => {
    if (done) return;
    if (time <= 0) {
      setDone(true);
      onComplete(false, tiles.filter((t) => t.matched).length / 2);
      return;
    }
    if (tiles.every((t) => t.matched)) {
      setDone(true);
      setWon(true);
      const score = Math.max(50, time * 5 + (60 - moves) * 2);
      onComplete(true, score);
      return;
    }
    const t = setTimeout(() => setTime((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [time, done, tiles, moves, onComplete]);

  const tap = (idx: number) => {
    if (lock || done) return;
    const tile = tiles[idx];
    if (tile.flipped || tile.matched) return;
    Haptics.selectionAsync().catch(() => {});

    if (first === null) {
      setTiles((prev) => prev.map((t, i) => (i === idx ? { ...t, flipped: true } : t)));
      setFirst(idx);
      return;
    }

    const next = tiles.map((t, i) => (i === idx ? { ...t, flipped: true } : t));
    setTiles(next);
    setMoves((m) => m + 1);

    if (next[first].emoji === next[idx].emoji) {
      setTimeout(() => {
        setTiles((prev) => prev.map((t, i) => (i === first || i === idx ? { ...t, matched: true } : t)));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        setFirst(null);
      }, 220);
    } else {
      setLock(true);
      setTimeout(() => {
        setTiles((prev) => prev.map((t, i) => (i === first || i === idx ? { ...t, flipped: false } : t)));
        setFirst(null);
        setLock(false);
      }, 720);
    }
  };

  const reset = () => {
    setTiles(makeBoard());
    setFirst(null);
    setMoves(0);
    setTime(ROUND_TIME);
    setDone(false);
    setWon(false);
    setLock(false);
  };

  if (done) {
    return (
      <GameShell game={game} onBack={onBack} score={moves} label="Ходов">
        <GameResult won={won} score={tiles.filter((t) => t.matched).length / 2} accent={game.accent} onRestart={reset} onBack={onBack} />
      </GameShell>
    );
  }

  return (
    <GameShell game={game} onBack={onBack} score={moves} label="Ходов" timer={time} timerMax={ROUND_TIME}>
      <Text style={{ fontSize: 12, fontFamily: fontFamily.semibold, color: colors.textMuted, textAlign: 'center' }}>
        Найди все пары за минуту.
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, paddingHorizontal: 4 }}>
        {tiles.map((t) => (
          <Pressable key={t.idx} onPress={() => tap(t.idx)} disabled={t.matched}>
            <View
              style={{
                width: cell,
                height: cell,
                borderRadius: radius.lg,
                backgroundColor: t.matched
                  ? `${game.accent}33`
                  : t.flipped
                  ? 'rgba(255,255,255,0.16)'
                  : 'rgba(0,0,0,0.4)',
                borderWidth: 1,
                borderColor: t.matched ? `${game.accent}88` : 'rgba(255,255,255,0.12)',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: t.matched ? 0.55 : 1,
              }}
            >
              <Text style={{ fontSize: cell * 0.55 }}>
                {t.flipped || t.matched ? t.emoji : '❓'}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>
    </GameShell>
  );
}
