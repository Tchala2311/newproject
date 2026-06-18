import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Game } from '../data/games';
import { GameShell } from './GameShell';
import { LevelComplete, shouldShowAdAfter } from './LevelComplete';
import { GameResult } from './GameResult';
import { colors, fontFamily, radius } from '../theme';

type Props = {
  game: Game;
  onBack: () => void;
  onComplete: (won: boolean, score: number, meta?: Record<string, number>) => void;
  initialLevel?: number;
};

const BALL_RADIUS = 18;
const EXPLOSION_DURATION = 600;
const MAX_ATTEMPTS = 3;
const BALL_PALETTE = [
  '#EF4444', '#F97316', '#EAB308', '#22C55E',
  '#14B8A6', '#3B82F6', '#8B5CF6', '#EC4899',
];

type Ball = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  exploded: boolean;
};

type Explosion = {
  id: number;
  x: number;
  y: number;
  startTime: number;
  maxRadius: number;
  currentRadius: number;
  settled: boolean;
};

let uidCounter = 0;

function makeBalls(count: number, bw: number, bh: number, speed: number): Ball[] {
  return Array.from({ length: count }, (_, i) => ({
    id: ++uidCounter,
    x: BALL_RADIUS * 2 + Math.random() * (bw - BALL_RADIUS * 4),
    y: BALL_RADIUS * 2 + Math.random() * (bh - BALL_RADIUS * 4),
    vx: (Math.random() > 0.5 ? 1 : -1) * (speed * (0.7 + Math.random() * 0.6)),
    vy: (Math.random() > 0.5 ? 1 : -1) * (speed * (0.7 + Math.random() * 0.6)),
    color: BALL_PALETTE[i % BALL_PALETTE.length],
    exploded: false,
  }));
}

export function ChainBoom({ game, onBack, onComplete, initialLevel }: Props) {
  const { width, height } = useWindowDimensions();
  const boardH = Math.min(height * 0.62, height - 210);
  const boardW = width - 32;

  const [level, setLevel] = useState(initialLevel ?? 1);
  const [phase, setPhase] = useState<'playing' | 'levelcomplete' | 'gameover'>('playing');
  const [lastScore, setLastScore] = useState(0);
  const [attempts, setAttempts] = useState(MAX_ATTEMPTS);
  const [explodedCount, setExplodedCount] = useState(0);
  const [canTap, setCanTap] = useState(true);
  const [, forceUpdate] = useState(0);
  // Bumped on retry (same level) to re-arm the RAF loop, which self-terminates
  // when the round ends — without this, retrying the same level soft-locks
  // because the [level]-keyed effect doesn't re-run.
  const [restartNonce, setRestartNonce] = useState(0);

  const ballsRef = useRef<Ball[]>([]);
  const explosionsRef = useRef<Explosion[]>([]);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const attemptsRef = useRef(MAX_ATTEMPTS);
  const canTapRef = useRef(true);
  const phaseRef = useRef<'playing' | 'levelcomplete' | 'gameover'>('playing');
  const levelRef = useRef(level);
  const tickRef = useRef(0);

  const ballCount = Math.min(level + 4, 20);
  const target = level + 2;
  const speed = 1.5 + level * 0.3;

  const initLevel = useCallback((lv: number) => {
    const s = 1.5 + lv * 0.3;
    const bcount = Math.min(lv + 4, 20);
    ballsRef.current = makeBalls(bcount, boardW, boardH, s);
    explosionsRef.current = [];
    attemptsRef.current = MAX_ATTEMPTS;
    canTapRef.current = true;
    phaseRef.current = 'playing';
    levelRef.current = lv;
    lastTimeRef.current = 0;
    tickRef.current = 0;
    setAttempts(MAX_ATTEMPTS);
    setExplodedCount(0);
    setCanTap(true);
    setPhase('playing');
    setLastScore(0);
  }, [boardW, boardH]);

  useEffect(() => {
    initLevel(level);
  }, [level]);

  useEffect(() => {
    const loop = (timestamp: number) => {
      if (phaseRef.current !== 'playing') return;

      const dt = lastTimeRef.current > 0 ? Math.min((timestamp - lastTimeRef.current) / 16, 3) : 1;
      lastTimeRef.current = timestamp;

      const now = Date.now();
      const balls = ballsRef.current;
      const explosions = explosionsRef.current;
      const lv = levelRef.current;

      // Update explosion radii
      for (const exp of explosions) {
        const elapsed = now - exp.startTime;
        const progress = Math.min(elapsed / EXPLOSION_DURATION, 1);
        exp.currentRadius = exp.maxRadius * progress;
        if (progress >= 1 && !exp.settled) exp.settled = true;
      }

      // Chain reaction: any active explosion touching a non-exploded ball
      let anyNew = false;
      for (const ball of balls) {
        if (ball.exploded) continue;
        for (const exp of explosions) {
          const dx = ball.x - exp.x;
          const dy = ball.y - exp.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < exp.currentRadius + BALL_RADIUS) {
            ball.exploded = true;
            anyNew = true;
            explosions.push({
              id: ++uidCounter,
              x: ball.x,
              y: ball.y,
              startTime: now,
              maxRadius: BALL_RADIUS * 3.2,
              currentRadius: 0,
              settled: false,
            });
            break;
          }
        }
      }

      // Move live balls
      for (const ball of balls) {
        if (ball.exploded) continue;
        ball.x += ball.vx * dt;
        ball.y += ball.vy * dt;
        if (ball.x - BALL_RADIUS < 0) { ball.x = BALL_RADIUS; ball.vx = Math.abs(ball.vx); }
        if (ball.x + BALL_RADIUS > boardW) { ball.x = boardW - BALL_RADIUS; ball.vx = -Math.abs(ball.vx); }
        if (ball.y - BALL_RADIUS < 0) { ball.y = BALL_RADIUS; ball.vy = Math.abs(ball.vy); }
        if (ball.y + BALL_RADIUS > boardH) { ball.y = boardH - BALL_RADIUS; ball.vy = -Math.abs(ball.vy); }
      }

      const exploded = balls.filter((b: Ball) => b.exploded).length;
      const activeExps = explosions.filter((e: Explosion) => !e.settled);

      // Tap was consumed and all explosions have settled — evaluate outcome
      if (!canTapRef.current && activeExps.length === 0) {
        const tgt = lv + 2;
        if (exploded >= tgt) {
          const sc = exploded * 10 * lv;
          phaseRef.current = 'levelcomplete';
          setLastScore(sc);
          setPhase('levelcomplete');
          onComplete(true, sc, { level: lv });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          return;
        } else {
          const rem = attemptsRef.current - 1;
          attemptsRef.current = rem;
          if (rem <= 0) {
            const sc = exploded * 10 * lv;
            phaseRef.current = 'gameover';
            setLastScore(sc);
            setPhase('gameover');
            onComplete(false, sc, { level: lv });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
            return;
          }
          // Prepare next attempt
          ballsRef.current = makeBalls(Math.min(lv + 4, 20), boardW, boardH, 1.5 + lv * 0.3);
          explosionsRef.current = [];
          canTapRef.current = true;
          setAttempts(rem);
          setExplodedCount(0);
          setCanTap(true);
        }
      }

      // Prune fully settled & invisible explosions (keep for 200ms after settle for visual)
      explosionsRef.current = explosions.filter((e: Explosion) => now - e.startTime < EXPLOSION_DURATION + 200);

      tickRef.current++;
      if (tickRef.current % 2 === 0) {
        setExplodedCount(exploded);
        forceUpdate((n: number) => n + 1);
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [level, boardW, boardH, onComplete, restartNonce]);

  const handleTap = useCallback((evt: any) => {
    if (!canTapRef.current || phaseRef.current !== 'playing') return;
    const { locationX, locationY } = evt.nativeEvent;
    canTapRef.current = false;
    setCanTap(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    explosionsRef.current.push({
      id: ++uidCounter,
      x: locationX,
      y: locationY,
      startTime: Date.now(),
      maxRadius: BALL_RADIUS * 4,
      currentRadius: 0,
      settled: false,
    });
  }, []);

  if (phase === 'levelcomplete') {
    return (
      <LevelComplete
        level={level}
        passed={true}
        score={lastScore}
        scoreLabel="Очки"
        accent={game.accent}
        showAd={shouldShowAdAfter(level)}
        onContinue={() => setLevel((l: number) => l + 1)}
        onRetry={() => { initLevel(level); setRestartNonce((n) => n + 1); }}
        onBack={onBack}
      />
    );
  }

  if (phase === 'gameover') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <GameResult
          won={false}
          score={lastScore}
          accent={game.accent}
          game={game}
          onRestart={() => { initLevel(level); setRestartNonce((n) => n + 1); }}
          onBack={onBack}
        />
      </View>
    );
  }

  const balls = ballsRef.current;
  const explosions = explosionsRef.current;

  return (
    <GameShell game={game} onBack={onBack} score={`Ур. ${level}`} label={`Цель: ${target} · Попытки: ${attempts}`}>
      {/* Stats row */}
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 4 }}>
        <View style={{
          backgroundColor: 'rgba(0,0,0,0.35)',
          borderRadius: radius.md,
          paddingHorizontal: 14,
          paddingVertical: 6,
          alignItems: 'center',
          minWidth: 90,
        }}>
          <Text style={{ fontSize: 10, fontFamily: fontFamily.semibold, color: colors.textDim, letterSpacing: 1 }}>
            ВЗОРВАНО
          </Text>
          <Text style={{ fontSize: 20, fontFamily: fontFamily.bold, color: game.accent }}>
            {explodedCount} / {target}
          </Text>
        </View>
        <View style={{
          backgroundColor: 'rgba(0,0,0,0.35)',
          borderRadius: radius.md,
          paddingHorizontal: 14,
          paddingVertical: 6,
          alignItems: 'center',
          minWidth: 90,
        }}>
          <Text style={{ fontSize: 10, fontFamily: fontFamily.semibold, color: colors.textDim, letterSpacing: 1 }}>
            ПОПЫТКИ
          </Text>
          <Text style={{
            fontSize: 20,
            fontFamily: fontFamily.bold,
            color: attempts === 1 ? colors.warn : '#fff',
          }}>
            {attempts} / {MAX_ATTEMPTS}
          </Text>
        </View>
      </View>

      {/* Game board */}
      <Pressable
        onPress={handleTap}
        style={{
          width: boardW,
          height: boardH,
          backgroundColor: 'rgba(0,0,0,0.28)',
          borderRadius: radius.lg,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: colors.glassBorder,
        }}
      >
        {/* Live balls */}
        {balls.map((ball: Ball) =>
          ball.exploded ? null : (
            <View
              key={ball.id}
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: ball.x - BALL_RADIUS,
                top: ball.y - BALL_RADIUS,
                width: BALL_RADIUS * 2,
                height: BALL_RADIUS * 2,
                borderRadius: BALL_RADIUS,
                backgroundColor: ball.color,
                shadowColor: ball.color,
                shadowOpacity: 0.8,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 0 },
              }}
            />
          )
        )}

        {/* Explosion rings */}
        {explosions.map((exp: Explosion) => {
          const r = exp.currentRadius;
          if (r <= 1) return null;
          const progress = exp.currentRadius / exp.maxRadius;
          const opacity = Math.max(0, 1 - progress * 0.65);
          return (
            <View
              key={exp.id}
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: exp.x - r,
                top: exp.y - r,
                width: r * 2,
                height: r * 2,
                borderRadius: r,
                backgroundColor: `rgba(255, 155, 20, ${opacity * 0.45})`,
                borderWidth: 2.5,
                borderColor: `rgba(255, 220, 50, ${opacity})`,
              }}
            />
          );
        })}

        {/* Tap hint */}
        {canTap && (
          <View
            pointerEvents="none"
            style={{ position: 'absolute', bottom: 14, left: 0, right: 0, alignItems: 'center' }}
          >
            <Text style={{ fontSize: 13, fontFamily: fontFamily.semibold, color: 'rgba(255,255,255,0.45)' }}>
              Тапни чтобы взорвать!
            </Text>
          </View>
        )}
      </Pressable>
    </GameShell>
  );
}
