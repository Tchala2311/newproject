import React, { useState } from 'react';
import { ScrollView, Text, View, Pressable, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { CATEGORIES, Game } from '../data/games';
import { GamePreview } from '../components/GamePreview';
import { colors, fontFamily, radius, SAFE_TOP } from '../theme';
import { usePrefs } from '../store/usePrefs';
import { useStats } from '../store/useStats';

type Props = {
  onPlay: (g: Game) => void;
  bottomInset: number;
};

export function ExploreScreen({ onPlay, bottomInset }: Props) {
  const { width } = useWindowDimensions();
  const { saves } = usePrefs();
  const { ranked } = useStats();
  const [cat, setCat] = useState<(typeof CATEGORIES)[number]['id']>('all');

  const filtered = cat === 'all' ? ranked : ranked.filter((g) => g.category === cat);
  const cardW = (width - 14 * 2 - 10) / 2;

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={['#1F1B36', '#0E0D24']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <ScrollView
        contentContainerStyle={{
          paddingTop: SAFE_TOP + 4,
          paddingHorizontal: 14,
          paddingBottom: 90 + bottomInset,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={{ fontSize: 26, fontFamily: fontFamily.bold, color: colors.text, marginBottom: 12 }}>
          Поиск
        </Text>

        {/* Category chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
          style={{ marginBottom: 16 }}
        >
          {CATEGORIES.map((c) => {
            const active = c.id === cat;
            return (
              <Pressable
                key={c.id}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  setCat(c.id);
                }}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 7,
                  borderRadius: radius.pill,
                  backgroundColor: active ? colors.glassBgStrong : colors.glassBg,
                  borderWidth: 1,
                  borderColor: active ? colors.glassBorderStrong : colors.glassBorder,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontFamily: fontFamily.bold,
                    color: active ? colors.text : colors.textDim,
                  }}
                >
                  {c.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Grid */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {filtered.map((g) => (
            <Pressable
              key={g.id}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                onPlay(g);
              }}
              style={{
                width: cardW,
                borderRadius: 18,
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              <LinearGradient
                colors={[g.gradient[0], g.gradient[1]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
              />
              <LinearGradient
                colors={[`${g.accent}55`, 'transparent']}
                start={{ x: 0.6, y: 0.3 }}
                end={{ x: 0.2, y: 1 }}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
              />

              {/* Match badge */}
              <View
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  backgroundColor: 'rgba(0,0,0,0.45)',
                  borderWidth: 1,
                  borderColor: colors.glassBorder,
                  borderRadius: radius.pill,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  zIndex: 2,
                }}
              >
                <Text style={{ fontSize: 9, fontFamily: fontFamily.bold, color: g.accent }}>
                  {g.match}%
                </Text>
              </View>

              <View style={{ paddingHorizontal: 10, paddingTop: 16, paddingBottom: 10, gap: 10 }}>
                <View
                  style={{
                    backgroundColor: 'rgba(0,0,0,0.22)',
                    borderRadius: 12,
                    minHeight: 80,
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 6,
                  }}
                >
                  <GamePreview game={g} />
                </View>
                <View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 14, fontFamily: fontFamily.bold, color: colors.text }}>
                      {g.name}
                    </Text>
                    {saves[g.id] ? (
                      <Text style={{ fontSize: 9, fontFamily: fontFamily.bold, color: g.accent }}>★</Text>
                    ) : null}
                  </View>
                  <Text
                    style={{
                      fontSize: 9,
                      fontFamily: fontFamily.semibold,
                      color: colors.textDim,
                      marginTop: 2,
                      marginBottom: 6,
                    }}
                  >
                    {g.plays} · {g.duration}
                  </Text>
                  <View
                    style={{
                      height: 30,
                      borderRadius: radius.pill,
                      backgroundColor: colors.glassBg,
                      borderWidth: 1,
                      borderColor: colors.glassBorder,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 11, fontFamily: fontFamily.bold, color: colors.text }}>
                      ▶ Играть
                    </Text>
                  </View>
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
