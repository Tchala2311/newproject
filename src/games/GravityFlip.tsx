import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Game } from '../data/games';
import { GameShell } from './GameShell';
import { LevelComplete, shouldShowAdAfter } from './LevelComplete';
import { fontFamily } from '../theme';

type Props = { game: Game; onBack: () => void; onComplete: (won: boolean, score: number, meta?: Record<string, number>) => void; initialLevel?: number };

const BOARD_W = 300;
const BOARD_H = 260;
const PLAYER_W = 22;
const PLAYER_H = 22;
const GRAVITY = 0.45;
const FLIP_BOOST = -5.5;
const SPEED = 3.5;
const GAP = (level: number) => Math.max(60, 110 - level * 8);
const TARGET_SCORE = (level: number) => 4 + level * 2;
const OBSTACLE_W = 22;
const OBSTACLE_INTERVAL = 120; // frames between obstacles

type Obstacle = { x: number; topH: number };

export function GravityFlip({ game, onBack, onComplete, initialLevel }: Props) {
  const [level, setLevel] = useState(initialLevel ?? 1);
  const [started, setStarted] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'playing' | 'complete'>('idle');
  const [passed, setPassed] = useState(false);
  const [lastScore, setLastScore] = useState(0);
  const [renderTick, setRenderTick] = useState(0);

  const playerY = useRef(BOARD_H / 2);
  const velocityY = useRef(0);
  const gravDir = useRef(1); // 1 = down, -1 = up
  const obstacles = useRef<Obstacle[]>([]);
  const frameCount = useRef(0);
  const scoreRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const gamePhaseRef = useRef<'idle' | 'playing' | 'complete'>('idle');

  const gap = GAP(level);

  const startGame = useCallback(() => {
    playerY.current = BOARD_H / 2;
    velocityY.current = 0;
    gravDir.current = 1;
    obstacles.current = [];
    frameCount.current = 0;
    scoreRef.current = 0;
    gamePhaseRef.current = 'playing';
    setPhase('playing');
  }, []);

  const flipGravity = useCallback(() => {
    if (gamePhaseRef.current !== 'playing') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    gravDir.current *= -1;
    velocityY.current = FLIP_BOOST * gravDir.current;
  }, []);

  useEffect(() => {
    if (phase !== 'playing') return;
    const loop = () => {
      frameCount.current += 1;
      // Physics
      velocityY.current += GRAVITY * gravDir.current;
      velocityY.current = Math.max(-8, Math.min(8, velocityY.current));
      playerY.current += velocityY.current;
      // Bounce off walls
      if (playerY.current <= 0) { playerY.current = 0; velocityY.current = Math.abs(velocityY.current) * 0.4; gravDir.current = 1; }
      if (playerY.current >= BOARD_H - PLAYER_H) { playerY.current = BOARD_H - PLAYER_H; velocityY.current = -Math.abs(velocityY.current) * 0.4; gravDir.current = -1; }
      // Spawn obstacles
      if (frameCount.current % OBSTACLE_INTERVAL === 0) {
        const topH = 20 + Math.random() * (BOARD_H - gap - 40);
        obstacles.current.push({ x: BOARD_W, topH });
      }
      // Move obstacles
      obstacles.current = obstacles.current.map((o) => ({ ...o, x: o.x - SPEED }));
      // Remove passed obstacles + count score
      const before = obstacles.current.length;
      obstacles.current = obstacles.current.filter((o) => {
        if (o.x + OBSTACLE_W < 30) { scoreRef.current += 1; return false; }
        return true;
      });
      // Collision detection
      const px = 30, py = playerY.current;
      for (const o of obstacles.current) {
        const inX = px + PLAYER_W > o.x && px < o.x + OBSTACLE_W;
        const inY = py < o.topH || py + PLAYER_H > o.topH + gap;
        if (inX && inY) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
          gamePhaseRef.current = 'complete';
          const p = scoreRef.current >= TARGET_SCORE(level);
          setPassed(p);
          setLastScore(scoreRef.current * 100);
          setPhase('complete');
          onComplete(p, scoreRef.current * 100, { level, obstacles: scoreRef.current });
          if (rafRef.current) cancelAnimationFrame(rafRef.current);
          return;
        }
      }
      if (scoreRef.current >= TARGET_SCORE(level) * 2) {
        gamePhaseRef.current = 'complete';
        setPassed(true);
        setLastScore(scoreRef.current * 100);
        setPhase('complete');
        onComplete(true, scoreRef.current * 100, { level });
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        return;
      }
      setRenderTick((t) => t + 1);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [phase, level, gap]);

  if (phase === 'complete') {
    return <LevelComplete level={level} passed={passed} score={lastScore} scoreLabel="Очки" accent={game.accent}
      showAd={passed && shouldShowAdAfter(level)}
      onContinue={() => { setLevel((l) => l + 1); startGame(); }}
      onRetry={startGame}
      onBack={onBack} />;
  }

  return (
    <GameShell game={game} onBack={onBack} score={`${scoreRef.current} ✓`} label={`нужно ${TARGET_SCORE(level)} · Ур. ${level}`}>
      <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: fontFamily.semibold, marginBottom: 8 }}>
        Тапни по экрану чтобы перевернуть гравитацию
      </Text>
      <Pressable onPress={phase === 'idle' ? startGame : flipGravity}
        style={{ width: BOARD_W, height: BOARD_H, backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
        {phase === 'idle' && (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 16, color: '#fff', fontFamily: fontFamily.bold }}>Тапни чтобы начать</Text>
          </View>
        )}
        {phase === 'playing' && (
          <>
            {/* Player */}
            <View style={{ position: 'absolute', left: 30, top: playerY.current, width: PLAYER_W, height: PLAYER_H, borderRadius: 6, backgroundColor: game.accent }} />
            {/* Obstacles */}
            {obstacles.current.map((o, i) => (
              <React.Fragment key={i}>
                <View style={{ position: 'absolute', left: o.x, top: 0, width: OBSTACLE_W, height: o.topH, backgroundColor: '#7E22CE', borderRadius: 4 }} />
                <View style={{ position: 'absolute', left: o.x, top: o.topH + gap, width: OBSTACLE_W, height: BOARD_H - o.topH - gap, backgroundColor: '#7E22CE', borderRadius: 4 }} />
              </React.Fragment>
            ))}
          </>
        )}
      </Pressable>
    </GameShell>
  );
}
