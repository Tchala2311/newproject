import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, Text, View, useWindowDimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Game } from '../data/games';
import { GameShell } from './GameShell';
import { LevelComplete, shouldShowAdAfter } from './LevelComplete';
import { colors, fontFamily } from '../theme';

type Props = {
  game: Game;
  onBack: () => void;
  onComplete: (won: boolean, score: number, meta?: Record<string, number>) => void;
  initialLevel?: number;
};

// Per-level: round duration, BPM, target score.
const LEVEL_CFG = (level: number) => ({
  time: 28 + Math.min(level, 8),
  bpm: Math.min(180, 80 + level * 12),
  target: 400 + level * 350,
});

type Note = {
  id: number;
  x: number; // 0..1
  spawnAt: number; // ms since round start
  hitAt?: number;
  judgement?: 'perfect' | 'good' | 'miss';
};

export function BeatTap({ game, onBack, onComplete, initialLevel }: Props) {
  const { width } = useWindowDimensions();
  const lanes = 3;
  const laneW = (width - 32) / lanes;

  const [level, setLevel] = useState(initialLevel ?? 1);
  const cfg = LEVEL_CFG(level);
  const beatMs = (60 / cfg.bpm) * 1000;
  const TRAVEL = Math.max(700, 1200 - level * 80);

  const [phase, setPhase] = useState<'playing' | 'complete'>('playing');
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [time, setTime] = useState(cfg.time);
  const [notes, setNotes] = useState<Note[]>([]);
  const [flash, setFlash] = useState<string | null>(null);
  const [lastPassed, setLastPassed] = useState(false);
  const [lastScore, setLastScore] = useState(0);
  const [, setRenderTick] = useState(0);
  const startRef = useRef(Date.now());
  const noteIdRef = useRef(0);
  const scoreRef = useRef(0);
  const completedRef = useRef(false);
  const notesRef = useRef<Note[]>([]);
  const phaseRef = useRef<'playing' | 'complete'>('playing');
  const rafRef = useRef<number | null>(null);

  useEffect(() => { notesRef.current = notes; }, [notes]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  const buildSchedule = (durSec: number, bMs: number) => {
    const sched: Note[] = [];
    for (let beat = 0; beat * bMs < durSec * 1000; beat += 1) {
      if (beat % 4 === 3) continue;
      sched.push({ id: noteIdRef.current++, x: Math.random(), spawnAt: beat * bMs });
    }
    return sched;
  };

  useEffect(() => {
    startRef.current = Date.now();
    setNotes(buildSchedule(cfg.time, beatMs));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (phase !== 'playing') return;
    const t = setInterval(() => {
      const elapsed = (Date.now() - startRef.current) / 1000;
      const remain = Math.max(0, cfg.time - elapsed);
      setTime(remain);
      if (remain <= 0 && !completedRef.current) {
        completedRef.current = true;
        const finalScore = scoreRef.current;
        const passed = finalScore >= cfg.target;
        setLastPassed(passed);
        setLastScore(finalScore);
        setPhase('complete');
        onComplete(passed, finalScore, { level });
      }
    }, 100);
    return () => clearInterval(t);
  }, [phase, onComplete, cfg.time, cfg.target, level]);

  // Miss sweep — combo is reset OUTSIDE the setNotes updater (computed from a
  // notesRef snapshot) so we never call setState from inside another updater.
  useEffect(() => {
    if (phase !== 'playing') return;
    const t = setInterval(() => {
      const now = Date.now() - startRef.current;
      const missDeadline = (n: Note) => !n.judgement && now > n.spawnAt + TRAVEL + 180;
      if (notesRef.current.some(missDeadline)) {
        setCombo(0);
        setNotes((prev) => prev.map((n) => (missDeadline(n) ? { ...n, judgement: 'miss' as const } : n)));
      }
    }, 80);
    return () => clearInterval(t);
  }, [phase, TRAVEL]);

  // Smooth 60fps render loop so notes are drawn from the real clock (Date.now)
  // rather than the 100ms-quantized `time` state — keeps the visual note
  // position aligned with the Date.now()-based hit detection in tap().
  useEffect(() => {
    if (phase !== 'playing') return;
    const loop = () => {
      if (phaseRef.current !== 'playing') return;
      setRenderTick((t) => (t + 1) % 1000000);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [phase]);

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
    // Update scoreRef synchronously so the 100ms-interval timer always reads the
    // latest accumulated score — setScore is async (batched) and scoreRef is only
    // synced by an effect that runs after the render, so without this direct write
    // a note hit in the same tick as the timer could be excluded from finalScore.
    const pts = points + combo * 5;
    scoreRef.current += pts;
    setScore(scoreRef.current);
    setCombo((c) => (judgement === 'miss' ? 0 : c + 1));
    setFlash(judgement);
    setTimeout(() => setFlash(null), 220);
    setNotes((prev) => prev.map((n) => (n.id === best!.id ? { ...n, judgement, hitAt: now } : n)));
    if (judgement === 'perfect') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    else if (judgement === 'good') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    else Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
  };

  const reset = () => {
    completedRef.current = false;
    scoreRef.current = 0;
    setScore(0);
    setCombo(0);
    setTime(cfg.time);
    setPhase('playing');
    setNotes([]);
    startRef.current = Date.now();
    setTimeout(() => setNotes(buildSchedule(cfg.time, beatMs)), 60);
  };

  const startNextLevel = () => {
    const nl = level + 1;
    const nc = LEVEL_CFG(nl);
    const nb = (60 / nc.bpm) * 1000;
    completedRef.current = false;
    scoreRef.current = 0;
    setLevel(nl);
    setScore(0);
    setCombo(0);
    setTime(nc.time);
    setPhase('playing');
    setNotes([]);
    startRef.current = Date.now();
    setTimeout(() => setNotes(buildSchedule(nc.time, nb)), 60);
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

  // Drive note position from the real clock (re-rendered each RAF frame) so it
  // stays in lock-step with the Date.now()-based hit window in tap().
  const elapsedMs = Date.now() - startRef.current;
  const targetY = 0.78; // 78% down the play area

  return (
    <GameShell game={game} onBack={onBack} score={`${score}/${cfg.target}`} label={`Ур. ${level} · ${cfg.bpm} BPM`} timer={time} timerMax={cfg.time}>
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
