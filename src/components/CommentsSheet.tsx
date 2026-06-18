import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Game, Creator } from '../data/games';
import { colors, fontFamily, radius } from '../theme';
import { useUser } from '../store/useUser';
import { supabase } from '../lib/supabase';

type Props = {
  visible: boolean;
  onClose: () => void;
  game: Game | null;
  onOpenCreator?: (creator: Creator) => void;
};

type CommentRow = {
  id: string;
  body: string;
  created_at: string;
  user_id: string;
  profile: {
    handle: string;
    display_name: string | null;
    avatar_color: string;
  } | null;
};

type CommentLikeRow = { comment_id: string };

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return 'сейчас';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}мин`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}ч`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}д`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w}нед`;
  const months = Math.floor(d / 30);
  return `${months}мес`;
}

export function CommentsSheet({ visible, onClose, game, onOpenCreator }: Props) {
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const slide = useRef(new Animated.Value(0)).current;

  const [draft, setDraft] = useState('');
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [likedSet, setLikedSet] = useState<Record<string, boolean>>({});
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // Distinguish a genuine "no comments yet" empty state from a fetch that
  // actually failed (network/session), so the latter shows a retry instead of
  // silently looking like an empty thread.
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // Slide animation
  useEffect(() => {
    Animated.timing(slide, {
      toValue: visible ? 1 : 0,
      duration: 240,
      useNativeDriver: true,
    }).start();
  }, [visible, slide]);

  // Fetch comments + my likes when sheet opens
  useEffect(() => {
    if (!visible || !game) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(false);
    (async () => {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          id, body, created_at, user_id,
          profile:profiles ( handle, display_name, avatar_color )
        `)
        .eq('game_id', game.id)
        .order('created_at', { ascending: false })
        .limit(200);
      if (cancelled) return;
      if (error) {
        if (__DEV__) console.warn('comments fetch failed');
        setComments([]);
        setLoadError(true);
        setLoading(false);
        return;
      } else {
        // Supabase returns profile as array OR object depending on relation type;
        // normalize to single object
        const rows: CommentRow[] = (data ?? []).map((r: any) => ({
          id: r.id,
          body: r.body,
          created_at: r.created_at,
          user_id: r.user_id,
          profile: Array.isArray(r.profile) ? (r.profile[0] ?? null) : r.profile,
        }));
        setComments(rows);
        // Fetch like counts
        if (rows.length) {
          const ids = rows.map((r) => r.id);
          const [{ data: counts }, { data: mine }] = await Promise.all([
            supabase.rpc('comment_like_counts', { ids }).then(
              (r) => (r.error ? { data: null } : r),
              () => ({ data: null })
            ),
            user
              ? supabase
                  .from('comment_likes')
                  .select('comment_id')
                  .eq('user_id', user.id)
                  .in('comment_id', ids)
              : Promise.resolve({ data: [] as CommentLikeRow[] }),
          ]);
          if (cancelled) return;
          // Fallback if RPC not present: count manually
          if (!counts) {
            const { data: rawCounts } = await supabase
              .from('comment_likes')
              .select('comment_id')
              .in('comment_id', ids);
            if (cancelled) return;
            const cm: Record<string, number> = {};
            (rawCounts ?? []).forEach((r: any) => {
              cm[r.comment_id] = (cm[r.comment_id] ?? 0) + 1;
            });
            setLikeCounts(cm);
          } else {
            const cm: Record<string, number> = {};
            (counts as any[]).forEach((r) => { cm[r.comment_id] = r.n; });
            setLikeCounts(cm);
          }
          const lm: Record<string, boolean> = {};
          (mine as CommentLikeRow[] | null ?? []).forEach((r) => { lm[r.comment_id] = true; });
          setLikedSet(lm);
        } else {
          setLikeCounts({});
          setLikedSet({});
        }
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [visible, game?.id, user?.id, reloadKey]);

  const submit = async () => {
    const body = draft.trim();
    if (!body || !user || !game || submitting) return;
    if (body.length > 500) return; // enforced by TextInput maxLength but guard server-side too
    setSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const { data, error } = await supabase
      .from('comments')
      .insert({ game_id: game.id, user_id: user.id, body })
      .select(`
        id, body, created_at, user_id,
        profile:profiles ( handle, display_name, avatar_color )
      `)
      .single();
    setSubmitting(false);
    if (error) {
      if (__DEV__) console.warn('comment insert failed');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      return;
    }
    const r: any = data;
    const row: CommentRow = {
      id: r.id,
      body: r.body,
      created_at: r.created_at,
      user_id: r.user_id,
      profile: Array.isArray(r.profile) ? (r.profile[0] ?? null) : r.profile,
    };
    setComments((prev) => [row, ...prev]);
    setDraft('');
  };

  const toggleLike = async (commentId: string) => {
    if (!user) return;
    Haptics.selectionAsync().catch(() => {});
    const isLiked = !!likedSet[commentId];
    // Optimistic update
    setLikedSet((prev) => ({ ...prev, [commentId]: !isLiked }));
    setLikeCounts((prev) => ({ ...prev, [commentId]: Math.max(0, (prev[commentId] ?? 0) + (isLiked ? -1 : 1)) }));
    const op = isLiked
      ? supabase.from('comment_likes').delete().match({ comment_id: commentId, user_id: user.id })
      : supabase.from('comment_likes').upsert({ comment_id: commentId, user_id: user.id });
    const { error } = await op;
    if (error) {
      // Revert on failure
      if (__DEV__) console.warn('comment like toggle failed');
      setLikedSet((prev) => ({ ...prev, [commentId]: isLiked }));
      setLikeCounts((prev) => ({ ...prev, [commentId]: Math.max(0, (prev[commentId] ?? 0) + (isLiked ? 1 : -1)) }));
    }
  };

  const handleHandleTap = (handle: string, displayName: string | null) => {
    if (!onOpenCreator) return;
    onClose();
    setTimeout(() => {
      onOpenCreator({
        handle,
        displayName: displayName ?? handle,
      });
    }, 180);
  };

  const screenH = Dimensions.get('window').height;
  const sheetH = screenH * 0.78;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' }}
      >
        <Animated.View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: sheetH,
            transform: [{
              translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [sheetH, 0] }),
            }],
          }}
        >
          <Pressable onPress={(e) => e.stopPropagation()} style={{ flex: 1 }}>
            <View
              style={{
                flex: 1,
                backgroundColor: '#0F0E22',
                borderTopLeftRadius: 22,
                borderTopRightRadius: 22,
                overflow: 'hidden',
              }}
            >
              <View style={{ alignItems: 'center', paddingTop: 8 }}>
                <View style={{ width: 38, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.25)' }} />
              </View>

              <View
                style={{
                  paddingTop: 14,
                  paddingBottom: 10,
                  alignItems: 'center',
                  borderBottomWidth: 1,
                  borderBottomColor: 'rgba(255,255,255,0.06)',
                }}
              >
                <Text style={{ fontSize: 14, fontFamily: fontFamily.bold, color: '#fff' }}>
                  {comments.length.toLocaleString('ru-RU')} комментариев
                </Text>
              </View>

              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={20}
                style={{ flex: 1 }}
              >
                <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
                  {loading ? (
                    <Text style={{ textAlign: 'center', color: colors.textDim, fontSize: 13, fontFamily: fontFamily.medium, marginTop: 20 }}>
                      Загружаем…
                    </Text>
                  ) : loadError ? (
                    <View style={{ alignItems: 'center', marginTop: 56, paddingHorizontal: 20 }}>
                      <Text style={{ fontSize: 40, marginBottom: 8 }}>📡</Text>
                      <Text style={{ fontSize: 15, fontFamily: fontFamily.bold, color: '#fff', marginBottom: 6 }}>
                        Не удалось загрузить
                      </Text>
                      <Text style={{ fontSize: 12, fontFamily: fontFamily.medium, color: colors.textDim, textAlign: 'center', lineHeight: 18, marginBottom: 14 }}>
                        Проверь соединение и попробуй снова
                      </Text>
                      <Pressable
                        onPress={() => setReloadKey((k) => k + 1)}
                        style={{ paddingHorizontal: 20, paddingVertical: 10, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.12)' }}
                      >
                        <Text style={{ fontSize: 13, fontFamily: fontFamily.bold, color: '#fff' }}>Повторить ↺</Text>
                      </Pressable>
                    </View>
                  ) : comments.length === 0 ? (
                    <View style={{ alignItems: 'center', marginTop: 56, paddingHorizontal: 20 }}>
                      <Text style={{ fontSize: 48, marginBottom: 8 }}>🎤</Text>
                      <Text style={{ fontSize: 16, fontFamily: fontFamily.bold, color: '#fff', marginBottom: 6 }}>
                        Пока тихо
                      </Text>
                      <Text style={{ fontSize: 12, fontFamily: fontFamily.medium, color: colors.textDim, textAlign: 'center', lineHeight: 18 }}>
                        Будь первым, кто оставит комментарий к этой игре
                      </Text>
                    </View>
                  ) : (
                    comments.map((c) => (
                      <CommentRowView
                        key={c.id}
                        c={c}
                        liked={!!likedSet[c.id]}
                        likeCount={likeCounts[c.id] ?? 0}
                        onToggleLike={() => toggleLike(c.id)}
                        onHandleTap={() => c.profile && handleHandleTap(c.profile.handle, c.profile.display_name)}
                        isMine={c.user_id === user?.id}
                      />
                    ))
                  )}
                </ScrollView>

                {/* Composer */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 14,
                    paddingTop: 10,
                    paddingBottom: insets.bottom + 10,
                    gap: 10,
                    borderTopWidth: 1,
                    borderTopColor: 'rgba(255,255,255,0.06)',
                    backgroundColor: '#0F0E22',
                  }}
                >
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: user?.avatarColor ?? '#C99FE6',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 14, fontFamily: fontFamily.bold, color: '#000' }}>
                      {(user?.handle?.[0] ?? '?').toUpperCase()}
                    </Text>
                  </View>
                  {user ? (
                    <>
                      <View
                        style={{
                          flex: 1,
                          backgroundColor: 'rgba(255,255,255,0.06)',
                          borderRadius: radius.pill,
                          paddingHorizontal: 14,
                          paddingVertical: 8,
                        }}
                      >
                        <TextInput
                          value={draft}
                          onChangeText={setDraft}
                          maxLength={500}
                          placeholder={`Написать @${user.handle}…`}
                          placeholderTextColor="rgba(255,255,255,0.4)"
                          style={{ fontSize: 13, color: '#fff', fontFamily: fontFamily.medium, padding: 0 }}
                          returnKeyType="send"
                          onSubmitEditing={submit}
                          editable={!submitting}
                          autoCorrect={false}
                        />
                      </View>
                      <Pressable
                        onPress={submit}
                        disabled={!draft.trim() || submitting}
                        style={{ opacity: draft.trim() && !submitting ? 1 : 0.4 }}
                      >
                        <Text style={{ fontSize: 14, fontFamily: fontFamily.bold, color: '#5DD9B0' }}>
                          {submitting ? '…' : 'Опубл.'}
                        </Text>
                      </Pressable>
                    </>
                  ) : (
                    <Pressable
                      onPress={onClose}
                      style={{
                        flex: 1,
                        backgroundColor: 'rgba(201,159,230,0.12)',
                        borderRadius: radius.pill,
                        paddingHorizontal: 16,
                        paddingVertical: 10,
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ fontSize: 13, fontFamily: fontFamily.bold, color: '#C99FE6' }}>
                        Войди, чтобы оставить комментарий →
                      </Text>
                    </Pressable>
                  )}
                </View>
              </KeyboardAvoidingView>
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

function CommentRowView({
  c,
  liked,
  likeCount,
  onToggleLike,
  onHandleTap,
  isMine,
}: {
  c: CommentRow;
  liked: boolean;
  likeCount: number;
  onToggleLike: () => void;
  onHandleTap: () => void;
  isMine: boolean;
}) {
  const handle = c.profile?.handle ?? 'удалён';
  const avatarColor = c.profile?.avatar_color ?? '#777';
  return (
    <View style={{ flexDirection: 'row', gap: 10 }}>
      <Pressable onPress={onHandleTap} hitSlop={6}>
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: avatarColor,
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 2,
          }}
        >
          <Text style={{ fontSize: 13, fontFamily: fontFamily.bold, color: '#000' }}>
            {handle[0]?.toUpperCase() ?? '?'}
          </Text>
        </View>
      </Pressable>
      <View style={{ flex: 1 }}>
        <Pressable onPress={onHandleTap} hitSlop={4}>
          <Text style={{ fontSize: 11, fontFamily: fontFamily.semibold, color: colors.textMuted }}>
            @{handle} · {relativeTime(c.created_at)}{isMine ? ' · ты' : ''}
          </Text>
        </Pressable>
        <Text style={{ fontSize: 13, fontFamily: fontFamily.medium, color: '#fff', marginTop: 2, lineHeight: 18 }}>
          {c.body}
        </Text>
        <View style={{ flexDirection: 'row', gap: 14, marginTop: 6 }}>
          <Text style={{ fontSize: 11, fontFamily: fontFamily.semibold, color: colors.textDim }}>Ответить</Text>
        </View>
      </View>
      <Pressable onPress={onToggleLike} style={{ alignItems: 'center' }} hitSlop={6}>
        <Text style={{ fontSize: 14, color: liked ? '#FF4D7A' : colors.textDim }}>{liked ? '♥' : '♡'}</Text>
        <Text style={{ fontSize: 10, fontFamily: fontFamily.semibold, color: colors.textDim, marginTop: 2 }}>
          {likeCount.toLocaleString('ru-RU')}
        </Text>
      </Pressable>
    </View>
  );
}
