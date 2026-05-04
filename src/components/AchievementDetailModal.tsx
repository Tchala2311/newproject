import React, { useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, Text, View } from 'react-native';
import { ACHIEVEMENTS_BY_ID, RARITY_COLOR } from '../lib/achievements/catalog';
import { fontFamily, radius, colors } from '../theme';

type Props = {
  achievementId: string | null;
  owned: boolean;
  onClose: () => void;
};

const RARITY_LABEL = {
  common: 'Обычная',
  rare: 'Редкая',
  epic: 'Эпическая',
  legendary: 'Легендарная',
} as const;

export function AchievementDetailModal({ achievementId, owned, onClose }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.8)).current;
  const a = achievementId ? ACHIEVEMENTS_BY_ID[achievementId] : null;

  useEffect(() => {
    if (!a) return;
    opacity.setValue(0);
    scale.setValue(0.8);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, damping: 14 }),
    ]).start();
  }, [a?.id]);

  if (!a) return null;
  const accent = RARITY_COLOR[a.rarity];

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center', padding: 28 }}
      >
        <Pressable onPress={(e) => e.stopPropagation()}>
          <Animated.View
            style={{
              backgroundColor: '#13122A',
              borderRadius: radius.xl,
              padding: 24,
              maxWidth: 320,
              width: '100%',
              alignItems: 'center',
              borderWidth: 1.5,
              borderColor: owned ? accent : 'rgba(255,255,255,0.1)',
              shadowColor: accent,
              shadowOpacity: owned ? 0.6 : 0,
              shadowRadius: 24,
              opacity,
              transform: [{ scale }],
            }}
          >
            <View
              style={{
                width: 96, height: 96, borderRadius: 48,
                backgroundColor: owned ? `${accent}25` : 'rgba(255,255,255,0.05)',
                borderWidth: 2,
                borderColor: owned ? accent : 'rgba(255,255,255,0.15)',
                alignItems: 'center', justifyContent: 'center',
                marginBottom: 14,
              }}
            >
              <Text style={{ fontSize: 50, opacity: owned ? 1 : 0.3 }}>{a.emoji}</Text>
            </View>
            <Text style={{ fontSize: 11, fontFamily: fontFamily.bold, color: accent, letterSpacing: 1.4 }}>
              {RARITY_LABEL[a.rarity].toUpperCase()}{owned ? ' · ПОЛУЧЕНА' : ' · ЗАБЛОКИРОВАНА'}
            </Text>
            <Text style={{ fontSize: 22, fontFamily: fontFamily.bold, color: '#fff', marginTop: 6, letterSpacing: -0.4, textAlign: 'center' }}>
              {owned ? a.title : '???'}
            </Text>
            <Text style={{ fontSize: 13, fontFamily: fontFamily.medium, color: owned ? colors.text : colors.textMuted, marginTop: 10, lineHeight: 18, textAlign: 'center' }}>
              {a.description}
            </Text>
            <Pressable onPress={onClose} style={{ marginTop: 20, paddingHorizontal: 24, paddingVertical: 11, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.1)' }}>
              <Text style={{ fontSize: 13, fontFamily: fontFamily.bold, color: '#fff' }}>Закрыть</Text>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
