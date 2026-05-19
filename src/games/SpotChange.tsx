import React, { useCallback, useEffect, useRef, useState } from 'react';
import { GestureResponderEvent, Pressable, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Rect } from 'react-native-svg';
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

type ShapeKind = 'circle' | 'rect';

type Shape = {
  id: number;
  kind: ShapeKind;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
};

const PALETTE = [
  '#EF4444', '#3B82F6', '#22C55E', '#EAB308',
  '#F97316', '#A855F7', '#06B6D4', '#EC4899',
  '#14B8A6', '#F59E0B', '#6366F1', '#84CC16',
];

function pickColor(exclude?: string): string {
  const pool = exclude ? PALETTE.filter((c) => c !== exclude) : PALETTE;
  return pool[Math.floor(Math.random() * pool.length)];
}

function generateShapes(
  count: number,
  svgW: number,
  svgH: number,
): Shape[] {
  const padding = 12;
  const maxW = Math.min(svgW * 0.22, 54);
  const minW = Math.min(svgW * 0.1, 26);
  const shapes: Shape[] = [];

  for (let i = 0; i < count; i++) {
    const kind: ShapeKind = Math.random() > 0.5 ? 'circle' : 'rect';
    const w = minW + Math.random() * (maxW - minW);
    const h = kind === 'rect' ? minW + Math.random() * (maxW - minW) : w;
    const x = padding + Math.random() * (svgW - w - padding * 2);
    const y = padding + Math.random() * (svgH - h - padding * 2);
    shapes.push({ id: i, kind, x, y, w, h, color: pickColor() });
  }
  return shapes;
}

function applyDifference(shapes: Shape[]): { shapes: Shape[]; changedId: number } {
  const idx = Math.floor(Math.random() * shapes.length);
  const original = shapes[idx];
  const changed: Shape = { ...original, color: pickColor(original.color) };
  const next = shapes.map((s, i) => (i === idx ? changed : s));
  return { shapes: next, changedId: original.id };
}

function isTouchOnShape(shape: Shape, tx: number, ty: number): boolean {
  if (shape.kind === 'circle') {
    const cx = shape.x + shape.w / 2;
    const cy = shape.y + shape.h / 2;
    const r = shape.w / 2;
    return Math.hypot(tx - cx, ty - cy) <= r + 8;
  }
  return (
    tx >= shape.x - 8 &&
    tx <= shape.x + shape.w + 8 &&
    ty >= shape.y - 8 &&
    ty <= shape.y + shape.h + 8
  );
}

const ROUNDS_PER_LEVEL = 5;
const MAX_LIVES = 3;

export function SpotChange({ game, onBack, onComplete, initialLevel }: Props) {
  const { width, height } = useWindowDimensions();

  // SVG scene dimensions — two scenes side by side with a gap
  const totalPad = 32;
  const gap = 10;
  const svgW = Math.floor((width - totalPad - gap) / 2);
  const svgH = Math.floor(Math.min(height * 0.38, svgW * 1.1));

  const [level, setLevel] = useState(initialLevel ?? 1);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(MAX_LIVES);
  const [round, setRound] = useState(1);
  const [phase, setPhase] = useState<'playing' | 'feedback' | 'levelComplete' | 'gameOver'>('playing');
  const [feedbackCorrect, setFeedbackCorrect] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [lastLevelScore, setLastLevelScore] = useState(0);

  const timeLimit = Math.max(8, 20 - level * 1.5);
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // scene state
  const [scenesA, setScenesA] = useState<Shape[]>([]);
  const [scenesB, setScenesB] = useState<Shape[]>([]);
  const [changedId, setChangedId] = useState<number>(-1);
  const [flashId, setFlashId] = useState<number | null>(null);

  const shapeCount = 6 + Math.min(level - 1, 4); // 6–10

  const generateRound = useCallback(
    (lv: number) => {
      const cnt = 6 + Math.min(lv - 1, 4);
      const base = generateShapes(cnt, svgW, svgH);
      const { shapes: modified, changedId: cid } = applyDifference(base);
      setScenesA(base);
      setScenesB(modified);
      setChangedId(cid);
      setFlashId(null);
      setTimeLeft(Math.max(8, 20 - lv * 1.5));
    },
    [svgW, svgH],
  );

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    stopTimer();
    timerRef.current = setInterval(() => {
      setTimeLeft((t: number) => {
        if (t <= 0.1) return 0;
        return +(t - 0.1).toFixed(1);
      });
    }, 100);
  }, [stopTimer]);

  // Init first round
  useEffect(() => {
    generateRound(level);
  }, []);

  // Watch timeLeft reach 0
  useEffect(() => {
    if (phase !== 'playing') return;
    if (timeLeft <= 0) {
      stopTimer();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      const newLives = lives - 1;
      setLives(newLives);
      setFeedbackCorrect(false);
      setFeedbackText('Время вышло!');
      setPhase('feedback');
      if (newLives <= 0) {
        onComplete(false, score, { level, round });
      }
    }
  }, [timeLeft, phase]);

  // Start timer when playing
  useEffect(() => {
    if (phase === 'playing') {
      startTimer();
    } else {
      stopTimer();
    }
    return stopTimer;
  }, [phase]);

  const handleSceneBTap = useCallback(
    (tx: number, ty: number) => {
      if (phase !== 'playing') return;
      stopTimer();

      const hit = scenesB.find((s: Shape) => isTouchOnShape(s, tx, ty));
      if (!hit) {
        startTimer();
        return;
      }

      if (hit.id === changedId) {
        // Correct
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        const gained = Math.ceil(timeLeft * 10) + level * 20;
        const newScore = score + gained;
        setScore(newScore);
        setFlashId(hit.id);
        setFeedbackCorrect(true);
        setFeedbackText(`Верно! +${gained} очков`);
        setPhase('feedback');

        if (round >= ROUNDS_PER_LEVEL) {
          setLastLevelScore(newScore - score + gained);
          setTimeout(() => {
            setPhase('levelComplete');
            onComplete(true, newScore, { level, round });
          }, 900);
        }
      } else {
        // Wrong tap
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        setFeedbackCorrect(false);
        setFeedbackText('Не то! Ищи дальше…');
        // Deduct half a second from timer as penalty, keep playing
        setTimeLeft((t: number) => Math.max(0, t - 2));
        setPhase('feedback');
      }
    },
    [phase, scenesB, changedId, timeLeft, score, round, level, stopTimer, startTimer],
  );

  const advanceRound = useCallback(() => {
    if (lives <= 0) {
      setPhase('gameOver');
      return;
    }
    const nextRound = round + 1;
    if (nextRound > ROUNDS_PER_LEVEL) {
      // should have been caught above, but guard
      setPhase('levelComplete');
      return;
    }
    setRound(nextRound);
    generateRound(level);
    setPhase('playing');
  }, [lives, round, level, generateRound]);

  // After feedback delay, auto-advance or wait for user
  useEffect(() => {
    if (phase !== 'feedback') return;
    const timeout = feedbackCorrect ? 800 : 1200;
    const t = setTimeout(() => {
      if (phase !== 'feedback') return;
      if (feedbackCorrect && round >= ROUNDS_PER_LEVEL) return; // levelComplete will take over
      if (lives <= 0) {
        setPhase('gameOver');
        return;
      }
      advanceRound();
    }, timeout);
    return () => clearTimeout(t);
  }, [phase, feedbackCorrect, advanceRound]);

  // ---- Level complete screen ----
  if (phase === 'levelComplete') {
    return (
      <LevelComplete
        level={level}
        passed
        score={score}
        scoreLabel="Очки"
        accent={game.accent}
        showAd={shouldShowAdAfter(level)}
        onContinue={() => {
          const nextLevel = level + 1;
          setLevel(nextLevel);
          setRound(1);
          setLives(MAX_LIVES);
          generateRound(nextLevel);
          setPhase('playing');
        }}
        onRetry={() => {
          setRound(1);
          setLives(MAX_LIVES);
          generateRound(level);
          setPhase('playing');
        }}
        onBack={onBack}
      />
    );
  }

  // ---- Game over screen ----
  if (phase === 'gameOver') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <GameResult
          won={false}
          score={score}
          accent={game.accent}
          game={game}
          onRestart={() => {
            setScore(0);
            setLevel(initialLevel ?? 1);
            setRound(1);
            setLives(MAX_LIVES);
            generateRound(initialLevel ?? 1);
            setPhase('playing');
          }}
          onBack={onBack}
        />
      </View>
    );
  }

  const timerPct = (timeLeft / timeLimit) * 100;
  const timerColor = timerPct > 50 ? colors.ok : timerPct > 25 ? '#EAB308' : colors.warn;

  return (
    <GameShell game={game} onBack={onBack} score={score} label={`Ур. ${level} · Раунд ${round}/${ROUNDS_PER_LEVEL}`}>
      {/* Lives */}
      <View style={{ flexDirection: 'row', gap: 6, alignSelf: 'center' }}>
        {Array.from({ length: MAX_LIVES }, (_, i) => (
          <Text key={i} style={{ fontSize: 18 }}>
            {i < lives ? '❤️' : '🖤'}
          </Text>
        ))}
      </View>

      {/* Timer bar */}
      <View
        style={{
          width: '100%',
          height: 6,
          borderRadius: 3,
          backgroundColor: 'rgba(255,255,255,0.1)',
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            height: '100%',
            width: `${Math.max(0, timerPct)}%`,
            backgroundColor: timerColor,
            borderRadius: 3,
          }}
        />
      </View>
      <Text
        style={{
          fontSize: 12,
          fontFamily: fontFamily.semibold,
          color: timerPct < 30 ? colors.warn : 'rgba(255,255,255,0.5)',
          alignSelf: 'flex-end',
        }}
      >
        {timeLeft.toFixed(1)} сек
      </Text>

      {/* Feedback overlay */}
      {phase === 'feedback' && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 10,
            alignItems: 'center',
            paddingTop: 8,
          }}
          pointerEvents="none"
        >
          <View
            style={{
              paddingHorizontal: 18,
              paddingVertical: 8,
              borderRadius: radius.pill,
              backgroundColor: feedbackCorrect ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)',
              borderWidth: 1,
              borderColor: feedbackCorrect ? '#22C55E' : '#EF4444',
            }}
          >
            <Text
              style={{
                fontFamily: fontFamily.bold,
                fontSize: 14,
                color: feedbackCorrect ? '#22C55E' : '#EF4444',
              }}
            >
              {feedbackText}
            </Text>
          </View>
        </View>
      )}

      {/* Instruction */}
      <Text
        style={{
          fontSize: 13,
          fontFamily: fontFamily.semibold,
          color: 'rgba(255,255,255,0.55)',
        }}
      >
        Найди отличие! Нажми на отличающуюся фигуру справа.
      </Text>

      {/* Scenes row */}
      <View style={{ flexDirection: 'row', gap, alignItems: 'flex-start' }}>
        {/* Scene A — original, non-interactive */}
        <View
          style={{
            width: svgW,
            height: svgH,
            borderRadius: radius.md,
            overflow: 'hidden',
            backgroundColor: 'rgba(0,0,0,0.3)',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.1)',
          }}
        >
          <Svg width={svgW} height={svgH}>
            {scenesA.map((shape: Shape) =>
              shape.kind === 'circle' ? (
                <Circle
                  key={shape.id}
                  cx={shape.x + shape.w / 2}
                  cy={shape.y + shape.h / 2}
                  r={shape.w / 2}
                  fill={shape.color}
                  opacity={0.9}
                />
              ) : (
                <Rect
                  key={shape.id}
                  x={shape.x}
                  y={shape.y}
                  width={shape.w}
                  height={shape.h}
                  rx={4}
                  fill={shape.color}
                  opacity={0.9}
                />
              ),
            )}
          </Svg>
          <View
            style={{
              position: 'absolute',
              bottom: 4,
              left: 0,
              right: 0,
              alignItems: 'center',
            }}
            pointerEvents="none"
          >
            <Text
              style={{
                fontSize: 10,
                fontFamily: fontFamily.bold,
                color: 'rgba(255,255,255,0.4)',
                letterSpacing: 1,
              }}
            >
              А
            </Text>
          </View>
        </View>

        {/* Scene B — interactive */}
        <Pressable
          onPress={(e: GestureResponderEvent) => {
            const { locationX, locationY } = e.nativeEvent;
            handleSceneBTap(locationX, locationY);
          }}
          style={{
            width: svgW,
            height: svgH,
            borderRadius: radius.md,
            overflow: 'hidden',
            backgroundColor: 'rgba(0,0,0,0.3)',
            borderWidth: 1,
            borderColor:
              phase === 'feedback'
                ? feedbackCorrect
                  ? '#22C55E'
                  : '#EF4444'
                : 'rgba(255,255,255,0.18)',
          }}
        >
          <Svg width={svgW} height={svgH}>
            {scenesB.map((shape: Shape) => {
              const isFlash = flashId === shape.id;
              return shape.kind === 'circle' ? (
                <Circle
                  key={shape.id}
                  cx={shape.x + shape.w / 2}
                  cy={shape.y + shape.h / 2}
                  r={isFlash ? shape.w / 2 + 4 : shape.w / 2}
                  fill={shape.color}
                  opacity={isFlash ? 1 : 0.9}
                  stroke={isFlash ? '#fff' : undefined}
                  strokeWidth={isFlash ? 3 : 0}
                />
              ) : (
                <Rect
                  key={shape.id}
                  x={isFlash ? shape.x - 4 : shape.x}
                  y={isFlash ? shape.y - 4 : shape.y}
                  width={isFlash ? shape.w + 8 : shape.w}
                  height={isFlash ? shape.h + 8 : shape.h}
                  rx={4}
                  fill={shape.color}
                  opacity={isFlash ? 1 : 0.9}
                  stroke={isFlash ? '#fff' : undefined}
                  strokeWidth={isFlash ? 3 : 0}
                />
              );
            })}
          </Svg>
          <View
            style={{
              position: 'absolute',
              bottom: 4,
              left: 0,
              right: 0,
              alignItems: 'center',
            }}
            pointerEvents="none"
          >
            <Text
              style={{
                fontSize: 10,
                fontFamily: fontFamily.bold,
                color: 'rgba(255,255,255,0.4)',
                letterSpacing: 1,
              }}
            >
              Б — нажми на отличие
            </Text>
          </View>
        </Pressable>
      </View>
    </GameShell>
  );
}
