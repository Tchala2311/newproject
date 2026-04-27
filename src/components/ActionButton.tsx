import React, { useRef } from 'react';
import { Pressable, Text, View, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, fontFamily } from '../theme';

type Props = {
  icon: string;
  label: string;
  active?: boolean;
  color?: string;
  onPress?: () => void;
};

export function ActionButton({ icon, label, active, color = colors.text, onPress }: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.28, duration: 90, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 110, useNativeDriver: true }),
    ]).start();
    onPress?.();
  };

  return (
    <Pressable onPress={handlePress} style={{ alignItems: 'center', gap: 3 }}>
      <Animated.View
        style={{
          width: 42,
          height: 42,
          borderRadius: 999,
          backgroundColor: active ? `${color}33` : colors.glassBg,
          borderWidth: 1,
          borderColor: active ? `${color}99` : colors.glassBorder,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ scale }],
        }}
      >
        <Text style={{ fontSize: 18, color: active ? color : colors.text, fontFamily: fontFamily.bold }}>
          {icon}
        </Text>
      </Animated.View>
      <Text style={{ fontSize: 9, fontFamily: fontFamily.bold, color: colors.textMuted }}>{label}</Text>
    </Pressable>
  );
}
