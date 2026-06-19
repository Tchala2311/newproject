import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Game } from '../data/games';
import { GameShell } from './GameShell';
import { LevelComplete, shouldShowAdAfter } from './LevelComplete';
import { fontFamily } from '../theme';

type Props = { game: Game; onBack: () => void; onComplete: (won: boolean, score: number, meta?: Record<string, number>) => void; initialLevel?: number };

const PLAYER_SIZE = 30;
// Single source of truth for the runner's left edge — used by both the collision
// box and the rendered sprite so the hitbox lines up with what the player sees.
const PLAYER_X = 44;
const GRAVITY = 0.7;
const JUMP_VY = -14;
const OBSTACLE_W = 22;
// Cap obstacle speed so the reaction window never collapses. The jump arc is a
// fixed ~40 frames of airtime, so faster obstacles just shorten the time to react.
const OBSTACLE_SPEED = (level: number) => Math.min(7, 3.8 + level * 0.5);
const TARGET = (level: number) => 6 + level * 3;
// Heights: min grows with level so early levels are forgiving, later are trickier
const OBS_MIN_H = (level: number) => Math.min(28 + level * 3, 50);
const OBS_MAX_H = (level: number) => Math.min(OBS_MIN_H(level) + 36, 90);
const OBSTACLE_EMOJIS = ['🌵','🪨','🌳','🔥','🧱'];

type Obstacle = { id: number; x: number; h: number; emoji: string };
let OID = 0;

export function RunnerJump({ game, onBack, onComplete, initialLevel }: Props) {
  const { width, height } = useWindowDimensions();
  const BOARD_W = width - 32;
  const BOARD_H = Math.min(height * 0.50, 440);
  const GROUND_Y = BOARD_H - 40;

  const [level, setLevel] = useState(initialLevel ?? 1);
  const [phase, setPhase] = useState<'idle' | 'playing' | 'complete'>('idle');
  const [passed, setPassed] = useState(false);
  const [lastScore, setLastScore] = useState(0);
  const [renderTick, setRenderTick] = useState(0);

  const playerY = useRef(GROUND_Y - PLAYER_SIZE);
  const velocityY = useRef(0);
  const isOnGround = useRef(true);
  const obstacles = useRef<Obstacle[]>([]);
  const scoreRef = useRef(0);
  const lastTimeRef = useRef(0);
  const spawnAccRef = useRef(0); // accumulated ms for spawn timing
  const rafRef = useRef<number | null>(null);
  const phaseRef = useRef<'idle' | 'playing' | 'complete'>('idle');

  const jump = useCallback(() => {
    if (phaseRef.current === 'idle') { phaseRef.current = 'playing'; setPhase('playing'); return; }
    if (!isOnGround.current) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    velocityY.current = JUMP_VY;
    isOnGround.current = false;
  }, []);

  const startGame = useCallback(() => {
    playerY.current = GROUND_Y - PLAYER_SIZE;
    velocityY.current = 0;
    isOnGround.current = true;
    obstacles.current = [];
    scoreRef.current = 0;
    lastTimeRef.current = 0;
    spawnAccRef.current = 0;
    phaseRef.current = 'idle';
    setPhase('idle');
  }, [GROUND_Y]);

  useEffect(() => {
    if (phase !== 'playing') return;
    lastTimeRef.current = 0;
    spawnAccRef.current = 0;
    const speedPx60 = OBSTACLE_SPEED(level); // px per 60fps frame
    // Jump airtime is ~40 frames (JUMP_VY/-GRAVITY * 2 = 40). The floor below gives
    // ~66 frames between spawns (1100/16.67) ≈ 1.65× the jump arc, so a single
    // well-timed jump always lands and clears before the next obstacle arrives.
    const spawnIntervalMs = Math.max(1100, (100 - level * 5) * (1000 / 60));
    const loop = (timestamp: number) => {
      const dt = lastTimeRef.current ? Math.min(timestamp - lastTimeRef.current, 50) : 16.67;
      lastTimeRef.current = timestamp;
      const scale = dt / 16.67;
      if (!isOnGround.current) {
        velocityY.current += GRAVITY * scale;
        playerY.current = Math.min(GROUND_Y - PLAYER_SIZE, playerY.current + velocityY.current * scale);
        if (playerY.current >= GROUND_Y - PLAYER_SIZE) {
          playerY.current = GROUND_Y - PLAYER_SIZE;
          velocityY.current = 0;
          isOnGround.current = true;
        }
      }
      spawnAccRef.current += dt;
      if (spawnAccRef.current >= spawnIntervalMs) {
        spawnAccRef.current -= spawnIntervalMs;
        const minH = OBS_MIN_H(level);
        const maxH = OBS_MAX_H(level);
        const h = minH + Math.floor(Math.random() * (maxH - minH));
        obstacles.current.push({ id: ++OID, x: BOARD_W, h, emoji: OBSTACLE_EMOJIS[Math.floor(Math.random() * OBSTACLE_EMOJIS.length)] });
      }
      obstacles.current = obstacles.current.map((o) => ({ ...o, x: o.x - speedPx60 * scale })).filter((o) => {
        if (o.x + OBSTACLE_W < PLAYER_X) { scoreRef.current += 1; return false; }
        return true;
      });
      const px = PLAYER_X, py = playerY.current;
      for (const o of obstacles.current) {
        if (px + PLAYER_SIZE - 4 > o.x && px + 4 < o.x + OBSTACLE_W &&
            py + PLAYER_SIZE - 4 > GROUND_Y - o.h) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
          phaseRef.current = 'complete';
          const p = scoreRef.current >= TARGET(level);
          setPassed(p);
          setLastScore(scoreRef.current * 80);
          setPhase('complete');
          onComplete(p, scoreRef.current * 80, { level, jumps: scoreRef.current });
          if (rafRef.current) cancelAnimationFrame(rafRef.current);
          return;
        }
      }
      if (scoreRef.current >= TARGET(level) * 2) {
        phaseRef.current = 'complete';
        setPassed(true);
        setLastScore(scoreRef.current * 80);
        setPhase('complete');
        onComplete(true, scoreRef.current * 80, { level });
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        return;
      }
      setRenderTick((t) => t + 1);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      lastTimeRef.current = 0;
    };
  }, [phase, level, BOARD_W, GROUND_Y]);

  if (phase === 'complete') {
    return <LevelComplete level={level} passed={passed} score={lastScore} scoreLabel="Очки" accent={game.accent}
      showAd={passed && shouldShowAdAfter(level)}
      onContinue={() => { setLevel((l) => l + 1); startGame(); }}
      onRetry={startGame}
      onBack={onBack} />;
  }

  return (
    <GameShell game={game} onBack={onBack} score={`${scoreRef.current} 🏃`} label={`нужно ${TARGET(level)}`}>
      <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: fontFamily.semibold, marginBottom: 4 }}>
        Тапни чтобы прыгнуть
      </Text>
      <Pressable onPress={jump}
        style={{ width: BOARD_W, height: BOARD_H, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
        {phase === 'idle' && (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 16, color: '#fff', fontFamily: fontFamily.bold }}>Тапни чтобы начать</Text>
          </View>
        )}
        {phase === 'playing' && (
          <>
            <View style={{ position: 'absolute', left: 0, top: GROUND_Y, right: 0, height: 3, backgroundColor: 'rgba(255,255,255,0.2)' }} />
            {/* scaleX:-1 flips the runner to face right toward incoming obstacles */}
            <Text style={{ position: 'absolute', left: PLAYER_X, top: playerY.current, fontSize: PLAYER_SIZE, transform: [{ scaleX: -1 }] }}>🏃</Text>
            {obstacles.current.map((o) => (
              <Text key={o.id} style={{ position: 'absolute', left: o.x, top: GROUND_Y - o.h - 4, fontSize: o.h + 10 }}>{o.emoji}</Text>
            ))}
          </>
        )}
      </Pressable>
    </GameShell>
  );
}
