import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { GamePreview } from '../components/GamePreview';
import { GAMES, Game, Creator } from '../data/games';
import { colors, fontFamily, radius } from '../theme';
import { useUser } from '../store/useUser';
import { supabase } from '../lib/supabase';

type Props = {
  creator: Creator;
  onBack: () => void;
  onPlay: (g: Game) => void;
  bottomInset: number;
};

// Seeded creator metadata — populated alongside avatars to make profiles feel
// alive without a backend. When a real `users` join arrives, this collapses
// into a Supabase select.
const CREATOR_META: Record<string, { followers: string; following: number; bio: string; avatarColor: string }> = {
  'nika.flood':  { followers: '128.4K',  following: 184, avatarColor: '#C99FE6', bio: 'Дизайнер, делаю Color Flood. Игры про цвет и медитацию 🎨' },
  'rush.maks':   { followers: '342.1K',  following: 91,  avatarColor: '#5DD9B0', bio: 'Скорость + рефлексы. Тапай быстрее ⚡️' },
  'lera.words':  { followers: '67.2K',   following: 410, avatarColor: '#F0CE61', bio: 'Слова — моя стихия. Русский язык красив 📚' },
  'tower.dima':  { followers: '512.0K',  following: 23,  avatarColor: '#79BCDD', bio: 'Башни до облаков. Точность важнее всего 🏗️' },
  'yana.wave':   { followers: '89.3K',   following: 220, avatarColor: '#6BD9C0', bio: '2048 нон-стоп. Слияния и стратегия 🌊' },
  'circle.viral':{ followers: '1.2M',    following: 11,  avatarColor: '#F5A04A', bio: 'Тот самый идеальный круг 🎯' },
  'react.fast':  { followers: '203.4K',  following: 67,  avatarColor: '#86EFAC', bio: 'Реакция как у профи. 187мс — мой рекорд ⚡️' },
  'stroop.lab':  { followers: '74.8K',   following: 158, avatarColor: '#FFB454', bio: 'Эффект Струпа и игры с восприятием 🧠' },
  'snake.og':    { followers: '988.0K',  following: 5,   avatarColor: '#5EEAD4', bio: 'Старая школа. Змейка с 1976 года 🐍' },
  'sort.daria':  { followers: '470.5K',  following: 312, avatarColor: '#7DD3FC', bio: 'Чилл-игры. Сортируй жидкость — сортируй мысли 💧' },
  'beat.kira':   { followers: '256.7K',  following: 48,  avatarColor: '#F472B6', bio: 'Ритм и BPM. 96 ударов в минуту — мой темп 🎵' },
  'memo.lia':    { followers: '110.0K',  following: 198, avatarColor: '#FCD34D', bio: 'Память — главная мышца. Пары находим за 10 ходов 🦊' },
  'pulse.gleb':  { followers: '52.3K',   following: 91,  avatarColor: '#5EEAD4', bio: 'Нервы стальные. Пульс ровный 🫀' },
  'type.zhenya': { followers: '184.0K',  following: 76,  avatarColor: '#93C5FD', bio: 'ЙЦУКЕН-ниндзя. Слепая печать 350 знм ⌨️' },
  'graph.misha': { followers: '88.6K',   following: 145, avatarColor: '#C4B5FD', bio: 'Гамильтоновы пути и графы 🔗' },
  'loop.team':   { followers: '2.4M',    following: 0,   avatarColor: '#9B7EFF', bio: 'Команда Луп. Делаем самые залипательные мини-игры 💜' },
  'tile.viktor': { followers: '94.0K',   following: 67,  avatarColor: '#D8B4FE', bio: 'Пятнашки и логика. Раскладываю всё по полочкам 🧩' },
  'word.smith':  { followers: '618.0K',  following: 92,  avatarColor: '#86EFAC', bio: 'Угадай слово за 6 попыток. Я угадываю за 3 ✍️' },
  'pixel.art':   { followers: '156.0K',  following: 134, avatarColor: '#F9A8D4', bio: 'Пиксель за пикселем. Картинки из чисел 🎨' },
  'block.master':{ followers: '1.7M',    following: 14,  avatarColor: '#7DD3FC', bio: 'Тетрис с 1984 года. Чищу 4 линии за раз 🧱' },
};

export function CreatorProfileScreen({ creator, onBack, onPlay, bottomInset }: Props) {
  const insets = useSafeAreaInsets();
  const SAFE_TOP = Math.max(insets.top, 14) + 8;
  const { user, follows, toggleFollow } = useUser();
  const [realProfile, setRealProfile] = useState<{ avatarColor: string; bio: string | null; displayName: string | null } | null>(null);

  // Look up a real profile row by handle — overrides seeded metadata when found.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Validate handle before calling RPC to avoid sending arbitrary input.
      if (typeof creator.handle !== 'string' || !/^[a-z0-9_.]{1,30}$/.test(creator.handle)) return;
      const { data } = await supabase
        .rpc('find_profile_by_handle', { p_handle: creator.handle })
        .single();
      if (cancelled) return;
      if (data) {
        const row = data as any;
        setRealProfile({
          avatarColor: row.avatar_color,
          bio: row.bio,
          displayName: row.display_name,
        });
      }
    })();
    return () => { cancelled = true; };
  }, [creator.handle]);

  const seed = CREATOR_META[creator.handle];
  const meta = {
    followers: seed?.followers ?? '—',
    following: seed?.following ?? 0,
    avatarColor: realProfile?.avatarColor ?? seed?.avatarColor ?? '#C99FE6',
    bio: realProfile?.bio ?? seed?.bio ?? 'Игрок Лупа.',
  };
  const displayName = realProfile?.displayName ?? creator.displayName;
  const isFollowing = !!follows[creator.handle];
  const isMe = !!user && creator.handle === user.handle;

  const games = GAMES.filter((g) => g.creator.handle === creator.handle);
  const totalLikes = games.reduce((s, g) => {
    const n = parseFloat(g.likes.replace(/[KkМm.,]/g, (m) => (m === ',' ? '.' : m)));
    return s + (g.likes.includes('M') || g.likes.includes('М') ? n * 1000 : n);
  }, 0);

  const handleFollow = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    toggleFollow(creator.handle);
  };

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={['#1F1B36', '#0E0D24']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />

      {/* Top header: back + handle + share */}
      <View
        style={{
          paddingTop: SAFE_TOP,
          paddingHorizontal: 14,
          paddingBottom: 8,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Pressable
          onPress={onBack}
          hitSlop={10}
          style={{
            width: 36, height: 36, borderRadius: 18,
            backgroundColor: 'rgba(0,0,0,0.35)',
            borderWidth: 1, borderColor: colors.glassBorder,
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 18, color: '#fff' }}>←</Text>
        </Pressable>
        <Text style={{ fontSize: 14, fontFamily: fontFamily.bold, color: '#fff' }}>
          @{creator.handle}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 90 + bottomInset }}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar block */}
        <View style={{ alignItems: 'center', gap: 6, marginTop: 8, marginBottom: 14 }}>
          <View
            style={{
              width: 96, height: 96, borderRadius: 48,
              alignItems: 'center', justifyContent: 'center',
              borderWidth: 3, borderColor: 'rgba(255,255,255,0.18)',
              backgroundColor: meta.avatarColor,
            }}
          >
            <Text style={{ fontSize: 38, fontFamily: fontFamily.bold, color: '#000' }}>
              {creator.handle[0].toUpperCase()}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 }}>
            <Text style={{ fontSize: 19, fontFamily: fontFamily.bold, color: '#fff' }}>
              {displayName}
            </Text>
            {creator.verified ? (
              <Text style={{ fontSize: 13, color: '#5DD9B0' }}>✓</Text>
            ) : null}
          </View>
          <Text style={{ fontSize: 12, fontFamily: fontFamily.semibold, color: colors.textDim }}>
            @{creator.handle}
          </Text>
        </View>

        {/* Stats */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 28, marginBottom: 14 }}>
          <Stat n={meta.following.toString()} l="Подписки" />
          <Stat n={meta.followers} l="Подписчики" />
          <Stat n={`${Math.round(totalLikes)}K`} l="Лайки" />
        </View>

        {/* Follow / Message buttons (hidden on own profile) */}
        {!isMe ? (
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 18, paddingHorizontal: 16 }}>
            <Pressable
              onPress={handleFollow}
              style={{
                flex: 1,
                paddingVertical: 11,
                borderRadius: radius.pill,
                backgroundColor: isFollowing ? 'transparent' : '#fff',
                borderWidth: 1,
                borderColor: isFollowing ? 'rgba(255,255,255,0.25)' : '#fff',
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 13, fontFamily: fontFamily.bold, color: isFollowing ? '#fff' : '#000' }}>
                {isFollowing ? 'Вы подписаны' : 'Подписаться'}
              </Text>
            </Pressable>
            <Pressable
              style={{
                flex: 1,
                paddingVertical: 11,
                borderRadius: radius.pill,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.25)',
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 13, fontFamily: fontFamily.bold, color: '#fff' }}>
                Сообщение
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={{ marginBottom: 18, paddingHorizontal: 16 }}>
            <View
              style={{
                paddingVertical: 11,
                borderRadius: radius.pill,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.25)',
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 13, fontFamily: fontFamily.bold, color: '#fff' }}>
                Это ты ✨
              </Text>
            </View>
          </View>
        )}

        {/* Bio */}
        <Text style={{ fontSize: 13, fontFamily: fontFamily.medium, color: '#fff', textAlign: 'center', lineHeight: 18, paddingHorizontal: 18, marginBottom: 18 }}>
          {meta.bio}
        </Text>

        {/* Section header */}
        <Text style={{ fontSize: 14, fontFamily: fontFamily.bold, color: '#fff', marginBottom: 10 }}>
          Игры автора · {games.length}
        </Text>

        {/* Games grid */}
        {games.length === 0 ? (
          <Text style={{ textAlign: 'center', color: colors.textDim, fontFamily: fontFamily.medium, fontSize: 13, marginTop: 16 }}>
            Игр пока нет.
          </Text>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {games.map((g) => (
              <Pressable key={g.id} onPress={() => onPlay(g)} style={{ width: '48.5%' }}>
                <View
                  style={{
                    aspectRatio: 0.75,
                    borderRadius: radius.lg,
                    overflow: 'hidden',
                  }}
                >
                  <LinearGradient
                    colors={[g.gradient[0], g.gradient[1]]}
                    style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                  />
                  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <GamePreview game={g} />
                  </View>
                  <View style={{ position: 'absolute', top: 8, left: 8 }}>
                    <Text style={{ fontSize: 10, fontFamily: fontFamily.bold, color: '#fff', backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 99 }}>
                      ▶ {g.plays}
                    </Text>
                  </View>
                  <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 10, backgroundColor: 'rgba(0,0,0,0.45)' }}>
                    <Text style={{ fontSize: 12, fontFamily: fontFamily.bold, color: '#fff' }} numberOfLines={1}>
                      {g.name}
                    </Text>
                    <Text style={{ fontSize: 10, fontFamily: fontFamily.semibold, color: colors.textMuted }}>
                      ♥ {g.likes}
                    </Text>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function Stat({ n, l }: { n: string; l: string }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ fontSize: 17, fontFamily: fontFamily.bold, color: '#fff' }}>{n}</Text>
      <Text style={{ fontSize: 10, fontFamily: fontFamily.semibold, color: colors.textDim, marginTop: 2 }}>{l}</Text>
    </View>
  );
}
