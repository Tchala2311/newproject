import React, { useState } from 'react';
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
import { supabase } from '../lib/supabase';

type Step = 'email' | 'code';

// Maps raw Supabase error strings to user-friendly messages so we never
// expose internal error details or DB hints to the client.
function authErrorMessage(raw: string): string {
  const r = raw.toLowerCase();
  if (r.includes('rate limit') || r.includes('too many')) return 'Слишком много попыток. Подожди немного.';
  if (r.includes('invalid') && r.includes('token')) return 'Неверный или просроченный код. Запроси новый.';
  if (r.includes('expired')) return 'Код устарел. Запроси новый.';
  if (r.includes('email')) return 'Проверь email и попробуй снова.';
  if (r.includes('network') || r.includes('fetch')) return 'Нет соединения. Проверь интернет.';
  return 'Что-то пошло не так. Попробуй ещё раз.';
}

export function AuthScreen() {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendCode = async () => {
    if (!email.includes('@')) {
      setError('Введи корректный email');
      return;
    }
    setBusy(true);
    setError(null);
    const { error: e } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: true },
    });
    setBusy(false);
    if (e) {
      if (__DEV__) console.warn('OTP send failed', e.status);
      setError(authErrorMessage(e.message));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setStep('code');
  };

  const verifyCode = async () => {
    const trimmed = code.replace(/\s+/g, '');
    if (trimmed.length < 6 || trimmed.length > 10) {
      setError('Код должен быть 6–10 цифр');
      return;
    }
    setBusy(true);
    setError(null);
    const { error: e } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: trimmed,
      type: 'email',
    });
    setBusy(false);
    if (e) {
      if (__DEV__) console.warn('OTP verify failed', e.status);
      setError(authErrorMessage(e.message));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    // App.tsx Gate will switch screens once the auth state changes.
  };

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
            paddingTop: insets.top + 40,
            paddingBottom: insets.bottom + 40,
            paddingHorizontal: 28,
            justifyContent: 'center',
          }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ alignItems: 'center', gap: 14, marginBottom: 32 }}>
            <Text style={{ fontSize: 72 }}>🎮</Text>
            <Text style={{ fontSize: 30, fontFamily: fontFamily.bold, color: '#fff', letterSpacing: -0.6 }}>
              FLIK
            </Text>
            <Text style={{ fontSize: 13, fontFamily: fontFamily.medium, color: colors.textMuted, textAlign: 'center' }}>
              {step === 'email' ? 'Войди по email — пришлём 6-значный код' : `Код отправлен на ${email}`}
            </Text>
          </View>

          {step === 'email' ? (
            <View style={{ gap: 12 }}>
              <View
                style={{
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  borderWidth: 1,
                  borderColor: error ? '#FF4D4D' : 'rgba(255,255,255,0.13)',
                  borderRadius: radius.lg,
                  paddingHorizontal: 14,
                  paddingVertical: 14,
                }}
              >
                <TextInput
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  keyboardType="email-address"
                  inputMode="email"
                  autoFocus
                  value={email}
                  onChangeText={(t) => { setEmail(t); setError(null); }}
                  placeholder="ты@example.com"
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  style={{ fontSize: 16, color: '#fff', fontFamily: fontFamily.semibold, padding: 0 }}
                  returnKeyType="send"
                  onSubmitEditing={sendCode}
                />
              </View>
              {error ? (
                <Text style={{ fontSize: 12, fontFamily: fontFamily.semibold, color: '#FF4D4D' }}>{error}</Text>
              ) : null}
              <Pressable
                onPress={busy ? undefined : sendCode}
                style={{
                  backgroundColor: busy ? 'rgba(255,255,255,0.18)' : '#fff',
                  borderRadius: radius.pill,
                  paddingVertical: 16,
                  alignItems: 'center',
                  marginTop: 6,
                }}
              >
                <Text style={{ fontSize: 15, fontFamily: fontFamily.bold, color: busy ? 'rgba(255,255,255,0.5)' : '#000' }}>
                  {busy ? 'Отправляем…' : 'Получить код'}
                </Text>
              </Pressable>
              <Text style={{ fontSize: 11, fontFamily: fontFamily.medium, color: colors.textFaint, textAlign: 'center', marginTop: 8 }}>
                Регистрируясь, ты соглашаешься с правилами FLIK.
              </Text>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              <View
                style={{
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  borderWidth: 1,
                  borderColor: error ? '#FF4D4D' : 'rgba(255,255,255,0.13)',
                  borderRadius: radius.lg,
                  paddingHorizontal: 14,
                  paddingVertical: 14,
                }}
              >
                <TextInput
                  autoFocus
                  keyboardType="number-pad"
                  maxLength={10}
                  value={code}
                  onChangeText={(t) => { setCode(t.replace(/\D/g, '')); setError(null); }}
                  placeholder="123 456"
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  style={{
                    fontSize: 26,
                    color: '#fff',
                    fontFamily: fontFamily.bold,
                    padding: 0,
                    textAlign: 'center',
                    letterSpacing: 8,
                  }}
                  returnKeyType="done"
                  onSubmitEditing={verifyCode}
                />
              </View>
              {error ? (
                <Text style={{ fontSize: 12, fontFamily: fontFamily.semibold, color: '#FF4D4D' }}>{error}</Text>
              ) : null}
              <Pressable
                onPress={busy ? undefined : verifyCode}
                style={{
                  backgroundColor: busy ? 'rgba(255,255,255,0.18)' : '#fff',
                  borderRadius: radius.pill,
                  paddingVertical: 16,
                  alignItems: 'center',
                  marginTop: 6,
                }}
              >
                <Text style={{ fontSize: 15, fontFamily: fontFamily.bold, color: busy ? 'rgba(255,255,255,0.5)' : '#000' }}>
                  {busy ? 'Проверяем…' : 'Войти'}
                </Text>
              </Pressable>
              <Pressable onPress={() => { setStep('email'); setCode(''); setError(null); }} style={{ alignItems: 'center', marginTop: 6 }}>
                <Text style={{ fontSize: 12, fontFamily: fontFamily.semibold, color: colors.textMuted }}>
                  ← Изменить email
                </Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
