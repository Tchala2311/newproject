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
import { Game } from '../data/games';
import { colors, fontFamily, radius } from '../theme';
import { useUser } from '../store/useUser';

type Props = {
  visible: boolean;
  onClose: () => void;
  game: Game | null;
};

type SeedComment = {
  id: string;
  handle: string;
  avatar: string;
  text: string;
  ago: string;
  likes: number;
  liked?: boolean;
};

// Seeded comments — visible on every game so the feature feels alive.
const SEED_BY_SLUG: Record<string, SeedComment[]> = {
  'color-flood': [
    { id: '1', handle: 'art.kamilla', avatar: '#F0CE61', text: 'Залипла на час 😭 спасибо за ваше существование', ago: '2ч', likes: 2841 },
    { id: '2', handle: 'pink.dreamz', avatar: '#E76F8E', text: 'на 12 уровне реально мозг ломается', ago: '5ч', likes: 814 },
    { id: '3', handle: 'tema_t', avatar: '#79BCDD', text: 'кто прошёл за 30 ходов? 🙋‍♂️', ago: '8ч', likes: 412 },
  ],
  'tap-rush': [
    { id: '1', handle: 'speed.ksu', avatar: '#5DD9B0', text: '83 шара за 30 сек, попробуй побей', ago: '1ч', likes: 5217 },
    { id: '2', handle: 'reflex.den', avatar: '#79BCDD', text: 'палец отвалился 🥹', ago: '3ч', likes: 1820 },
    { id: '3', handle: 'just.olya', avatar: '#F0CE61', text: 'играю в метро каждое утро вместо новостей', ago: '6ч', likes: 943 },
  ],
  'word-blast': [
    { id: '1', handle: 'lit.dasha', avatar: '#F0CE61', text: 'словарь раскрыла на новые слова, спасибо!', ago: '4ч', likes: 1124 },
    { id: '2', handle: 'gramota', avatar: '#C99FE6', text: 'подскажите, где взять слова на 7 букв?', ago: '7ч', likes: 287 },
  ],
  'stack-it': [
    { id: '1', handle: 'tower.king', avatar: '#79BCDD', text: '47 этажей, рекорд держится 3 дня уже 👑', ago: '2ч', likes: 6432 },
    { id: '2', handle: 'maks.b', avatar: '#5DD9B0', text: 'самая залипательная штука в этом году', ago: '5ч', likes: 2104 },
    { id: '3', handle: 'nika.flood', avatar: '#C99FE6', text: 'на 30+ это уже спорт', ago: '9ч', likes: 887 },
  ],
  'merge-wave': [
    { id: '1', handle: 'wave.x', avatar: '#6BD9C0', text: 'дошёл до 256 и заплакал ☺️', ago: '3ч', likes: 1872 },
    { id: '2', handle: 'gleb_2048', avatar: '#79BCDD', text: 'тактика в комментах ниже 👇', ago: '6ч', likes: 612 },
  ],
};

export function CommentsSheet({ visible, onClose, game }: Props) {
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const slide = useRef(new Animated.Value(0)).current;
  const [draft, setDraft] = useState('');
  const [extra, setExtra] = useState<SeedComment[]>([]);

  useEffect(() => {
    if (visible) setExtra([]);
    Animated.timing(slide, {
      toValue: visible ? 1 : 0,
      duration: 240,
      useNativeDriver: true,
    }).start();
  }, [visible, slide]);

  const seed = useMemo(() => (game ? SEED_BY_SLUG[game.slug] ?? [] : []), [game]);
  const all = useMemo(() => [...extra, ...seed], [extra, seed]);

  const submit = () => {
    if (!draft.trim() || !user) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setExtra((prev) => [
      {
        id: `me-${Date.now()}`,
        handle: user.handle,
        avatar: user.avatarColor,
        text: draft.trim(),
        ago: 'сейчас',
        likes: 0,
      },
      ...prev,
    ]);
    setDraft('');
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
              {/* Handle */}
              <View style={{ alignItems: 'center', paddingTop: 8 }}>
                <View style={{ width: 38, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.25)' }} />
              </View>

              {/* Title */}
              <View style={{ paddingTop: 14, paddingBottom: 10, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' }}>
                <Text style={{ fontSize: 14, fontFamily: fontFamily.bold, color: '#fff' }}>
                  {all.length.toLocaleString('ru-RU')} комментариев
                </Text>
              </View>

              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={20}
                style={{ flex: 1 }}
              >
                <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
                  {all.map((c) => (
                    <CommentRow key={c.id} c={c} />
                  ))}
                  {all.length === 0 ? (
                    <Text style={{ textAlign: 'center', color: colors.textDim, fontSize: 13, fontFamily: fontFamily.medium, marginTop: 40 }}>
                      Будь первым 🎤
                    </Text>
                  ) : null}
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
                      placeholder={`Ответить @${user?.handle ?? 'guest'}…`}
                      placeholderTextColor="rgba(255,255,255,0.4)"
                      style={{ fontSize: 13, color: '#fff', fontFamily: fontFamily.medium, padding: 0 }}
                      returnKeyType="send"
                      onSubmitEditing={submit}
                    />
                  </View>
                  <Pressable
                    onPress={submit}
                    disabled={!draft.trim()}
                    style={{ opacity: draft.trim() ? 1 : 0.4 }}
                  >
                    <Text style={{ fontSize: 14, fontFamily: fontFamily.bold, color: '#5DD9B0' }}>Опубл.</Text>
                  </Pressable>
                </View>
              </KeyboardAvoidingView>
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

function CommentRow({ c }: { c: SeedComment }) {
  const [liked, setLiked] = useState(c.liked ?? false);
  return (
    <View style={{ flexDirection: 'row', gap: 10 }}>
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: c.avatar,
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: 2,
        }}
      >
        <Text style={{ fontSize: 13, fontFamily: fontFamily.bold, color: '#000' }}>
          {c.handle[0].toUpperCase()}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 11, fontFamily: fontFamily.semibold, color: colors.textMuted }}>
          @{c.handle} · {c.ago}
        </Text>
        <Text style={{ fontSize: 13, fontFamily: fontFamily.medium, color: '#fff', marginTop: 2, lineHeight: 18 }}>
          {c.text}
        </Text>
        <View style={{ flexDirection: 'row', gap: 14, marginTop: 6 }}>
          <Text style={{ fontSize: 11, fontFamily: fontFamily.semibold, color: colors.textDim }}>Ответить</Text>
        </View>
      </View>
      <Pressable onPress={() => setLiked((p) => !p)} style={{ alignItems: 'center' }}>
        <Text style={{ fontSize: 14, color: liked ? '#FF4D7A' : colors.textDim }}>{liked ? '♥' : '♡'}</Text>
        <Text style={{ fontSize: 10, fontFamily: fontFamily.semibold, color: colors.textDim, marginTop: 2 }}>
          {(c.likes + (liked && !c.liked ? 1 : 0)).toLocaleString('ru-RU')}
        </Text>
      </Pressable>
    </View>
  );
}
