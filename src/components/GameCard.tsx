import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Svg, { Polygon } from 'react-native-svg';
import { Game } from '../data/games';
import { colors, fontFamily, radius, SAFE_TOP } from '../theme';
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
  musicPlaying: boolean;
  trackName: string;
  onMusicToggle: () => void;
  onNextTrack: () => void;
  bottomInset: number;
};

export function GameCard({
  game,
  isActive,
  onPlay,
  liked,
  onLike,
  saved,
  onSave,
  onShare,
  musicPlaying,
  trackName,
  onMusicToggle,
  onNextTrack,
  bottomInset,
}: Props) {
  const { width, height } = useWindowDimensions();
  const pulse1 = useRef(new Animated.Value(0)).current;
  const pulse2 = useRef(new Animated.Value(0)).current;
  const pulse3 = useRef(new Animated.Value(0)).current;
  const playScale = useRef(new Animated.Value(1)).current;

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

  return (
    <View style={{ width, height, overflow: 'hidden' }}>
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

      {/* Top badges */}
      <View
        style={{
          position: 'absolute',
          top: SAFE_TOP,
          left: 12,
          right: 12,
          flexDirection: 'row',
          justifyContent: 'space-between',
          zIndex: 5,
        }}
      >
        <Glass
          borderRadius={radius.pill}
          style={{ paddingHorizontal: 11, paddingVertical: 4 }}
        >
          <Text style={{ fontSize: 11, fontFamily: fontFamily.bold, color: 'rgba(255,255,255,0.92)' }}>
            {game.tag}
          </Text>
        </Glass>
        <Glass
          borderRadius={radius.pill}
          style={{ paddingHorizontal: 11, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', gap: 5 }}
        >
          <View
            style={{
              width: 13,
              height: 13,
              borderRadius: 7,
              backgroundColor: game.accent,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 8, fontFamily: fontFamily.bold, color: '#000' }}>AI</Text>
          </View>
          <Text style={{ fontSize: 11, fontFamily: fontFamily.bold, color: game.accent }}>
            {game.match}% совпадение
          </Text>
        </Glass>
      </View>

      {/* Center play button */}
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: SAFE_TOP + 40,
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
          <Pressable onPress={handlePlay}>
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
                <Polygon points="8,5 24,14 8,23" fill="white" />
              </Svg>
            </Animated.View>
          </Pressable>
        </View>
      </View>

      {/* Bottom overlay */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.85)']}
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          paddingTop: 80,
          paddingBottom: 76 + bottomInset,
          paddingHorizontal: 14,
        }}
      >
        <View style={{ marginBottom: 10 }}>
          <MusicBadge
            playing={musicPlaying}
            trackName={trackName}
            onToggle={onMusicToggle}
            onNext={onNextTrack}
          />
        </View>

        <Text
          style={{
            fontSize: 28,
            fontFamily: fontFamily.bold,
            color: colors.text,
            letterSpacing: -0.5,
            lineHeight: 32,
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
            marginTop: 3,
          }}
        >
          {game.tagline}
        </Text>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            marginTop: 12,
            marginBottom: 10,
          }}
        >
          <View style={{ gap: 5 }}>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Text style={{ fontSize: 11, fontFamily: fontFamily.semibold, color: colors.textMuted }}>
                ⏱ {game.duration}
              </Text>
              <Text style={{ fontSize: 11, fontFamily: fontFamily.semibold, color: colors.textMuted }}>
                ▶ {game.plays}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              {[1, 2, 3].map((i) => (
                <View key={i} style={{ width: 16, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.75)' }} />
              ))}
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 7 }}>
            <ActionButton icon="♥" label={game.likes} active={liked} color={game.accent} onPress={onLike} />
            <ActionButton icon="↗" label="Поделиться" onPress={onShare} />
            <ActionButton
              icon="＋"
              label={saved ? 'В сохр.' : 'Сохранить'}
              active={saved}
              color={game.accent}
              onPress={onSave}
            />
          </View>
        </View>

        <Pressable onPress={handlePlay}>
          <Glass
            borderRadius={radius.pill}
            style={{
              height: 50,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 8,
            }}
          >
            <Text style={{ fontSize: 15, fontFamily: fontFamily.bold, color: colors.text }}>
              ▶ Играть
            </Text>
          </Glass>
        </Pressable>
      </LinearGradient>
    </View>
  );
}
