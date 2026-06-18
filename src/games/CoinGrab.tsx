import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, Text, View, useWindowDimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Game } from '../data/games';
import { LevelComplete, shouldShowAdAfter } from './LevelComplete';
import { GameResult } from './GameResult';
import { GameBackButton } from './GameBackButton';
import { colors, fontFamily, radius, SAFE_TOP } from '../theme';

type Props = {
  game: Game;
  onBack: () => void;
  onComplete: (won: boolean, score: number, meta?: Record<string, number>) => void;
  initialLevel?: number;
};

type CoinKind = 'gold' | 'silver' | 'bronze' | 'penalty';

const COIN_CONFIG: Record<CoinKind, { label: string; color: string; value: number; emoji: string }> = {
  gold:    { label: 'Золото',  color: '#F59E0B', value: 45,  emoji: '🪙' },
  silver:  { label: 'Серебро', color: '#94A3B8', value: 30,  emoji: '🥈' },
  bronze:  { label: 'Бронза',  color: '#CD7C3A', value: 15,  emoji: '🥉' },
  penalty: { label: 'Штраф',   color: '#EF4444', value: -45, emoji: '💸' },
};

const ITEMS_PER_LEVEL = 8;
const COOLDOWN_MS = 1400;

function botReactionMs(level: number): number {
  return Math.max(380, 1800 - (level - 1) * 130);
}

function randomKind(level: number): CoinKind {
  const penaltyChance = Math.min(0.25, 0.08 + level * 0.02);
  const r = Math.random();
  if (r < penaltyChance) return 'penalty';
  const rest = r - penaltyChance;
  const range = 1 - penaltyChance;
  if (rest / range < 0.25) return 'gold';
  if (rest / range < 0.55) return 'silver';
  return 'bronze';
}

type ItemState = { kind: CoinKind; id: number } | null;
type Phase = 'playing' | 'levelComplete' | 'gameOver';
type Grabber = 'player' | 'bot' | 'nobody';

export function CoinGrab({ game, onBack, onComplete, initialLevel = 1 }: Props) {
  const { width, height } = useWindowDimensions();
  const [level, setLevel] = useState(initialLevel);
  const [score, setScore] = useState(0);
  const [phase, setPhase] = useState<Phase>('playing');
  const [item, setItem] = useState<ItemState>(null);
  const [itemsLeft, setItemsLeft] = useState(ITEMS_PER_LEVEL);
  const [grabber, setGrabber] = useState<Grabber | null>(null);
  const [onCooldown, setOnCooldown] = useState(false);
  const [botScore, setBotScore] = useState(0);

  const botTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextItemTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const itemIdRef = useRef(0);
  const itemsLeftRef = useRef(ITEMS_PER_LEVEL);
  const phaseRef = useRef<Phase>('playing');

  const coinScale = useRef(new Animated.Value(0)).current;
  const grabAnim = useRef(new Animated.Value(0)).current;

  const clearTimers = () => {
    if (botTimerRef.current) clearTimeout(botTimerRef.current);
    if (nextItemTimerRef.current) clearTimeout(nextItemTimerRef.current);
  };

  const popIn = () => {
    coinScale.setValue(0);
    Animated.spring(coinScale, { toValue: 1, useNativeDriver: true, damping: 9 }).start();
  };

  const flashGrab = () => {
    grabAnim.setValue(0);
    Animated.sequence([
      Animated.timing(grabAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
      Animated.timing(grabAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
  };

  const scheduleNextItem = useCallback((lv: number, remaining: number) => {
    if (phaseRef.current !== 'playing') return;
    if (remaining <= 0) {
      setTimeout(() => {
        if (phaseRef.current === 'playing') setPhase('levelComplete');
      }, 800);
      return;
    }
    const delay = 800 + Math.random() * 1200;
    nextItemTimerRef.current = setTimeout(() => {
      if (phaseRef.current !== 'playing') return;
      itemIdRef.current += 1;
      const kind = randomKind(lv);
      const currentId = itemIdRef.current;
      setItem({ kind, id: currentId });
      setGrabber(null);
      popIn();

      // Bot grabs after its reaction time
      const reaction = botReactionMs(lv) + (Math.random() - 0.5) * 300;
      botTimerRef.current = setTimeout(() => {
        setItem(prev => {
          if (!prev || prev.id !== currentId) return prev;
          // Bot grabs
          const val = COIN_CONFIG[prev.kind].value;
          if (val > 0) setBotScore(s => s + val);
          setGrabber('bot');
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          flashGrab();
          const newLeft = itemsLeftRef.current - 1;
          itemsLeftRef.current = newLeft;
          setItemsLeft(newLeft);
          setTimeout(() => { setItem(null); scheduleNextItem(lv, newLeft); }, 600);
          return null;
        });
      }, reaction);
    }, delay);
  }, []);

  const startLevel = useCallback((lv: number) => {
    clearTimers();
    itemsLeftRef.current = ITEMS_PER_LEVEL;
    phaseRef.current = 'playing';
    setPhase('playing');
    setItem(null);
    setItemsLeft(ITEMS_PER_LEVEL);
    setGrabber(null);
    setBotScore(0);
    scheduleNextItem(lv, ITEMS_PER_LEVEL);
  }, [scheduleNextItem]);

  useEffect(() => {
    startLevel(level);
    return clearTimers;
  }, [level]);

  useEffect(() => {
    phaseRef.current = phase;
    if (phase !== 'playing') clearTimers();
  }, [phase]);

  // Report completion exactly once when phase transitions
  useEffect(() => {
    if (phase === 'gameOver') {
      onComplete(score > 0, score, { level });
    } else if (phase === 'levelComplete') {
      onComplete(true, score, { level });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const handleTap = () => {
    if (phase !== 'playing' || onCooldown) return;

    // Start cooldown regardless of whether coin is present
    setOnCooldown(true);
    if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
    cooldownTimerRef.current = setTimeout(() => setOnCooldown(false), COOLDOWN_MS);

    if (!item) return;

    // Player grabs
    if (botTimerRef.current) clearTimeout(botTimerRef.current);
    const grabbed = item;
    setItem(null);
    setGrabber('player');
    const val = COIN_CONFIG[grabbed.kind].value;
    setScore(s => s + val);
    flashGrab();

    if (val > 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    }

    const newLeft = itemsLeftRef.current - 1;
    itemsLeftRef.current = newLeft;
    setItemsLeft(newLeft);
    setTimeout(() => scheduleNextItem(level, newLeft), 400);
  };

  if (phase === 'gameOver') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
        <GameResult
          won={score > 0}
          score={score}
          accent={game.accent}
          onRestart={() => { setScore(0); startLevel(1); setLevel(1); }}
          onBack={onBack}
          game={game}
        />
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
        onContinue={() => { setLevel(l => l + 1); }}
        onRetry={() => { setScore(0); startLevel(level); }}
        onBack={onBack}
      />
    );
  }

  const coinSize = Math.min(width * 0.38, 160);
  const progressFilled = ITEMS_PER_LEVEL - itemsLeft;

  return (
    <Pressable
      onPress={handleTap}
      style={{ flex: 1 }}
      android_ripple={null}
    >
      <View style={{ flex: 1, backgroundColor: '#0A0A0A' }}>

        {/* Back row — kept separate so the player/bot scoreboard stays symmetric */}
        <View style={{ paddingTop: SAFE_TOP, paddingHorizontal: 14 }}>
          <GameBackButton onPress={onBack} />
        </View>

        {/* Score bar */}
        <View style={{ paddingTop: 8, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 22, fontFamily: fontFamily.bold, color: '#fff' }}>{score}</Text>
            <Text style={{ fontSize: 10, fontFamily: fontFamily.semibold, color: colors.textDim, letterSpacing: 1 }}>ТЫ</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 11, fontFamily: fontFamily.bold, color: colors.textDim, letterSpacing: 1 }}>УРОВЕНЬ {level}</Text>
            <View style={{ flexDirection: 'row', gap: 4, marginTop: 4 }}>
              {Array.from({ length: ITEMS_PER_LEVEL }).map((_, i) => (
                <View key={i} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: i < progressFilled ? game.accent : 'rgba(255,255,255,0.15)' }} />
              ))}
            </View>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 22, fontFamily: fontFamily.bold, color: '#EF4444' }}>{botScore}</Text>
            <Text style={{ fontSize: 10, fontFamily: fontFamily.semibold, color: colors.textDim, letterSpacing: 1 }}>БОТ</Text>
          </View>
        </View>

        {/* Bot hand */}
        <View style={{ alignItems: 'center', marginTop: 20 }}>
          <Text style={{ fontSize: 64 }}>🤖</Text>
          <Text style={{ fontSize: 11, fontFamily: fontFamily.semibold, color: colors.textDim }}>
            реакция {(botReactionMs(level) / 1000).toFixed(1)}с
          </Text>
        </View>

        {/* Arena */}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          {item ? (
            <Animated.View style={{ transform: [{ scale: coinScale }], alignItems: 'center' }}>
              <Text style={{ fontSize: coinSize * 0.6 }}>{COIN_CONFIG[item.kind].emoji}</Text>
              <Text style={{
                fontSize: 28,
                fontFamily: fontFamily.bold,
                color: COIN_CONFIG[item.kind].color,
                marginTop: 4,
              }}>
                {COIN_CONFIG[item.kind].value > 0 ? '+' : ''}{COIN_CONFIG[item.kind].value}
              </Text>
            </Animated.View>
          ) : grabber ? (
            <Animated.View style={{ opacity: grabAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }), alignItems: 'center' }}>
              <Text style={{ fontSize: 32, fontFamily: fontFamily.bold, color: grabber === 'player' ? game.accent : '#EF4444' }}>
                {grabber === 'player' ? '✋ Ты!' : '🤖 Бот!'}
              </Text>
            </Animated.View>
          ) : (
            <Text style={{ fontSize: 13, fontFamily: fontFamily.medium, color: colors.textFaint }}>
              Жди монету…
            </Text>
          )}
        </View>

        {/* Player tap zone */}
        <View style={{ paddingBottom: 40, alignItems: 'center' }}>
          {onCooldown ? (
            <View style={{ paddingHorizontal: 32, paddingVertical: 14, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.06)' }}>
              <Text style={{ fontSize: 13, fontFamily: fontFamily.semibold, color: colors.textDim }}>⏱ Перезарядка…</Text>
            </View>
          ) : (
            <View style={{ paddingHorizontal: 40, paddingVertical: 16, borderRadius: radius.pill, backgroundColor: item ? game.accent : 'rgba(255,255,255,0.08)', borderWidth: item ? 0 : 1, borderColor: 'rgba(255,255,255,0.12)' }}>
              <Text style={{ fontSize: 15, fontFamily: fontFamily.bold, color: item ? '#000' : colors.textMuted }}>
                {item ? '✋ ХВАТАЙ!' : 'Нажми для захвата'}
              </Text>
            </View>
          )}
          <Text style={{ fontSize: 10, fontFamily: fontFamily.medium, color: colors.textFaint, marginTop: 8 }}>
            Кулдаун: {(COOLDOWN_MS / 1000).toFixed(1)}с
          </Text>
        </View>
      </View>
    </Pressable>
  );
}
