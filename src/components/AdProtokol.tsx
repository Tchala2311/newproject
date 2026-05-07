import React, { useEffect, useState } from 'react';
import { Pressable, Text, View, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Line, Rect } from 'react-native-svg';
import { fontFamily, radius } from '../theme';

type Props = {
  height: number;
  bottomInset: number;
};

// Mock ПРОТОКОЛ live-auction lot card. Editorial / gallery vibe matching
// protokol.art aesthetic (off-white paper, black ink, amber accent).
// Replace LOT with real partner-feed data when integrated.
const LOT = {
  brand: 'ПРОТОКОЛ',
  brandEn: 'PROTOKOL',
  domain: 'protokol.art',
  number: 'ЛОТ № 247',
  title: 'AES+F — Allegoria Sacra',
  meta: 'Шёлкография · 2024 · 3/12',
  size: '70 × 100 см',
  startBid: 45000,
  currentBid: 127000,
  step: 5000,
  bidders: 14,
  endsAt: Date.now() + 1000 * 60 * 60 * 4 + 1000 * 60 * 12,
  cta: 'Сделать ставку',
  url: 'https://protokol.art',
  paper: '#F4F1EA',
  paperDark: '#E8E2D2',
  ink: '#0A0A0A',
  accent: '#B8893E',
  red: '#C41818',
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

function ProtokolLogo() {
  // Editorial wordmark with horizontal divider — gallery/auction-house vibe
  return (
    <View style={{ alignItems: 'center', gap: 2 }}>
      <Text style={{ fontSize: 14, fontFamily: fontFamily.bold, color: LOT.ink, letterSpacing: 6 }}>
        {LOT.brand}
      </Text>
      <View style={{ width: 90, height: 1, backgroundColor: LOT.ink }} />
      <Text style={{ fontSize: 8, fontFamily: fontFamily.semibold, color: LOT.ink, letterSpacing: 4 }}>
        EST. MMXXIV
      </Text>
    </View>
  );
}

export function AdProtokol({ height, bottomInset }: Props) {
  const insets = useSafeAreaInsets();
  const topPad = Math.max(insets.top, 14) + 8;
  const bottomPad = 76 + bottomInset;
  const remaining = useCountdown(LOT.endsAt);

  return (
    <View style={{ height, width: '100%', overflow: 'hidden', backgroundColor: LOT.paper }}>
      {/* Yandex Direct chrome */}
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
          <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 2, backgroundColor: LOT.ink }}>
            <Text style={{ fontSize: 9, fontFamily: fontFamily.bold, color: LOT.paper, letterSpacing: 0.8 }}>
              РЕКЛАМА
            </Text>
          </View>
          <Text style={{ fontSize: 10, fontFamily: fontFamily.semibold, color: 'rgba(0,0,0,0.45)' }}>Яндекс Директ</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: LOT.red }} />
          <Text style={{ fontSize: 11, fontFamily: fontFamily.bold, color: LOT.ink, letterSpacing: 1.5 }}>LIVE-АУКЦИОН</Text>
        </View>
      </View>

      {/* Logo */}
      <View style={{ position: 'absolute', top: topPad + 38, left: 0, right: 0, alignItems: 'center' }}>
        <ProtokolLogo />
      </View>

      {/* Lot number ribbon */}
      <View style={{ position: 'absolute', top: topPad + 100, left: 0, right: 0, alignItems: 'center' }}>
        <Text style={{ fontSize: 11, fontFamily: fontFamily.bold, color: LOT.accent, letterSpacing: 4 }}>
          {LOT.number}
        </Text>
      </View>

      {/* Lot artwork placeholder — abstract editorial composition */}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: topPad + 130, paddingBottom: bottomPad + 280 }}>
        <View
          style={{
            width: 230,
            height: 280,
            backgroundColor: '#fff',
            padding: 14,
            shadowColor: '#000',
            shadowOpacity: 0.18,
            shadowRadius: 22,
            shadowOffset: { width: 0, height: 14 },
          }}
        >
          <Svg width={202} height={252} viewBox="0 0 200 250">
            <Rect x={0} y={0} width={200} height={250} fill={LOT.paperDark} />
            <Circle cx={100} cy={110} r={62} fill={LOT.ink} />
            <Circle cx={100} cy={110} r={28} fill={LOT.accent} />
            <Line x1={20} y1={200} x2={180} y2={200} stroke={LOT.ink} strokeWidth={2} />
            <Line x1={20} y1={210} x2={140} y2={210} stroke={LOT.ink} strokeWidth={1} />
            <Line x1={20} y1={218} x2={100} y2={218} stroke={LOT.ink} strokeWidth={1} />
            <Rect x={20} y={232} width={50} height={6} fill={LOT.red} />
          </Svg>
        </View>
      </View>

      {/* Bottom info card */}
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
          borderTopWidth: 1,
          borderTopColor: 'rgba(0,0,0,0.08)',
          gap: 5,
        }}
      >
        <Text style={{ fontSize: 21, fontFamily: fontFamily.bold, color: LOT.ink, letterSpacing: -0.3, lineHeight: 25 }}>
          {LOT.title}
        </Text>
        <Text style={{ fontSize: 12, fontFamily: fontFamily.medium, color: 'rgba(0,0,0,0.55)' }}>
          {LOT.meta} · {LOT.size}
        </Text>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, alignItems: 'flex-end' }}>
          <View>
            <Text style={{ fontSize: 9, fontFamily: fontFamily.bold, color: 'rgba(0,0,0,0.45)', letterSpacing: 1 }}>ТЕКУЩАЯ СТАВКА</Text>
            <Text style={{ fontSize: 24, fontFamily: fontFamily.bold, color: LOT.ink, fontVariant: ['tabular-nums'] }}>
              {fmtRub(LOT.currentBid)}
            </Text>
            <Text style={{ fontSize: 10, fontFamily: fontFamily.semibold, color: 'rgba(0,0,0,0.4)' }}>
              старт {fmtRub(LOT.startBid)} · шаг {fmtRub(LOT.step)}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 9, fontFamily: fontFamily.bold, color: LOT.red, letterSpacing: 1 }}>ДО ОКОНЧАНИЯ</Text>
            <Text style={{ fontSize: 18, fontFamily: fontFamily.bold, color: LOT.ink, fontVariant: ['tabular-nums'] }}>
              {remaining}
            </Text>
            <Text style={{ fontSize: 10, fontFamily: fontFamily.semibold, color: 'rgba(0,0,0,0.4)' }}>
              {LOT.bidders} участников
            </Text>
          </View>
        </View>

        <Pressable onPress={() => Linking.openURL(LOT.url).catch(() => {})} style={{ marginTop: 10 }}>
          <View
            style={{
              backgroundColor: LOT.ink,
              borderRadius: 4,
              paddingVertical: 16,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <Text style={{ fontSize: 14, fontFamily: fontFamily.bold, color: '#fff', letterSpacing: 1 }}>
              {LOT.cta.toUpperCase()} →
            </Text>
          </View>
        </Pressable>
        <Text style={{ fontSize: 10, fontFamily: fontFamily.medium, color: 'rgba(0,0,0,0.35)', textAlign: 'center', marginTop: 2 }}>
          {LOT.domain} · 18+ · смахни ↑ чтобы продолжить
        </Text>
      </View>
    </View>
  );
}
