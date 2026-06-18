import React, { useCallback, useEffect, useRef, useState } from 'react';
import { PanResponder, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';
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

type Phase = 'preview' | 'drawing' | 'result' | 'levelComplete';

type WaveParams = {
  amplitude: number;
  frequency: number;
  phase: number;
};

type Pt = { x: number; y: number };

const ROUNDS_PER_LEVEL = 4;
const SAMPLE_COUNT = 40;

function randomWaveParams(): WaveParams {
  return {
    amplitude: 30 + Math.random() * 50,
    frequency: 1 + Math.random() * 2,
    phase: Math.random() * Math.PI * 2,
  };
}

function buildWavePath(
  params: WaveParams,
  boardWidth: number,
  boardHeight: number
): string {
  const midY = boardHeight / 2;
  const points: string[] = [];
  for (let i = 0; i <= 80; i++) {
    const x = (i / 80) * boardWidth;
    const t = (i / 80) * Math.PI * 2 * params.frequency;
    const y = midY - params.amplitude * Math.sin(t + params.phase);
    points.push(i === 0 ? `M${x.toFixed(1)},${y.toFixed(1)}` : `L${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return points.join(' ');
}

function sampleWave(
  params: WaveParams,
  boardWidth: number,
  boardHeight: number,
  count: number
): number[] {
  const midY = boardHeight / 2;
  return Array.from({ length: count }, (_, i) => {
    const t = (i / (count - 1)) * Math.PI * 2 * params.frequency;
    return midY - params.amplitude * Math.sin(t + params.phase);
  });
}

function buildUserPath(pts: Pt[]): string {
  if (pts.length < 2) return '';
  return pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ');
}

function normalizeUserPoints(pts: Pt[], boardWidth: number, count: number): number[] {
  if (pts.length < 2) return Array(count).fill(0);

  // Map each sample x in [0, boardWidth] to a user y via linear interpolation
  const sorted = [...pts].sort((a, b) => a.x - b.x);

  return Array.from({ length: count }, (_, i) => {
    const targetX = (i / (count - 1)) * boardWidth;
    // Find surrounding pts
    let lo = 0;
    let hi = sorted.length - 1;
    for (let j = 0; j < sorted.length - 1; j++) {
      if (sorted[j].x <= targetX && sorted[j + 1].x >= targetX) {
        lo = j;
        hi = j + 1;
        break;
      }
    }
    if (lo === hi) return sorted[lo].y;
    const dx = sorted[hi].x - sorted[lo].x;
    if (Math.abs(dx) < 0.001) return sorted[lo].y;
    const t = (targetX - sorted[lo].x) / dx;
    return sorted[lo].y + t * (sorted[hi].y - sorted[lo].y);
  });
}

function computeDeviation(userYs: number[], targetYs: number[]): number {
  const n = Math.min(userYs.length, targetYs.length);
  if (n === 0) return 999;
  const sum = Array.from({ length: n }, (_, i) => Math.abs(userYs[i] - targetYs[i])).reduce(
    (a, b) => a + b,
    0
  );
  return sum / n;
}

function roundScore(deviation: number): number {
  if (deviation < 20) return 100;
  if (deviation < 40) return 60;
  if (deviation < 60) return 30;
  return 0;
}

export function WaveMatch({ game, onBack, onComplete, initialLevel }: Props) {
  const { width, height } = useWindowDimensions();
  const boardWidth = width - 32;
  const boardHeight = Math.min(height * 0.38, 220);

  const [level, setLevel] = useState(initialLevel ?? 1);
  const [phase, setPhase] = useState<Phase>('preview');
  const [round, setRound] = useState(1);
  const [totalScore, setTotalScore] = useState(0);
  const [waveParams, setWaveParams] = useState<WaveParams>(() => randomWaveParams());
  const [userPoints, setUserPoints] = useState<Pt[]>([]);
  const [lastRoundScore, setLastRoundScore] = useState<number | null>(null);
  const [lastDeviation, setLastDeviation] = useState<number>(0);
  const [passed, setPassed] = useState(false);

  const boardRef = useRef<View>(null);
  const boardOriginRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const userPointsRef = useRef<Pt[]>([]);
  const phaseRef = useRef<Phase>('preview');
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const waveParamsRef = useRef<WaveParams>(waveParams);

  phaseRef.current = phase;
  waveParamsRef.current = waveParams;

  const startPreview = useCallback((params: WaveParams) => {
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    setUserPoints([]);
    userPointsRef.current = [];
    setLastRoundScore(null);
    setPhase('preview');
    phaseRef.current = 'preview';
    previewTimerRef.current = setTimeout(() => {
      setPhase('drawing');
      phaseRef.current = 'drawing';
    }, 2000);
  }, []);

  useEffect(() => () => { if (previewTimerRef.current) clearTimeout(previewTimerRef.current); }, []);

  useEffect(() => {
    const params = randomWaveParams();
    setWaveParams(params);
    waveParamsRef.current = params;
    startPreview(params);
  }, [level]);

  const onLayout = () => {
    boardRef.current?.measureInWindow((x, y) => {
      boardOriginRef.current = { x, y };
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => phaseRef.current === 'drawing',
      onMoveShouldSetPanResponder: () => phaseRef.current === 'drawing',
      onPanResponderGrant: (_, g) => {
        // Re-measure the true board position at gesture start — measure() on
        // layout is unreliable, so refresh the origin via measureInWindow here.
        boardRef.current?.measureInWindow((x, y) => {
          boardOriginRef.current = { x, y };
        });
        const ox = boardOriginRef.current.x;
        const oy = boardOriginRef.current.y;
        const pt = { x: g.x0 - ox, y: g.y0 - oy };
        userPointsRef.current = [pt];
        setUserPoints([pt]);
      },
      onPanResponderMove: (_, g) => {
        if (phaseRef.current !== 'drawing') return;
        const ox = boardOriginRef.current.x;
        const oy = boardOriginRef.current.y;
        const pt = { x: g.moveX - ox, y: g.moveY - oy };
        userPointsRef.current = [...userPointsRef.current, pt];
        setUserPoints([...userPointsRef.current]);
      },
      onPanResponderRelease: () => {
        if (phaseRef.current !== 'drawing') return;
        const pts = userPointsRef.current;
        if (pts.length < 5) return;

        const params = waveParamsRef.current;
        const targetYs = sampleWave(params, boardWidth, boardHeight, SAMPLE_COUNT);
        const userYs = normalizeUserPoints(pts, boardWidth, SAMPLE_COUNT);
        const deviation = computeDeviation(userYs, targetYs);
        const pts2 = roundScore(deviation);

        setLastDeviation(deviation);
        setLastRoundScore(pts2);
        setPhase('result');
        phaseRef.current = 'result';

        if (pts2 >= 60) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        }
      },
    })
  ).current;

  const advance = () => {
    const newTotal = totalScore + (lastRoundScore ?? 0);

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
      setRound((r) => r + 1);
      const params = randomWaveParams();
      setWaveParams(params);
      waveParamsRef.current = params;
      startPreview(params);
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
          const params = randomWaveParams();
          setWaveParams(params);
          waveParamsRef.current = params;
          startPreview(params);
        }}
        onBack={onBack}
      />
    );
  }

  const wavePath = buildWavePath(waveParams, boardWidth, boardHeight);
  const userPath = buildUserPath(userPoints);

  return (
    <GameShell game={game} onBack={onBack} score={`${totalScore}`} label={`раунд ${round}/${ROUNDS_PER_LEVEL}`}>
      <Text
        style={{
          fontSize: 15,
          fontFamily: fontFamily.bold,
          color: phase === 'preview' ? game.accent : '#fff',
          marginBottom: 14,
          letterSpacing: 0.4,
        }}
      >
        {phase === 'preview'
          ? 'Запомни волну!'
          : phase === 'drawing'
          ? 'Нарисуй!'
          : 'Результат'}
      </Text>

      <View
        ref={boardRef}
        onLayout={onLayout}
        {...panResponder.panHandlers}
        style={{
          width: boardWidth,
          height: boardHeight,
          backgroundColor: 'rgba(0,0,0,0.30)',
          borderRadius: 16,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.12)',
          overflow: 'hidden',
        }}
      >
        <Svg width={boardWidth} height={boardHeight}>
          {/* Target wave — visible during preview and result */}
          {(phase === 'preview' || phase === 'result') && wavePath ? (
            <Path
              d={wavePath}
              fill="none"
              stroke={game.accent}
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}
          {/* User drawn path — visible during drawing and result */}
          {(phase === 'drawing' || phase === 'result') && userPath ? (
            <Path
              d={userPath}
              fill="none"
              stroke="#ffffff"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.9}
            />
          ) : null}
          {/* Midline guide */}
          {phase === 'drawing' ? (
            <Path
              d={`M0,${boardHeight / 2} L${boardWidth},${boardHeight / 2}`}
              fill="none"
              stroke="rgba(255,255,255,0.12)"
              strokeWidth={1}
              strokeDasharray="6,6"
            />
          ) : null}
        </Svg>
      </View>

      {phase === 'result' && lastRoundScore !== null ? (
        <View style={{ alignItems: 'center', marginTop: 16, gap: 6 }}>
          <Text
            style={{
              fontSize: 20,
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
          <Text
            style={{
              fontSize: 11,
              fontFamily: fontFamily.semibold,
              color: colors.textDim,
            }}
          >
            отклонение: {Math.round(lastDeviation)}px
          </Text>
          <View
            style={{
              marginTop: 10,
              backgroundColor: game.accent,
              paddingHorizontal: 36,
              paddingVertical: 13,
              borderRadius: radius.pill,
            }}
          >
            <Text
              onPress={advance}
              style={{ fontSize: 15, fontFamily: fontFamily.bold, color: '#000' }}
            >
              {round >= ROUNDS_PER_LEVEL ? 'Итоги' : 'Следующий →'}
            </Text>
          </View>
        </View>
      ) : (
        <Text
          style={{
            marginTop: 16,
            fontSize: 11,
            fontFamily: fontFamily.semibold,
            color: colors.textFaint,
          }}
        >
          {phase === 'preview'
            ? `амплитуда ${Math.round(waveParams.amplitude)}px · ${waveParams.frequency.toFixed(1)} цикла`
            : phase === 'drawing'
            ? 'Веди пальцем по экрану'
            : ''}
        </Text>
      )}
    </GameShell>
  );
}
