import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Svg, { Polygon } from 'react-native-svg';
import { Game } from '../data/games';
import { colors, fontFamily, radius } from '../theme';
import { Glass } from './Glass';
import { BgPattern } from './BgPattern';
import { ActionButton } from './ActionButton';
import { MusicBadge } from './MusicBadge';

type Props = {
  game: Game;
  isActive: boolean;
  onPlay: () => void;
  liked: boolean;
  onLike: () => void;
  saved: boolean;
  onSave: () => void;
  onShare: () => void;
  onComment?: () => void;
  commentsCount?: string;
  creator?: { handle: string; avatar?: string };
  musicPlaying: boolean;
  trackName: string;
  onMusicToggle: () => void;
  onNextTrack: () => void;
  bottomInset: number;
};

const NAV_HEIGHT = 60;

export function GameCard({
  game,
  isActive,
  onPlay,
  liked,
  onLike,
  saved,
  onSave,
  onShare,
  onComment,
  commentsCount,
  creator,
  musicPlaying,
  trackName,
  onMusicToggle,
  onNextTrack,
  bottomInset,
}: Props) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const topPad = Math.max(insets.top, 14) + 8;
  const bottomPad = NAV_HEIGHT + bottomInset + 14;

  const pulse1 = useRef(new Animated.Value(0)).current;
  const pulse2 = useRef(new Animated.Value(0)).current;
  const pulse3 = useRef(new Animated.Value(0)).current;
  const playScale = useRef(new Animated.Value(1)).current;
  const heartBurst = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isActive) return undefined;
    const make = (val: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(val, { toValue: 1, duration: 1800, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.timing(val, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      );
    const a = make(pulse1, 500);
    const b = make(pulse2, 800);
    const c = make(pulse3, 1100);
    a.start(); b.start(); c.start();
    return () => { a.stop(); b.stop(); c.stop(); };
  }, [isActive, pulse1, pulse2, pulse3]);

  const ring = (val: Animated.Value, base: number) => ({
    width: base,
    height: base,
    borderRadius: base / 2,
    borderWidth: 1.5,
    borderColor: game.accent,
    position: 'absolute' as const,
    opacity: val.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] }),
    transform: [{ scale: val.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1.4] }) }],
  });

  const handlePlay = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    Animated.sequence([
      Animated.timing(playScale, { toValue: 0.93, duration: 80, useNativeDriver: true }),
      Animated.timing(playScale, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
    onPlay();
  };

  // TikTok-style double-tap to like
  const lastTap = useRef<number>(0);
  const handleCardTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 280) {
      if (!liked) onLike();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
      heartBurst.setValue(0);
      Animated.sequence([
        Animated.timing(heartBurst, { toValue: 1, duration: 220, easing: Easing.out(Easing.back(2)), useNativeDriver: true }),
        Animated.timing(heartBurst, { toValue: 0, duration: 320, delay: 140, useNativeDriver: true }),
      ]).start();
      lastTap.current = 0;
      return;
    }
    lastTap.current = now;
  };

  return (
    <View style={{ width, height, overflow: 'hidden', backgroundColor: '#000' }}>
      <LinearGradient
        colors={[game.gradient[0], game.gradient[1]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <LinearGradient
        colors={[`${game.accent}55`, 'transparent']}
        start={{ x: 0.6, y: 0.3 }}
        end={{ x: 0.2, y: 0.9 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <View
        pointerEvents="none"
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}
      >
        <BgPattern type={game.patternType} accent={game.accent} />
      </View>

      {/* Tap-to-play / double-tap-to-like overlay covers card body */}
      <Pressable
        onPress={handleCardTap}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />

      {/* Top row: tag chip + AI match */}
      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          top: topPad,
          left: 14,
          right: 14,
          flexDirection: 'row',
          justifyContent: 'space-between',
          zIndex: 5,
        }}
      >
        <Glass borderRadius={radius.pill} style={{ paddingHorizontal: 12, paddingVertical: 5 }}>
          <Text style={{ fontSize: 11, fontFamily: fontFamily.bold, color: 'rgba(255,255,255,0.92)' }}>
            {game.tag}
          </Text>
        </Glass>
        <Glass
          borderRadius={radius.pill}
          style={{ paddingHorizontal: 11, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', gap: 6 }}
        >
          <View
            style={{
              width: 14, height: 14, borderRadius: 7, backgroundColor: game.accent,
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 8, fontFamily: fontFamily.bold, color: '#000' }}>AI</Text>
          </View>
          <Text style={{ fontSize: 11, fontFamily: fontFamily.bold, color: game.accent }}>
            {game.match}%
          </Text>
        </Glass>
      </View>

      {/* Center play button (no padding-stack — actually centered) */}
      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View style={{ width: 240, height: 240, alignItems: 'center', justifyContent: 'center' }}>
          {isActive && (
            <>
              <Animated.View style={ring(pulse1, 160)} />
              <Animated.View style={ring(pulse2, 200)} />
              <Animated.View style={ring(pulse3, 240)} />
            </>
          )}
          <Pressable onPress={handlePlay} hitSlop={20}>
            <Animated.View
              style={{
                width: 88,
                height: 88,
                borderRadius: 44,
                backgroundColor: 'rgba(255,255,255,0.18)',
                borderWidth: 1.5,
                borderColor: 'rgba(255,255,255,0.4)',
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: game.accent,
                shadowOpacity: 0.6,
                shadowRadius: 30,
                shadowOffset: { width: 0, height: 0 },
                elevation: 10,
                transform: [{ scale: playScale }],
              }}
            >
              <Svg width={28} height={28} viewBox="0 0 28 28">
                <Polygon points="9,5 24,14 9,23" fill="white" />
              </Svg>
            </Animated.View>
          </Pressable>
        </View>

        {/* Heart burst on double-tap */}
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            opacity: heartBurst,
            transform: [
              { scale: heartBurst.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1.6] }) },
            ],
          }}
        >
          <Text style={{ fontSize: 120 }}>❤️</Text>
        </Animated.View>
      </View>

      {/* Right rail — TikTok-style vertical actions */}
      <View
        style={{
          position: 'absolute',
          right: 10,
          bottom: bottomPad + 4,
          alignItems: 'center',
          gap: 14,
          zIndex: 6,
        }}
      >
        {/* Creator avatar with follow + */}
        <Pressable hitSlop={8} style={{ alignItems: 'center' }}>
          <View
            style={{
              width: 46, height: 46, borderRadius: 23,
              backgroundColor: game.accent,
              borderWidth: 2, borderColor: '#fff',
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 18, fontFamily: fontFamily.bold, color: '#000' }}>
              {(creator?.handle?.[0] ?? game.name[0]).toUpperCase()}
            </Text>
          </View>
          <View
            style={{
              position: 'absolute', bottom: -8,
              width: 18, height: 18, borderRadius: 9,
              backgroundColor: game.accent,
              alignItems: 'center', justifyContent: 'center',
              borderWidth: 1.5, borderColor: '#000',
            }}
          >
            <Text style={{ fontSize: 12, color: '#000', fontFamily: fontFamily.bold, marginTop: -2 }}>+</Text>
          </View>
        </Pressable>

        <ActionButton icon="♥" label={game.likes} active={liked} color={game.accent} onPress={onLike} />
        <ActionButton icon="💬" label={commentsCount ?? '—'} onPress={onComment ?? (() => {})} />
        <ActionButton icon="＋" label={saved ? 'Сохр.' : 'Сохр.'} active={saved} color={game.accent} onPress={onSave} />
        <ActionButton icon="↗" label="Ещё" onPress={onShare} />
      </View>

      {/* Bottom-left content (TikTok title/desc) */}
      <LinearGradient
        pointerEvents="box-none"
        colors={['transparent', 'rgba(0,0,0,0.85)']}
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          paddingTop: 80,
          paddingBottom: bottomPad,
          paddingLeft: 14,
          paddingRight: 88, // leave room for right rail
        }}
      >
        <View pointerEvents="box-none" style={{ marginBottom: 8 }}>
          <Text style={{ fontSize: 14, fontFamily: fontFamily.bold, color: '#fff', marginBottom: 6 }}>
            @{creator?.handle ?? game.slug.replace(/-/g, '_')}
          </Text>
          <Text
            style={{
              fontSize: 26,
              fontFamily: fontFamily.bold,
              color: colors.text,
              letterSpacing: -0.5,
              lineHeight: 30,
              textShadowColor: 'rgba(0,0,0,0.4)',
              textShadowOffset: { width: 0, height: 2 },
              textShadowRadius: 10,
            }}
          >
            {game.name}
          </Text>
          <Text
            style={{
              fontSize: 13,
              fontFamily: fontFamily.medium,
              color: colors.textMuted,
              marginTop: 4,
            }}
          >
            {game.tagline}
          </Text>
          <View style={{ flexDirection: 'row', gap: 14, marginTop: 8 }}>
            <Text style={{ fontSize: 11, fontFamily: fontFamily.semibold, color: colors.textMuted }}>
              ⏱ {game.duration}
            </Text>
            <Text style={{ fontSize: 11, fontFamily: fontFamily.semibold, color: colors.textMuted }}>
              ▶ {game.plays}
            </Text>
          </View>
        </View>

        <View pointerEvents="box-none">
          <MusicBadge
            playing={musicPlaying}
            trackName={trackName}
            onToggle={onMusicToggle}
            onNext={onNextTrack}
          />
        </View>
      </LinearGradient>
    </View>
  );
}
