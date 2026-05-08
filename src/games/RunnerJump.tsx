import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Game } from '../data/games';
import { GameShell } from './GameShell';
import { LevelComplete, shouldShowAdAfter } from './LevelComplete';
import { fontFamily } from '../theme';

type Props = { game: Game; onBack: () => void; onComplete: (won: boolean, score: number, meta?: Record<string, number>) => void; initialLevel?: number };

const PLAYER_SIZE = 30;
const GRAVITY = 0.7;
const JUMP_VY = -13;
const OBSTACLE_W = 20;
const OBSTACLE_SPEED = (level: number) => 3.5 + level * 0.4;
const TARGET = (level: number) => 6 + level * 3;
const OBSTACLE_EMOJIS = ['🌵','🪨','🌊','🔥'];

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
  const frameCount = useRef(0);
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
    frameCount.current = 0;
    phaseRef.current = 'idle';
    setPhase('idle');
  }, [GROUND_Y]);

  useEffect(() => {
    if (phase !== 'playing') return;
    const speed = OBSTACLE_SPEED(level);
    const spawnInterval = Math.max(60, 100 - level * 5);
    const loop = () => {
      frameCount.current += 1;
      if (!isOnGround.current) {
        velocityY.current += GRAVITY;
        playerY.current = Math.min(GROUND_Y - PLAYER_SIZE, playerY.current + velocityY.current);
        if (playerY.current >= GROUND_Y - PLAYER_SIZE) {
          playerY.current = GROUND_Y - PLAYER_SIZE;
          velocityY.current = 0;
          isOnGround.current = true;
        }
      }
      if (frameCount.current % spawnInterval === 0) {
        const h = 24 + Math.floor(Math.random() * 20);
        obstacles.current.push({ id: ++OID, x: BOARD_W, h, emoji: OBSTACLE_EMOJIS[Math.floor(Math.random() * OBSTACLE_EMOJIS.length)] });
      }
      obstacles.current = obstacles.current.map((o) => ({ ...o, x: o.x - speed })).filter((o) => {
        if (o.x + OBSTACLE_W < 44) { scoreRef.current += 1; return false; }
        return true;
      });
      const px = 44, py = playerY.current;
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
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
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
            <Text style={{ position: 'absolute', left: 38, top: playerY.current, fontSize: PLAYER_SIZE }}>🏃</Text>
            {obstacles.current.map((o) => (
              <Text key={o.id} style={{ position: 'absolute', left: o.x, top: GROUND_Y - o.h - 4, fontSize: o.h + 10 }}>{o.emoji}</Text>
            ))}
          </>
        )}
      </Pressable>
    </GameShell>
  );
}
