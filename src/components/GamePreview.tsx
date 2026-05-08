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

    case 16:
      // Slide15 — 3x3 number grid with one missing
      return (
        <View style={{ width: 84, height: 84, padding: 2, backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 6 }}>
          {[[1, 2, 3], [4, 5, 6], [7, 8, 0]].map((row, y) => (
            <View key={y} style={{ flexDirection: 'row' }}>
              {row.map((v, x) => (
                <View
                  key={x}
                  style={{
                    width: 24, height: 24, margin: 2, borderRadius: 4,
                    backgroundColor: v === 0 ? 'transparent' : a,
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {v !== 0 ? <Text style={{ fontSize: 11, fontWeight: '900', color: '#000' }}>{v}</Text> : null}
                </View>
              ))}
            </View>
          ))}
        </View>
      );

    case 17:
      // Wordle5 — 4x5 grid with green/yellow/grey letters
      return (
        <View style={{ gap: 2 }}>
          {[
            ['С', 'В', 'Е', 'Т', 'А'],   // all green = solved
            ['В', 'Е', 'С', 'Н', 'А'],   // mixed
            ['', '', '', '', ''],         // empty
          ].map((row, ri) => (
            <View key={ri} style={{ flexDirection: 'row', gap: 2 }}>
              {row.map((ch, ci) => {
                let bg = 'rgba(255,255,255,0.06)';
                if (ri === 0) bg = '#22C55E';
                else if (ri === 1) {
                  if (ci === 1) bg = '#22C55E';
                  else if (ci === 0 || ci === 4) bg = '#FACC15';
                  else if (ch) bg = '#3F3F46';
                }
                return (
                  <View
                    key={ci}
                    style={{ width: 16, height: 16, borderRadius: 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Text style={{ fontSize: 8, fontWeight: '900', color: '#fff' }}>{ch}</Text>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      );

    case 18:
      // Picross — 5x5 grid with some filled (heart shape)
      return (
        <View style={{ width: 84, height: 84, padding: 2, backgroundColor: 'rgba(0,0,0,0.3)' }}>
          {[
            [0, 1, 0, 1, 0],
            [1, 1, 1, 1, 1],
            [1, 1, 1, 1, 1],
            [0, 1, 1, 1, 0],
            [0, 0, 1, 0, 0],
          ].map((row, y) => (
            <View key={y} style={{ flexDirection: 'row' }}>
              {row.map((v, x) => (
                <View
                  key={x}
                  style={{
                    width: 15, height: 15,
                    borderWidth: 0.5,
                    borderColor: 'rgba(255,255,255,0.15)',
                    backgroundColor: v ? a : 'transparent',
                  }}
                />
              ))}
            </View>
          ))}
        </View>
      );

    case 19:
      // TetrisMini — vertical board with stacked blocks at bottom + falling T-piece
      return (
        <View style={{ width: 56, height: 84, padding: 2, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 4 }}>
          <View style={{ flex: 1, position: 'relative' }}>
            {/* T piece falling */}
            <View style={{ position: 'absolute', top: 6, left: 18, flexDirection: 'row' }}>
              {[1, 1, 1].map((_, i) => (
                <View key={i} style={{ width: 7, height: 7, backgroundColor: '#A855F7', borderWidth: 0.5, borderColor: '#fff' }} />
              ))}
            </View>
            <View style={{ position: 'absolute', top: 13, left: 25, width: 7, height: 7, backgroundColor: '#A855F7', borderWidth: 0.5, borderColor: '#fff' }} />
            {/* Bottom stack */}
            <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
              {[
                ['#22D3EE', '#FACC15', '#F97316', '#22C55E', '#A855F7', '#22D3EE', '#FACC15'],
                ['', '', '#F97316', '#22C55E', '#A855F7', '', ''],
              ].map((row, y) => (
                <View key={y} style={{ flexDirection: 'row' }}>
                  {row.map((c, x) => (
                    <View key={x} style={{ width: 7, height: 7, backgroundColor: c || 'transparent', borderWidth: c ? 0.5 : 0, borderColor: '#fff' }} />
                  ))}
                </View>
              ))}
            </View>
          </View>
        </View>
      );

    case 20: {
      // NumberOrder — 4×4 grid, first 6 "tapped" (checked)
      const nums = Array.from({ length: 16 }, (_, i) => i + 1);
      return (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', width: 88, gap: 2 }}>
          {nums.map((n) => (
            <View key={n} style={{ width: 19, height: 19, borderRadius: 3, alignItems: 'center', justifyContent: 'center', backgroundColor: n <= 6 ? `${a}30` : `${a}14`, borderWidth: 1, borderColor: n <= 6 ? `${a}60` : `${a}30` }}>
              <Text style={{ fontSize: 8, fontWeight: '900', color: n <= 6 ? `${a}99` : a }}>{n <= 6 ? '✓' : n}</Text>
            </View>
          ))}
        </View>
      );
    }

    case 21:
      // MathBlitz — equation + 4 answer bubbles
      return (
        <View style={{ alignItems: 'center', width: 90 }}>
          <View style={{ backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 6 }}>
            <Text style={{ fontSize: 14, fontWeight: '900', color: '#fff' }}>7 + 8 = ?</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 5 }}>
            {[13, 15, 16, 12].map((n, i) => (
              <View key={n} style={{ width: 18, height: 18, borderRadius: 4, backgroundColor: i === 1 ? a : `${a}22`, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 8, fontWeight: '900', color: i === 1 ? '#000' : a }}>{n}</Text>
              </View>
            ))}
          </View>
        </View>
      );

    case 22:
      // SimonSays — 2×2 colored buttons
      return (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', width: 68, gap: 5 }}>
          {['#EF4444', '#22C55E', '#3B82F6', '#EAB308'].map((c, i) => (
            <View key={i} style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: i === 0 ? c : `${c}44`, borderWidth: 1.5, borderColor: c }} />
          ))}
        </View>
      );

    case 23: {
      // WhackMole — 3×3 holes, one active mole
      return (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', width: 78, gap: 4 }}>
          {Array.from({ length: 9 }).map((_, i) => (
            <View key={i} style={{ width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: i === 4 ? '#92400E' : 'rgba(255,255,255,0.07)', borderWidth: 1.5, borderColor: i === 4 ? '#FCD34D' : 'rgba(255,255,255,0.12)' }}>
              <Text style={{ fontSize: i === 4 ? 13 : 11 }}>{i === 4 ? '🐾' : '⭕'}</Text>
            </View>
          ))}
        </View>
      );
    }

    case 24:
      // BalloonPop — scattered balloons
      return (
        <View style={{ width: 90, height: 62, position: 'relative' }}>
          {[{ x: 6, y: 26, s: 22 }, { x: 32, y: 4, s: 28 }, { x: 58, y: 18, s: 24 }, { x: 16, y: 4, s: 18 }, { x: 66, y: 2, s: 18 }].map((b, i) => (
            <Text key={i} style={{ position: 'absolute', left: b.x, top: b.y, fontSize: b.s }}>🎈</Text>
          ))}
        </View>
      );

    case 25: {
      // FlipDuo — 3×4 card grid, some revealed
      const faceDown = [1, 2, 3, 5, 8, 10, 11];
      const symbols = ['🐶', '🐱', '🦊', '🐸', '⭐', '🍎'];
      return (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', width: 88, gap: 3 }}>
          {Array.from({ length: 12 }).map((_, i) => (
            <View key={i} style={{ width: 24, height: 24, borderRadius: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: faceDown.includes(i) ? 'rgba(255,255,255,0.08)' : `${a}22`, borderWidth: 1, borderColor: faceDown.includes(i) ? 'rgba(255,255,255,0.15)' : `${a}66` }}>
              <Text style={{ fontSize: faceDown.includes(i) ? 9 : 12 }}>{faceDown.includes(i) ? '❓' : symbols[i % symbols.length]}</Text>
            </View>
          ))}
        </View>
      );
    }

    case 26:
      // GravityFlip — mini side-scroller board with player + gap in obstacle
      return (
        <Svg width={90} height={62} viewBox="0 0 90 62">
          <Rect x={0} y={0} width={90} height={62} rx={6} fill="rgba(0,0,0,0.35)" />
          {/* Two purple obstacle pillars with gap */}
          <Rect x={55} y={0} width={10} height={22} rx={3} fill="#7E22CE" />
          <Rect x={55} y={38} width={10} height={24} rx={3} fill="#7E22CE" />
          {/* Player */}
          <Rect x={20} y={24} width={12} height={12} rx={3} fill={a} />
          {/* Gravity arrows */}
          <Polyline points="82,18 86,24 78,24" fill={a} stroke={a} strokeWidth={1} />
          <Polyline points="82,44 86,38 78,38" fill={a} stroke={a} strokeWidth={1} />
        </Svg>
      );

    case 27:
      // CatchDrop — fruits falling + basket at bottom
      return (
        <View style={{ width: 90, height: 62, position: 'relative' }}>
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 8 }} />
          <Text style={{ position: 'absolute', left: 12, top: 4, fontSize: 16 }}>🍎</Text>
          <Text style={{ position: 'absolute', left: 38, top: 14, fontSize: 14 }}>🍊</Text>
          <Text style={{ position: 'absolute', left: 62, top: 6, fontSize: 16 }}>🍋</Text>
          <Text style={{ position: 'absolute', left: 28, top: 32, fontSize: 14 }}>🍇</Text>
          {/* Basket */}
          <View style={{ position: 'absolute', bottom: 2, left: 24, width: 44, height: 14, borderRadius: 6, backgroundColor: a, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 9 }}>🧺</Text>
          </View>
        </View>
      );

    case 28:
      // SpeedSort — a card with an emoji + swipe arrows on each side
      return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 20, color: 'rgba(255,255,255,0.4)' }}>←</Text>
          <View style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: `${a}22`, borderWidth: 2, borderColor: `${a}66`, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 30 }}>🐶</Text>
          </View>
          <Text style={{ fontSize: 20, color: 'rgba(255,255,255,0.4)' }}>→</Text>
        </View>
      );

    case 29:
      // RunnerJump — runner above obstacle, ground line
      return (
        <Svg width={90} height={62} viewBox="0 0 90 62">
          <Rect x={0} y={0} width={90} height={62} rx={6} fill="rgba(0,0,0,0.35)" />
          {/* Ground */}
          <Line x1={0} y1={50} x2={90} y2={50} stroke="rgba(255,255,255,0.2)" strokeWidth={1.5} />
          {/* Obstacle */}
          <Rect x={60} y={38} width={10} height={12} rx={2} fill="#22C55E" />
          {/* Runner (stick figure) */}
          <Circle cx={28} cy={30} r={5} fill={a} />
          <Line x1={28} y1={35} x2={28} y2={46} stroke={a} strokeWidth={2} />
          <Line x1={28} y1={42} x2={22} y2={50} stroke={a} strokeWidth={2} />
          <Line x1={28} y1={42} x2={34} y2={48} stroke={a} strokeWidth={2} />
          <Line x1={28} y1={38} x2={22} y2={43} stroke={a} strokeWidth={2} />
          <Line x1={28} y1={38} x2={34} y2={43} stroke={a} strokeWidth={2} />
        </Svg>
      );

    default:
      return null;
  }
}
