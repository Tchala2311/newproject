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

type Phase = 'idle' | 'playing' | 'levelComplete' | 'gameOver';

const BALL_RADIUS = 10;
const TAPS_TO_WIN = 20;
const MAX_LIVES_L1 = 3;

function corridorGap(level: number) {
  return Math.max(48, 120 - level * 8);
}

function ballSpeed(level: number) {
  return 2.5 + level * 0.4;
}

function maxLives(level: number) {
  return level === 1 ? MAX_LIVES_L1 : 1;
}

export function Zigzag({ game, onBack, onComplete, initialLevel }: Props) {
  const { width, height } = useWindowDimensions();

  const BOARD_W = width - 32;
  const BOARD_H = Math.min(height * 0.55, 460);
  const CORRIDOR_CENTER = BOARD_H / 2;

  const [level, setLevel] = useState(initialLevel ?? 1);
  const [phase, setPhase] = useState<Phase>('idle');
  const [lives, setLives] = useState(maxLives(initialLevel ?? 1));
  const [totalScore, setTotalScore] = useState(0);
  const [lastLevelScore, setLastLevelScore] = useState(0);
  const [renderTick, setRenderTick] = useState(0);

  // Game state via refs to avoid stale closures in RAF loop
  const ballX = useRef(BOARD_W / 2);
  const ballY = useRef(CORRIDOR_CENTER);
  const velX = useRef(ballSpeed(initialLevel ?? 1));
  const velY = useRef(ballSpeed(initialLevel ?? 1));
  const tapsRef = useRef(0);
  const livesRef = useRef(maxLives(initialLevel ?? 1));
  const scoreRef = useRef(0);
  const phaseRef = useRef<Phase>('idle');
  const rafRef = useRef<number | null>(null);

  const gap = corridorGap(level);
  const wallTop = CORRIDOR_CENTER - gap / 2;
  const wallBottom = CORRIDOR_CENTER + gap / 2;

  const stopLoop = () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  const initBall = useCallback(
    (lv: number) => {
      const speed = ballSpeed(lv);
      ballX.current = BOARD_W / 2;
      ballY.current = CORRIDOR_CENTER;
      velX.current = speed;
      velY.current = speed;
      tapsRef.current = 0;
      scoreRef.current = 0;
    },
    [BOARD_W, CORRIDOR_CENTER],
  );

  const startGame = useCallback(
    (lv: number) => {
      stopLoop();
      initBall(lv);
      livesRef.current = maxLives(lv);
      setLives(maxLives(lv));
      phaseRef.current = 'playing';
      setPhase('playing');
    },
    [initBall],
  );

  const endLevel = useCallback(
    (won: boolean) => {
      stopLoop();
      const finalScore = scoreRef.current;
      setLastLevelScore(finalScore);
      setTotalScore((s) => s + finalScore);
      if (won) {
        phaseRef.current = 'levelComplete';
        setPhase('levelComplete');
        onComplete(true, totalScore + finalScore, { level, taps: tapsRef.current });
      } else {
        phaseRef.current = 'gameOver';
        setPhase('gameOver');
        onComplete(false, totalScore + finalScore, { level, taps: tapsRef.current });
      }
    },
    [level, totalScore, onComplete],
  );

  // RAF game loop
  useEffect(() => {
    if (phase !== 'playing') return;

    const wTop = CORRIDOR_CENTER - corridorGap(level) / 2;
    const wBottom = CORRIDOR_CENTER + corridorGap(level) / 2;

    const loop = () => {
      if (phaseRef.current !== 'playing') return;

      ballX.current += velX.current;
      ballY.current += velY.current;

      // Bounce off left/right walls
      if (ballX.current - BALL_RADIUS <= 0) {
        ballX.current = BALL_RADIUS;
        velX.current = Math.abs(velX.current);
      } else if (ballX.current + BALL_RADIUS >= BOARD_W) {
        ballX.current = BOARD_W - BALL_RADIUS;
        velX.current = -Math.abs(velX.current);
      }

      // Check corridor wall collision
      const hitTop = ballY.current - BALL_RADIUS <= wTop;
      const hitBottom = ballY.current + BALL_RADIUS >= wBottom;

      if (hitTop || hitBottom) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        const newLives = livesRef.current - 1;
        livesRef.current = newLives;
        setLives(newLives);

        if (newLives <= 0) {
          phaseRef.current = 'gameOver';
          endLevel(false);
          return;
        }

        // Bounce back into corridor
        if (hitTop) {
          ballY.current = wTop + BALL_RADIUS + 1;
          velY.current = Math.abs(velY.current);
        } else {
          ballY.current = wBottom - BALL_RADIUS - 1;
          velY.current = -Math.abs(velY.current);
        }
      }

      setRenderTick((t) => t + 1);
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return stopLoop;
  }, [phase, level, CORRIDOR_CENTER, BOARD_W, endLevel]);

  const handleTap = useCallback(() => {
    if (phaseRef.current === 'idle') {
      startGame(level);
      return;
    }
    if (phaseRef.current !== 'playing') return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    // Flip vertical direction
    velY.current *= -1;

    tapsRef.current += 1;
    scoreRef.current += 10;

    if (tapsRef.current >= TAPS_TO_WIN) {
      phaseRef.current = 'levelComplete';
      endLevel(true);
    }
  }, [level, startGame, endLevel]);

  if (phase === 'levelComplete') {
    return (
      <LevelComplete
        level={level}
        passed
        score={lastLevelScore}
        scoreLabel="Очки"
        accent={game.accent}
        showAd={shouldShowAdAfter(level)}
        onContinue={() => {
          const next = level + 1;
          setLevel(next);
          startGame(next);
        }}
        onRetry={() => startGame(level)}
        onBack={onBack}
      />
    );
  }

  if (phase === 'gameOver') {
    return (
      <GameResult
        won={false}
        score={totalScore}
        accent={game.accent}
        game={game}
        onRestart={() => {
          setLevel(initialLevel ?? 1);
          setTotalScore(0);
          startGame(initialLevel ?? 1);
        }}
        onBack={onBack}
      />
    );
  }

  const livesTotal = maxLives(level);
  const hearts = Array.from({ length: livesTotal }, (_, i) => (i < lives ? '❤️' : '🖤'));

  return (
    <GameShell game={game} onBack={onBack} score={scoreRef.current} label={`Ур. ${level}`}>
      <View style={{ alignItems: 'center', width: '100%' }}>
        {/* Lives */}
        {livesTotal > 1 && (
          <Text style={{ fontSize: 20, letterSpacing: 4, marginBottom: 6 }}>{hearts.join('')}</Text>
        )}

        {/* Hint */}
        <Text
          style={{
            fontSize: 12,
            fontFamily: fontFamily.semibold,
            color: 'rgba(255,255,255,0.5)',
            marginBottom: 10,
          }}
        >
          {phase === 'idle' ? 'Тапни чтобы начать' : 'Тап чтобы изменить направление'}
        </Text>

        {/* Tap progress */}
        {phase === 'playing' && (
          <Text
            style={{
              fontSize: 11,
              fontFamily: fontFamily.medium,
              color: 'rgba(255,255,255,0.35)',
              marginBottom: 8,
            }}
          >
            {tapsRef.current} / {TAPS_TO_WIN} тапов
          </Text>
        )}

        {/* Game board */}
        <Pressable
          onPress={handleTap}
          style={{
            width: BOARD_W,
            height: BOARD_H,
            backgroundColor: 'rgba(0,0,0,0.35)',
            borderRadius: 16,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.1)',
          }}
        >
          {phase === 'idle' && (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 16, color: '#fff', fontFamily: fontFamily.bold }}>
                Тапни чтобы начать
              </Text>
            </View>
          )}

          {phase === 'playing' && (
            <>
              {/* Top wall */}
              <View
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: 0,
                  height: wallTop,
                  backgroundColor: 'rgba(255,255,255,0.12)',
                }}
              />
              {/* Top wall edge highlight */}
              <View
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: wallTop - 2,
                  height: 3,
                  backgroundColor: `${game.accent}cc`,
                  borderRadius: 2,
                }}
              />

              {/* Bottom wall */}
              <View
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: 0,
                  height: BOARD_H - wallBottom,
                  backgroundColor: 'rgba(255,255,255,0.12)',
                }}
              />
              {/* Bottom wall edge highlight */}
              <View
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: wallBottom - 1,
                  height: 3,
                  backgroundColor: `${game.accent}cc`,
                  borderRadius: 2,
                }}
              />

              {/* Ball */}
              <View
                style={{
                  position: 'absolute',
                  left: ballX.current - BALL_RADIUS,
                  top: ballY.current - BALL_RADIUS,
                  width: BALL_RADIUS * 2,
                  height: BALL_RADIUS * 2,
                  borderRadius: BALL_RADIUS,
                  backgroundColor: game.accent,
                  shadowColor: game.accent,
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.9,
                  shadowRadius: 8,
                }}
              />
            </>
          )}
        </Pressable>
      </View>
    </GameShell>
  );
}
