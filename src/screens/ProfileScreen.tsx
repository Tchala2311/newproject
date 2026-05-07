import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Glass } from '../components/Glass';
import { GAMES, Game } from '../data/games';
import { colors, fontFamily, radius, SAFE_TOP } from '../theme';
import { usePrefs } from '../store/usePrefs';
import { useStats } from '../store/useStats';

type Props = {
  onPlay: (g: Game) => void;
  bottomInset: number;
};

type ProfileTab = 'recent' | 'saved' | 'liked';

export function ProfileScreen({ onPlay, bottomInset }: Props) {
  const { likes, saves } = usePrefs();
  const { totals, streak, recentIds, topCategory, bests } = useStats();
  const [view, setView] = useState<ProfileTab>('recent');

  const likedGames = useMemo(() => GAMES.filter((g) => likes[g.id]), [likes]);
  const savedGames = useMemo(() => GAMES.filter((g) => saves[g.id]), [saves]);
  const recentGames = useMemo(() => {
    const byId = new Map(GAMES.map((g) => [g.id, g]));
    const list = recentIds.map((id) => byId.get(id)).filter(Boolean) as Game[];
    // Pad with top-ranked games for new users so the screen never looks empty.
    if (list.length < 4) {
      for (const g of GAMES) {
        if (list.length >= 4) break;
        if (!list.find((x) => x.id === g.id)) list.push(g);
      }
    }
    return list;
  }, [recentIds]);

  const list = view === 'recent' ? recentGames : view === 'saved' ? savedGames : likedGames;

  // Level: 1 level per 5 completed games, capped at 99.
  const level = Math.min(99, 1 + Math.floor(totals.totalCompletes / 5));
  const roleLabel = topCategory ? `Любит ${topCategory}` : 'Новичок';
  const streakLabel = streak > 0 ? `${streak}🔥` : '0';

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
        {/* Avatar */}
        <View style={{ alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 3,
              borderColor: 'rgba(255,255,255,0.12)',
              overflow: 'hidden',
            }}
          >
            <LinearGradient
              colors={['#9C5FE0', '#C13E84']}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            />
            <Text style={{ fontSize: 30 }}>👾</Text>
          </View>
          <Text style={{ fontSize: 18, fontFamily: fontFamily.bold, color: colors.text }}>@gamer_z</Text>
          <Text style={{ fontSize: 11, fontFamily: fontFamily.semibold, color: colors.textDim }}>
            {level} уровень · {roleLabel}
          </Text>
        </View>

        {/* Stats — real data */}
        <Glass
          borderRadius={radius.xl}
          style={{
            paddingVertical: 14,
            flexDirection: 'row',
            marginBottom: 16,
          }}
        >
          {[
            { v: `${totals.totalPlays}`, l: 'Игр' },
            { v: `${likedGames.length}`, l: 'Лайков' },
            { v: streakLabel, l: 'Дней подряд' },
          ].map((s, i) => (
            <View
              key={i}
              style={{
                flex: 1,
                alignItems: 'center',
                borderRightWidth: i < 2 ? 1 : 0,
                borderRightColor: 'rgba(255,255,255,0.09)',
              }}
            >
              <Text style={{ fontSize: 18, fontFamily: fontFamily.bold, color: colors.text }}>{s.v}</Text>
              <Text style={{ fontSize: 10, fontFamily: fontFamily.semibold, color: colors.textDim, marginTop: 2 }}>
                {s.l}
              </Text>
            </View>
          ))}
        </Glass>

        {/* Tabs */}
        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
          {[
            { id: 'recent' as const, label: 'Недавнее' },
            { id: 'saved' as const, label: `Сохранённое${savedGames.length ? ` (${savedGames.length})` : ''}` },
            { id: 'liked' as const, label: 'Любимое' },
          ].map((t) => {
            const active = t.id === view;
            return (
              <Pressable
                key={t.id}
                onPress={() => setView(t.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  borderRadius: radius.pill,
                  backgroundColor: active ? colors.glassBgStrong : colors.glassBg,
                  borderWidth: 1,
                  borderColor: active ? colors.glassBorderStrong : colors.glassBorder,
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontFamily: fontFamily.bold,
                    color: active ? colors.text : colors.textDim,
                  }}
                >
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* List */}
        {list.map((g) => {
          const best = bests[g.id] || 0;
          return (
            <Pressable key={g.id} onPress={() => onPlay(g)}>
              <Glass
                borderRadius={radius.lg}
                style={{
                  marginBottom: 8,
                  padding: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                  }}
                >
                  <LinearGradient
                    colors={[g.gradient[0], g.gradient[1]]}
                    style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                  />
                  <Text style={{ fontSize: 14, color: colors.text }}>▶</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontFamily: fontFamily.bold, color: colors.text }}>{g.name}</Text>
                  <Text style={{ fontSize: 10, fontFamily: fontFamily.semibold, color: colors.textDim, marginTop: 2 }}>
                    {g.tag} · {g.duration}
                    {best > 0 ? ` · 🏆 ${best}` : ''}
                  </Text>
                </View>
                <View
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: radius.pill,
                    backgroundColor: `${g.accent}1f`,
                  }}
                >
                  <Text style={{ fontSize: 10, fontFamily: fontFamily.bold, color: g.accent, letterSpacing: 0.5 }}>
                    ИГРАТЬ
                  </Text>
                </View>
              </Glass>
            </Pressable>
          );
        })}

        {view !== 'recent' && list.length === 0 ? (
          <Text
            style={{
              textAlign: 'center',
              color: colors.textDim,
              fontSize: 13,
              fontFamily: fontFamily.medium,
              marginTop: 24,
            }}
          >
            {view === 'saved'
              ? 'Сохраняй игры из ленты!'
              : 'Лайкай игры из ленты!'}
          </Text>
        ) : null}
      </ScrollView>
    </View>
  );
}
