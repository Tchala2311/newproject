import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Game } from '../data/games';
import { LevelComplete, shouldShowAdAfter } from './LevelComplete';
import { GameResult } from './GameResult';
import { fontFamily, colors } from '../theme';

type Props = {
  game: Game;
  onBack: () => void;
  onComplete: (won: boolean, score: number, meta?: Record<string, number>) => void;
  initialLevel?: number;
};

const BLOCK_H = 36;
const BLOCK_GAP = 6;
const BLOCK_STRIDE = BLOCK_H + BLOCK_GAP;
const NEON_COLORS = ['#00FF6A', '#FF2D78', '#A020F0', '#00E5FF', '#FFD600', '#FF6B00'];
const BLOCKS_TO_WIN = 12;
const MIN_WIDTH = 24;

function speedForLevel(level: number): number {
  return Math.min(9, 2.2 + (level - 1) * 0.7);
}

type Block = { x: number; w: number; color: string };
type Phase = 'playing' | 'levelComplete' | 'gameOver';

export function TowerStack({ game, onBack, onComplete, initialLevel = 1 }: Props) {
  const { width, height } = useWindowDimensions();
  const PLAY_W = width - 32;

  const [level, setLevel] = useState(initialLevel);
  const [phase, setPhase] = useState<Phase>('playing');
  const [blocks, setBlocks] = useState<Block[]>([{ x: 0, w: PLAY_W, color: NEON_COLORS[0] }]);
  const [score, setScore] = useState(0);
  const [sliderX, setSliderX] = useState(0);
  const [sliderW, setSliderW] = useState(PLAY_W);
  const [colorIdx, setColorIdx] = useState(1);

  const sliderXRef = useRef(0);
  const sliderWRef = useRef(PLAY_W);
  const dirRef = useRef(1);
  const phaseRef = useRef<Phase>('playing');
  const blocksRef = useRef<Block[]>([{ x: 0, w: PLAY_W, color: NEON_COLORS[0] }]);
  const colorIdxRef = useRef(1);

  // Camera scroll: scrollY tracks how many blocks are stacked
  const scrollY = useRef(new Animated.Value(0)).current;

  const syncScroll = useCallback((blockCount: number) => {
    const offset = Math.max(0, blockCount - 5) * BLOCK_STRIDE;
    Animated.timing(scrollY, { toValue: offset, duration: 200, useNativeDriver: true }).start();
  }, [scrollY]);

  useEffect(() => { phaseRef.current = phase; }, [phase]);

  // Slider animation loop
  useEffect(() => {
    if (phase !== 'playing') return;
    let raf: number;
    const speed = speedForLevel(level);
    const loop = () => {
      if (phaseRef.current !== 'playing') return;
      const w = sliderWRef.current;
      let next = sliderXRef.current + speed * dirRef.current;
      if (next + w > PLAY_W) { next = PLAY_W - w; dirRef.current = -1; }
      if (next < 0) { next = 0; dirRef.current = 1; }
      sliderXRef.current = next;
      setSliderX(next);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase, level, PLAY_W]);

  const reset = useCallback((lv: number) => {
    const base: Block[] = [{ x: 0, w: PLAY_W, color: NEON_COLORS[0] }];
    blocksRef.current = base;
    setBlocks(base);
    setSliderX(0);
    setSliderW(PLAY_W);
    sliderXRef.current = 0;
    sliderWRef.current = PLAY_W;
    dirRef.current = 1;
    colorIdxRef.current = 1;
    setColorIdx(1);
    scrollY.setValue(0);
    setPhase('playing');
  }, [PLAY_W, scrollY]);

  const handleTap = useCallback(() => {
    if (phaseRef.current !== 'playing') return;
    const top = blocksRef.current[blocksRef.current.length - 1];
    const sx = sliderXRef.current;
    const sw = sliderWRef.current;

    const left = Math.max(sx, top.x);
    const right = Math.min(sx + sw, top.x + top.w);
    const newW = right - left;

    if (newW <= MIN_WIDTH) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      setPhase('gameOver');
      onComplete(false, score, { level });
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    const color = NEON_COLORS[colorIdxRef.current % NEON_COLORS.length];
    colorIdxRef.current += 1;
    setColorIdx(ci => ci + 1);

    const newBlock: Block = { x: left, w: newW, color };
    const newBlocks = [...blocksRef.current, newBlock];
    blocksRef.current = newBlocks;
    setBlocks(newBlocks);
    sliderXRef.current = left;
    sliderWRef.current = newW;
    setSliderX(left);
    setSliderW(newW);

    const newScore = score + Math.round((newW / top.w) * 100);
    setScore(newScore);
    syncScroll(newBlocks.length);

    if (newBlocks.length > BLOCKS_TO_WIN) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setPhase('levelComplete');
      onComplete(true, newScore, { level });
    }
  }, [score, level, onComplete, syncScroll]);

  if (phase === 'gameOver') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
        <GameResult won={false} score={score} accent={game.accent} onRestart={() => { setScore(0); reset(level); }} onBack={onBack} game={game} />
      </View>
    );
  }

  if (phase === 'levelComplete') {
    return (
      <LevelComplete
        level={level}
        passed
        score={score}
        scoreLabel="Очки"
        accent={game.accent}
        showAd={shouldShowAdAfter(level)}
        onContinue={() => { setLevel(l => l + 1); reset(level + 1); }}
        onRetry={() => { setScore(0); reset(level); }}
        onBack={onBack}
      />
    );
  }

  // Render: bottom-anchored tower, camera scrolls up
  const visibleBlocks = blocks.slice(-20);
  const sliderColor = NEON_COLORS[colorIdx % NEON_COLORS.length];

  return (
    <Pressable onPress={handleTap} style={{ flex: 1 }}>
      <LinearGradient colors={['#1A0010', '#2D0020', '#0A0010']} style={{ flex: 1 }}>

        {/* Header */}
        <View style={{ paddingTop: 16, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 }}>
            <Text style={{ fontSize: 12, fontFamily: fontFamily.bold, color: '#fff', letterSpacing: 1 }}>
              УР. {level}
            </Text>
          </View>
          <View style={{ backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 }}>
            <Text style={{ fontSize: 12, fontFamily: fontFamily.bold, color: game.accent }}>
              {score} ОЧК
            </Text>
          </View>
          <View style={{ backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 }}>
            <Text style={{ fontSize: 12, fontFamily: fontFamily.bold, color: colors.textDim }}>
              {blocks.length - 1}/{BLOCKS_TO_WIN}
            </Text>
          </View>
        </View>

        {/* Tower arena */}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 80, overflow: 'hidden' }}>
          <Animated.View style={{ transform: [{ translateY: scrollY }] }}>
            {/* Stacked blocks (bottom to top) */}
            {visibleBlocks.map((b, i) => (
              <View
                key={i}
                style={{
                  position: 'relative',
                  height: BLOCK_H,
                  marginBottom: BLOCK_GAP,
                  width: b.w,
                  alignSelf: 'flex-start',
                  marginLeft: b.x - (width - PLAY_W) / 2 + 16,
                  borderRadius: 8,
                  backgroundColor: b.color,
                  shadowColor: b.color,
                  shadowOpacity: 0.6,
                  shadowRadius: 8,
                  shadowOffset: { width: 0, height: 0 },
                  elevation: 8,
                }}
              />
            ))}

            {/* Sliding block */}
            <View
              style={{
                height: BLOCK_H,
                marginBottom: BLOCK_GAP,
                width: sliderW,
                marginLeft: sliderX - (width - PLAY_W) / 2 + 16,
                borderRadius: 8,
                backgroundColor: sliderColor,
                shadowColor: sliderColor,
                shadowOpacity: 0.8,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: 0 },
                elevation: 10,
              }}
            />
          </Animated.View>
        </View>

        {/* Tap hint */}
        <View style={{ position: 'absolute', bottom: 24, left: 0, right: 0, alignItems: 'center' }}>
          <Text style={{ fontSize: 13, fontFamily: fontFamily.semibold, color: 'rgba(255,255,255,0.4)' }}>
            Тапни чтобы положить блок
          </Text>
        </View>

      </LinearGradient>
    </Pressable>
  );
}
