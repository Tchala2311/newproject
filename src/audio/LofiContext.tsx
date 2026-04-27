import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { Audio, AVPlaybackSource, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';

// Royalty-free lofi tracks. Drop your MP3s into assets/lofi/ and add them here.
// We ship with manifest entries but no bundled audio — see README for sourcing.
//
// To enable: download CC0/royalty-free lofi tracks (Pixabay, Uppbeat) and place them
// in assets/lofi/, then uncomment the require() lines below. Lofi from Pixabay is
// already cleared for commercial use including Russia.

type Track = { name: string; source: AVPlaybackSource | null };

const TRACKS: Track[] = [
  { name: 'Полночный лофи', source: null /* require('../../assets/lofi/midnight.mp3') */ },
  { name: 'Поезд в метро', source: null /* require('../../assets/lofi/subway.mp3') */ },
  { name: 'Дождь и вайб', source: null /* require('../../assets/lofi/rain.mp3') */ },
  { name: 'Спокойный поток', source: null /* require('../../assets/lofi/flow.mp3') */ },
  { name: 'Утренний кофе', source: null /* require('../../assets/lofi/coffee.mp3') */ },
];

type LofiState = {
  playing: boolean;
  trackName: string;
  toggle: () => void;
  nextTrack: () => void;
  hasAudio: boolean;
};

const LofiCtx = createContext<LofiState | null>(null);

export function LofiProvider({ children }: { children: React.ReactNode }) {
  const [trackIdx, setTrackIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);

  const hasAudio = TRACKS.some((t) => t.source !== null);

  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
      interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
      interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
    }).catch(() => {});
    return () => {
      soundRef.current?.unloadAsync().catch(() => {});
    };
  }, []);

  const loadAndPlay = useCallback(async (idx: number) => {
    const track = TRACKS[idx];
    if (!track?.source) return false;
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      const { sound } = await Audio.Sound.createAsync(track.source, {
        shouldPlay: true,
        isLooping: true,
        volume: 0.7,
      });
      soundRef.current = sound;
      return true;
    } catch (e) {
      if (Platform.OS !== 'web') console.warn('lofi load failed', e);
      return false;
    }
  }, []);

  const toggle = useCallback(() => {
    if (!hasAudio) {
      // No tracks bundled — flip the visual state anyway so users see the UI work
      setPlaying((p) => !p);
      return;
    }
    if (playing) {
      soundRef.current?.pauseAsync().catch(() => {});
      setPlaying(false);
    } else {
      loadAndPlay(trackIdx).then((ok) => setPlaying(ok));
    }
  }, [playing, trackIdx, loadAndPlay, hasAudio]);

  const nextTrack = useCallback(() => {
    const next = (trackIdx + 1) % TRACKS.length;
    setTrackIdx(next);
    if (playing && hasAudio) loadAndPlay(next).then((ok) => setPlaying(ok));
  }, [trackIdx, playing, loadAndPlay, hasAudio]);

  const value = useMemo<LofiState>(
    () => ({
      playing,
      trackName: TRACKS[trackIdx].name,
      toggle,
      nextTrack,
      hasAudio,
    }),
    [playing, trackIdx, toggle, nextTrack, hasAudio]
  );

  return <LofiCtx.Provider value={value}>{children}</LofiCtx.Provider>;
}

export function useLofi(): LofiState {
  const ctx = useContext(LofiCtx);
  if (!ctx) throw new Error('useLofi must be used inside LofiProvider');
  return ctx;
}
