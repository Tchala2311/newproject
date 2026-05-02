import React from 'react';
import { Pressable, Text, View, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';
import { fontFamily, radius } from '../theme';

type Props = {
  height: number;
  bottomInset: number;
};

// Mock HipHub featured-release ad. Wordmark + palette mirror the public hiphub.ru
// brand identity (black ground, blood-red signature). Real campaign assets
// (cover image, artist string, deep-link) plug in via the `AD` const.
const AD = {
  brand: 'HIPHUB',
  domain: 'hiphub.ru',
  artist: 'OG BUDA × MAYOT',
  title: 'POP UP STARS',
  hook: 'Эксклюзив · только сегодня',
  meta: 'EP · 6 треков · 18 мин',
  plays: '2.4M прослушиваний',
  cta: 'Слушать',
  url: 'https://hiphub.ru',
  bg1: '#0A0A0A',
  bg2: '#180404',
  red: '#E11D48',
  redDark: '#9F1239',
};

function HipHubLogo({ size = 56 }: { size?: number }) {
  // Stylized wordmark — bold sans, red H box like a tag
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <View
        style={{
          width: size,
          height: size,
          backgroundColor: AD.red,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 4,
        }}
      >
        <Text style={{ fontSize: size * 0.55, fontFamily: fontFamily.bold, color: '#000', letterSpacing: -2 }}>HH</Text>
      </View>
      <Text style={{ fontSize: size * 0.42, fontFamily: fontFamily.bold, color: '#fff', letterSpacing: -0.5 }}>
        HIPHUB
      </Text>
    </View>
  );
}

export function AdHipHub({ height, bottomInset }: Props) {
  const insets = useSafeAreaInsets();
  const topPad = Math.max(insets.top, 14) + 8;
  const bottomPad = 76 + bottomInset;

  return (
    <View style={{ height, width: '100%', overflow: 'hidden' }}>
      <LinearGradient colors={[AD.bg1, AD.bg2]} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
      <LinearGradient
        colors={[`${AD.red}55`, 'transparent']}
        start={{ x: 0.85, y: 0.0 }}
        end={{ x: 0.0, y: 0.6 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />

      {/* Yandex Direct chrome — top */}
      <View
        style={{
          position: 'absolute',
          top: topPad,
          left: 14,
          right: 14,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 10, fontFamily: fontFamily.bold, color: 'rgba(255,255,255,0.55)', letterSpacing: 1 }}>
            РЕКЛАМА
          </Text>
          <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)' }}>·</Text>
          <Text style={{ fontSize: 10, fontFamily: fontFamily.semibold, color: 'rgba(255,255,255,0.55)' }}>Яндекс Директ</Text>
        </View>
        <HipHubLogo size={26} />
      </View>

      {/* Big wordmark + ribbon */}
      <View style={{ position: 'absolute', top: topPad + 56, left: 14, right: 14 }}>
        <View
          style={{
            paddingHorizontal: 14,
            paddingVertical: 6,
            backgroundColor: AD.red,
            alignSelf: 'flex-start',
            transform: [{ rotate: '-2deg' }],
          }}
        >
          <Text style={{ fontSize: 11, fontFamily: fontFamily.bold, color: '#000', letterSpacing: 2 }}>
            {AD.hook.toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Cover-art card */}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: topPad + 30, paddingBottom: bottomPad + 230 }}>
        <View
          style={{
            width: 240,
            height: 240,
            backgroundColor: '#000',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: AD.red,
            shadowOpacity: 0.7,
            shadowRadius: 36,
            shadowOffset: { width: 0, height: 8 },
          }}
        >
          {/* Stylized stripes */}
          <Svg width={240} height={240} style={{ position: 'absolute' }}>
            <Rect x={0} y={0} width={240} height={240} fill="#0A0A0A" />
            <Rect x={0} y={64} width={240} height={6} fill={AD.red} />
            <Rect x={0} y={172} width={240} height={6} fill={AD.red} />
            <Rect x={20} y={20} width={4} height={200} fill={AD.red} />
          </Svg>
          <View style={{ alignItems: 'center', gap: 4, paddingHorizontal: 24 }}>
            <Text style={{ fontSize: 11, fontFamily: fontFamily.bold, color: AD.red, letterSpacing: 2.5 }}>HIPHUB DROP</Text>
            <Text style={{ fontSize: 22, fontFamily: fontFamily.bold, color: '#fff', textAlign: 'center', letterSpacing: -0.3 }}>
              {AD.title}
            </Text>
            <View style={{ width: 40, height: 2, backgroundColor: AD.red, marginVertical: 6 }} />
            <Text style={{ fontSize: 12, fontFamily: fontFamily.semibold, color: 'rgba(255,255,255,0.7)', textAlign: 'center', letterSpacing: 1 }}>
              {AD.artist}
            </Text>
          </View>
        </View>
      </View>

      {/* Bottom block */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          paddingHorizontal: 18,
          paddingTop: 22,
          paddingBottom: bottomPad,
          gap: 8,
        }}
      >
        <Text style={{ fontSize: 13, fontFamily: fontFamily.semibold, color: 'rgba(255,255,255,0.55)', letterSpacing: 0.4 }}>
          {AD.meta}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: AD.red }} />
          <Text style={{ fontSize: 12, fontFamily: fontFamily.bold, color: '#fff' }}>{AD.plays}</Text>
        </View>
        <Pressable onPress={() => Linking.openURL(AD.url).catch(() => {})} style={{ marginTop: 6 }}>
          <View
            style={{
              backgroundColor: AD.red,
              borderRadius: 6,
              paddingVertical: 16,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 10,
            }}
          >
            <View style={{ width: 0, height: 0, borderLeftWidth: 10, borderTopWidth: 6, borderBottomWidth: 6, borderLeftColor: '#fff', borderTopColor: 'transparent', borderBottomColor: 'transparent' }} />
            <Text style={{ fontSize: 14, fontFamily: fontFamily.bold, color: '#fff', letterSpacing: 0.5 }}>
              {AD.cta.toUpperCase()} НА HIPHUB
            </Text>
          </View>
        </Pressable>
        <Text style={{ fontSize: 10, fontFamily: fontFamily.medium, color: 'rgba(255,255,255,0.35)', textAlign: 'center', marginTop: 2 }}>
          {AD.domain} · 18+ · смахни ↑ чтобы продолжить
        </Text>
      </View>
    </View>
  );
}
