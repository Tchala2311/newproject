import React, { useEffect, useRef } from 'react';
import { Animated, Text, View } from 'react-native';
import { colors, fontFamily, radius } from '../theme';

type Props = {
  message: string;
  onDone: () => void;
};

// Auto-dismissing toast that slides in from the right. Used for "Saved!", "Liked", etc.
export function Toast({ message, onDone }: Props) {
  const x = useRef(new Animated.Value(180)).current;
  // Keep onDone in a ref so an unstable parent callback can't restart the
  // dismiss timer on every re-render (which would make the toast linger).
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    Animated.spring(x, { toValue: 0, useNativeDriver: true, damping: 14 }).start();
    const t = setTimeout(() => {
      Animated.timing(x, { toValue: 180, duration: 280, useNativeDriver: true }).start(({ finished }) => {
        if (finished) onDoneRef.current();
      });
    }, 1900);
    return () => clearTimeout(t);
  }, [x]);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        bottom: 90,
        right: 14,
        zIndex: 999,
        backgroundColor: 'rgba(20,20,35,0.92)',
        borderWidth: 1,
        borderColor: colors.glassBorder,
        borderRadius: radius.lg,
        paddingVertical: 9,
        paddingHorizontal: 14,
        maxWidth: 200,
        transform: [{ translateX: x }],
      }}
    >
      <Text
        style={{
          fontSize: 12,
          fontFamily: fontFamily.bold,
          color: colors.text,
          textAlign: 'center',
        }}
      >
        {message}
      </Text>
    </Animated.View>
  );
}
