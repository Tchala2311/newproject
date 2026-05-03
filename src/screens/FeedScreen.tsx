import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  Share,
  Text,
  View,
  ViewToken,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { GAMES, Game, Creator } from '../data/games';
import { GameCard } from '../components/GameCard';
import { AdSlot } from '../components/AdSlot';
import { CommentsSheet } from '../components/CommentsSheet';
import { useLofi } from '../audio/LofiContext';
import { usePrefs } from '../store/usePrefs';
import { useUser } from '../store/useUser';
import { logEvent } from '../store/events';
import { fontFamily } from '../theme';

type Props = {
  onPlay: (game: Game) => void;
  onToast: (msg: string) => void;
  onOpenCreator: (creator: Creator) => void;
  bottomInset: number;
  feedIdx: number;
  setFeedIdx: (i: number) => void;
};

// We interleave an ad-slot card after every Nth game.
const AD_EVERY = 4;
type FeedItem = { type: 'game'; game: Game } | { type: 'ad'; key: string; adIdx: number };
type FeedTab = 'forYou' | 'following';

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
  if (games.length >= 1 && adIdx < 3) {
    for (let i = adIdx; i < 3; i += 1) {
      out.push({ type: 'ad', key: `ad-extra-${i}`, adIdx: i });
    }
  }
  return out;
}

const viewabilityConfig = { itemVisiblePercentThreshold: 60 };

export function FeedScreen({ onPlay, onToast, onOpenCreator, bottomInset, feedIdx, setFeedIdx }: Props) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { playing, trackName, toggle, nextTrack } = useLofi();
  const { likes, saves, toggleLike, toggleSave } = usePrefs();
  const { follows } = useUser();

  const [tab, setTab] = useState<FeedTab>('forYou');
  const [commentsFor, setCommentsFor] = useState<Game | null>(null);
  const listRef = useRef<FlatList<FeedItem>>(null);

  const followingGames = useMemo(
    () => GAMES.filter((g) => follows[g.creator.handle]),
    [follows]
  );

  const items = useMemo<FeedItem[]>(() => {
    const games = tab === 'forYou' ? GAMES : followingGames;
    return buildFeed(games);
  }, [tab, followingGames]);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (!viewableItems.length) return;
    const idx = viewableItems[0].index ?? 0;
    setFeedIdx(idx);
    Haptics.selectionAsync().catch(() => {});
  }).current;

  const handleShare = useCallback(async (game: Game) => {
    try {
      await Share.share({ message: `Зацени «${game.name}» в Луп — ${game.tagline}` });
      logEvent({ type: 'share', gameId: game.id });
    } catch {
      onToast('Не получилось поделиться');
    }
  }, [onToast]);

  const handleSave = useCallback((game: Game) => {
    const next = !saves[game.id];
    toggleSave(game.id);
    onToast(next ? '✅ Сохранено!' : 'Убрано из сохранённого');
    logEvent({ type: next ? 'save' : 'unsave', gameId: game.id });
  }, [saves, toggleSave, onToast]);

  const handleLike = useCallback((game: Game) => {
    const next = !likes[game.id];
    toggleLike(game.id);
    logEvent({ type: next ? 'like' : 'unlike', gameId: game.id });
  }, [likes, toggleLike]);

  const switchTab = (next: FeedTab) => {
    if (next === tab) return;
    if (next === 'following' && followingGames.length === 0) {
      onToast('Подпишись на авторов в онбординге');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setTab(next);
    setFeedIdx(0);
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  };

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
          onComment={() => setCommentsFor(g)}
          commentsCount={g.comments}
          creator={g.creator}
          onCreatorPress={() => onOpenCreator(g.creator)}
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
        extraData={tab}
      />

      {/* Top tab toggle (For You / Following) */}
      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          top: Math.max(insets.top, 14) + 8,
          left: 0,
          right: 0,
          alignItems: 'center',
          zIndex: 10,
        }}
      >
        <View style={{ flexDirection: 'row', gap: 18, alignItems: 'center' }}>
          <TabPill label="Подписки" active={tab === 'following'} onPress={() => switchTab('following')} />
          <View style={{ width: 1, height: 16, backgroundColor: 'rgba(255,255,255,0.3)' }} />
          <TabPill label="Для тебя" active={tab === 'forYou'} onPress={() => switchTab('forYou')} />
        </View>
      </View>

      {/* Empty state for Following */}
      {tab === 'following' && items.length === 0 ? (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 16, fontFamily: fontFamily.bold, color: '#fff', marginBottom: 6 }}>
            Лента подписок пуста
          </Text>
          <Text style={{ fontSize: 13, fontFamily: fontFamily.medium, color: 'rgba(255,255,255,0.55)' }}>
            Открой Профиль и подпишись на авторов
          </Text>
        </View>
      ) : null}

      <CommentsSheet
        visible={!!commentsFor}
        onClose={() => setCommentsFor(null)}
        game={commentsFor}
        onOpenCreator={onOpenCreator}
      />
    </View>
  );
}

function TabPill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={10}>
      <Text
        style={{
          fontSize: 16,
          fontFamily: fontFamily.bold,
          color: active ? '#fff' : 'rgba(255,255,255,0.55)',
          textShadowColor: 'rgba(0,0,0,0.6)',
          textShadowOffset: { width: 0, height: 1 },
          textShadowRadius: 6,
        }}
      >
        {label}
      </Text>
      {active ? (
        <View
          style={{
            height: 2,
            backgroundColor: '#fff',
            borderRadius: 1,
            marginTop: 4,
          }}
        />
      ) : null}
    </Pressable>
  );
}
