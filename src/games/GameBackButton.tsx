import React from 'react';
import { Pressable, StyleProp, Text, ViewStyle } from 'react-native';
import { colors } from '../theme';

// Shared "back to feed" control for games that render a custom layout instead
// of GameShell (which already provides its own back button). Keeps the corner
// affordance visually identical across every screen.
export function GameBackButton({ onPress, style }: { onPress: () => void; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel="Назад в ленту"
      style={[
        {
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: 'rgba(0,0,0,0.4)',
          borderWidth: 1,
          borderColor: colors.glassBorder,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <Text style={{ fontSize: 16, color: colors.text }}>←</Text>
    </Pressable>
  );
}
