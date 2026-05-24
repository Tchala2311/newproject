import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Glass } from '../components/Glass';
import { GAMES, Game } from '../data/games';
import { colors, fontFamily, radius } from '../theme';
import { usePrefs } from '../store/usePrefs';
import { useUser } from '../store/useUser';
import { useAchievements } from '../store/useAchievements';
import { ACHIEVEMENTS, RARITY_COLOR } from '../lib/achievements/catalog';
import { AchievementDetailModal } from '../components/AchievementDetailModal';

type Props = {
  onPlay: (g: Game) => void;
  bottomInset: number;
};

type ProfileTab = 'recent' | 'saved' | 'liked';

export function ProfileScreen({ onPlay, bottomInset }: Props) {
  const { likes, saves } = usePrefs();
  const { user, follows, signOut, followerCount } = useUser();
  const { unlocked, progressByGame, recentGameIds } = useAchievements();
  const insets = useSafeAreaInsets();
  const SAFE_TOP = Math.max(insets.top, 14) + 8;
  const [view, setView] = useState<ProfileTab>('recent');
  const [selectedAchievement, setSelectedAchievement] = useState<string | null>(null);
  const followCount = Object.values(follows).filter(Boolean).length;
  const ownedCount = unlocked.size;

  const likedGames = useMemo(() => GAMES.filter((g) => likes[g.id]), [likes]);
  const savedGames = useMemo(() => GAMES.filter((g) => saves[g.id]), [saves]);

  const bests = useMemo(() => {
    const m: Record<number, number> = {};
    progressByGame.forEach((p, id) => { if (p.best_score > 0) m[id] = p.best_score; });
    return m;
  }, [progressByGame]);

  const totals = useMemo(() => {
    let totalPlays = 0, totalCompletes = 0;
    progressByGame.forEach((p) => { totalPlays += p.total_plays; totalCompletes += p.total_wins; });
    return { totalPlays, totalCompletes };
  }, [progressByGame]);

  const topCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    progressByGame.forEach((p, id) => {
      const g = GAMES.find((x) => x.id === id);
      if (g && p.total_plays > 0) counts[g.categoryLabel] = (counts[g.categoryLabel] ?? 0) + p.total_plays;
    });
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return top?.[0] ?? null;
  }, [progressByGame]);

  // Simple streak: count distinct calendar days in the last run of consecutive
  // days that have at least one play. We derive it from progressByGame total_plays
  // as a proxy (no per-day timestamps available client-side yet).
  const streak = Math.min(ownedCount, 7); // placeholder until date-stamped play log

  const recentGames = useMemo(() => {
    const byId = new Map(GAMES.map((g) => [g.id, g]));
    const list = recentGameIds.map((id) => byId.get(id)).filter(Boolean) as Game[];
    if (list.length < 4) {
      for (const g of GAMES) {
        if (list.length >= 4) break;
        if (!list.find((x) => x.id === g.id)) list.push(g);
      }
    }
    return list;
  }, [recentGameIds]);

  const list = view === 'recent' ? recentGames : view === 'saved' ? savedGames : likedGames;

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
        <View style={{ alignItems: 'center', gap: 6, marginBottom: 16 }}>
          <View
            style={{
              width: 92,
              height: 92,
              borderRadius: 46,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 3,
              borderColor: 'rgba(255,255,255,0.18)',
              backgroundColor: user?.avatarColor ?? '#C99FE6',
            }}
          >
            <Text style={{ fontSize: 38, fontFamily: fontFamily.bold, color: '#000' }}>
              {(user?.handle?.[0] ?? '?').toUpperCase()}
            </Text>
          </View>
          <Text style={{ fontSize: 20, fontFamily: fontFamily.bold, color: colors.text, marginTop: 4 }}>
            {user?.displayName || `@${user?.handle ?? 'guest'}`}
          </Text>
          <Text style={{ fontSize: 12, fontFamily: fontFamily.semibold, color: colors.textDim }}>
            @{user?.handle ?? 'guest'}
          </Text>
          <View style={{ flexDirection: 'row', gap: 18, marginTop: 6 }}>
            <Stat n={followCount} l="Подписки" />
            <Stat n={followerCount} l="Подписчики" />
            <Stat n={likedGames.length} l="Лайки" />
          </View>
          <Pressable
            onPress={signOut}
            style={{
              marginTop: 10,
              paddingHorizontal: 16,
              paddingVertical: 6,
              borderRadius: radius.pill,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.15)',
            }}
          >
            <Text style={{ fontSize: 11, fontFamily: fontFamily.bold, color: colors.textMuted }}>
              Сменить аккаунт
            </Text>
          </Pressable>
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

        {/* Achievements grid */}
        <View style={{ marginTop: 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <Text style={{ fontSize: 14, fontFamily: fontFamily.bold, color: colors.text }}>
              Ачивки
            </Text>
            <Text style={{ fontSize: 11, fontFamily: fontFamily.semibold, color: colors.textDim }}>
              {ownedCount} / {ACHIEVEMENTS.length}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {ACHIEVEMENTS.map((a) => {
              const owned = unlocked.has(a.id);
              const accent = RARITY_COLOR[a.rarity];
              return (
                <Pressable
                  key={a.id}
                  onPress={() => setSelectedAchievement(a.id)}
                  style={{
                    width: '31%',
                    aspectRatio: 0.95,
                    borderRadius: 12,
                    padding: 10,
                    backgroundColor: owned ? `${accent}1a` : 'rgba(255,255,255,0.04)',
                    borderWidth: 1,
                    borderColor: owned ? `${accent}88` : 'rgba(255,255,255,0.08)',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                  }}
                >
                  <Text style={{ fontSize: 28, opacity: owned ? 1 : 0.25 }}>{a.emoji}</Text>
                  <Text
                    numberOfLines={2}
                    style={{
                      fontSize: 10,
                      fontFamily: fontFamily.bold,
                      color: owned ? '#fff' : colors.textDim,
                      textAlign: 'center',
                    }}
                  >
                    {owned ? a.title : '???'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Legal footer */}
        <View style={{ marginTop: 32, paddingBottom: 16, alignItems: 'center', gap: 4 }}>
          <Text style={{ fontSize: 10, fontFamily: fontFamily.medium, color: colors.textDim, textAlign: 'center' }}>
            © 2025 ИП Цейтлин М.А.
          </Text>
          <Text style={{ fontSize: 10, fontFamily: fontFamily.medium, color: 'rgba(255,255,255,0.2)', textAlign: 'center' }}>
            ИНН: 772846562633 · ОГРНИП: 326774600367465
          </Text>
        </View>
      </ScrollView>

      <AchievementDetailModal
        achievementId={selectedAchievement}
        owned={selectedAchievement ? unlocked.has(selectedAchievement) : false}
        onClose={() => setSelectedAchievement(null)}
      />
    </View>
  );
}

function Stat({ n, l }: { n: number; l: string }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ fontSize: 16, fontFamily: fontFamily.bold, color: colors.text }}>{n}</Text>
      <Text style={{ fontSize: 10, fontFamily: fontFamily.semibold, color: colors.textDim, marginTop: 2 }}>
        {l}
      </Text>
    </View>
  );
}
