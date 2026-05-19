import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Game } from '../data/games';
import { colors, fontFamily, radius, SAFE_TOP } from '../theme';

type Props = {
  game: Game;
  onBack: () => void;
  score: number | string;
  label?: string;
  timer?: number;
  timerMax?: number;
  children: React.ReactNode;
};

export function GameShell({ game, onBack, score, label, timer, timerMax, children }: Props) {
  const pct = (timerMax != null && timer != null) ? (timer / timerMax) * 100 : null;
  const warn = timer !== undefined && timer <= 5;

  return (
    <View style={{ flex: 1, overflow: 'hidden' }}>
      <LinearGradient
        colors={[game.gradient[0], game.gradient[1]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <LinearGradient
        colors={[`${game.accent}33`, 'transparent']}
        start={{ x: 0.6, y: 0.3 }}
        end={{ x: 0.2, y: 0.9 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />

      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: SAFE_TOP,
          paddingHorizontal: 14,
          paddingBottom: 8,
        }}
      >
        <Pressable
          onPress={onBack}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: 'rgba(0,0,0,0.3)',
            borderWidth: 1,
            borderColor: colors.glassBorder,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 16, color: colors.text }}>←</Text>
        </Pressable>
        <Text style={{ fontSize: 14, fontFamily: fontFamily.bold, color: colors.text }}>{game.name}</Text>
        <View
          style={{
            backgroundColor: 'rgba(0,0,0,0.3)',
            borderWidth: 1,
            borderColor: colors.glassBorder,
            borderRadius: radius.pill,
            paddingHorizontal: 12,
            paddingVertical: 5,
            minWidth: 64,
            alignItems: 'center',
          }}
        >
          {label ? (
            <Text style={{ fontSize: 9, color: colors.textDim, fontFamily: fontFamily.semibold }}>{label}</Text>
          ) : null}
          <Text style={{ fontSize: 13, fontFamily: fontFamily.bold, color: game.accent }}>{score}</Text>
        </View>
      </View>

      {/* Timer */}
      {pct !== null ? (
        <View style={{ height: 3, marginHorizontal: 14, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.1)' }}>
          <View
            style={{
              height: '100%',
              width: `${Math.max(0, pct)}%`,
              borderRadius: 2,
              backgroundColor: warn ? colors.warn : game.accent,
            }}
          />
        </View>
      ) : null}

      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 16,
          paddingTop: 8,
          paddingBottom: 24,
          gap: 14,
        }}
      >
        {children}
      </View>
    </View>
  );
}
