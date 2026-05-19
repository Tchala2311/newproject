import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, Text, View, useWindowDimensions } from 'react-native';
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

const SURVIVE_TIME = 30;
const TIP_ANGLE = 35;
const COUNTERWEIGHT_STEP = 5;
const OBJECT_RADIUS = 22;
const SEESAW_HEIGHT = 12;
const SEESAW_W = 280;
const PIVOT_H = 40;

type FallingObject = {
  id: number;
  x: number;
  y: number;
  weight: number;
  color: string;
  landed: boolean;
  side: 'left' | 'right' | null;
};

type LandedObject = {
  id: number;
  side: 'left' | 'right';
  weight: number;
  color: string;
  xOffset: number;
};

const OBJ_COLORS = ['#EF4444', '#F97316', '#EAB308', '#22C55E', '#3B82F6'];

let objUid = 0;

function weightToColor(w: number): string {
  return OBJ_COLORS[w - 1] ?? '#fff';
}

export function Balance({ game, onBack, onComplete, initialLevel }: Props) {
  const { width, height } = useWindowDimensions();
  const boardTop = height * 0.18;
  const seesawY = height * 0.52;

  const [level, setLevel] = useState(initialLevel ?? 1);
  const [phase, setPhase] = useState<'playing' | 'levelcomplete' | 'gameover'>('playing');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(SURVIVE_TIME);
  const [leftWeight, setLeftWeight] = useState(0);
  const [rightWeight, setRightWeight] = useState(0);
  const [counterweight, setCounterweight] = useState(0);
  const [fallingObjects, setFallingObjects] = useState<FallingObject[]>([]);
  const [landedObjects, setLandedObjects] = useState<LandedObject[]>([]);
  const [tiltDeg, setTiltDeg] = useState(0);

  const animAngle = useRef(new Animated.Value(0)).current;
  const phaseRef = useRef<'playing' | 'levelcomplete' | 'gameover'>('playing');
  const leftWeightRef = useRef(0);
  const rightWeightRef = useRef(0);
  const counterweightRef = useRef(0);
  const levelRef = useRef(level);
  const scoreRef = useRef(0);
  const spawnTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const landedRef = useRef<LandedObject[]>([]);
  const fallingRef = useRef<FallingObject[]>([]);
  const fallTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const computeAngle = useCallback(
    (lw: number, rw: number, cw: number): number => {
      const adjustedLeft = lw + cw;
      const adjustedRight = rw - cw;
      const total = adjustedLeft + adjustedRight;
      if (total === 0) return 0;
      const raw = Math.atan((adjustedRight - adjustedLeft) / Math.max(total, 1)) * (180 / Math.PI);
      return Math.max(-45, Math.min(45, raw));
    },
    []
  );

  const endGame = useCallback(
    (won: boolean) => {
      if (phaseRef.current !== 'playing') return;
      phaseRef.current = won ? 'levelcomplete' : 'gameover';
      if (spawnTimerRef.current) clearInterval(spawnTimerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (fallTimerRef.current) clearInterval(fallTimerRef.current);
      const sc = scoreRef.current;
      setPhase(won ? 'levelcomplete' : 'gameover');
      onComplete(won, sc, { level: levelRef.current });
      if (won) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      }
    },
    [onComplete]
  );

  const initLevel = useCallback(
    (lv: number) => {
      levelRef.current = lv;
      phaseRef.current = 'playing';
      leftWeightRef.current = 0;
      rightWeightRef.current = 0;
      counterweightRef.current = 0;
      scoreRef.current = 0;
      landedRef.current = [];
      fallingRef.current = [];
      setPhase('playing');
      setScore(0);
      setTimeLeft(SURVIVE_TIME);
      setLeftWeight(0);
      setRightWeight(0);
      setCounterweight(0);
      setTiltDeg(0);
      setLandedObjects([]);
      setFallingObjects([]);
      animAngle.setValue(0);
    },
    [animAngle]
  );

  // Main game loop when phase changes to playing
  useEffect(() => {
    if (phase !== 'playing') return;

    initLevel(level);

    // Countdown timer
    countdownRef.current = setInterval(() => {
      if (phaseRef.current !== 'playing') return;
      setTimeLeft((prev: number) => {
        const next = prev - 1;
        scoreRef.current = SURVIVE_TIME - next;
        setScore(scoreRef.current);
        if (next <= 0) {
          endGame(true);
          return 0;
        }
        return next;
      });
    }, 1000);

    // Object spawner
    const spawnInterval = Math.max(1000, 2500 - level * 200);
    spawnTimerRef.current = setInterval(() => {
      if (phaseRef.current !== 'playing') return;
      const weight = Math.ceil(Math.random() * 5) as 1 | 2 | 3 | 4 | 5;
      const obj: FallingObject = {
        id: ++objUid,
        x: OBJECT_RADIUS + Math.random() * (width - OBJECT_RADIUS * 2),
        y: 0,
        weight,
        color: weightToColor(weight),
        landed: false,
        side: null,
      };
      fallingRef.current = [...fallingRef.current, obj];
      setFallingObjects([...fallingRef.current]);
    }, spawnInterval);

    // Falling animation tick
    fallTimerRef.current = setInterval(() => {
      if (phaseRef.current !== 'playing') return;

      const updated: FallingObject[] = [];
      const newlyLanded: LandedObject[] = [];

      for (const obj of fallingRef.current) {
        if (obj.landed) continue;

        const nextY = obj.y + 6;
        // Seesaw is at seesawY relative to screen; board area starts below header
        // We use absolute y positions for falling objects relative to the board
        const landY = seesawY - boardTop - OBJECT_RADIUS - SEESAW_HEIGHT;

        if (nextY >= landY) {
          const seesawCenterX = width / 2;
          const side: 'left' | 'right' = obj.x < seesawCenterX ? 'left' : 'right';
          const xOffset = obj.x - seesawCenterX;
          newlyLanded.push({ id: obj.id, side, weight: obj.weight, color: obj.color, xOffset });
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        } else {
          updated.push({ ...obj, y: nextY });
        }
      }

      fallingRef.current = updated;

      if (newlyLanded.length > 0) {
        const nextLanded = [...landedRef.current, ...newlyLanded];
        landedRef.current = nextLanded;

        let lw = 0;
        let rw = 0;
        for (const o of nextLanded) {
          if (o.side === 'left') lw += o.weight;
          else rw += o.weight;
        }

        leftWeightRef.current = lw;
        rightWeightRef.current = rw;
        setLeftWeight(lw);
        setRightWeight(rw);
        setLandedObjects([...nextLanded]);

        const cw = counterweightRef.current;
        const angle = computeAngle(lw, rw, cw);
        setTiltDeg(angle);
        Animated.spring(animAngle, {
          toValue: angle,
          useNativeDriver: true,
          damping: 12,
          stiffness: 100,
        }).start();

        if (Math.abs(angle) >= TIP_ANGLE) {
          endGame(false);
          return;
        }
      }

      setFallingObjects([...fallingRef.current]);
    }, 40);

    return () => {
      if (spawnTimerRef.current) clearInterval(spawnTimerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (fallTimerRef.current) clearInterval(fallTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, phase === 'playing']);

  const shiftBalance = useCallback(
    (dir: 'left' | 'right') => {
      if (phaseRef.current !== 'playing') return;
      Haptics.selectionAsync().catch(() => {});

      setCounterweight((prev: number) => {
        const delta = dir === 'left' ? -COUNTERWEIGHT_STEP : COUNTERWEIGHT_STEP;
        const next = Math.max(-30, Math.min(30, prev + delta));
        counterweightRef.current = next;

        const lw = leftWeightRef.current;
        const rw = rightWeightRef.current;
        const angle = computeAngle(lw, rw, next);
        setTiltDeg(angle);
        Animated.spring(animAngle, {
          toValue: angle,
          useNativeDriver: true,
          damping: 12,
          stiffness: 100,
        }).start();

        if (Math.abs(angle) >= TIP_ANGLE) {
          endGame(false);
        }

        return next;
      });
    },
    [animAngle, computeAngle, endGame]
  );

  if (phase === 'levelcomplete') {
    return (
      <LevelComplete
        level={level}
        passed={true}
        score={score}
        scoreLabel="Секунды"
        accent={game.accent}
        showAd={shouldShowAdAfter(level)}
        onContinue={() => { setPhase('playing'); setLevel((l: number) => l + 1); }}
        onRetry={() => {
          initLevel(level);
          setPhase('playing');
        }}
        onBack={onBack}
      />
    );
  }

  if (phase === 'gameover') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <GameResult
          won={false}
          score={score}
          accent={game.accent}
          game={game}
          onRestart={() => {
            initLevel(level);
            setPhase('playing');
          }}
          onBack={onBack}
        />
      </View>
    );
  }

  const seesawRotate = animAngle.interpolate({
    inputRange: [-45, 45],
    outputRange: ['-45deg', '45deg'],
  });

  const absAngle = Math.abs(tiltDeg);
  const angleColor =
    absAngle > 30 ? colors.warn : absAngle > 20 ? '#F97316' : absAngle > 10 ? '#EAB308' : colors.ok;

  const seesawCenterX = width / 2;
  const boardAreaTop = boardTop;

  return (
    <GameShell
      game={game}
      onBack={onBack}
      score={`${score}с`}
      timer={timeLeft}
      timerMax={SURVIVE_TIME}
      label={`Ур. ${level} · выживи ${SURVIVE_TIME}с`}
    >
      {/* HUD */}
      <View style={{
        flexDirection: 'row',
        gap: 10,
        alignItems: 'center',
        marginBottom: 8,
      }}>
        <View style={{
          backgroundColor: 'rgba(0,0,0,0.35)',
          borderRadius: radius.md,
          paddingHorizontal: 12,
          paddingVertical: 6,
          alignItems: 'center',
          minWidth: 72,
        }}>
          <Text style={{ fontSize: 10, fontFamily: fontFamily.semibold, color: colors.textDim, letterSpacing: 1 }}>
            ЛЕВО
          </Text>
          <Text style={{ fontSize: 18, fontFamily: fontFamily.bold, color: '#fff' }}>
            {leftWeight}
          </Text>
        </View>

        <View style={{
          backgroundColor: 'rgba(0,0,0,0.35)',
          borderRadius: radius.md,
          paddingHorizontal: 12,
          paddingVertical: 6,
          alignItems: 'center',
          flex: 1,
        }}>
          <Text style={{ fontSize: 10, fontFamily: fontFamily.semibold, color: colors.textDim, letterSpacing: 1 }}>
            НАКЛОН
          </Text>
          <Text style={{ fontSize: 18, fontFamily: fontFamily.bold, color: angleColor }}>
            {tiltDeg > 0 ? '→' : tiltDeg < 0 ? '←' : '—'} {Math.abs(tiltDeg).toFixed(0)}°
          </Text>
          <Text style={{ fontSize: 9, fontFamily: fontFamily.semibold, color: colors.textFaint }}>
            лимит {TIP_ANGLE}°
          </Text>
        </View>

        <View style={{
          backgroundColor: 'rgba(0,0,0,0.35)',
          borderRadius: radius.md,
          paddingHorizontal: 12,
          paddingVertical: 6,
          alignItems: 'center',
          minWidth: 72,
        }}>
          <Text style={{ fontSize: 10, fontFamily: fontFamily.semibold, color: colors.textDim, letterSpacing: 1 }}>
            ПРАВО
          </Text>
          <Text style={{ fontSize: 18, fontFamily: fontFamily.bold, color: '#fff' }}>
            {rightWeight}
          </Text>
        </View>
      </View>

      {/* Counterweight indicator */}
      <Text style={{
        fontSize: 11,
        fontFamily: fontFamily.semibold,
        color: colors.textDim,
        marginBottom: 4,
      }}>
        Противовес: {counterweight > 0 ? `→ +${counterweight}` : counterweight < 0 ? `← ${counterweight}` : '0'}
      </Text>

      {/* Game area: falling objects + seesaw */}
      <View style={{
        width: width - 32,
        height: height * 0.42,
        overflow: 'hidden',
        borderRadius: radius.lg,
        backgroundColor: 'rgba(0,0,0,0.22)',
        borderWidth: 1,
        borderColor: colors.glassBorder,
        position: 'relative',
      }}>
        {/* Falling objects */}
        {fallingObjects.map((obj: FallingObject) => {
          const relX = obj.x - 16;
          return (
            <View
              key={obj.id}
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: relX - OBJECT_RADIUS,
                top: obj.y,
                width: OBJECT_RADIUS * 2,
                height: OBJECT_RADIUS * 2,
                borderRadius: OBJECT_RADIUS,
                backgroundColor: obj.color,
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: obj.color,
                shadowOpacity: 0.7,
                shadowRadius: 6,
                shadowOffset: { width: 0, height: 0 },
              }}
            >
              <Text style={{ fontSize: 13, fontFamily: fontFamily.bold, color: '#fff' }}>
                {obj.weight}
              </Text>
            </View>
          );
        })}

        {/* Seesaw pivot */}
        <View style={{
          position: 'absolute',
          bottom: 0,
          left: (width - 32) / 2 - 8,
          width: 16,
          height: PIVOT_H,
          backgroundColor: 'rgba(255,255,255,0.3)',
          borderTopLeftRadius: 4,
          borderTopRightRadius: 4,
        }} />

        {/* Seesaw beam */}
        <Animated.View
          style={{
            position: 'absolute',
            bottom: PIVOT_H - SEESAW_HEIGHT / 2,
            left: (width - 32) / 2 - SEESAW_W / 2,
            width: SEESAW_W,
            height: SEESAW_HEIGHT,
            borderRadius: radius.sm,
            backgroundColor: game.accent,
            transformOrigin: 'center',
            transform: [{ rotate: seesawRotate }],
            shadowColor: game.accent,
            shadowOpacity: 0.5,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 0 },
          }}
        />

        {/* Landed objects on seesaw */}
        {landedObjects.map((obj: LandedObject, idx: number) => {
          const seesawRelX = (width - 32) / 2 + obj.xOffset;
          const bottomOffset = PIVOT_H + SEESAW_HEIGHT + OBJECT_RADIUS;
          return (
            <View
              key={obj.id}
              pointerEvents="none"
              style={{
                position: 'absolute',
                bottom: bottomOffset + (idx % 2) * (OBJECT_RADIUS * 0.5),
                left: seesawRelX - OBJECT_RADIUS,
                width: OBJECT_RADIUS * 2,
                height: OBJECT_RADIUS * 2,
                borderRadius: OBJECT_RADIUS,
                backgroundColor: obj.color,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: 0.85,
              }}
            >
              <Text style={{ fontSize: 12, fontFamily: fontFamily.bold, color: '#fff' }}>
                {obj.weight}
              </Text>
            </View>
          );
        })}

        {/* Danger bar */}
        {absAngle > 25 && (
          <View style={{
            position: 'absolute',
            top: 8,
            left: 0,
            right: 0,
            alignItems: 'center',
          }}>
            <Text style={{ fontSize: 12, fontFamily: fontFamily.bold, color: colors.warn }}>
              ⚠ ОПАСНЫЙ НАКЛОН!
            </Text>
          </View>
        )}
      </View>

      {/* Control buttons */}
      <View style={{ flexDirection: 'row', gap: 16, marginTop: 8 }}>
        <Pressable
          onPress={() => shiftBalance('left')}
          style={({ pressed }: { pressed: boolean }) => ({
            flex: 1,
            paddingVertical: 16,
            borderRadius: radius.lg,
            backgroundColor: pressed ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.12)',
            borderWidth: 1,
            borderColor: colors.glassBorderStrong,
            alignItems: 'center',
          })}
        >
          <Text style={{ fontSize: 22 }}>←</Text>
          <Text style={{ fontSize: 11, fontFamily: fontFamily.semibold, color: colors.textMuted, marginTop: 2 }}>
            Нажми
          </Text>
        </Pressable>

        <Pressable
          onPress={() => shiftBalance('right')}
          style={({ pressed }: { pressed: boolean }) => ({
            flex: 1,
            paddingVertical: 16,
            borderRadius: radius.lg,
            backgroundColor: pressed ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.12)',
            borderWidth: 1,
            borderColor: colors.glassBorderStrong,
            alignItems: 'center',
          })}
        >
          <Text style={{ fontSize: 22 }}>→</Text>
          <Text style={{ fontSize: 11, fontFamily: fontFamily.semibold, color: colors.textMuted, marginTop: 2 }}>
            Нажми
          </Text>
        </Pressable>
      </View>

      <Text style={{
        fontSize: 11,
        fontFamily: fontFamily.semibold,
        color: colors.textFaint,
        marginTop: 4,
      }}>
        ← Нажми →  чтобы сместить противовес
      </Text>
    </GameShell>
  );
}
