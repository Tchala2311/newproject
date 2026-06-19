import React, { useCallback, useEffect, useRef, useState } from 'react';
import { PanResponder, Pressable, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
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

type Phase = 'preview' | 'input' | 'levelComplete';

const ROUNDS_PER_LEVEL = 5;

function randomAngleDeg(): number {
  // Avoid angles too close to 0/360 and 180 (base line) to make it interesting
  const candidates = [
    15 + Math.random() * 60,
    120 + Math.random() * 60,
    200 + Math.random() * 60,
    290 + Math.random() * 60,
  ];
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function marginForLevel(level: number): number {
  // level 1 = ±30°, level 5 = ±10°; linear interpolation
  return Math.max(10, 30 - (level - 1) * 5);
}

function roundScore(diffDeg: number, level: number): number {
  const margin = marginForLevel(level);
  if (diffDeg < 5) return 100;
  if (diffDeg < margin * 0.5) return 60;
  if (diffDeg < margin) return 30;
  return 0;
}

function angleDiff(a: number, b: number): number {
  let d = Math.abs(a - b) % 360;
  if (d > 180) d = 360 - d;
  return d;
}

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function lineEndpoint(cx: number, cy: number, angleDeg: number, r: number) {
  const rad = degToRad(angleDeg);
  return { x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) };
}

export function AngleGuess({ game, onBack, onComplete, initialLevel }: Props) {
  const { width, height } = useWindowDimensions();
  // Reserve vertical room for the title, score line, "Готово" button and hint
  // below the dial so the controls never get pushed off-screen on short phones.
  const boardSize = Math.min(width - 48, height * 0.52, height - 340);
  const cx = boardSize / 2;
  const cy = boardSize / 2;
  const lineR = boardSize * 0.42;

  const [level, setLevel] = useState(initialLevel ?? 1);
  const [phase, setPhase] = useState<Phase>('preview');
  const [round, setRound] = useState(1);
  const [totalScore, setTotalScore] = useState(0);
  const [targetAngle, setTargetAngle] = useState(() => randomAngleDeg());
  const [playerAngle, setPlayerAngle] = useState(0);
  const [lastRoundScore, setLastRoundScore] = useState<number | null>(null);
  const [passed, setPassed] = useState(false);

  const boardRef = useRef<View>(null);
  const boardOriginRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const playerAngleRef = useRef(0);
  const phaseRef = useRef<Phase>('preview');
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const submitLockRef = useRef(false);

  phaseRef.current = phase;

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  const startPreview = useCallback((targetDeg: number) => {
    clearTimers();
    submitLockRef.current = false;
    setPlayerAngle(0);
    playerAngleRef.current = 0;
    setLastRoundScore(null);
    setPhase('preview');
    phaseRef.current = 'preview';
    timersRef.current.push(setTimeout(() => {
      setPhase('input');
      phaseRef.current = 'input';
    }, 2000));
  }, [clearTimers]);

  useEffect(() => {
    const angle = randomAngleDeg();
    setTargetAngle(angle);
    startPreview(angle);
  }, [level]);

  // Cancel any pending preview/next-round timers on unmount.
  useEffect(() => clearTimers, [clearTimers]);

  const onLayout = () => {
    boardRef.current?.measure((_x, _y, _w, _h, pageX, pageY) => {
      boardOriginRef.current = { x: pageX, y: pageY };
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => phaseRef.current === 'input',
      onMoveShouldSetPanResponder: () => phaseRef.current === 'input',
      onPanResponderGrant: (_, g) => {
        const dx = g.x0 - boardOriginRef.current.x - cx;
        const dy = g.y0 - boardOriginRef.current.y - cy;
        const angle = (Math.atan2(-dy, dx) * 180) / Math.PI;
        playerAngleRef.current = angle < 0 ? angle + 360 : angle;
        setPlayerAngle(playerAngleRef.current);
      },
      onPanResponderMove: (_, g) => {
        if (phaseRef.current !== 'input') return;
        const dx = g.moveX - boardOriginRef.current.x - cx;
        const dy = g.moveY - boardOriginRef.current.y - cy;
        const angle = (Math.atan2(-dy, dx) * 180) / Math.PI;
        playerAngleRef.current = angle < 0 ? angle + 360 : angle;
        setPlayerAngle(playerAngleRef.current);
      },
    })
  ).current;

  const submit = () => {
    if (phaseRef.current !== 'input' || submitLockRef.current) return;
    submitLockRef.current = true;
    const diff = angleDiff(targetAngle, playerAngle);
    const pts = roundScore(diff, level);
    const newTotal = totalScore + pts;
    setLastRoundScore(pts);

    if (pts >= 60) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    }

    if (round >= ROUNDS_PER_LEVEL) {
      const finalScore = newTotal * level;
      const didPass = finalScore > 0;
      setPassed(didPass);
      setTotalScore(finalScore);
      setPhase('levelComplete');
      phaseRef.current = 'levelComplete';
      onComplete(didPass, finalScore, { level, rounds: ROUNDS_PER_LEVEL });
    } else {
      setTotalScore(newTotal);
      // Block further input until the next round's preview starts.
      setPhase('preview');
      phaseRef.current = 'preview';
      timersRef.current.push(setTimeout(() => {
        const nextAngle = randomAngleDeg();
        setTargetAngle(nextAngle);
        setRound((r) => r + 1);
        startPreview(nextAngle);
      }, 900));
    }
  };

  if (phase === 'levelComplete') {
    return (
      <LevelComplete
        level={level}
        passed={passed}
        score={totalScore}
        scoreLabel="Очки"
        accent={game.accent}
        showAd={passed && shouldShowAdAfter(level)}
        onContinue={() => {
          setRound(1);
          setTotalScore(0);
          setLevel((l) => l + 1);
        }}
        onRetry={() => {
          setRound(1);
          setTotalScore(0);
          const angle = randomAngleDeg();
          setTargetAngle(angle);
          startPreview(angle);
        }}
        onBack={onBack}
      />
    );
  }

  const targetEnd = lineEndpoint(cx, cy, targetAngle, lineR);
  const playerEnd = lineEndpoint(cx, cy, playerAngle, lineR);
  const baseEnd = lineEndpoint(cx, cy, 0, lineR);

  return (
    <GameShell game={game} onBack={onBack} score={`${totalScore}`} label={`раунд ${round}/${ROUNDS_PER_LEVEL}`}>
      <Text
        style={{
          fontSize: 15,
          fontFamily: fontFamily.bold,
          color: phase === 'preview' ? game.accent : '#fff',
          marginBottom: 16,
          letterSpacing: 0.4,
        }}
      >
        {phase === 'preview' ? 'Запомни угол!' : 'Воспроизведи!'}
      </Text>

      <View
        ref={boardRef}
        onLayout={onLayout}
        {...panResponder.panHandlers}
        style={{
          width: boardSize,
          height: boardSize,
          backgroundColor: 'rgba(0,0,0,0.30)',
          borderRadius: boardSize / 2,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.12)',
          overflow: 'hidden',
        }}
      >
        <Svg width={boardSize} height={boardSize}>
          <Circle
            cx={cx}
            cy={cy}
            r={lineR}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={1}
          />
          {/* Base horizontal line */}
          <Line
            x1={cx}
            y1={cy}
            x2={baseEnd.x}
            y2={baseEnd.y}
            stroke="rgba(255,255,255,0.35)"
            strokeWidth={2}
            strokeLinecap="round"
          />
          {/* Target line — only visible during preview */}
          {phase === 'preview' ? (
            <Line
              x1={cx}
              y1={cy}
              x2={targetEnd.x}
              y2={targetEnd.y}
              stroke={game.accent}
              strokeWidth={3.5}
              strokeLinecap="round"
            />
          ) : null}
          {/* Player line — visible during input */}
          {phase === 'input' ? (
            <Line
              x1={cx}
              y1={cy}
              x2={playerEnd.x}
              y2={playerEnd.y}
              stroke="#ffffff"
              strokeWidth={3.5}
              strokeLinecap="round"
            />
          ) : null}
          {/* Center dot */}
          <Circle cx={cx} cy={cy} r={5} fill={game.accent} />
        </Svg>
      </View>

      {lastRoundScore !== null ? (
        <Text
          style={{
            marginTop: 14,
            fontSize: 18,
            fontFamily: fontFamily.bold,
            color: lastRoundScore >= 60 ? game.accent : colors.warn,
          }}
        >
          {lastRoundScore >= 100
            ? 'Идеально! +100'
            : lastRoundScore >= 60
            ? 'Хорошо! +60'
            : lastRoundScore >= 30
            ? 'Неплохо +30'
            : 'Мимо +0'}
        </Text>
      ) : (
        <View style={{ height: 32 }} />
      )}

      {phase === 'input' ? (
        <Pressable
          onPress={submit}
          style={{
            marginTop: 20,
            backgroundColor: game.accent,
            paddingHorizontal: 36,
            paddingVertical: 14,
            borderRadius: radius.pill,
          }}
        >
          <Text style={{ fontSize: 15, fontFamily: fontFamily.bold, color: '#000' }}>
            Готово
          </Text>
        </Pressable>
      ) : null}

      <Text
        style={{
          marginTop: 12,
          fontSize: 11,
          fontFamily: fontFamily.semibold,
          color: colors.textFaint,
        }}
      >
        {phase === 'preview' ? `точность ур.${level}: ±${marginForLevel(level)}°` : 'Тяни для выбора угла'}
      </Text>
    </GameShell>
  );
}
