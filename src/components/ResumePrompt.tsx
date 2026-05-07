import React, { useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Game } from '../data/games';
import { fontFamily, radius, colors } from '../theme';

type Props = {
  game: Game | null;
  resumeLevel: number;
  bestLevel: number;
  bestScore: number;
  onContinue: () => void;
  onRestart: () => void;
};

export function ResumePrompt({ game, resumeLevel, bestLevel, bestScore, onContinue, onRestart }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (!game) return;
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, damping: 14 }),
    ]).start();
  }, [game?.slug, opacity, scale]);

  if (!game) return null;

  const tap = (fn: () => void) => () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    fn();
  };

  return (
    <Modal visible transparent animationType="fade">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Animated.View
          style={{
            backgroundColor: '#13122A',
            borderRadius: radius.xl,
            padding: 22,
            width: '100%',
            maxWidth: 340,
            opacity,
            transform: [{ scale }],
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.08)',
          }}
        >
          <Text style={{ fontSize: 11, fontFamily: fontFamily.bold, color: game.accent, letterSpacing: 1.4, marginBottom: 4 }}>
            СОХРАНЁННЫЙ ПРОГРЕСС
          </Text>
          <Text style={{ fontSize: 22, fontFamily: fontFamily.bold, color: '#fff', letterSpacing: -0.4 }}>
            {game.name}
          </Text>
          <View style={{ flexDirection: 'row', gap: 18, marginTop: 14 }}>
            <Stat label="Уровень" value={`${resumeLevel}`} accent={game.accent} />
            <Stat label="Рекорд" value={`Ур. ${bestLevel}`} />
            <Stat label="Лучший счёт" value={`${bestScore}`} />
          </View>
          <View style={{ gap: 8, marginTop: 18 }}>
            <Pressable onPress={tap(onContinue)} style={{ backgroundColor: game.accent, borderRadius: radius.pill, paddingVertical: 14, alignItems: 'center' }}>
              <Text style={{ fontSize: 14, fontFamily: fontFamily.bold, color: '#000' }}>Продолжить с уровня {resumeLevel}</Text>
            </Pressable>
            <Pressable onPress={tap(onRestart)} style={{ borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', borderRadius: radius.pill, paddingVertical: 13, alignItems: 'center' }}>
              <Text style={{ fontSize: 13, fontFamily: fontFamily.bold, color: colors.text }}>Начать сначала</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <View>
      <Text style={{ fontSize: 9, fontFamily: fontFamily.bold, color: 'rgba(255,255,255,0.4)', letterSpacing: 1 }}>{label.toUpperCase()}</Text>
      <Text style={{ fontSize: 18, fontFamily: fontFamily.bold, color: accent ?? '#fff', marginTop: 2 }}>{value}</Text>
    </View>
  );
}
