import React, { useCallback, useMemo, useRef } from 'react';
import {
  FlatList,
  Share,
  View,
  ViewToken,
  useWindowDimensions,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Game } from '../data/games';
import { GameCard } from '../components/GameCard';
import { AdSlot } from '../components/AdSlot';
import { useLofi } from '../audio/LofiContext';
import { usePrefs } from '../store/usePrefs';
import { useStats } from '../store/useStats';
import { logEvent } from '../store/events';

type Props = {
  onPlay: (game: Game) => void;
  onToast: (msg: string) => void;
  bottomInset: number;
  feedIdx: number;
  setFeedIdx: (i: number) => void;
};

// We interleave an ad-slot card after every Nth game. This keeps the feed
// pacing TikTok-like while making the monetization surface obvious from day 1.
const AD_EVERY = 4;
type FeedItem = { type: 'game'; game: Game } | { type: 'ad'; key: string };

function buildFeed(games: Game[]): FeedItem[] {
  const out: FeedItem[] = [];
  games.forEach((g, i) => {
    out.push({ type: 'game', game: g });
    if ((i + 1) % AD_EVERY === 0 && i < games.length - 1) {
      out.push({ type: 'ad', key: `ad-${i}` });
    }
  });
  return out;
}

const viewabilityConfig = { itemVisiblePercentThreshold: 60 };
const SKIP_THRESHOLD_MS = 2500;

export function FeedScreen({ onPlay, onToast, bottomInset, feedIdx, setFeedIdx }: Props) {
  const { height } = useWindowDimensions();
  const { playing, trackName, toggle, nextTrack } = useLofi();
  const { likes, saves, toggleLike, toggleSave } = usePrefs();
  const { ranked } = useStats();

  // Capture ranking once on mount so the feed order doesn't shuffle while the
  // user is mid-scroll. Refreshing the feed (e.g. after completing a game)
  // simply requires a tab switch — that's the TikTok pattern anyway.
  const items = useRef<FeedItem[] | null>(null);
  if (items.current === null) {
    items.current = buildFeed(ranked.length ? ranked : []);
  }
  const feedItems = items.current;

  const listRef = useRef<FlatList<FeedItem>>(null);
  const lastView = useRef<{ gameId: number; ts: number; engaged: boolean } | null>(null);

  const markEngaged = useCallback((gameId: number) => {
    if (lastView.current && lastView.current.gameId === gameId) {
      lastView.current.engaged = true;
    }
  }, []);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (!viewableItems.length) return;
    const idx = viewableItems[0].index ?? 0;
    setFeedIdx(idx);
    Haptics.selectionAsync().catch(() => {});

    // If the previous card was abandoned without engagement, log a skip — this
    // is a strong negative signal for the recommender.
    const prev = lastView.current;
    if (prev && !prev.engaged) {
      const dt = Date.now() - prev.ts;
      if (dt < SKIP_THRESHOLD_MS) {
        logEvent({ type: 'skip', gameId: prev.gameId });
      }
    }

    const item = feedItems[idx];
    if (item?.type === 'game') {
      logEvent({ type: 'view', gameId: item.game.id });
      lastView.current = { gameId: item.game.id, ts: Date.now(), engaged: false };
    } else {
      lastView.current = null;
    }
  }).current;

  const handleShare = useCallback(async (game: Game) => {
    markEngaged(game.id);
    try {
      await Share.share({
        message: `Зацени «${game.name}» в Луп — ${game.tagline}`,
      });
      logEvent({ type: 'share', gameId: game.id });
    } catch {
      onToast('Не получилось поделиться');
    }
  }, [onToast, markEngaged]);

  const handleSave = useCallback(
    (game: Game) => {
      markEngaged(game.id);
      const next = !saves[game.id];
      toggleSave(game.id);
      onToast(next ? '✅ Сохранено!' : 'Убрано из сохранённого');
      logEvent({ type: next ? 'save' : 'unsave', gameId: game.id });
    },
    [saves, toggleSave, onToast, markEngaged],
  );

  const handleLike = useCallback(
    (game: Game) => {
      markEngaged(game.id);
      const next = !likes[game.id];
      toggleLike(game.id);
      logEvent({ type: next ? 'like' : 'unlike', gameId: game.id });
    },
    [likes, toggleLike, markEngaged],
  );

  const handlePlay = useCallback(
    (game: Game) => {
      markEngaged(game.id);
      logEvent({ type: 'play', gameId: game.id });
      onPlay(game);
    },
    [onPlay, markEngaged],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: FeedItem; index: number }) => {
      if (item.type === 'ad') {
        return <AdSlot height={height} bottomInset={bottomInset} onCTA={() => onToast('Подписка скоро запустится 🚀')} />;
      }
      const g = item.game;
      return (
        <GameCard
          game={g}
          isActive={index === feedIdx}
          onPlay={() => handlePlay(g)}
          liked={!!likes[g.id]}
          onLike={() => handleLike(g)}
          saved={!!saves[g.id]}
          onSave={() => handleSave(g)}
          onShare={() => handleShare(g)}
          musicPlaying={playing}
          trackName={trackName}
          onMusicToggle={toggle}
          onNextTrack={nextTrack}
          bottomInset={bottomInset}
        />
      );
    },
    [feedIdx, height, bottomInset, likes, saves, playing, trackName, toggle, nextTrack, handlePlay, handleLike, handleSave, handleShare, onToast],
  );

  const keyExtractor = useMemo(
    () => (it: FeedItem) => (it.type === 'ad' ? it.key : `g-${it.game.id}`),
    [],
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <FlatList
        ref={listRef}
        data={feedItems}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        pagingEnabled
        snapToInterval={height}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={(_, index) => ({ length: height, offset: height * index, index })}
        windowSize={3}
        initialNumToRender={2}
        maxToRenderPerBatch={2}
        removeClippedSubviews
      />
    </View>
  );
}
