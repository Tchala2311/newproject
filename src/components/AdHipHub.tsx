import React from 'react';
import { Pressable, Text, View, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Glass } from './Glass';
import { fontFamily, radius } from '../theme';

type Props = {
  height: number;
  bottomInset: number;
};

// Mock HipHub featured-release ad. Swap in live campaign assets when partner deal lands:
// - cover image
// - artist + title strings
// - deep link URL
const AD = {
  brand: 'HipHub',
  domain: 'hiphub.ru',
  artist: 'Скриптонит',
  title: 'Новый альбом · 2030',
  hook: 'Эксклюзивный дроп — слушай первым',
  cta: 'Слушать на HipHub',
  url: 'https://hiphub.ru',
  // Brand palette — black/red signature of the mag layout
  bg1: '#0A0A0A',
  bg2: '#1A0808',
  accent: '#E11D48',
};

export function AdHipHub({ height, bottomInset }: Props) {
  const insets = useSafeAreaInsets();
  const topPad = Math.max(insets.top, 14) + 8;
  const bottomPad = 76 + bottomInset;

  return (
    <View style={{ height, width: '100%', overflow: 'hidden' }}>
      <LinearGradient colors={[AD.bg1, AD.bg2]} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
      <LinearGradient
        colors={[`${AD.accent}66`, 'transparent']}
        start={{ x: 0.7, y: 0.0 }}
        end={{ x: 0.0, y: 0.7 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />

      {/* Sponsored chip */}
      <View style={{ position: 'absolute', top: topPad, left: 14, right: 14, flexDirection: 'row', justifyContent: 'space-between' }}>
        <Glass borderRadius={radius.pill} style={{ paddingHorizontal: 11, paddingVertical: 4 }}>
          <Text style={{ fontSize: 10, fontFamily: fontFamily.bold, color: 'rgba(255,255,255,0.55)', letterSpacing: 0.5 }}>РЕКЛАМА</Text>
        </Glass>
        <View
          style={{
            paddingHorizontal: 12,
            paddingVertical: 5,
            borderRadius: radius.pill,
            backgroundColor: AD.accent,
          }}
        >
          <Text style={{ fontSize: 11, fontFamily: fontFamily.bold, color: '#fff', letterSpacing: 0.5 }}>{AD.brand.toUpperCase()}</Text>
        </View>
      </View>

      {/* Centered "cover" — abstract until real artwork is wired */}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: topPad + 20, paddingBottom: bottomPad + 180 }}>
        <View
          style={{
            width: 240,
            height: 240,
            borderRadius: 12,
            backgroundColor: '#000',
            borderWidth: 2,
            borderColor: AD.accent,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: AD.accent,
            shadowOpacity: 0.6,
            shadowRadius: 30,
            shadowOffset: { width: 0, height: 0 },
          }}
        >
          <Text style={{ fontSize: 92, fontFamily: fontFamily.bold, color: AD.accent }}>HH</Text>
          <View style={{ position: 'absolute', bottom: 12, left: 12, right: 12 }}>
            <Text style={{ fontSize: 9, fontFamily: fontFamily.bold, color: 'rgba(255,255,255,0.5)', letterSpacing: 1.5 }}>EXCLUSIVE DROP</Text>
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
          paddingTop: 24,
          paddingBottom: bottomPad,
          gap: 10,
        }}
      >
        <Text style={{ fontSize: 12, fontFamily: fontFamily.bold, color: AD.accent, letterSpacing: 1.2 }}>
          {AD.hook.toUpperCase()}
        </Text>
        <Text style={{ fontSize: 28, fontFamily: fontFamily.bold, color: '#fff', letterSpacing: -0.5, lineHeight: 30 }}>
          {AD.artist}
        </Text>
        <Text style={{ fontSize: 16, fontFamily: fontFamily.semibold, color: 'rgba(255,255,255,0.75)' }}>
          {AD.title}
        </Text>
        <Pressable
          onPress={() => Linking.openURL(AD.url).catch(() => {})}
          style={{ marginTop: 6 }}
        >
          <View
            style={{
              backgroundColor: AD.accent,
              borderRadius: radius.pill,
              paddingVertical: 14,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <Text style={{ fontSize: 14, fontFamily: fontFamily.bold, color: '#fff' }}>{AD.cta}</Text>
            <Text style={{ fontSize: 14, color: '#fff' }}>→</Text>
          </View>
        </Pressable>
        <Text style={{ fontSize: 10, fontFamily: fontFamily.medium, color: 'rgba(255,255,255,0.35)', textAlign: 'center', marginTop: 2 }}>
          {AD.domain} · смахни ↑ чтобы продолжить
        </Text>
      </View>
    </View>
  );
}
