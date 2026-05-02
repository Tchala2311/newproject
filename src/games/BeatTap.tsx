import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, Text, View, useWindowDimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Game } from '../data/games';
import { GameShell } from './GameShell';
import { GameResult } from './GameResult';
import { colors, fontFamily } from '../theme';

type Props = {
  game: Game;
  onBack: () => void;
  onComplete: (won: boolean, score: number) => void;
};

const ROUND_TIME = 30;
const BPM = 96;
const BEAT_MS = (60 / BPM) * 1000;

type Note = {
  id: number;
  x: number; // 0..1
  spawnAt: number; // ms since round start
  hitAt?: number;
  judgement?: 'perfect' | 'good' | 'miss';
};

export function BeatTap({ game, onBack, onComplete }: Props) {
  const { width } = useWindowDimensions();
  const lanes = 3;
  const laneW = (width - 32) / lanes;

  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [time, setTime] = useState(ROUND_TIME);
  const [done, setDone] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [flash, setFlash] = useState<string | null>(null);
  const startRef = useRef(Date.now());
  const noteIdRef = useRef(0);

  // 1s travel time before reaching target
  const TRAVEL = 1100;

  useEffect(() => {
    startRef.current = Date.now();
    // Pre-generate beat schedule
    const schedule: Note[] = [];
    for (let beat = 0; beat * BEAT_MS < ROUND_TIME * 1000; beat += 1) {
      // Skip every 4th to leave breathing room
      if (beat % 4 === 3) continue;
      schedule.push({
        id: noteIdRef.current++,
        x: Math.random(),
        spawnAt: beat * BEAT_MS,
      });
    }
    setNotes(schedule);
  }, []);

  useEffect(() => {
    if (done) return;
    const t = setInterval(() => {
      const elapsed = (Date.now() - startRef.current) / 1000;
      const remain = Math.max(0, ROUND_TIME - elapsed);
      setTime(remain);
      if (remain <= 0) {
        setDone(true);
        onComplete(score >= 800, score);
      }
    }, 100);
    return () => clearInterval(t);
  }, [done, score, onComplete]);

  // Auto-miss notes that pass the target line
  useEffect(() => {
    if (done) return;
    const t = setInterval(() => {
      const now = Date.now() - startRef.current;
      setNotes((prev) =>
        prev.map((n) => {
          if (n.judgement) return n;
          if (now > n.spawnAt + TRAVEL + 180) {
            setCombo(0);
            return { ...n, judgement: 'miss' as const };
          }
          return n;
        })
      );
    }, 80);
    return () => clearInterval(t);
  }, [done]);

  const tap = (lane: number) => {
    const now = Date.now() - startRef.current;
    // Find best matching active note in this lane
    let best: Note | null = null;
    let bestDelta = 9999;
    for (const n of notes) {
      if (n.judgement) continue;
      const noteLane = Math.floor(n.x * lanes);
      if (noteLane !== lane) continue;
      const targetAt = n.spawnAt + TRAVEL;
      const delta = Math.abs(now - targetAt);
      if (delta < bestDelta && delta < 280) {
        bestDelta = delta;
        best = n;
      }
    }
    if (!best) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      return;
    }
    const judgement: 'perfect' | 'good' | 'miss' =
      bestDelta < 80 ? 'perfect' : bestDelta < 180 ? 'good' : 'miss';
    const points = judgement === 'perfect' ? 100 : judgement === 'good' ? 50 : 0;
    setScore((s) => s + points + (combo * 5));
    setCombo((c) => (judgement === 'miss' ? 0 : c + 1));
    setFlash(judgement);
    setTimeout(() => setFlash(null), 220);
    setNotes((prev) => prev.map((n) => (n.id === best!.id ? { ...n, judgement, hitAt: now } : n)));
    if (judgement === 'perfect') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    else if (judgement === 'good') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    else Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
  };

  const reset = () => {
    setScore(0);
    setCombo(0);
    setTime(ROUND_TIME);
    setDone(false);
    setNotes([]);
    startRef.current = Date.now();
    setTimeout(() => {
      const sched: Note[] = [];
      for (let beat = 0; beat * BEAT_MS < ROUND_TIME * 1000; beat += 1) {
        if (beat % 4 === 3) continue;
        sched.push({ id: noteIdRef.current++, x: Math.random(), spawnAt: beat * BEAT_MS });
      }
      setNotes(sched);
    }, 60);
  };

  if (done) {
    return (
      <GameShell game={game} onBack={onBack} score={score} label="Очки">
        <GameResult won={score >= 800} score={score} accent={game.accent} onRestart={reset} onBack={onBack} />
      </GameShell>
    );
  }

  const elapsed = ROUND_TIME - time;
  const elapsedMs = elapsed * 1000;
  const targetY = 0.78; // 78% down the play area

  return (
    <GameShell game={game} onBack={onBack} score={score} label="Очки" timer={time} timerMax={ROUND_TIME}>
      <Text style={{ fontSize: 12, fontFamily: fontFamily.semibold, color: colors.textMuted, textAlign: 'center' }}>
        Тапни кружок, когда он попадает в цель. Чувствуй ритм.
      </Text>
      <View style={{ flex: 1, width: '100%', flexDirection: 'row', borderRadius: 12, overflow: 'hidden', backgroundColor: 'rgba(0,0,0,0.3)' }}>
        {Array.from({ length: lanes }).map((_, lane) => (
          <Pressable
            key={lane}
            onPress={() => tap(lane)}
            style={{
              flex: 1,
              borderRightWidth: lane < lanes - 1 ? 1 : 0,
              borderRightColor: 'rgba(255,255,255,0.08)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          />
        ))}
        {/* Target ring overlay */}
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: `${targetY * 100}%`, alignItems: 'stretch' }}>
          <View style={{ height: 3, backgroundColor: game.accent, opacity: 0.6 }} />
        </View>

        {/* Notes */}
        {notes.map((n) => {
          if (n.judgement) return null;
          const noteLane = Math.floor(n.x * lanes);
          const progress = (elapsedMs - n.spawnAt) / TRAVEL;
          if (progress < 0 || progress > 1.15) return null;
          return (
            <View
              key={n.id}
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: noteLane * laneW + laneW / 2 - 22,
                top: `${progress * targetY * 100}%`,
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: game.accent,
                borderWidth: 2,
                borderColor: '#fff',
                opacity: 0.92,
              }}
            />
          );
        })}

        {flash ? (
          <View pointerEvents="none" style={{ position: 'absolute', top: '40%', left: 0, right: 0, alignItems: 'center' }}>
            <Text
              style={{
                fontSize: 30,
                fontFamily: fontFamily.bold,
                color: flash === 'perfect' ? '#FACC15' : flash === 'good' ? '#5DD9B0' : '#FF4D4D',
                letterSpacing: 1,
                textShadowColor: 'rgba(0,0,0,0.6)',
                textShadowOffset: { width: 0, height: 2 },
                textShadowRadius: 8,
              }}
            >
              {flash === 'perfect' ? 'PERFECT!' : flash === 'good' ? 'GOOD' : 'MISS'}
            </Text>
            {combo >= 5 ? (
              <Text style={{ fontSize: 16, fontFamily: fontFamily.bold, color: '#FFB454' }}>x{combo}</Text>
            ) : null}
          </View>
        ) : null}
      </View>
    </GameShell>
  );
}
