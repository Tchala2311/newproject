import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { colors, fontFamily, radius } from '../theme';
import { useUser, validateHandle } from '../store/useUser';

type Step = 'welcome' | 'handle' | 'name' | 'avatar' | 'follow';

const SUGGESTED_FOLLOWS = [
  { handle: 'nika.flood', name: 'Ника', verified: true },
  { handle: 'rush.maks', name: 'Макс', verified: true },
  { handle: 'lera.words', name: 'Лера' },
  { handle: 'tower.dima', name: 'Дима', verified: true },
  { handle: 'yana.wave', name: 'Яна' },
  { handle: 'loop.team', name: 'Луп · команда', verified: true },
];

const AVATAR_PALETTE = ['#C99FE6', '#5DD9B0', '#F0CE61', '#79BCDD', '#6BD9C0', '#E76F8E', '#F5A04A', '#9B7EFF'];

export function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { setUser, toggleFollow, follows } = useUser();

  const [step, setStep] = useState<Step>('welcome');
  const [handle, setHandle] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [avatarColor, setAvatarColor] = useState(AVATAR_PALETTE[0]);

  const handleError = useMemo(() => (handle ? validateHandle(handle) : null), [handle]);

  const next = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (step === 'welcome') return setStep('handle');
    if (step === 'handle') return setStep('name');
    if (step === 'name') return setStep('avatar');
    if (step === 'avatar') return setStep('follow');
    if (step === 'follow') {
      setUser({
        handle,
        displayName: displayName || handle,
        avatarColor,
        createdAt: Date.now(),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
  };

  const canAdvance =
    (step === 'welcome') ||
    (step === 'handle' && !handleError && handle.length >= 3) ||
    (step === 'name') ||
    (step === 'avatar') ||
    (step === 'follow');

  const buttonLabel = step === 'welcome'
    ? 'Начать'
    : step === 'follow'
    ? 'Готово!'
    : 'Дальше';

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <LinearGradient
        colors={['#1F1B36', '#08071A']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <LinearGradient
        colors={['rgba(155,89,224,0.45)', 'transparent']}
        start={{ x: 0.2, y: 0.1 }}
        end={{ x: 0.7, y: 0.7 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingTop: insets.top + 24,
            paddingBottom: insets.bottom + 100,
            paddingHorizontal: 24,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <ProgressDots step={step} />
          <View style={{ height: 32 }} />
          {step === 'welcome' && <Welcome />}
          {step === 'handle' && (
            <HandlePicker handle={handle} setHandle={setHandle} error={handleError} />
          )}
          {step === 'name' && <NamePicker name={displayName} setName={setDisplayName} />}
          {step === 'avatar' && (
            <AvatarPicker
              color={avatarColor}
              setColor={setAvatarColor}
              handle={handle}
            />
          )}
          {step === 'follow' && (
            <FollowSuggestions follows={follows} toggle={toggleFollow} />
          )}
        </ScrollView>

        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            paddingHorizontal: 24,
            paddingTop: 12,
            paddingBottom: insets.bottom + 16,
            backgroundColor: 'rgba(8,7,26,0.6)',
            borderTopWidth: 1,
            borderTopColor: 'rgba(255,255,255,0.06)',
          }}
        >
          <Pressable
            onPress={canAdvance ? next : undefined}
            style={{
              backgroundColor: canAdvance ? '#fff' : 'rgba(255,255,255,0.18)',
              borderRadius: radius.pill,
              paddingVertical: 16,
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 15, fontFamily: fontFamily.bold, color: canAdvance ? '#000' : 'rgba(255,255,255,0.4)' }}>
              {buttonLabel}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const STEPS: Step[] = ['welcome', 'handle', 'name', 'avatar', 'follow'];

function ProgressDots({ step }: { step: Step }) {
  const idx = STEPS.indexOf(step);
  return (
    <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center' }}>
      {STEPS.map((s, i) => (
        <View
          key={s}
          style={{
            width: i <= idx ? 24 : 8,
            height: 4,
            borderRadius: 2,
            backgroundColor: i <= idx ? '#fff' : 'rgba(255,255,255,0.2)',
          }}
        />
      ))}
    </View>
  );
}

function Welcome() {
  return (
    <View style={{ alignItems: 'center', gap: 18 }}>
      <Text style={{ fontSize: 84 }}>🎮</Text>
      <Text style={{ fontSize: 34, fontFamily: fontFamily.bold, color: '#fff', textAlign: 'center', letterSpacing: -0.8 }}>
        Добро пожаловать в Луп
      </Text>
      <Text style={{ fontSize: 15, fontFamily: fontFamily.medium, color: colors.textMuted, textAlign: 'center', lineHeight: 22 }}>
        Залипай на быстрых играх, лайкай, делись с друзьями.{'\n'}Свайпай вверх — следующая игра.
      </Text>
      <View style={{ marginTop: 12, gap: 10 }}>
        <Bullet text="Лента из мини-игр в стиле TikTok" />
        <Bullet text="Лофи во время игры" />
        <Bullet text="Сохраняй любимые игры в профиле" />
      </View>
    </View>
  );
}

function Bullet({ text }: { text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#C99FE6' }} />
      <Text style={{ fontSize: 14, fontFamily: fontFamily.medium, color: '#fff' }}>{text}</Text>
    </View>
  );
}

function HandlePicker({
  handle,
  setHandle,
  error,
}: {
  handle: string;
  setHandle: (s: string) => void;
  error: string | null;
}) {
  return (
    <View style={{ gap: 18 }}>
      <View>
        <Text style={{ fontSize: 26, fontFamily: fontFamily.bold, color: '#fff', letterSpacing: -0.5 }}>
          Выбери имя пользователя
        </Text>
        <Text style={{ fontSize: 13, fontFamily: fontFamily.medium, color: colors.textMuted, marginTop: 6 }}>
          Это твой @тег. Его увидят другие в комментариях и подписках.
        </Text>
      </View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: 'rgba(255,255,255,0.08)',
          borderWidth: 1,
          borderColor: error ? '#FF4D4D' : 'rgba(255,255,255,0.13)',
          borderRadius: radius.lg,
          paddingHorizontal: 14,
          paddingVertical: 14,
          gap: 4,
        }}
      >
        <Text style={{ fontSize: 18, fontFamily: fontFamily.bold, color: 'rgba(255,255,255,0.55)' }}>@</Text>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
          maxLength={20}
          value={handle}
          onChangeText={(t) => setHandle(t.toLowerCase().replace(/[^a-z0-9_.]/g, ''))}
          placeholder="username"
          placeholderTextColor="rgba(255,255,255,0.35)"
          style={{
            flex: 1,
            fontSize: 18,
            color: '#fff',
            fontFamily: fontFamily.bold,
            padding: 0,
          }}
        />
      </View>
      {error ? (
        <Text style={{ fontSize: 12, fontFamily: fontFamily.semibold, color: '#FF4D4D' }}>{error}</Text>
      ) : (
        <Text style={{ fontSize: 12, fontFamily: fontFamily.medium, color: colors.textFaint }}>
          3–20 символов. Латиница, цифры, _ и .
        </Text>
      )}
    </View>
  );
}

function NamePicker({ name, setName }: { name: string; setName: (s: string) => void }) {
  return (
    <View style={{ gap: 18 }}>
      <View>
        <Text style={{ fontSize: 26, fontFamily: fontFamily.bold, color: '#fff', letterSpacing: -0.5 }}>
          Как тебя звать?
        </Text>
        <Text style={{ fontSize: 13, fontFamily: fontFamily.medium, color: colors.textMuted, marginTop: 6 }}>
          Имя, которое будет видно в профиле. Можешь поменять позже.
        </Text>
      </View>
      <View
        style={{
          backgroundColor: 'rgba(255,255,255,0.08)',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.13)',
          borderRadius: radius.lg,
          paddingHorizontal: 14,
          paddingVertical: 14,
        }}
      >
        <TextInput
          autoFocus
          maxLength={30}
          value={name}
          onChangeText={setName}
          placeholder="Например, Маша"
          placeholderTextColor="rgba(255,255,255,0.35)"
          style={{
            fontSize: 18,
            color: '#fff',
            fontFamily: fontFamily.bold,
            padding: 0,
          }}
        />
      </View>
      <Text style={{ fontSize: 12, fontFamily: fontFamily.medium, color: colors.textFaint }}>
        Можно оставить пустым — покажем твой @тег.
      </Text>
    </View>
  );
}

function AvatarPicker({
  color,
  setColor,
  handle,
}: {
  color: string;
  setColor: (c: string) => void;
  handle: string;
}) {
  return (
    <View style={{ gap: 18, alignItems: 'center' }}>
      <View>
        <Text style={{ fontSize: 26, fontFamily: fontFamily.bold, color: '#fff', letterSpacing: -0.5, textAlign: 'center' }}>
          Выбери цвет аватара
        </Text>
        <Text style={{ fontSize: 13, fontFamily: fontFamily.medium, color: colors.textMuted, marginTop: 6, textAlign: 'center' }}>
          Фотку загрузишь, когда подключим аккаунт.
        </Text>
      </View>
      <View
        style={{
          width: 110,
          height: 110,
          borderRadius: 55,
          backgroundColor: color,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 3,
          borderColor: '#fff',
        }}
      >
        <Text style={{ fontSize: 44, fontFamily: fontFamily.bold, color: '#000' }}>
          {(handle?.[0] ?? '?').toUpperCase()}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginTop: 8 }}>
        {AVATAR_PALETTE.map((c) => (
          <Pressable key={c} onPress={() => setColor(c)}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: c,
                borderWidth: c === color ? 3 : 0,
                borderColor: '#fff',
              }}
            />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function FollowSuggestions({
  follows,
  toggle,
}: {
  follows: Record<string, boolean>;
  toggle: (h: string) => void;
}) {
  return (
    <View style={{ gap: 18 }}>
      <View>
        <Text style={{ fontSize: 26, fontFamily: fontFamily.bold, color: '#fff', letterSpacing: -0.5 }}>
          На кого подписаться?
        </Text>
        <Text style={{ fontSize: 13, fontFamily: fontFamily.medium, color: colors.textMuted, marginTop: 6 }}>
          Авторы топ-игр Лупа. Подпишись — их игры появятся в твоей ленте «Подписки».
        </Text>
      </View>
      <View style={{ gap: 10 }}>
        {SUGGESTED_FOLLOWS.map((s) => {
          const active = !!follows[s.handle];
          return (
            <View
              key={s.handle}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                backgroundColor: 'rgba(255,255,255,0.05)',
                borderRadius: radius.lg,
                padding: 12,
              }}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: '#C99FE6',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 18, fontFamily: fontFamily.bold, color: '#000' }}>
                  {s.handle[0].toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={{ fontSize: 14, fontFamily: fontFamily.bold, color: '#fff' }}>{s.name}</Text>
                  {s.verified ? <Text style={{ fontSize: 11, color: '#5DD9B0' }}>✓</Text> : null}
                </View>
                <Text style={{ fontSize: 12, fontFamily: fontFamily.medium, color: colors.textMuted }}>@{s.handle}</Text>
              </View>
              <Pressable
                onPress={() => toggle(s.handle)}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: radius.pill,
                  backgroundColor: active ? 'transparent' : '#fff',
                  borderWidth: 1,
                  borderColor: active ? 'rgba(255,255,255,0.3)' : '#fff',
                }}
              >
                <Text style={{ fontSize: 12, fontFamily: fontFamily.bold, color: active ? '#fff' : '#000' }}>
                  {active ? 'Отписаться' : 'Подписаться'}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}
