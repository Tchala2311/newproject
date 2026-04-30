import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { createAudioPlayer, setAudioModeAsync, AudioPlayer, AudioSource } from 'expo-audio';

// Royalty-free lofi tracks. Drop your MP3s into assets/lofi/ and add them here.
// We ship with manifest entries but no bundled audio — see README for sourcing.
//
// To enable: download CC0/royalty-free lofi tracks (Pixabay, Uppbeat) and place them
// in assets/lofi/, then uncomment the require() lines below. Lofi from Pixabay is
// already cleared for commercial use including Russia.

type Track = { name: string; source: AudioSource | null };

const TRACKS: Track[] = [
  { name: 'Track 1', source: require('../../assets/lofi/track1.mp3') },
  { name: 'Track 2', source: require('../../assets/lofi/track2.mp3') },
  { name: 'Track 3', source: require('../../assets/lofi/track3.mp3') },
  { name: 'Track 4', source: require('../../assets/lofi/track4.mp3') },
  { name: 'Track 5', source: require('../../assets/lofi/track5.mp3') },
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
  const playerRef = useRef<AudioPlayer | null>(null);

  const hasAudio = TRACKS.some((t) => t.source !== null);

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'mixWithOthers',
    }).catch(() => {});
    return () => {
      playerRef.current?.release();
      playerRef.current = null;
    };
  }, []);

  const loadAndPlay = useCallback(async (idx: number) => {
    const track = TRACKS[idx];
    if (!track?.source) return false;
    try {
      if (playerRef.current) {
        playerRef.current.release();
        playerRef.current = null;
      }
      const player = createAudioPlayer(track.source);
      player.loop = true;
      player.volume = 0.7;
      player.play();
      playerRef.current = player;
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
      playerRef.current?.pause();
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
