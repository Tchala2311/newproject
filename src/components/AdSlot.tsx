import React from 'react';
import { Text, View, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Glass } from './Glass';
import { colors, fontFamily, radius, SAFE_TOP } from '../theme';

type Props = {
  height: number;
  bottomInset: number;
  onCTA?: () => void;
};

// Stub ad surface that lives in the swipe feed between games. In v1 we render a
// branded subscription-upsell card; in v2 we'll swap this for Yandex Mobile Ads
// SDK (interstitial or rewarded) which is the only major ad network still
// operating in Russia after AdMob's withdrawal.
export function AdSlot({ height, bottomInset, onCTA }: Props) {
  return (
    <View style={{ height, width: '100%', overflow: 'hidden' }}>
      <LinearGradient
        colors={['#1A1330', '#08071A']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <LinearGradient
        colors={['rgba(155,89,224,0.45)', 'transparent']}
        start={{ x: 0.2, y: 0.1 }}
        end={{ x: 0.7, y: 0.7 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />

      <View
        style={{
          position: 'absolute',
          top: SAFE_TOP,
          left: 12,
          right: 12,
          flexDirection: 'row',
          justifyContent: 'space-between',
        }}
      >
        <Glass borderRadius={radius.pill} style={{ paddingHorizontal: 11, paddingVertical: 4 }}>
          <Text style={{ fontSize: 11, fontFamily: fontFamily.bold, color: 'rgba(255,255,255,0.6)' }}>
            реклама
          </Text>
        </Glass>
      </View>

      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 24,
          paddingBottom: 120 + bottomInset,
          gap: 16,
        }}
      >
        <Text style={{ fontSize: 56 }}>✨</Text>
        <Text
          style={{
            fontSize: 26,
            fontFamily: fontFamily.bold,
            color: colors.text,
            textAlign: 'center',
            lineHeight: 30,
            letterSpacing: -0.5,
          }}
        >
          Луп без рекламы
        </Text>
        <Text
          style={{
            fontSize: 14,
            fontFamily: fontFamily.medium,
            color: colors.textMuted,
            textAlign: 'center',
            lineHeight: 20,
            maxWidth: 280,
          }}
        >
          Подписка убирает рекламу и открывает выбор твоей собственной музыки во время игры.
        </Text>
        <Pressable onPress={onCTA} style={{ marginTop: 8 }}>
          <Glass
            borderRadius={radius.pill}
            style={{
              paddingHorizontal: 28,
              paddingVertical: 14,
              flexDirection: 'row',
              gap: 8,
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 14, fontFamily: fontFamily.bold, color: colors.text }}>
              Попробовать бесплатно
            </Text>
          </Glass>
        </Pressable>
        <Text
          style={{
            fontSize: 11,
            fontFamily: fontFamily.medium,
            color: colors.textFaint,
            textAlign: 'center',
          }}
        >
          смахни ↑ чтобы продолжить
        </Text>
      </View>
    </View>
  );
}
