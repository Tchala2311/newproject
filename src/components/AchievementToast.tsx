import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Achievement, RARITY_COLOR } from '../lib/achievements/catalog';
import { fontFamily, radius } from '../theme';

type Props = {
  achievement: Achievement;
  onDone: () => void;
};

// Slides in from the top with a juicy spring + plays Success haptics. Auto-
// dismisses after 4 seconds; tap to dismiss earlier.
export function AchievementToast({ achievement, onDone }: Props) {
  const insets = useSafeAreaInsets();
  const slide = useRef(new Animated.Value(-200)).current;
  const accent = RARITY_COLOR[achievement.rarity];

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    Animated.spring(slide, {
      toValue: 0,
      useNativeDriver: true,
      damping: 12,
      stiffness: 120,
    }).start();
    const t = setTimeout(() => {
      Animated.timing(slide, { toValue: -200, duration: 260, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(({ finished }) => {
        if (finished) onDone();
      });
    }, 4000);
    return () => clearTimeout(t);
  }, [achievement.id, slide, onDone]);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: insets.top + 8,
        left: 14,
        right: 14,
        zIndex: 100,
        transform: [{ translateY: slide }],
      }}
    >
      <Pressable onPress={onDone}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            padding: 12,
            backgroundColor: '#0F0E22',
            borderWidth: 1.5,
            borderColor: accent,
            borderRadius: radius.lg,
            shadowColor: accent,
            shadowOpacity: 0.5,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 4 },
          }}
        >
          <View
            style={{
              width: 50,
              height: 50,
              borderRadius: 25,
              backgroundColor: `${accent}33`,
              borderWidth: 2,
              borderColor: accent,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 26 }}>{achievement.emoji}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 10, fontFamily: fontFamily.bold, color: accent, letterSpacing: 1 }}>
              НОВАЯ АЧИВКА · {achievement.rarity.toUpperCase()}
            </Text>
            <Text style={{ fontSize: 16, fontFamily: fontFamily.bold, color: '#fff', marginTop: 2 }}>
              {achievement.title}
            </Text>
            <Text numberOfLines={2} style={{ fontSize: 11, fontFamily: fontFamily.medium, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>
              {achievement.description}
            </Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}
