import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fontFamily } from '../theme';

// Animated full-screen skeleton card with shimmer + spinning vinyl. Shows
// while the recommender is building the first feed. Designed to look like a
// "pre-render" of a real GameCard so the layout doesn't jump on swap.
export function FeedSkeleton() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const shimmer = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shimmerLoop = Animated.loop(
      Animated.timing(shimmer, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.cubic), useNativeDriver: true })
    );
    const spinLoop = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 2400, easing: Easing.linear, useNativeDriver: true })
    );
    shimmerLoop.start();
    spinLoop.start();
    // Stop both loops when the skeleton is swapped out for the real feed.
    return () => { shimmerLoop.stop(); spinLoop.stop(); };
  }, [shimmer, spin]);

  const translateX = shimmer.interpolate({ inputRange: [0, 1], outputRange: [-width, width] });
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#000' }}>
      <LinearGradient
        colors={['#1F1B36', '#08071A']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <LinearGradient
        colors={['rgba(155,89,224,0.35)', 'transparent']}
        start={{ x: 0.6, y: 0.3 }}
        end={{ x: 0.2, y: 0.9 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />

      {/* Top tab placeholder */}
      <View style={{ position: 'absolute', top: insets.top + 8, left: 0, right: 0, alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', gap: 18, alignItems: 'center' }}>
          <SkeletonBlock w={70} h={20} shimmer={translateX} />
          <View style={{ width: 1, height: 16, backgroundColor: 'rgba(255,255,255,0.18)' }} />
          <SkeletonBlock w={70} h={20} shimmer={translateX} />
        </View>
      </View>

      {/* Center vinyl */}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: insets.top + 60 }}>
        <Animated.View
          style={{
            width: 120,
            height: 120,
            borderRadius: 60,
            backgroundColor: '#0A0A14',
            borderWidth: 6,
            borderColor: '#1F1F2C',
            alignItems: 'center',
            justifyContent: 'center',
            transform: [{ rotate }],
          }}
        >
          <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: '#13122A' }} />
          <View style={{ position: 'absolute', width: 30, height: 30, borderRadius: 15, backgroundColor: '#C99FE6' }} />
          <View style={{ position: 'absolute', width: 8, height: 8, borderRadius: 4, backgroundColor: '#000' }} />
        </Animated.View>
        <Text style={{ marginTop: 28, fontSize: 14, fontFamily: fontFamily.bold, color: '#fff' }}>
          Подбираем игры под тебя
        </Text>
        <Text style={{ marginTop: 4, fontSize: 11, fontFamily: fontFamily.medium, color: 'rgba(255,255,255,0.45)' }}>
          анализируем твой вайб ✨
        </Text>
      </View>

      {/* Bottom-left text placeholders */}
      <View style={{ position: 'absolute', bottom: insets.bottom + 100, left: 14, right: 100, gap: 8 }}>
        <SkeletonBlock w={120} h={14} shimmer={translateX} />
        <SkeletonBlock w={220} h={26} shimmer={translateX} />
        <SkeletonBlock w={180} h={12} shimmer={translateX} />
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
          <SkeletonBlock w={60} h={12} shimmer={translateX} />
          <SkeletonBlock w={60} h={12} shimmer={translateX} />
        </View>
      </View>

      {/* Right rail placeholders */}
      <View style={{ position: 'absolute', right: 12, bottom: insets.bottom + 100, alignItems: 'center', gap: 18 }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <View key={i} style={{ alignItems: 'center', gap: 6 }}>
            <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.08)' }} />
          </View>
        ))}
      </View>
    </View>
  );
}

function SkeletonBlock({ w, h, shimmer }: { w: number; h: number; shimmer: Animated.AnimatedInterpolation<string | number> }) {
  return (
    <View style={{ width: w, height: h, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
      <Animated.View style={{ position: 'absolute', top: 0, bottom: 0, width: 80, transform: [{ translateX: shimmer }] }}>
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.18)', 'transparent']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={{ flex: 1 }}
        />
      </Animated.View>
    </View>
  );
}
