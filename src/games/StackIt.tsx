import React, { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Game } from '../data/games';
import { colors, fontFamily } from '../theme';
import { GameShell } from './GameShell';
import { GameResult } from './GameResult';

const ST_W = 240;
const ST_BH = 18;
const ST_TARGET = 8;
const STAGE_H = 240;

type Block = { x: number; w: number };

type Props = { game: Game; onBack: () => void; onComplete: (won: boolean, score: number) => void };

export function StackIt({ game, onBack, onComplete }: Props) {
  const [blocks, setBlocks] = useState<Block[]>([{ x: 0, w: ST_W }]);
  const [cx, setCx] = useState(0);
  const [cw, setCw] = useState(ST_W);
  const dirRef = useRef(1);
  const cxRef = useRef(0);
  const cwRef = useRef(ST_W);
  const doneRef = useRef(false);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [won, setWon] = useState(false);

  useEffect(() => { cxRef.current = cx; }, [cx]);
  useEffect(() => { cwRef.current = cw; }, [cw]);
  useEffect(() => { doneRef.current = done; }, [done]);

  useEffect(() => {
    if (done) return undefined;
    let raf: number;
    const speed = 1.8 + score * 0.06;
    const loop = () => {
      if (doneRef.current) return;
      const next = cxRef.current + speed * dirRef.current;
      if (next + cwRef.current > ST_W) dirRef.current = -1;
      else if (next < 0) dirRef.current = 1;
      const clamped = Math.max(0, Math.min(ST_W - cwRef.current, next));
      cxRef.current = clamped;
      setCx(clamped);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [done, score]);

  useEffect(() => {
    if (done) onComplete(won, score);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  const drop = () => {
    if (done) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const last = blocks[blocks.length - 1];
    const left = Math.max(cx, last.x);
    const right = Math.min(cx + cw, last.x + last.w);
    const newW = right - left;
    if (newW <= 4) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      setDone(true);
      setWon(false);
      return;
    }
    const nb = { x: left, w: newW };
    const next = [...blocks, nb];
    setBlocks(next);
    setCx(left);
    setCw(newW);
    cxRef.current = left;
    cwRef.current = newW;
    const ns = score + 10;
    setScore(ns);
    if (next.length > ST_TARGET) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setDone(true);
      setWon(true);
    }
  };

  const reset = () => {
    setBlocks([{ x: 0, w: ST_W }]);
    setCx(0);
    setCw(ST_W);
    cxRef.current = 0;
    cwRef.current = ST_W;
    dirRef.current = 1;
    doneRef.current = false;
    setScore(0);
    setDone(false);
    setWon(false);
  };

  const visible = blocks.slice(-9);

  return (
    <GameShell game={game} onBack={onBack} score={score} label="Очки">
      {done ? (
        <GameResult won={won} score={score} accent={game.accent} onRestart={reset} onBack={onBack} />
      ) : (
        <>
          <Text style={{ fontSize: 11, color: colors.textDim, fontFamily: fontFamily.semibold, textAlign: 'center' }}>
            ТАПНИ ЧТОБЫ УРОНИТЬ — осталось слоёв: {Math.max(0, ST_TARGET - blocks.length + 1)}
          </Text>
          <Pressable onPress={drop}>
            <View
              style={{
                width: ST_W,
                height: STAGE_H,
                backgroundColor: 'rgba(0,0,0,0.22)',
                borderRadius: 12,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  position: 'absolute',
                  top: 8,
                  left: cx,
                  width: cw,
                  height: ST_BH,
                  borderRadius: 4,
                  backgroundColor: game.accent,
                }}
              />
              {visible.map((b, i) => (
                <View
                  key={i}
                  style={{
                    position: 'absolute',
                    left: b.x,
                    bottom: i * (ST_BH + 2),
                    width: b.w,
                    height: ST_BH,
                    borderRadius: 4,
                    backgroundColor: `rgba(255,255,255,${0.18 + i * 0.06})`,
                  }}
                />
              ))}
            </View>
          </Pressable>
        </>
      )}
    </GameShell>
  );
}
