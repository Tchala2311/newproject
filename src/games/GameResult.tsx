import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, Share, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Game } from '../data/games';
import { colors, fontFamily, radius } from '../theme';
import { recordScore } from '../store/personalBests';
import { logEvent } from '../store/events';

type Props = {
  won: boolean;
  score?: number;
  accent?: string;
  onRestart: () => void;
  onBack: () => void;
  game?: Game;
};

export function GameResult({ won, score, accent = '#fff', onRestart, onBack, game }: Props) {
  const scale = useRef(new Animated.Value(0.5)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const [bestInfo, setBestInfo] = useState<{ best: number; isNew: boolean; previous: number } | null>(null);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, damping: 10 }),
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [scale, opacity]);

  useEffect(() => {
    if (!game || score === undefined) return;
    let alive = true;
    recordScore(game.id, score).then((r) => {
      if (!alive) return;
      setBestInfo(r);
      if (r.isNew && score > 0) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
    });
    return () => { alive = false; };
  }, [game?.id, score]);

  const handleShare = async () => {
    if (!game) return;
    Haptics.selectionAsync().catch(() => {});
    try {
      await Share.share({
        message: won
          ? `Я набрал ${score ?? 0} очков в «${game.name}» в Луп 🎮 Зацени, попробуй побить!`
          : `Залип в «${game.name}» в Луп 💀 Попробуй сам — может, ты пройдёшь`,
      });
      logEvent({ type: 'share', gameId: game.id });
    } catch {}
  };

  return (
    <Animated.View style={{ alignItems: 'center', gap: 14, opacity, transform: [{ scale }] }}>
      <Text style={{ fontSize: 56 }} accessibilityLabel={won ? 'Победа' : 'Поражение'}>
        {won ? '🎉' : '💀'}
      </Text>
      <Text style={{ fontSize: 26, fontFamily: fontFamily.bold, color: colors.text }}>
        {won ? 'Красавчик!' : 'Конец игры'}
      </Text>
      {score !== undefined ? (
        <Text style={{ fontSize: 18, fontFamily: fontFamily.bold, color: accent }}>+{score} очков</Text>
      ) : null}

      {bestInfo && score !== undefined && score > 0 ? (
        bestInfo.isNew ? (
          <View
            style={{
              paddingHorizontal: 14,
              paddingVertical: 6,
              borderRadius: radius.pill,
              backgroundColor: `${accent}33`,
              borderWidth: 1,
              borderColor: `${accent}88`,
            }}
          >
            <Text style={{ fontSize: 12, fontFamily: fontFamily.bold, color: accent, letterSpacing: 0.4 }}>
              🏆 НОВЫЙ РЕКОРД! {bestInfo.previous > 0 ? `(было ${bestInfo.previous})` : ''}
            </Text>
          </View>
        ) : (
          <Text style={{ fontSize: 11, fontFamily: fontFamily.semibold, color: colors.textDim }}>
            Личный рекорд: {bestInfo.best}
          </Text>
        )
      ) : null}

      <Pressable
        onPress={onRestart}
        accessibilityRole="button"
        accessibilityLabel="Играть ещё раз"
        style={{
          paddingHorizontal: 32,
          paddingVertical: 12,
          borderRadius: radius.pill,
          backgroundColor: colors.glassBgStrong,
          borderWidth: 1,
          borderColor: colors.glassBorderStrong,
        }}
      >
        <Text style={{ fontSize: 15, fontFamily: fontFamily.bold, color: colors.text }}>Ещё раз ↺</Text>
      </Pressable>

      {game ? (
        <Pressable
          onPress={handleShare}
          accessibilityRole="button"
          accessibilityLabel="Поделиться результатом"
          style={{
            paddingHorizontal: 22,
            paddingVertical: 9,
            borderRadius: radius.pill,
            backgroundColor: colors.glassBg,
            borderWidth: 1,
            borderColor: colors.glassBorder,
            flexDirection: 'row',
            gap: 6,
            alignItems: 'center',
          }}
        >
          <Text style={{ fontSize: 13, fontFamily: fontFamily.bold, color: colors.text }}>
            ↗ Поделиться
          </Text>
        </Pressable>
      ) : null}

      <Pressable onPress={onBack} accessibilityRole="link" accessibilityLabel="Вернуться в ленту">
        <Text style={{ fontSize: 12, color: colors.textDim, fontFamily: fontFamily.medium }}>← В ленту</Text>
      </Pressable>
    </Animated.View>
  );
}
