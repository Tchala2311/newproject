import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import { colors, fontFamily, radius } from '../theme';

type Props = {
  won: boolean;
  score?: number;
  accent?: string;
  onRestart: () => void;
  onBack: () => void;
};

export function GameResult({ won, score, accent = '#fff', onRestart, onBack }: Props) {
  const scale = useRef(new Animated.Value(0.5)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, damping: 10 }),
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [scale, opacity]);

  return (
    <Animated.View style={{ alignItems: 'center', gap: 14, opacity, transform: [{ scale }] }}>
      <Text style={{ fontSize: 56 }}>{won ? '🎉' : '💀'}</Text>
      <Text style={{ fontSize: 26, fontFamily: fontFamily.bold, color: colors.text }}>
        {won ? 'Красавчик!' : 'Конец игры'}
      </Text>
      {score !== undefined ? (
        <Text style={{ fontSize: 18, fontFamily: fontFamily.bold, color: accent }}>+{score} очков</Text>
      ) : null}
      <Pressable
        onPress={onRestart}
        style={{
          paddingHorizontal: 32,
          paddingVertical: 12,
          borderRadius: radius.pill,
          backgroundColor: colors.glassBgStrong,
          borderWidth: 1,
          borderColor: colors.glassBorderStrong,
        }}
      >
        <Text style={{ fontSize: 15, fontFamily: fontFamily.bold, color: colors.text }}>Ещё раз ↺</Text>
      </Pressable>
      <Pressable onPress={onBack}>
        <Text style={{ fontSize: 12, color: colors.textDim, fontFamily: fontFamily.medium }}>← В ленту</Text>
      </Pressable>
    </Animated.View>
  );
}
