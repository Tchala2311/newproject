import React from 'react';
import { Text, View, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Glass } from './Glass';
import { colors, fontFamily, radius } from '../theme';
import { AdHipHub } from './AdHipHub';
import { AdProtokol } from './AdProtokol';

type Variant = 'hiphub' | 'protokol' | 'premium';

type Props = {
  height: number;
  bottomInset: number;
  index?: number;
  onCTA?: () => void;
};

// We rotate ad creatives so the showcase has variety. In production this gets
// replaced with Yandex Mobile Ads SDK requests (interstitial / rewarded).
const VARIANTS: Variant[] = ['hiphub', 'protokol', 'premium'];

export function AdSlot({ height, bottomInset, index = 0, onCTA }: Props) {
  const variant = VARIANTS[index % VARIANTS.length];
  if (variant === 'hiphub') return <AdHipHub height={height} bottomInset={bottomInset} />;
  if (variant === 'protokol') return <AdProtokol height={height} bottomInset={bottomInset} />;
  return <PremiumUpsell height={height} bottomInset={bottomInset} onCTA={onCTA} />;
}

function PremiumUpsell({ height, bottomInset, onCTA }: { height: number; bottomInset: number; onCTA?: () => void }) {
  const insets = useSafeAreaInsets();
  const topPad = Math.max(insets.top, 14) + 8;
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

      <View style={{ position: 'absolute', top: topPad, left: 12, right: 12 }}>
        <Glass borderRadius={radius.pill} style={{ paddingHorizontal: 11, paddingVertical: 4, alignSelf: 'flex-start' }}>
          <Text style={{ fontSize: 10, fontFamily: fontFamily.bold, color: 'rgba(255,255,255,0.55)', letterSpacing: 0.5 }}>
            РЕКЛАМА
          </Text>
        </Glass>
      </View>

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingBottom: 90 + bottomInset, gap: 16 }}>
        <Text style={{ fontSize: 56 }}>✨</Text>
        <Text style={{ fontSize: 26, fontFamily: fontFamily.bold, color: colors.text, textAlign: 'center', lineHeight: 30, letterSpacing: -0.5 }}>
          FLIK без рекламы
        </Text>
        <Text style={{ fontSize: 14, fontFamily: fontFamily.medium, color: colors.textMuted, textAlign: 'center', lineHeight: 20, maxWidth: 280 }}>
          Подписка убирает рекламу и открывает выбор твоей собственной музыки во время игры.
        </Text>
        <Pressable onPress={onCTA} style={{ marginTop: 8 }}>
          <Glass borderRadius={radius.pill} style={{ paddingHorizontal: 28, paddingVertical: 14 }}>
            <Text style={{ fontSize: 14, fontFamily: fontFamily.bold, color: colors.text }}>
              Попробовать бесплатно
            </Text>
          </Glass>
        </Pressable>
        <Text style={{ fontSize: 11, fontFamily: fontFamily.medium, color: colors.textFaint, textAlign: 'center' }}>
          смахни ↑ чтобы продолжить
        </Text>
      </View>
    </View>
  );
}
