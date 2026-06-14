import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
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
import { FeedSkeleton } from '../components/FeedSkeleton';
import { DailyChallengeBanner } from '../components/DailyChallengeBanner';
import { useLofi } from '../audio/LofiContext';
import { usePrefs } from '../store/usePrefs';
import { useUser } from '../store/useUser';
import { useAchievements } from '../store/useAchievements';
import { useNotInterested } from '../store/useNotInterested';
import { logEvent } from '../store/events';
import { fontFamily } from '../theme';
import { getRankedFeed, logImpression, markEngaged } from '../lib/recommender';
import type { FeedItem } from '../lib/recommender/mixer';
import { getDailyChallenge } from '../lib/dailyChallenge';

type Props = {
  onPlay: (game: Game) => void;
  onToast: (msg: string) => void;
  onOpenCreator: (creator: Creator) => void;
  bottomInset: number;
  feedIdx: number;
  setFeedIdx: (i: number) => void;
};

type FeedTab = 'forYou' | 'following';

const AD_EVERY = 4;
function buildSimpleFeed(games: Game[]): FeedItem[] {
  const out: FeedItem[] = [];
  let adIdx = 0;
  games.forEach((g, i) => {
    out.push({ type: 'game', game: g });
    if ((i + 1) % AD_EVERY === 0 && i < games.length - 1) {
      out.push({ type: 'ad', key: `ad-${i}`, adIdx });
      adIdx += 1;
    }
  });
  return out;
}

const viewabilityConfig = { itemVisiblePercentThreshold: 60 };
const SKIP_THRESHOLD_MS = 2500;

export function FeedScreen({ onPlay, onToast, onOpenCreator, bottomInset, feedIdx, setFeedIdx }: Props) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { playing, trackName, toggle, nextTrack } = useLofi();
  const { likes, saves, toggleLike, toggleSave } = usePrefs();
  const { user, follows } = useUser();
  const { report } = useAchievements();
  const { notInterested, markNotInterested } = useNotInterested();

  const [tab, setTab] = useState<FeedTab>('forYou');
  const [commentsFor, setCommentsFor] = useState<Game | null>(null);
  const [forYouItems, setForYouItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [adLocked, setAdLocked] = useState(false);
  const [adCountdown, setAdCountdown] = useState(7);
  const listRef = useRef<FlatList<FeedItem>>(null);
  const loggedImpressions = useRef<Set<number>>(new Set());
  const refreshNonceRef = useRef(0);
  const adTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // onViewableItemsChanged must be a STABLE function reference for FlatList, so
  // it can't close over `user.id` directly (that would freeze the value from
  // first render). Read the current id from a ref instead.
  const userIdRef = useRef<string | null>(user?.id ?? null);
  useEffect(() => { userIdRef.current = user?.id ?? null; }, [user?.id]);

  // Track when each game card became visible to compute skip signals.
  const cardVisibleAtRef = useRef<number>(0);

  const dailyChallenge = useMemo(() => getDailyChallenge(), []);

  const buildFeed = useCallback(async (nonce = 0) => {
    try {
      const res = await getRankedFeed({
        userId: user?.id ?? null,
        followsLocal: follows,
        notInterestedLocal: notInterested,
        targetLength: 22,
        refreshNonce: nonce,
      });
      // Drop the result if a newer refresh/tab-switch has superseded this one,
      // so slow earlier requests can't overwrite a fresher feed (out-of-order).
      if (nonce !== refreshNonceRef.current) return;
      setForYouItems(res.items);
    } catch (e) {
      console.warn('recommender failed, falling back to catalog order', e);
      if (nonce !== refreshNonceRef.current) return;
      setForYouItems(buildSimpleFeed(GAMES));
    }
  }, [user?.id, follows, notInterested]);

  const followingGames = useMemo(
    () => GAMES.filter((g) => follows[g.creator.handle]),
    [follows]
  );

  // Show the plain catalog instantly (zero network) so the user sees content
  // immediately, then replace with the ranked feed once the recommender finishes.
  // This mirrors TikTok/Reels behaviour: no "loading…" screen on cold start.
  useEffect(() => {
    let cancelled = false;
    // Instant: pre-populate with shuffled catalog so skeleton never shows.
    if (forYouItems.length === 0) {
      setForYouItems(buildSimpleFeed([...GAMES].sort(() => Math.random() - 0.5)));
    }
    // Background: replace with ranked feed; don't change scroll position.
    buildFeed(0).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Rebuild the ranked feed in the background whenever the user's follow list
  // changes — inNetworkCandidates needs the updated set immediately so that
  // a newly followed creator's games surface without a manual pull-to-refresh.
  const followsRef = useRef(follows);
  useEffect(() => {
    if (followsRef.current === follows) return;
    followsRef.current = follows;
    const nonce = refreshNonceRef.current + 1;
    refreshNonceRef.current = nonce;
    setRefreshNonce(nonce);
    buildFeed(nonce).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [follows]);

  // Pull-to-refresh handler — Reels/TikTok-style. Re-runs the ranker with a
  // fresh nonce so ordering visibly changes, scrolls to top, and fires a
  // success haptic + toast so it's obvious the feed updated.
  const onRefresh = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    // Instant: shuffle current items so the feed visibly changes right away
    setForYouItems((prev) => [...prev].sort(() => Math.random() - 0.5));
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
    setFeedIdx(0);
    loggedImpressions.current.clear();
    setRefreshing(true);
    const nonce = refreshNonceRef.current + 1;
    refreshNonceRef.current = nonce;
    setRefreshNonce(nonce);
    // Dismiss spinner quickly — ranked feed replaces items silently in background
    setTimeout(() => setRefreshing(false), 500);
    buildFeed(nonce).then(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      onToast('🎉 Лента обновлена');
    }).catch(() => {});
  }, [buildFeed, onToast, setFeedIdx]);

  const followingItems = useMemo<FeedItem[]>(() => buildSimpleFeed(followingGames), [followingGames]);
  const items = tab === 'forYou' ? forYouItems : followingItems;

  // Lock scrolling for 7 seconds whenever an ad slot is the visible item.
  const isAdVisible = items[feedIdx]?.type === 'ad';
  useEffect(() => {
    if (!isAdVisible) {
      if (adTimerRef.current) { clearInterval(adTimerRef.current); adTimerRef.current = null; }
      setAdLocked(false);
      setAdCountdown(7);
      return;
    }
    setAdLocked(true);
    setAdCountdown(7);
    let count = 7;
    adTimerRef.current = setInterval(() => {
      count -= 1;
      setAdCountdown(count);
      if (count <= 0) {
        clearInterval(adTimerRef.current!);
        adTimerRef.current = null;
        setAdLocked(false);
      }
    }, 1000);
    return () => {
      if (adTimerRef.current) { clearInterval(adTimerRef.current); adTimerRef.current = null; }
    };
  }, [isAdVisible]);

  // prevGameIdRef: tracks the last visible game so we can emit a skip if the
  // user swiped past it faster than SKIP_THRESHOLD_MS.
  const prevGameIdRef = useRef<number | null>(null);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (!viewableItems.length) return;
    const idx = viewableItems[0].index ?? 0;
    const now = Date.now();

    // Emit skip for the card we're leaving if the user barely glanced at it.
    if (prevGameIdRef.current !== null && cardVisibleAtRef.current > 0) {
      const dwellMs = now - cardVisibleAtRef.current;
      if (dwellMs < SKIP_THRESHOLD_MS) {
        logEvent({ type: 'skip', gameId: prevGameIdRef.current });
      }
    }

    setFeedIdx(idx);
    Haptics.selectionAsync().catch(() => {});

    const item = viewableItems[0].item as FeedItem | undefined;
    prevGameIdRef.current = item?.type === 'game' ? item.game.id : null;
    cardVisibleAtRef.current = now;

    // Log impression once per (session, game)
    if (item?.type === 'game' && !loggedImpressions.current.has(item.game.id)) {
      loggedImpressions.current.add(item.game.id);
      logImpression(userIdRef.current, item.game.id, idx);
    }
  }).current;

  const handleShare = useCallback(async (game: Game) => {
    try {
      const link = `flik://game/${game.slug}`;
      await Share.share({
        message: `Зацени «${game.name}» в FLIK — ${game.tagline}\n${link}`,
      });
      logEvent({ type: 'share', gameId: game.id });
      markEngaged(user?.id ?? null, game.id);
    } catch {
      onToast('Не получилось поделиться');
    }
  }, [onToast, user?.id]);

  const handleSave = useCallback((game: Game) => {
    const next = !saves[game.id];
    toggleSave(game.id);
    onToast(next ? '✅ Сохранено!' : 'Убрано из сохранённого');
    logEvent({ type: next ? 'save' : 'unsave', gameId: game.id });
    if (next) markEngaged(user?.id ?? null, game.id);
  }, [saves, toggleSave, onToast, user?.id]);

  const handleLike = useCallback((game: Game) => {
    const next = !likes[game.id];
    toggleLike(game.id);
    logEvent({ type: next ? 'like' : 'unlike', gameId: game.id });
    if (next) markEngaged(user?.id ?? null, game.id);
  }, [likes, toggleLike, user?.id]);

  const handleComment = useCallback((game: Game) => {
    setCommentsFor(game);
    markEngaged(user?.id ?? null, game.id);
    report({ type: 'comment' });
  }, [user?.id, report]);

  const handleNotInterested = useCallback((game: Game) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    markNotInterested(game.id);
    onToast('Не покажем больше 👌');
    logEvent({ type: 'skip', gameId: game.id });
    // Remove from current feed immediately so user sees instant feedback;
    // the next refresh will rebuild from scratch with the negative weight.
    setForYouItems((prev) => prev.filter((it) => it.type === 'ad' || it.game.id !== game.id));
  }, [markNotInterested, onToast]);

  const switchTab = (next: FeedTab) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (next === tab) {
      if (next === 'forYou') {
        // Instant shuffle so the user sees a new order immediately, no network wait
        setForYouItems((prev) => [...prev].sort(() => Math.random() - 0.5));
        listRef.current?.scrollToOffset({ offset: 0, animated: true });
        setFeedIdx(0);
        loggedImpressions.current.clear();
        // Then replace with properly ranked items in background
        const nonce = refreshNonceRef.current + 1;
        refreshNonceRef.current = nonce;
        setRefreshNonce(nonce);
        buildFeed(nonce);
      } else {
        listRef.current?.scrollToOffset({ offset: 0, animated: true });
        setFeedIdx(0);
      }
      return;
    }
    setTab(next);
    setFeedIdx(0);
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  };

  const renderItem = useCallback(
    ({ item, index }: { item: FeedItem; index: number }) => {
      if (item.type === 'ad') {
        return <AdSlot height={height} bottomInset={bottomInset} index={item.adIdx} locked={adLocked} countdown={adCountdown} />;
      }
      const g = item.game;
      const isDailyChallenge = g.id === dailyChallenge.game.id && index === 0 && tab === 'forYou';
      return (
        <View>
          <GameCard
            game={g}
            isActive={index === feedIdx}
            onPlay={() => {
              logEvent({ type: 'play', gameId: g.id });
              markEngaged(user?.id ?? null, g.id);
              onPlay(g);
            }}
            liked={!!likes[g.id]}
            onLike={() => handleLike(g)}
            saved={!!saves[g.id]}
            onSave={() => handleSave(g)}
            onShare={() => handleShare(g)}
            onComment={() => handleComment(g)}
            onNotInterested={() => handleNotInterested(g)}
            commentsCount={g.comments}
            creator={g.creator}
            onCreatorPress={() => onOpenCreator(g.creator)}
            musicPlaying={playing}
            trackName={trackName}
            onMusicToggle={toggle}
            onNextTrack={nextTrack}
            bottomInset={bottomInset}
          />
          {isDailyChallenge ? <DailyChallengeBanner game={g} /> : null}
        </View>
      );
    },
    [feedIdx, height, bottomInset, likes, saves, playing, trackName, toggle, nextTrack, onPlay, handleLike, handleSave, handleShare, handleComment, handleNotInterested, onOpenCreator, user?.id, dailyChallenge.game.id, tab, adLocked, adCountdown]
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      {refreshing && tab === 'forYou' && items.length === 0 ? <FeedSkeleton /> : null}

      <FlatList
        ref={listRef}
        data={items}
        keyExtractor={(it) => (it.type === 'ad' ? it.key : `g-${it.game.id}`)}
        renderItem={renderItem}
        pagingEnabled
        scrollEnabled={!adLocked}
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
        refreshControl={
          tab === 'forYou' ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#fff"
              colors={['#C99FE6']}
              progressBackgroundColor="#13122A"
              title="Тяни вниз чтобы обновить"
              titleColor="rgba(255,255,255,0.7)"
            />
          ) : undefined
        }
      />

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

      {tab === 'following' && items.length === 0 ? (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 }}>
          <Text style={{ fontSize: 56, marginBottom: 12 }}>👥</Text>
          <Text style={{ fontSize: 18, fontFamily: fontFamily.bold, color: '#fff', marginBottom: 6 }}>
            Подписок пока нет
          </Text>
          <Text style={{ fontSize: 13, fontFamily: fontFamily.medium, color: 'rgba(255,255,255,0.6)', textAlign: 'center', lineHeight: 20 }}>
            Тапни по аватарке любого автора в ленте «Для тебя» чтобы подписаться. Их игры появятся здесь.
          </Text>
          <Pressable
            onPress={() => switchTab('forYou')}
            style={{
              marginTop: 18,
              paddingHorizontal: 22,
              paddingVertical: 11,
              borderRadius: 999,
              backgroundColor: '#C99FE6',
            }}
          >
            <Text style={{ fontSize: 13, fontFamily: fontFamily.bold, color: '#000' }}>
              Открыть «Для тебя»
            </Text>
          </Pressable>
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
