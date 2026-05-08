import React, { useEffect, useState } from 'react';
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

const ALL_EMOJIS = ['🦊', '🐼', '🦄', '🐙', '🦖', '🐧', '🦉', '🐝', '🦁', '🐸', '🐵', '🐢'];

const LEVEL_CFG = (level: number) => {
  const pairs = Math.min(12, 5 + level);          // 6, 7, 8, …, capped at 12 (pool size)
  const time = Math.max(35, 65 - level * 3);
  const cols = pairs <= 6 ? 3 : 4;
  return { pairs, time, cols };
};

type Tile = { idx: number; emoji: string; flipped: boolean; matched: boolean };

function makeBoard(pairs: number): Tile[] {
  const set = ALL_EMOJIS.slice(0, pairs);
  const pool = [...set, ...set];
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.map((e, i) => ({ idx: i, emoji: e, flipped: false, matched: false }));
}

export function EmojiMatch({ game, onBack, onComplete, initialLevel }: Props) {
  const { width, height } = useWindowDimensions();
  const [level, setLevel] = useState(initialLevel ?? 1);
  const cfg = LEVEL_CFG(level);
  const cell = Math.min((width - 60) / cfg.cols, height * 0.14);

  const [phase, setPhase] = useState<'playing' | 'complete'>('playing');
  const [tiles, setTiles] = useState<Tile[]>(() => makeBoard(cfg.pairs));
  const [first, setFirst] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);
  const [time, setTime] = useState(cfg.time);
  const [lock, setLock] = useState(false);
  const [lastPassed, setLastPassed] = useState(false);
  const [lastScore, setLastScore] = useState(0);

  useEffect(() => {
    if (phase !== 'playing') return;
    if (time <= 0) {
      const matched = tiles.filter((t) => t.matched).length / 2;
      setLastPassed(false);
      setLastScore(matched);
      setPhase('complete');
      onComplete(false, matched, { level });
      return;
    }
    if (tiles.every((t) => t.matched)) {
      const score = Math.max(50, time * 5 + (cfg.pairs * 10 - moves) * 2) * level;
      setLastPassed(true);
      setLastScore(score);
      setPhase('complete');
      onComplete(true, score, { level });
      return;
    }
    const t = setTimeout(() => setTime((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [time, phase, tiles, moves, onComplete, cfg.pairs, level]);

  const tap = (idx: number) => {
    if (lock || phase !== 'playing') return;
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
    setTiles(makeBoard(cfg.pairs));
    setFirst(null);
    setMoves(0);
    setTime(cfg.time);
    setPhase('playing');
    setLock(false);
  };

  const startNextLevel = () => {
    const nl = level + 1;
    const nc = LEVEL_CFG(nl);
    setLevel(nl);
    setTiles(makeBoard(nc.pairs));
    setFirst(null);
    setMoves(0);
    setTime(nc.time);
    setPhase('playing');
    setLock(false);
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
    <GameShell game={game} onBack={onBack} score={moves} label={`Ур. ${level}`} timer={time} timerMax={cfg.time}>
      <Text style={{ fontSize: 12, fontFamily: fontFamily.semibold, color: colors.textMuted, textAlign: 'center' }}>
        Найди все {cfg.pairs} пар(ы).
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
