import React, { useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActivityIndicator, Text, View } from 'react-native';
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
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { AuthScreen } from './src/screens/AuthScreen';
import { CreatorProfileScreen } from './src/screens/CreatorProfileScreen';
import { GamePlayScreen } from './src/games';
import { LofiProvider } from './src/audio/LofiContext';
import { PrefsProvider } from './src/store/usePrefs';
import { UserProvider, useUser } from './src/store/useUser';
import { AchievementsProvider, useAchievements } from './src/store/useAchievements';
import { NotInterestedProvider } from './src/store/useNotInterested';
import { StatsProvider } from './src/store/useStats';
import { Game, Creator } from './src/data/games';
import { colors } from './src/theme';
import { AchievementToast } from './src/components/AchievementToast';
import { ErrorBoundary } from './src/components/ErrorBoundary';

SystemUI.setBackgroundColorAsync(colors.bg).catch(() => {});

function Shell() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('feed');
  const [feedIdx, setFeedIdx] = useState(0);
  const [playing, setPlaying] = useState<Game | null>(null);
  const [viewingCreator, setViewingCreator] = useState<Creator | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const { lastUnlocked, clearLastUnlocked } = useAchievements();
  // The null→message flip remounts Toast so its enter animation always replays;
  // track the timer so we can cancel it on unmount (no setState-after-unmount).
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current); }, []);

  const showToast = (msg: string) => {
    setToast(null);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(msg), 10);
  };

  const handlePlay = (game: Game) => {
    setPlaying(game);
  };

  const handleOpenCreator = (creator: Creator) => {
    setViewingCreator(creator);
  };

  // ALL three tabs are mounted permanently and toggled via display, so feed
  // scroll position + state survive trips into a game / creator profile.
  // The game and creator profile layer ON TOP, so swapping back is instant
  // and the FlatList doesn't have to remount + refetch.
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <AmbientBackground />

      {/* Always-mounted tabs */}
      <View style={{ flex: 1, display: tab === 'feed' && !playing && !viewingCreator ? 'flex' : 'none' }}>
        <FeedScreen
          onPlay={handlePlay}
          onToast={showToast}
          onOpenCreator={handleOpenCreator}
          bottomInset={insets.bottom}
          feedIdx={feedIdx}
          setFeedIdx={setFeedIdx}
        />
      </View>
      <View style={{ flex: 1, display: tab === 'explore' && !playing && !viewingCreator ? 'flex' : 'none', position: tab === 'explore' && !playing && !viewingCreator ? 'relative' : 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
        {tab === 'explore' && !playing && !viewingCreator ? (
          <ExploreScreen onPlay={handlePlay} bottomInset={insets.bottom} />
        ) : null}
      </View>
      <View style={{ flex: 1, display: tab === 'profile' && !playing && !viewingCreator ? 'flex' : 'none', position: tab === 'profile' && !playing && !viewingCreator ? 'relative' : 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
        {tab === 'profile' && !playing && !viewingCreator ? (
          <ProfileScreen onPlay={handlePlay} bottomInset={insets.bottom} />
        ) : null}
      </View>

      {/* Bottom nav — visible only when no overlay is up */}
      {!playing && !viewingCreator ? (
        <BottomNav tab={tab} setTab={setTab} bottomInset={insets.bottom} />
      ) : null}

      {/* Overlays on top */}
      {viewingCreator ? (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
          <CreatorProfileScreen
            creator={viewingCreator}
            onBack={() => setViewingCreator(null)}
            onPlay={(g) => { setViewingCreator(null); handlePlay(g); }}
            bottomInset={insets.bottom}
          />
        </View>
      ) : null}
      {playing ? (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
          <GamePlayScreen game={playing} onBack={() => setPlaying(null)} />
        </View>
      ) : null}

      {toast ? <Toast message={toast} onDone={() => setToast(null)} /> : null}
      {lastUnlocked ? (
        <AchievementToast achievement={lastUnlocked} onDone={clearLastUnlocked} />
      ) : null}
    </View>
  );
}

function LoadingScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', gap: 20 }}>
      <StatusBar style="light" />
      <Text style={{ fontSize: 42, fontWeight: '800', color: '#fff', letterSpacing: -1 }}>FLIK</Text>
      <ActivityIndicator color="#C99FE6" size="large" />
    </View>
  );
}

function Gate() {
  const { session, authLoading, user, hydrated } = useUser();
  if (authLoading || !hydrated) return <LoadingScreen />;
  if (!session) return <AuthScreen />;
  if (!user) return <OnboardingScreen />;
  return <Shell />;
}

export default function App() {
  const [fontsLoaded] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
  });

  if (!fontsLoaded) return <LoadingScreen />;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <UserProvider>
            <PrefsProvider>
              <NotInterestedProvider>
                <AchievementsProvider>
                  <StatsProvider>
                    <LofiProvider>
                      <StatusBar style="light" />
                      <ErrorBoundary>
                        <Gate />
                      </ErrorBoundary>
                    </LofiProvider>
                  </StatsProvider>
                </AchievementsProvider>
              </NotInterestedProvider>
            </PrefsProvider>
          </UserProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
