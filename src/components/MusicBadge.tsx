import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, Text, View } from 'react-native';
import { colors, fontFamily, radius } from '../theme';

type Props = {
  playing: boolean;
  trackName: string;
  onToggle: () => void;
  onNext: () => void;
};

// Marquee + spinning vinyl badge. Plays the vinyl spin animation when audio is on.
export function MusicBadge({ playing, trackName, onToggle, onNext }: Props) {
  const spin = useRef(new Animated.Value(0)).current;
  const marquee = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (playing) {
      const spinAnim = Animated.loop(
        Animated.timing(spin, {
          toValue: 1,
          duration: 2800,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      const marqueeAnim = Animated.loop(
        Animated.timing(marquee, {
          toValue: 1,
          duration: 10000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      spinAnim.start();
      marqueeAnim.start();
      return () => {
        spinAnim.stop();
        marqueeAnim.stop();
      };
    }
    spin.setValue(0);
    marquee.setValue(0);
    return undefined;
  }, [playing, spin, marquee]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const translateX = marquee.interpolate({ inputRange: [0, 1], outputRange: [0, -160] });

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Pressable
        onPress={onToggle}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 7,
          backgroundColor: colors.surfaceDark,
          borderWidth: 1,
          borderColor: colors.glassBorder,
          borderRadius: radius.pill,
          paddingVertical: 5,
          paddingLeft: 7,
          paddingRight: 10,
          maxWidth: 200,
          overflow: 'hidden',
        }}
      >
        <Animated.View
          style={{
            width: 24,
            height: 24,
            borderRadius: 12,
            backgroundColor: '#222',
            alignItems: 'center',
            justifyContent: 'center',
            transform: [{ rotate }],
          }}
        >
          <View
            style={{
              width: 12,
              height: 12,
              borderRadius: 6,
              backgroundColor: '#888',
            }}
          />
          <View
            style={{
              position: 'absolute',
              top: 9,
              left: 9,
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: '#444',
            }}
          />
        </Animated.View>
        <View style={{ flex: 1, height: 15, overflow: 'hidden' }}>
          {playing ? (
            <Animated.View style={{ flexDirection: 'row', transform: [{ translateX }] }}>
              {[0, 1].map((n) => (
                <Text
                  key={n}
                  numberOfLines={1}
                  style={{
                    fontSize: 9,
                    fontFamily: fontFamily.bold,
                    color: 'rgba(255,255,255,0.85)',
                    paddingRight: 24,
                  }}
                >
                  {trackName}  ·  lofi hip-hop  ·  loop radio  ·
                </Text>
              ))}
            </Animated.View>
          ) : (
            <Text style={{ fontSize: 9, fontFamily: fontFamily.semibold, color: colors.textFaint }}>
              нажми, чтобы включить музыку
            </Text>
          )}
        </View>
      </Pressable>
      {playing ? (
        <Pressable
          onPress={onNext}
          style={{
            width: 30,
            height: 30,
            borderRadius: 15,
            backgroundColor: colors.surfaceDark,
            borderWidth: 1,
            borderColor: colors.glassBorder,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 13, color: colors.textMuted }}>⏭</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
