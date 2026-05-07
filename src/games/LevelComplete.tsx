import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { fontFamily, radius, colors } from '../theme';
import { AdHipHub } from '../components/AdHipHub';
import { AdProtokol } from '../components/AdProtokol';
import { useAchievements } from '../store/useAchievements';

type Props = {
  level: number;
  passed: boolean;
  score: number;
  scoreLabel?: string;
  accent: string;
  // Show an ad on this transition? Caller decides via shouldShowAdAfter().
  showAd: boolean;
  onContinue: () => void;        // start next level
  onRetry: () => void;           // retry this level (shown when !passed)
  onBack: () => void;            // exit to feed
  bottomInset?: number;
};

const AD_VARIANTS: Array<'hiphub' | 'protokol'> = ['hiphub', 'protokol'];

// Single-screen between-levels overlay. When `showAd` is true, the ad takes
// up the top portion (full visual brand exposure), the unlock-result chip is
// docked at the bottom, and the user must tap "Продолжить" to dismiss.
// The 3-second delay before the dismiss button enables prevents impatient
// tappers from skipping the ad before its first impression renders fully —
// just like real interstitials.
export function LevelComplete({
  level,
  passed,
  score,
  scoreLabel = 'Очки',
  accent,
  showAd,
  onContinue,
  onRetry,
  onBack,
  bottomInset = 0,
}: Props) {
  const { height } = useWindowDimensions();
  const { report } = useAchievements();
  const [adReady, setAdReady] = useState(!showAd);
  const [secondsLeft, setSecondsLeft] = useState(showAd ? 5 : 0);

  useEffect(() => {
    if (showAd && passed) report({ type: 'ad-view' });
  }, [showAd, passed]);
  const opacity = useRef(new Animated.Value(0)).current;
  const scoreScale = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Haptics.notificationAsync(
      passed ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error
    ).catch(() => {});
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.spring(scoreScale, { toValue: 1, useNativeDriver: true, damping: 9 }),
    ]).start();
  }, [opacity, scoreScale, passed]);

  // Countdown to enable the skip button on ad shows
  useEffect(() => {
    if (!showAd) return;
    if (secondsLeft <= 0) { setAdReady(true); return; }
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft, showAd]);

  // Pick a deterministic-ish ad variant per level so user sees both eventually
  const adVariant = AD_VARIANTS[level % AD_VARIANTS.length];

  // ----- Ad mode: ad on top, banner on bottom -----
  if (showAd && passed) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        {/* Ad fills the screen */}
        {adVariant === 'hiphub'
          ? <AdHipHub height={height} bottomInset={bottomInset + 80} />
          : <AdProtokol height={height} bottomInset={bottomInset + 80} />}

        {/* Banner ribbon over the top edge */}
        <View
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0,
            paddingTop: 50,
            paddingBottom: 10,
            backgroundColor: 'rgba(0,0,0,0.55)',
            alignItems: 'center',
          }}
        >
          <Text style={{ fontSize: 11, fontFamily: fontFamily.bold, color: 'rgba(255,255,255,0.6)', letterSpacing: 1.5 }}>
            УРОВЕНЬ {level} ПРОЙДЕН · +{score}
          </Text>
        </View>

        {/* Sticky bottom dismiss bar */}
        <View
          style={{
            position: 'absolute',
            bottom: 0, left: 0, right: 0,
            paddingTop: 10,
            paddingBottom: bottomInset + 10,
            paddingHorizontal: 14,
            backgroundColor: 'rgba(0,0,0,0.85)',
            flexDirection: 'row',
            gap: 10,
          }}
        >
          <Pressable
            onPress={onBack}
            style={{
              paddingHorizontal: 18,
              paddingVertical: 14,
              borderRadius: radius.pill,
              backgroundColor: 'rgba(255,255,255,0.1)',
            }}
          >
            <Text style={{ fontSize: 13, fontFamily: fontFamily.bold, color: '#fff' }}>В ленту</Text>
          </Pressable>
          <Pressable
            onPress={adReady ? onContinue : undefined}
            style={{
              flex: 1,
              paddingVertical: 14,
              borderRadius: radius.pill,
              backgroundColor: adReady ? accent : 'rgba(255,255,255,0.18)',
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 14, fontFamily: fontFamily.bold, color: adReady ? '#000' : 'rgba(255,255,255,0.55)' }}>
              {adReady ? `Уровень ${level + 1} →` : `Подожди ${secondsLeft}…`}
            </Text>
          </Pressable>
        </View>

        {/* Tiny hint about Premium */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            bottom: bottomInset + 70,
            left: 0,
            right: 0,
            alignItems: 'center',
          }}
        >
          <Text style={{ fontSize: 10, fontFamily: fontFamily.semibold, color: 'rgba(255,255,255,0.45)' }}>
            ✨ Луп Премиум — без рекламы
          </Text>
        </View>
      </View>
    );
  }

  // ----- Default mode: clean level-up panel -----
  return (
    <Animated.View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
        paddingBottom: bottomInset + 24,
        opacity,
      }}
    >
      <LinearGradient
        colors={passed ? ['rgba(0,0,0,0.65)', 'rgba(0,0,0,0.92)'] : ['rgba(60,0,0,0.5)', 'rgba(0,0,0,0.92)']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <Text style={{ fontSize: 64, marginBottom: 6 }}>
        {passed ? (level >= 5 ? '🏆' : level >= 3 ? '🔥' : '🎉') : '💀'}
      </Text>
      <Text style={{ fontSize: 12, fontFamily: fontFamily.bold, color: passed ? accent : '#FF4D4D', letterSpacing: 1.5 }}>
        {passed ? `УРОВЕНЬ ${level} ПРОЙДЕН` : `УРОВЕНЬ ${level} ПРОВАЛЕН`}
      </Text>
      <Animated.View style={{ transform: [{ scale: scoreScale }], marginTop: 6, alignItems: 'center' }}>
        <Text style={{ fontSize: 56, fontFamily: fontFamily.bold, color: '#fff', letterSpacing: -1 }}>
          +{score}
        </Text>
        <Text style={{ fontSize: 11, fontFamily: fontFamily.semibold, color: colors.textDim, letterSpacing: 1 }}>
          {scoreLabel.toUpperCase()}
        </Text>
      </Animated.View>

      <View style={{ marginTop: 28, gap: 10, width: '100%', maxWidth: 320 }}>
        {passed ? (
          <Pressable
            onPress={onContinue}
            style={{
              backgroundColor: accent,
              borderRadius: radius.pill,
              paddingVertical: 14,
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 15, fontFamily: fontFamily.bold, color: '#000' }}>
              Уровень {level + 1} →
            </Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={onRetry}
            style={{
              backgroundColor: '#fff',
              borderRadius: radius.pill,
              paddingVertical: 14,
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 15, fontFamily: fontFamily.bold, color: '#000' }}>
              Попробовать снова ↺
            </Text>
          </Pressable>
        )}
        <Pressable onPress={onBack} style={{ paddingVertical: 10, alignItems: 'center' }}>
          <Text style={{ fontSize: 12, fontFamily: fontFamily.semibold, color: colors.textMuted }}>
            ← В ленту
          </Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

// Helper: deterministic-ish "show ad after this level transition?" rule.
// Default: ad after level 2, then every 3 levels (5, 8, 11, …). Avoids ads
// on level 1 so users get a clean first taste; then increases to mimic
// freemium pacing.
export function shouldShowAdAfter(level: number): boolean {
  if (level < 2) return false;
  return level === 2 || (level - 2) % 3 === 0;
}
