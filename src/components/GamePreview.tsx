import React from 'react';
import { Text, View } from 'react-native';
import { Game } from '../data/games';

type Props = { game: Game };

// Tiny visual tease per game, used in the Explore grid cards.
export function GamePreview({ game }: Props) {
  const a = game.accent;

  if (game.id === 1) {
    // Color Flood — colorful 5×5 grid
    const palette = ['#e74c3c', '#3498db', '#3498db', '#2ecc71', '#2ecc71',
      '#e74c3c', '#e74c3c', '#3498db', '#f1c40f', '#2ecc71',
      '#9b59b6', '#e74c3c', '#e74c3c', '#f1c40f', '#f1c40f',
      '#9b59b6', '#9b59b6', '#1abc9c', '#1abc9c', '#f1c40f',
      '#9b59b6', '#1abc9c', '#1abc9c', '#1abc9c', '#f1c40f'];
    return (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', width: 90, gap: 2, padding: 4 }}>
        {palette.map((c, i) => (
          <View key={i} style={{ width: 16, height: 16, borderRadius: 2, backgroundColor: c }} />
        ))}
      </View>
    );
  }

  if (game.id === 2) {
    // Tap Rush — bubbles
    const bubbles = [
      { x: 20, y: 5, r: 16 },
      { x: 60, y: 20, r: 20 },
      { x: 40, y: 35, r: 12 },
      { x: 75, y: 2, r: 14 },
      { x: 10, y: 35, r: 10 },
    ];
    return (
      <View style={{ width: 90, height: 60, position: 'relative' }}>
        {bubbles.map((b, i) => (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: b.x,
              top: b.y,
              width: b.r * 2,
              height: b.r * 2,
              borderRadius: b.r,
              backgroundColor: a + 'aa',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.4)',
            }}
          />
        ))}
      </View>
    );
  }

  if (game.id === 3) {
    // Word Blast — letter tiles
    return (
      <View style={{ flexDirection: 'row', gap: 4 }}>
        {['С', 'Л', 'О', 'В', 'О'].map((l, i) => (
          <View
            key={i}
            style={{
              width: 24,
              height: 30,
              borderRadius: 6,
              backgroundColor: i < 3 ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.08)',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.2)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '900', color: i < 3 ? a : 'rgba(255,255,255,0.3)' }}>
              {l}
            </Text>
          </View>
        ))}
      </View>
    );
  }

  if (game.id === 4) {
    // Stack It — bars
    const widths = [90, 75, 58, 44, 32];
    return (
      <View style={{ alignItems: 'center', width: 90 }}>
        <View style={{ width: 70, height: 12, borderRadius: 3, backgroundColor: a, marginBottom: 2 }} />
        {widths.map((w, i) => (
          <View
            key={i}
            style={{
              width: w,
              height: 12,
              borderRadius: 3,
              backgroundColor: `rgba(255,255,255,${0.15 + i * 0.1})`,
              marginTop: 3,
            }}
          />
        ))}
      </View>
    );
  }

  if (game.id === 5) {
    // Merge Wave — 3×3 grid
    const vals = [2, 4, 8, 4, 16, 32, 8, 32, 64];
    const bgFor = (v: number): string =>
      ({ 2: '#eee4da', 4: '#ede0c8', 8: '#f2b179', 16: '#f59563', 32: '#f67c5f', 64: '#f65e3b' } as Record<number, string>)[v] || '#333';
    return (
      <View style={{ width: 84, flexDirection: 'row', flexWrap: 'wrap', gap: 3 }}>
        {vals.map((v, i) => (
          <View
            key={i}
            style={{
              width: 26,
              height: 26,
              borderRadius: 4,
              backgroundColor: bgFor(v),
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 9, fontWeight: '900', color: '#222' }}>{v}</Text>
          </View>
        ))}
      </View>
    );
  }

  return null;
}
