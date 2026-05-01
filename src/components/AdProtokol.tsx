import React, { useEffect, useState } from 'react';
import { Pressable, Text, View, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Glass } from './Glass';
import { fontFamily, radius } from '../theme';

type Props = {
  height: number;
  bottomInset: number;
};

// Mock ПРОТОКОЛ auction lot card. Replace with live lot data via partner feed when integrated.
const LOT = {
  brand: 'ПРОТОКОЛ',
  domain: 'protokol.ru',
  number: 'Лот №247',
  title: 'Винил · АИГЕЛ — Татарин',
  maker: 'Limited press · 2024 · 500 экз.',
  startBid: 4900,
  currentBid: 12700,
  bidders: 14,
  endsAt: Date.now() + 1000 * 60 * 60 * 4 + 1000 * 60 * 12, // ~4h 12m
  cta: 'Сделать ставку',
  url: 'https://protokol.ru',
  // Brand palette — austere off-white + black, accent gold
  bg1: '#F4F1EA',
  bg2: '#E8E2D2',
  ink: '#0E0E0E',
  accent: '#B8893E',
};

function fmtRub(n: number) {
  return n.toLocaleString('ru-RU') + ' ₽';
}

function useCountdown(endsAt: number) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const ms = Math.max(0, endsAt - now);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function AdProtokol({ height, bottomInset }: Props) {
  const insets = useSafeAreaInsets();
  const topPad = Math.max(insets.top, 14) + 8;
  const bottomPad = 76 + bottomInset;
  const remaining = useCountdown(LOT.endsAt);

  return (
    <View style={{ height, width: '100%', overflow: 'hidden', backgroundColor: LOT.bg1 }}>
      <LinearGradient colors={[LOT.bg1, LOT.bg2]} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />

      {/* Top row */}
      <View style={{ position: 'absolute', top: topPad, left: 14, right: 14, flexDirection: 'row', justifyContent: 'space-between' }}>
        <View style={{ paddingHorizontal: 11, paddingVertical: 4, borderRadius: radius.pill, borderWidth: 1, borderColor: 'rgba(0,0,0,0.18)' }}>
          <Text style={{ fontSize: 10, fontFamily: fontFamily.bold, color: 'rgba(0,0,0,0.55)', letterSpacing: 0.5 }}>РЕКЛАМА</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#D11' }} />
          <Text style={{ fontSize: 11, fontFamily: fontFamily.bold, color: LOT.ink, letterSpacing: 1 }}>LIVE · {LOT.brand}</Text>
        </View>
      </View>

      {/* Lot "image" placeholder */}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: topPad + 30, paddingBottom: bottomPad + 240 }}>
        <View
          style={{
            width: 240,
            height: 240,
            borderRadius: 4,
            backgroundColor: LOT.ink,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOpacity: 0.25,
            shadowRadius: 22,
            shadowOffset: { width: 0, height: 14 },
          }}
        >
          <View style={{ position: 'absolute', width: 240, height: 240, borderRadius: 4, borderWidth: 8, borderColor: '#000' }} />
          <View style={{ width: 200, height: 200, borderRadius: 100, backgroundColor: '#0A0A0A', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#222' }}>
            <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: LOT.accent, alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#000' }} />
            </View>
          </View>
        </View>
      </View>

      {/* Bottom card */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          paddingHorizontal: 18,
          paddingTop: 22,
          paddingBottom: bottomPad,
          backgroundColor: '#fff',
          borderTopLeftRadius: 18,
          borderTopRightRadius: 18,
          gap: 6,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 11, fontFamily: fontFamily.bold, color: 'rgba(0,0,0,0.5)', letterSpacing: 1.5 }}>
            {LOT.number}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 10, fontFamily: fontFamily.semibold, color: 'rgba(0,0,0,0.5)' }}>осталось</Text>
            <Text style={{ fontSize: 13, fontFamily: fontFamily.bold, color: LOT.accent, fontVariant: ['tabular-nums'] }}>{remaining}</Text>
          </View>
        </View>
        <Text style={{ fontSize: 22, fontFamily: fontFamily.bold, color: LOT.ink, letterSpacing: -0.4, lineHeight: 26 }}>
          {LOT.title}
        </Text>
        <Text style={{ fontSize: 12, fontFamily: fontFamily.medium, color: 'rgba(0,0,0,0.55)' }}>
          {LOT.maker}
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 18, marginTop: 6 }}>
          <View>
            <Text style={{ fontSize: 10, fontFamily: fontFamily.semibold, color: 'rgba(0,0,0,0.45)', letterSpacing: 0.5 }}>ТЕКУЩАЯ СТАВКА</Text>
            <Text style={{ fontSize: 22, fontFamily: fontFamily.bold, color: LOT.ink, fontVariant: ['tabular-nums'] }}>
              {fmtRub(LOT.currentBid)}
            </Text>
          </View>
          <View>
            <Text style={{ fontSize: 10, fontFamily: fontFamily.semibold, color: 'rgba(0,0,0,0.45)', letterSpacing: 0.5 }}>УЧАСТНИКОВ</Text>
            <Text style={{ fontSize: 22, fontFamily: fontFamily.bold, color: LOT.ink, fontVariant: ['tabular-nums'] }}>
              {LOT.bidders}
            </Text>
          </View>
        </View>

        <Pressable onPress={() => Linking.openURL(LOT.url).catch(() => {})} style={{ marginTop: 8 }}>
          <View
            style={{
              backgroundColor: LOT.ink,
              borderRadius: 6,
              paddingVertical: 14,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <Text style={{ fontSize: 14, fontFamily: fontFamily.bold, color: '#fff', letterSpacing: 0.5 }}>
              {LOT.cta.toUpperCase()}
            </Text>
          </View>
        </Pressable>
        <Text style={{ fontSize: 10, fontFamily: fontFamily.medium, color: 'rgba(0,0,0,0.35)', textAlign: 'center', marginTop: 2 }}>
          {LOT.domain} · смахни ↑ чтобы продолжить
        </Text>
      </View>
    </View>
  );
}
