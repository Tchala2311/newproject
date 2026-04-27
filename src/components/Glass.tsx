import React from 'react';
import { View, ViewStyle, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { colors, radius } from '../theme';

type Props = {
  children?: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  intensity?: number;
  borderRadius?: number;
  tint?: 'light' | 'dark' | 'default';
};

// Glassmorphism container. expo-blur on iOS gives true backdrop blur; Android
// falls back to a translucent tinted layer (Android 12+ has limited support).
export function Glass({
  children,
  style,
  intensity = 30,
  borderRadius = radius.xl,
  tint = 'dark',
}: Props) {
  const flattened = StyleSheet.flatten(style) as ViewStyle | undefined;
  const useBlur = Platform.OS === 'ios';
  return (
    <View
      style={[
        {
          borderRadius,
          overflow: 'hidden',
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.glassBorder,
          backgroundColor: useBlur ? 'transparent' : colors.glassBg,
        },
        flattened,
      ]}
    >
      {useBlur ? (
        <>
          <BlurView intensity={intensity} tint={tint} style={StyleSheet.absoluteFill} />
          <View
            style={[StyleSheet.absoluteFill, { backgroundColor: colors.glassBg }]}
          />
        </>
      ) : null}
      {children}
    </View>
  );
}
