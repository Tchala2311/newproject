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
  { name: 'I Can\'t Take My Eyes Out of You · BarradeenLofi', source: require('../../assets/lofi/barradeen-i-cant-take-my-eyes-out-of-you.mp3') },
  { name: 'I Fell in Love with a Girl · Barradeen', source: require('../../assets/lofi/barradeen-i-fell-in-love-with-a-girl.mp3') },
  { name: 'The Girl I Haven\'t Met · Barradeen', source: require('../../assets/lofi/barradeen-the-girl-i-havent-met.mp3') },
  { name: 'Intermezzo · Friendzoned', source: require('../../assets/lofi/friendzoned-intermezzo.mp3') },
  { name: 'Subtle Break · Ghostrifter', source: require('../../assets/lofi/ghostrifter-subtle-break.mp3') },
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
  const audioModeReady = useRef<Promise<void> | null>(null);

  const hasAudio = TRACKS.some((t) => t.source !== null);

  useEffect(() => {
    audioModeReady.current = setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
    }).catch((e) => {
      console.warn('audio mode setup failed', e);
    });
    return () => {
      try { playerRef.current?.release(); } catch {}
      playerRef.current = null;
    };
  }, []);

  const loadAndPlay = useCallback(async (idx: number) => {
    const track = TRACKS[idx];
    if (!track?.source) return false;
    try {
      // Make sure the iOS audio session is configured before we touch a player.
      if (audioModeReady.current) await audioModeReady.current;
      if (playerRef.current) {
        try { playerRef.current.release(); } catch {}
        playerRef.current = null;
      }
      const player = createAudioPlayer(track.source);
      player.loop = true;
      player.volume = 1.0;
      // Some Expo builds need a tick before play() lands.
      await new Promise((r) => setTimeout(r, 50));
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
