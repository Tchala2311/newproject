import React, { useCallback, useRef } from 'react';
import {
  FlatList,
  Share,
  View,
  ViewToken,
  useWindowDimensions,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { GAMES, Game } from '../data/games';
import { GameCard } from '../components/GameCard';
import { AdSlot } from '../components/AdSlot';
import { useLofi } from '../audio/LofiContext';
import { usePrefs } from '../store/usePrefs';
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
type FeedItem = { type: 'game'; game: Game } | { type: 'ad'; key: string; adIdx: number };

function buildFeed(games: Game[]): FeedItem[] {
  const out: FeedItem[] = [];
  let adIdx = 0;
  games.forEach((g, i) => {
    out.push({ type: 'game', game: g });
    if ((i + 1) % AD_EVERY === 0 && i < games.length - 1) {
      out.push({ type: 'ad', key: `ad-${i}`, adIdx });
      adIdx += 1;
    }
  });
  // Always demo all 3 ad variants for showcase by inserting at the end of the first loop
  if (games.length >= 1 && adIdx < 3) {
    for (let i = adIdx; i < 3; i += 1) {
      out.push({ type: 'ad', key: `ad-extra-${i}`, adIdx: i });
    }
  }
  return out;
}

const viewabilityConfig = { itemVisiblePercentThreshold: 60 };

export function FeedScreen({ onPlay, onToast, bottomInset, feedIdx, setFeedIdx }: Props) {
  const { height } = useWindowDimensions();
  const { playing, trackName, toggle, nextTrack } = useLofi();
  const { likes, saves, toggleLike, toggleSave } = usePrefs();

  const items = useRef<FeedItem[]>(buildFeed(GAMES)).current;
  const listRef = useRef<FlatList<FeedItem>>(null);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (!viewableItems.length) return;
    const idx = viewableItems[0].index ?? 0;
    setFeedIdx(idx);
    Haptics.selectionAsync().catch(() => {});
    const item = items[idx];
    if (item?.type === 'game') logEvent({ type: 'view', gameId: item.game.id });
  }).current;

  const handleShare = useCallback(async (game: Game) => {
    try {
      await Share.share({
        message: `Зацени «${game.name}» в Луп — ${game.tagline}`,
      });
      logEvent({ type: 'share', gameId: game.id });
    } catch {
      onToast('Не получилось поделиться');
    }
  }, [onToast]);

  const handleSave = useCallback(
    (game: Game) => {
      const next = !saves[game.id];
      toggleSave(game.id);
      onToast(next ? '✅ Сохранено!' : 'Убрано из сохранённого');
      logEvent({ type: next ? 'save' : 'unsave', gameId: game.id });
    },
    [saves, toggleSave, onToast]
  );

  const handleLike = useCallback(
    (game: Game) => {
      const next = !likes[game.id];
      toggleLike(game.id);
      logEvent({ type: next ? 'like' : 'unlike', gameId: game.id });
    },
    [likes, toggleLike]
  );

  const renderItem = useCallback(
    ({ item, index }: { item: FeedItem; index: number }) => {
      if (item.type === 'ad') {
        return <AdSlot height={height} bottomInset={bottomInset} index={item.adIdx} />;
      }
      const g = item.game;
      return (
        <GameCard
          game={g}
          isActive={index === feedIdx}
          onPlay={() => {
            logEvent({ type: 'play', gameId: g.id });
            onPlay(g);
          }}
          liked={!!likes[g.id]}
          onLike={() => handleLike(g)}
          saved={!!saves[g.id]}
          onSave={() => handleSave(g)}
          onShare={() => handleShare(g)}
          onComment={() => onToast('Комментарии скоро')}
          commentsCount={g.comments}
          creator={g.creator}
          musicPlaying={playing}
          trackName={trackName}
          onMusicToggle={toggle}
          onNextTrack={nextTrack}
          bottomInset={bottomInset}
        />
      );
    },
    [feedIdx, height, bottomInset, likes, saves, playing, trackName, toggle, nextTrack, onPlay, handleLike, handleSave, handleShare]
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <FlatList
        ref={listRef}
        data={items}
        keyExtractor={(it) => (it.type === 'ad' ? it.key : `g-${it.game.id}`)}
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
