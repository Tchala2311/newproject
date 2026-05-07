import React from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Game } from '../data/games';
import { fontFamily, radius } from '../theme';

// Small overlay badge that pins to the top of the very first feed card when
// it happens to be today's daily challenge. Lets you know "everyone's playing
// this today" without taking over the screen.
export function DailyChallengeBanner({ game }: { game: Game }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: Math.max(insets.top, 14) + 44,
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 9,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingHorizontal: 12,
          paddingVertical: 5,
          borderRadius: radius.pill,
          backgroundColor: 'rgba(0,0,0,0.55)',
          borderWidth: 1,
          borderColor: `${game.accent}aa`,
        }}
      >
        <Text style={{ fontSize: 13 }}>🏆</Text>
        <Text style={{ fontSize: 11, fontFamily: fontFamily.bold, color: game.accent, letterSpacing: 0.4 }}>
          ВЫЗОВ ДНЯ
        </Text>
      </View>
    </View>
  );
}
