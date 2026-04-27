import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { View } from 'react-native';
import * as SystemUI from 'expo-system-ui';
import {
  useFonts,
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';

import { AmbientBackground } from './src/components/AmbientBackground';
import { BottomNav, Tab } from './src/components/BottomNav';
import { Toast } from './src/components/Toast';
import { FeedScreen } from './src/screens/FeedScreen';
import { ExploreScreen } from './src/screens/ExploreScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { GamePlayScreen } from './src/games';
import { LofiProvider } from './src/audio/LofiContext';
import { PrefsProvider } from './src/store/usePrefs';
import { Game } from './src/data/games';
import { colors } from './src/theme';

SystemUI.setBackgroundColorAsync(colors.bg).catch(() => {});

function Shell() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('feed');
  const [feedIdx, setFeedIdx] = useState(0);
  const [playing, setPlaying] = useState<Game | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(null);
    setTimeout(() => setToast(msg), 10);
  };

  const handlePlay = (game: Game) => {
    setPlaying(game);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <AmbientBackground />
      {playing ? (
        <GamePlayScreen game={playing} onBack={() => setPlaying(null)} />
      ) : (
        <>
          {tab === 'feed' ? (
            <FeedScreen
              onPlay={handlePlay}
              onToast={showToast}
              bottomInset={insets.bottom}
              feedIdx={feedIdx}
              setFeedIdx={setFeedIdx}
            />
          ) : null}
          {tab === 'explore' ? <ExploreScreen onPlay={handlePlay} bottomInset={insets.bottom} /> : null}
          {tab === 'profile' ? <ProfileScreen onPlay={handlePlay} bottomInset={insets.bottom} /> : null}
          <BottomNav tab={tab} setTab={setTab} bottomInset={insets.bottom} />
        </>
      )}
      {toast ? <Toast message={toast} onDone={() => setToast(null)} /> : null}
    </View>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <StatusBar style="light" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaProvider>
        <PrefsProvider>
          <LofiProvider>
            <StatusBar style="light" />
            <Shell />
          </LofiProvider>
        </PrefsProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
