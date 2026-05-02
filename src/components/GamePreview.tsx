import React from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Line, Polyline, Rect } from 'react-native-svg';
import { Game } from '../data/games';

type Props = { game: Game };

// Tiny visual tease per game, used in the Explore grid cards. Each preview
// renders inside a ~90x70 card area; keep them compact and instantly readable.
export function GamePreview({ game }: Props) {
  const a = game.accent;

  switch (game.id) {
    case 1: {
      // Color Flood — colorful 5×5 grid
      const palette = [
        '#e74c3c', '#3498db', '#3498db', '#2ecc71', '#2ecc71',
        '#e74c3c', '#e74c3c', '#3498db', '#f1c40f', '#2ecc71',
        '#9b59b6', '#e74c3c', '#e74c3c', '#f1c40f', '#f1c40f',
        '#9b59b6', '#9b59b6', '#1abc9c', '#1abc9c', '#f1c40f',
        '#9b59b6', '#1abc9c', '#1abc9c', '#1abc9c', '#f1c40f',
      ];
      return (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', width: 90, gap: 2, padding: 4 }}>
          {palette.map((c, i) => (
            <View key={i} style={{ width: 16, height: 16, borderRadius: 2, backgroundColor: c }} />
          ))}
        </View>
      );
    }

    case 2: {
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

    case 3: {
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

    case 4: {
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

    case 5: {
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

    case 6:
      // Perfect Circle — wobbly hand-drawn loop with a centroid dot
      return (
        <Svg width={90} height={70} viewBox="0 0 90 70">
          <Polyline
            points="45,12 60,16 70,28 71,40 64,52 50,58 35,57 23,49 18,38 22,25 32,16 45,12"
            fill="none"
            stroke={a}
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Circle cx={45} cy={36} r={2.5} fill={a} opacity={0.6} />
        </Svg>
      );

    case 7:
      // Reflex 333 — green pad with ms readout
      return (
        <View
          style={{
            width: 90,
            height: 60,
            borderRadius: 8,
            backgroundColor: '#22C55E',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: '900', color: '#fff', letterSpacing: 1 }}>ТАПАЙ!</Text>
          <Text style={{ fontSize: 16, fontWeight: '900', color: '#fff', fontVariant: ['tabular-nums'] }}>231мс</Text>
        </View>
      );

    case 8:
      // Color Snipe — Stroop word (word "красный" rendered in blue)
      return (
        <View
          style={{
            width: 90,
            height: 60,
            borderRadius: 8,
            backgroundColor: 'rgba(0,0,0,0.35)',
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 4,
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: '900', color: '#3B82F6', letterSpacing: -0.4 }}>
            КРАСНЫЙ
          </Text>
          <View style={{ flexDirection: 'row', gap: 3, marginTop: 5 }}>
            <View style={{ width: 14, height: 8, borderRadius: 2, backgroundColor: '#FF4D4D' }} />
            <View style={{ width: 14, height: 8, borderRadius: 2, backgroundColor: '#3B82F6' }} />
            <View style={{ width: 14, height: 8, borderRadius: 2, backgroundColor: '#22C55E' }} />
            <View style={{ width: 14, height: 8, borderRadius: 2, backgroundColor: '#FACC15' }} />
          </View>
        </View>
      );

    case 9: {
      // Swipe Snake — snake on micro-grid + food
      const cells: Array<{ x: number; y: number; head?: boolean }> = [
        { x: 6, y: 3, head: true }, { x: 5, y: 3 }, { x: 4, y: 3 }, { x: 4, y: 2 }, { x: 4, y: 1 },
      ];
      return (
        <Svg width={90} height={60} viewBox="0 0 90 60">
          <Rect x={0} y={0} width={90} height={60} rx={6} fill="rgba(0,0,0,0.35)" />
          {cells.map((c, i) => (
            <Rect
              key={i}
              x={c.x * 10 + 1}
              y={c.y * 10 + 1}
              width={9}
              height={9}
              rx={1.5}
              fill={c.head ? a : `${a}cc`}
            />
          ))}
          <Circle cx={75} cy={45} r={4} fill="#FF4D7A" />
        </Svg>
      );
    }

    case 10:
      // Water Sort — 4 colored tubes
      return (
        <View style={{ flexDirection: 'row', gap: 4, height: 60, alignItems: 'flex-end' }}>
          {[
            ['#FF4D7A', '#3B82F6', '#22C55E', '#FACC15'],
            ['#3B82F6', '#FACC15', '#22C55E', '#FF4D7A'],
            ['#22C55E', '#FF4D7A', '#FACC15'],
            [],
          ].map((tube, ti) => (
            <View
              key={ti}
              style={{
                width: 14,
                height: 56,
                borderWidth: 1.2,
                borderTopWidth: 0,
                borderColor: 'rgba(255,255,255,0.55)',
                borderTopLeftRadius: 0,
                borderTopRightRadius: 0,
                borderBottomLeftRadius: 4,
                borderBottomRightRadius: 4,
                justifyContent: 'flex-end',
                overflow: 'hidden',
              }}
            >
              {tube.map((c, ci) => (
                <View key={ci} style={{ height: 12, backgroundColor: c }} />
              ))}
            </View>
          ))}
        </View>
      );

    case 11:
      // Beat Tap — 3 lanes with target ring + descending notes
      return (
        <Svg width={90} height={60} viewBox="0 0 90 60">
          <Rect x={0} y={0} width={90} height={60} rx={6} fill="rgba(0,0,0,0.35)" />
          <Line x1={30} y1={0} x2={30} y2={60} stroke="rgba(255,255,255,0.1)" strokeWidth={1} />
          <Line x1={60} y1={0} x2={60} y2={60} stroke="rgba(255,255,255,0.1)" strokeWidth={1} />
          <Line x1={0} y1={48} x2={90} y2={48} stroke={a} strokeWidth={1.5} />
          <Circle cx={15} cy={48} r={6} fill={a} stroke="#fff" strokeWidth={1.5} />
          <Circle cx={45} cy={28} r={6} fill={a} opacity={0.85} />
          <Circle cx={75} cy={12} r={6} fill={a} opacity={0.6} />
        </Svg>
      );

    case 12: {
      // Emoji Match — 3×2 mini grid with emoji
      const cells = ['🦊', '❓', '🐼', '❓', '🦄', '🦊'];
      return (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', width: 90, gap: 3 }}>
          {cells.map((e, i) => (
            <View
              key={i}
              style={{
                width: 28,
                height: 26,
                borderRadius: 5,
                backgroundColor: e === '❓' ? 'rgba(0,0,0,0.4)' : `${a}33`,
                borderWidth: 1,
                borderColor: e === '❓' ? 'rgba(255,255,255,0.15)' : `${a}88`,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 14 }}>{e}</Text>
            </View>
          ))}
        </View>
      );
    }

    case 13:
      // Nerve Pulse — concentric pulsing rings with center dot
      return (
        <Svg width={90} height={60} viewBox="0 0 90 60">
          <Circle cx={45} cy={30} r={26} stroke={a} strokeWidth={1} fill="none" opacity={0.25} />
          <Circle cx={45} cy={30} r={20} stroke={a} strokeWidth={1.5} fill="none" opacity={0.55} />
          <Circle cx={45} cy={30} r={14} stroke={a} strokeWidth={2} fill="none" />
          <Circle cx={45} cy={30} r={4} fill="#fff" />
        </Svg>
      );

    case 14: {
      // Falling Letters — three letters dropping above a keyboard strip
      return (
        <View style={{ width: 90, height: 60 }}>
          {[
            { x: 12, y: 4, ch: 'А' },
            { x: 38, y: 18, ch: 'Б' },
            { x: 62, y: 8, ch: 'Ы' },
          ].map((l, i) => (
            <View
              key={i}
              style={{
                position: 'absolute',
                left: l.x,
                top: l.y,
                width: 18,
                height: 18,
                borderRadius: 4,
                backgroundColor: a,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 10, fontWeight: '900', color: '#000' }}>{l.ch}</Text>
            </View>
          ))}
          <View
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 14,
              flexDirection: 'row',
              gap: 1.5,
            }}
          >
            {Array.from({ length: 9 }).map((_, i) => (
              <View
                key={i}
                style={{
                  flex: 1,
                  backgroundColor: 'rgba(255,255,255,0.18)',
                  borderRadius: 2,
                }}
              />
            ))}
          </View>
        </View>
      );
    }

    case 15:
      // Connect — numbered dots with non-crossing path
      return (
        <Svg width={90} height={60} viewBox="0 0 90 60">
          <Polyline
            points="18,12 70,16 50,32 22,46 78,46"
            fill="none"
            stroke={a}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {[
            { x: 18, y: 12 }, { x: 70, y: 16 }, { x: 50, y: 32 }, { x: 22, y: 46 }, { x: 78, y: 46 },
          ].map((p, i) => (
            <Circle key={i} cx={p.x} cy={p.y} r={5} fill={a} stroke="#fff" strokeWidth={1.2} />
          ))}
        </Svg>
      );

    default:
      return null;
  }
}
