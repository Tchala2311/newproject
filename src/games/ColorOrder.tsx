import React, { useCallback, useEffect, useRef, useState } from 'react';
import { GestureResponderEvent, Pressable, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Path, Circle as SvgCircle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { Game } from '../data/games';
import { LevelComplete, shouldShowAdAfter } from './LevelComplete';
import { GameResult } from './GameResult';
import { GameBackButton } from './GameBackButton';
import { fontFamily, colors, radius, SAFE_TOP } from '../theme';

type Props = {
  game: Game;
  onBack: () => void;
  onComplete: (won: boolean, score: number, meta?: Record<string, number>) => void;
  initialLevel?: number;
};

function hslHex(h: number, s: number, l: number): string {
  s /= 100; l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const hex = (x: number) => Math.round(255 * x).toString(16).padStart(2, '0');
  return `#${hex(f(0))}${hex(f(8))}${hex(f(4))}`;
}

function segmentPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const x1 = cx + r * Math.cos(startAngle);
  const y1 = cy + r * Math.sin(startAngle);
  const x2 = cx + r * Math.cos(endAngle);
  const y2 = cy + r * Math.sin(endAngle);
  const large = endAngle - startAngle > Math.PI ? 1 : 0;
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
}

// Valid if placements form a monotone sequence in any rotation or direction
function isValidOrder(placements: (number | null)[]): boolean {
  if (placements.some(p => p === null)) return false;
  const vals = placements as number[];
  const n = vals.length;
  const sorted = [...vals].sort((a, b) => a - b);
  const rev = [...sorted].reverse();
  for (let start = 0; start < n; start++) {
    if (vals.every((v, i) => v === sorted[(i + start) % n])) return true;
    if (vals.every((v, i) => v === rev[(i + start) % n])) return true;
  }
  return false;
}

function numSegments(level: number): number {
  return Math.min(2 + level, 9);
}

function generateLevel(n: number) {
  const hue = Math.floor(Math.random() * 360);
  const sat = 55 + Math.random() * 20;
  const shadeColors: string[] = [];
  const denom = n > 1 ? n - 1 : 1; // avoid divide-by-zero / NaN lightness
  for (let i = 0; i < n; i++) {
    const light = 18 + (i / denom) * 54;
    shadeColors.push(hslHex(hue, sat, light));
  }
  // tray = shuffled indices
  const tray = [...Array(n).keys()].sort(() => Math.random() - 0.5);
  return { shadeColors, tray, placements: Array(n).fill(null) as (number | null)[] };
}

type Phase = 'playing' | 'wrong' | 'levelComplete' | 'gameOver';

export function ColorOrder({ game, onBack, onComplete, initialLevel = 1 }: Props) {
  const { width } = useWindowDimensions();
  const [level, setLevel] = useState(initialLevel);
  const [score, setScore] = useState(0);
  const [phase, setPhase] = useState<Phase>('playing');
  const [shadeColors, setShadeColors] = useState<string[]>([]);
  const [tray, setTray] = useState<(number | null)[]>([]);
  const [placements, setPlacements] = useState<(number | null)[]>([]);
  const [selected, setSelected] = useState<number | null>(null); // shade index
  const [selectedFrom, setSelectedFrom] = useState<'tray' | 'segment' | null>(null);
  const [selectedSegIdx, setSelectedSegIdx] = useState<number | null>(null);
  const [wrongFlash, setWrongFlash] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const completedRef = useRef(false);

  const startLevel = useCallback((lv: number) => {
    completedRef.current = false;
    const n = numSegments(lv);
    const lvl = generateLevel(n);
    setShadeColors(lvl.shadeColors);
    setTray(lvl.tray);
    setPlacements(lvl.placements);
    setSelected(null);
    setSelectedFrom(null);
    setSelectedSegIdx(null);
    setWrongFlash(false);
    setAttempts(0);
    setPhase('playing');
  }, []);

  useEffect(() => { startLevel(level); }, [level]);

  const n = numSegments(level);
  const circleSize = Math.min(width - 64, 300);
  const r = circleSize / 2 - 4;
  const cx = circleSize / 2;
  const cy = circleSize / 2;

  const checkComplete = useCallback((p: (number | null)[]) => {
    if (p.some(v => v === null)) return;
    if (isValidOrder(p)) {
      if (completedRef.current) return;
      completedRef.current = true;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      const pts = Math.max(50, 200 - attempts * 30);
      setScore(s => s + pts);
      setPhase('levelComplete');
      onComplete(true, score + pts, { level });
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      setWrongFlash(true);
      setAttempts(a => a + 1);
      setTimeout(() => setWrongFlash(false), 600);
    }
  }, [attempts, score, level, onComplete]);

  const handleSegmentPress = (segIdx: number) => {
    if (phase !== 'playing') return;

    if (selected !== null) {
      // Place selected shade onto this segment
      const prev = placements[segIdx];
      const newPlacements = [...placements];
      newPlacements[segIdx] = selected;

      // Return previous occupant to tray if there was one
      const newTray = [...tray];
      if (prev !== null) {
        newTray.push(prev);
      }
      // Remove selected from tray (if it came from tray)
      if (selectedFrom === 'tray') {
        const ti = newTray.indexOf(selected);
        if (ti !== -1) newTray.splice(ti, 1);
      }
      // If it came from another segment, clear that segment
      if (selectedFrom === 'segment' && selectedSegIdx !== null && selectedSegIdx !== segIdx) {
        newPlacements[selectedSegIdx] = null;
      }

      Haptics.selectionAsync().catch(() => {});
      setPlacements(newPlacements);
      setTray(newTray);
      setSelected(null);
      setSelectedFrom(null);
      setSelectedSegIdx(null);
      checkComplete(newPlacements);
    } else {
      // Select shade from segment if occupied
      if (placements[segIdx] !== null) {
        setSelected(placements[segIdx]);
        setSelectedFrom('segment');
        setSelectedSegIdx(segIdx);
        Haptics.selectionAsync().catch(() => {});
      }
    }
  };

  const handleTrayPress = (shadeIdx: number) => {
    if (phase !== 'playing') return;
    if (selected === shadeIdx && selectedFrom === 'tray') {
      setSelected(null);
      setSelectedFrom(null);
      setSelectedSegIdx(null);
      return;
    }
    setSelected(shadeIdx);
    setSelectedFrom('tray');
    setSelectedSegIdx(null);
    Haptics.selectionAsync().catch(() => {});
  };

  // react-native-svg <Path onPress> does not fire reliably in this runtime, so
  // the wheel is wrapped in a single RN Pressable and we resolve which wedge was
  // tapped from the touch coordinates. Wedges are painted from -90° (top) going
  // clockwise — match that exact convention so the tapped pixel maps to the same
  // index the SVG drew.
  const handleCircleTap = (e: GestureResponderEvent) => {
    if (phase !== 'playing') return;
    const { locationX, locationY } = e.nativeEvent;
    const dx = locationX - cx;
    const dy = locationY - cy;
    if (Math.hypot(dx, dy) > r) return; // tapped outside the wheel
    let rel = Math.atan2(dy, dx) + Math.PI / 2;
    rel = ((rel % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const idx = Math.min(n - 1, Math.floor(rel / ((2 * Math.PI) / n)));
    handleSegmentPress(idx);
  };

  if (phase === 'levelComplete') {
    return (
      <LevelComplete level={level} passed score={score} scoreLabel="Очки" accent={game.accent}
        showAd={shouldShowAdAfter(level)}
        onContinue={() => setLevel(l => l + 1)}
        onRetry={() => startLevel(level)}
        onBack={onBack} />
    );
  }

  if (phase === 'gameOver') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
        <GameResult won={false} score={score} accent={game.accent}
          onRestart={() => { setScore(0); startLevel(1); setLevel(1); }}
          onBack={onBack} game={game} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#0D0D0D', alignItems: 'center', justifyContent: 'space-around' }}>
      <GameBackButton onPress={onBack} style={{ position: 'absolute', top: SAFE_TOP - 8, left: 14, zIndex: 50 }} />
      {/* Header */}
      <View style={{ flexDirection: 'row', gap: 12, paddingTop: SAFE_TOP }}>
        <View style={{ backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 }}>
          <Text style={{ fontSize: 12, fontFamily: fontFamily.bold, color: '#fff', letterSpacing: 1 }}>УР. {level}</Text>
        </View>
        <View style={{ backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 }}>
          <Text style={{ fontSize: 12, fontFamily: fontFamily.bold, color: game.accent }}>{score} ОЧК</Text>
        </View>
      </View>

      {/* Circle */}
      <Pressable onPress={handleCircleTap} style={{ width: circleSize, height: circleSize }}>
        <Svg width={circleSize} height={circleSize} pointerEvents="none">
          {shadeColors.map((_, i) => {
            const startAngle = -Math.PI / 2 + (i / n) * 2 * Math.PI;
            const endAngle = -Math.PI / 2 + ((i + 1) / n) * 2 * Math.PI;
            const placed = placements[i];
            const isSelected = selectedFrom === 'segment' && selectedSegIdx === i;
            const fill = wrongFlash && placed !== null
              ? '#FF3B30'
              : placed !== null
              ? shadeColors[placed]
              : isSelected
              ? 'rgba(255,255,255,0.15)'
              : 'rgba(255,255,255,0.07)';

            return (
              <Path
                key={i}
                d={segmentPath(cx, cy, r, startAngle, endAngle)}
                fill={fill}
                stroke={isSelected ? game.accent : '#fff'}
                strokeWidth={isSelected ? 2 : 0.5}
              />
            );
          })}
          <SvgCircle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
        </Svg>
      </Pressable>

      {/* Hint */}
      <Text style={{ fontSize: 12, fontFamily: fontFamily.medium, color: wrongFlash ? '#FF3B30' : colors.textFaint, textAlign: 'center', paddingHorizontal: 24 }}>
        {wrongFlash
          ? 'Неправильный порядок — попробуй снова'
          : selected !== null
          ? 'Тапни сегмент чтобы разместить цвет'
          : 'Расставь оттенки от светлого к тёмному'}
      </Text>

      {/* Tray */}
      <View style={{ paddingBottom: 40 }}>
        <View style={{ flexDirection: 'row', gap: 12, justifyContent: 'center', flexWrap: 'wrap', paddingHorizontal: 24 }}>
          {tray.map((shadeIdx) => {
            if (shadeIdx === null) return null;
            const isSelected = selected === shadeIdx && selectedFrom === 'tray';
            return (
              <Pressable
                key={shadeIdx}
                onPress={() => handleTrayPress(shadeIdx)}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: shadeColors[shadeIdx],
                  borderWidth: isSelected ? 3 : 1.5,
                  borderColor: isSelected ? game.accent : 'rgba(255,255,255,0.2)',
                  shadowColor: isSelected ? game.accent : 'transparent',
                  shadowOpacity: 0.8,
                  shadowRadius: 8,
                  elevation: isSelected ? 6 : 0,
                }}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}
