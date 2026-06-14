import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Game } from '../data/games';
import { GameShell } from './GameShell';
import { LevelComplete, shouldShowAdAfter } from './LevelComplete';
import { GameResult } from './GameResult';
import { colors, fontFamily, radius } from '../theme';

type Props = {
  game: Game;
  onBack: () => void;
  onComplete: (won: boolean, score: number, meta?: Record<string, number>) => void;
  initialLevel?: number;
};

type Phase = 'showing' | 'input' | 'levelComplete' | 'gameOver';

const MAX_LIVES = 3;

function seqLength(level: number) {
  return level + 2;
}

function displayDuration(level: number) {
  return Math.max(800, 2500 - level * 200);
}

function buildSequence(level: number): string {
  const len = seqLength(level);
  let result = '';
  for (let i = 0; i < len; i++) {
    result += String(Math.floor(Math.random() * 10));
  }
  return result;
}

export function NumberFlash({ game, onBack, onComplete, initialLevel }: Props) {
  const { width } = useWindowDimensions();

  const [level, setLevel] = useState(initialLevel ?? 1);
  const [lives, setLives] = useState(MAX_LIVES);
  const [score, setScore] = useState(0);
  const [phase, setPhase] = useState<Phase>('showing');
  const [sequence, setSequence] = useState(() => buildSequence(initialLevel ?? 1));
  const [userInput, setUserInput] = useState('');
  const [statusMsg, setStatusMsg] = useState('Запомни число');
  const [passed, setPassed] = useState(false);
  const [lastLevelScore, setLastLevelScore] = useState(0);

  const shakeAnim = useRef(new Animated.Value(0)).current;
  const showingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<TextInput>(null);
  const completedRef = useRef(false);

  const clearShowTimeout = () => {
    if (showingTimeout.current) {
      clearTimeout(showingTimeout.current);
      showingTimeout.current = null;
    }
  };

  const startLevel = useCallback((lv: number) => {
    completedRef.current = false;
    const seq = buildSequence(lv);
    setSequence(seq);
    setUserInput('');
    setStatusMsg('Запомни число');
    setPhase('showing');
    clearShowTimeout();
    showingTimeout.current = setTimeout(() => {
      setPhase('input');
      setStatusMsg('Введи число');
      setTimeout(() => inputRef.current?.focus(), 80);
    }, displayDuration(lv));
  }, []);

  useEffect(() => {
    startLevel(level);
    return clearShowTimeout;
  }, []);

  const triggerShake = () => {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 40, useNativeDriver: true }),
    ]).start();
  };

  const handleSubmit = () => {
    if (phase !== 'input' || completedRef.current) return;
    if (userInput === sequence) {
      completedRef.current = true;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      const gained = seqLength(level) * 10 * level;
      const newScore = score + gained;
      setScore(newScore);
      setLastLevelScore(gained);
      setPassed(true);
      setPhase('levelComplete');
      onComplete(true, newScore, { level });
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      triggerShake();
      setStatusMsg('Неверно!');
      const newLives = lives - 1;
      setLives(newLives);
      if (newLives <= 0) {
        completedRef.current = true;
        setPhase('gameOver');
        onComplete(false, score, { level });
      } else {
        setTimeout(() => {
          setUserInput('');
          setStatusMsg('Введи число');
          inputRef.current?.focus();
        }, 700);
      }
    }
  };

  if (phase === 'levelComplete') {
    return (
      <LevelComplete
        level={level}
        passed={passed}
        score={lastLevelScore}
        scoreLabel="Очки"
        accent={game.accent}
        showAd={shouldShowAdAfter(level)}
        onContinue={() => {
          const nextLevel = level + 1;
          setLevel(nextLevel);
          startLevel(nextLevel);
        }}
        onRetry={() => startLevel(level)}
        onBack={onBack}
      />
    );
  }

  if (phase === 'gameOver') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <GameResult
          won={false}
          score={score}
          accent={game.accent}
          game={game}
          onRestart={() => {
            setLevel(initialLevel ?? 1);
            setLives(MAX_LIVES);
            setScore(0);
            startLevel(initialLevel ?? 1);
          }}
          onBack={onBack}
        />
      </View>
    );
  }

  const hearts = Array.from({ length: MAX_LIVES }, (_, i) => (i < lives ? '❤️' : '🖤'));

  return (
    <GameShell game={game} onBack={onBack} score={score} label={`Ур. ${level}`}>
      <View style={{ alignItems: 'center', width: '100%', paddingHorizontal: 16 }}>
        {/* Lives */}
        <Text style={{ fontSize: 22, letterSpacing: 4, marginBottom: 8 }}>{hearts.join('')}</Text>

        {/* Status message */}
        <Text
          style={{
            fontSize: 13,
            fontFamily: fontFamily.semibold,
            color: statusMsg === 'Неверно!' ? colors.warn : 'rgba(255,255,255,0.6)',
            marginBottom: 24,
          }}
        >
          {statusMsg}
        </Text>

        {/* Number display */}
        <Animated.View
          style={{
            transform: [{ translateX: shakeAnim }],
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 120,
            width: '100%',
          }}
        >
          {phase === 'showing' ? (
            <Text
              style={{
                fontSize: Math.min(72, Math.floor((width - 64) / seqLength(level)) + 8),
                fontFamily: fontFamily.bold,
                color: colors.text,
                letterSpacing: 8,
                textAlign: 'center',
              }}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {sequence}
            </Text>
          ) : (
            <View style={{ alignItems: 'center', width: '100%' }}>
              <TextInput
                ref={inputRef}
                value={userInput}
                onChangeText={(t) => {
                  const digits = t.replace(/[^0-9]/g, '');
                  setUserInput(digits);
                }}
                keyboardType="number-pad"
                maxLength={seqLength(level)}
                style={{
                  fontSize: Math.min(64, Math.floor((width - 64) / seqLength(level)) + 8),
                  fontFamily: fontFamily.bold,
                  color: game.accent,
                  letterSpacing: 8,
                  textAlign: 'center',
                  minWidth: 120,
                  padding: 0,
                }}
                placeholderTextColor="rgba(255,255,255,0.2)"
                placeholder={'—'.repeat(seqLength(level))}
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
                caretHidden
              />

              <Text
                style={{
                  fontSize: 11,
                  fontFamily: fontFamily.medium,
                  color: 'rgba(255,255,255,0.35)',
                  marginTop: 8,
                }}
              >
                {userInput.length} / {seqLength(level)}
              </Text>

              <Pressable
                onPress={handleSubmit}
                style={{
                  marginTop: 28,
                  paddingHorizontal: 40,
                  paddingVertical: 14,
                  borderRadius: radius.pill,
                  backgroundColor: game.accent,
                }}
              >
                <Text style={{ fontSize: 16, fontFamily: fontFamily.bold, color: '#000' }}>
                  Проверить
                </Text>
              </Pressable>
            </View>
          )}
        </Animated.View>
      </View>
    </GameShell>
  );
}
