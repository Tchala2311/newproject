-- Loop / Луп — Supabase schema + Row Level Security (RLS) policies.
--
-- HOW TO APPLY:
--   1. Create a new project at https://supabase.com/dashboard
--   2. Open SQL Editor → New query
--   3. Paste this whole file → Run
--   4. (Optional) re-run after edits — uses CREATE OR REPLACE / IF NOT EXISTS
--
-- SECURITY MODEL:
--   - Every table has RLS enabled. Without policies, *nothing* is readable
--     or writable, including via the anon key.
--   - The anon key is safe to ship in the client bundle because RLS gates
--     every row.
--   - The service_role key bypasses RLS — never put it in client code or
--     any EXPO_PUBLIC_* var.
-- ============================================================================

-- ---------- profiles ---------------------------------------------------------
-- One row per auth user. Created via trigger when auth.users row inserted.
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  handle      text unique not null check (handle ~ '^[a-z0-9_.]{3,20}$'),
  display_name text,
  avatar_color text not null default '#C99FE6',
  bio         text,
  created_at  timestamptz not null default now()
);

create index if not exists profiles_handle_idx on public.profiles (handle);

alter table public.profiles enable row level security;

-- Anyone (signed in or not) can read profiles — they're public-by-design.
drop policy if exists "profiles_read_all" on public.profiles;
create policy "profiles_read_all" on public.profiles
  for select using (true);

-- A user can insert/update/delete only their own profile row.
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_delete_own" on public.profiles
  for delete using (auth.uid() = id);

-- ---------- follows ----------------------------------------------------------
create table if not exists public.follows (
  follower_id  uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create index if not exists follows_following_idx on public.follows (following_id);

alter table public.follows enable row level security;

drop policy if exists "follows_read_all" on public.follows;
create policy "follows_read_all" on public.follows for select using (true);

drop policy if exists "follows_insert_self" on public.follows;
create policy "follows_insert_self" on public.follows
  for insert with check (auth.uid() = follower_id);

drop policy if exists "follows_delete_self" on public.follows;
create policy "follows_delete_self" on public.follows
  for delete using (auth.uid() = follower_id);

-- ---------- likes ------------------------------------------------------------
create table if not exists public.likes (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  game_id    int  not null,
  created_at timestamptz not null default now(),
  primary key (user_id, game_id)
);

create index if not exists likes_game_idx on public.likes (game_id);

alter table public.likes enable row level security;

drop policy if exists "likes_read_all" on public.likes;
create policy "likes_read_all" on public.likes for select using (true);

drop policy if exists "likes_write_self" on public.likes;
create policy "likes_write_self" on public.likes
  for insert with check (auth.uid() = user_id);

drop policy if exists "likes_delete_self" on public.likes;
create policy "likes_delete_self" on public.likes
  for delete using (auth.uid() = user_id);

-- ---------- saves ------------------------------------------------------------
-- Saves are a private bookmark — only the owner can read them.
create table if not exists public.saves (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  game_id    int  not null,
  created_at timestamptz not null default now(),
  primary key (user_id, game_id)
);

alter table public.saves enable row level security;

drop policy if exists "saves_read_self" on public.saves;
create policy "saves_read_self" on public.saves
  for select using (auth.uid() = user_id);

drop policy if exists "saves_write_self" on public.saves;
create policy "saves_write_self" on public.saves
  for insert with check (auth.uid() = user_id);

drop policy if exists "saves_delete_self" on public.saves;
create policy "saves_delete_self" on public.saves
  for delete using (auth.uid() = user_id);

-- ---------- comments ---------------------------------------------------------
create table if not exists public.comments (
  id         uuid primary key default gen_random_uuid(),
  game_id    int  not null,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  body       text not null check (length(body) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists comments_game_idx on public.comments (game_id, created_at desc);

alter table public.comments enable row level security;

drop policy if exists "comments_read_all" on public.comments;
create policy "comments_read_all" on public.comments for select using (true);

drop policy if exists "comments_insert_self" on public.comments;
create policy "comments_insert_self" on public.comments
  for insert with check (auth.uid() = user_id);

drop policy if exists "comments_update_self" on public.comments;
create policy "comments_update_self" on public.comments
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "comments_delete_self" on public.comments;
create policy "comments_delete_self" on public.comments
  for delete using (auth.uid() = user_id);

-- ---------- comment_likes ----------------------------------------------------
create table if not exists public.comment_likes (
  comment_id uuid not null references public.comments(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

alter table public.comment_likes enable row level security;

drop policy if exists "clikes_read_all" on public.comment_likes;
create policy "clikes_read_all" on public.comment_likes for select using (true);

drop policy if exists "clikes_write_self" on public.comment_likes;
create policy "clikes_write_self" on public.comment_likes
  for insert with check (auth.uid() = user_id);

drop policy if exists "clikes_delete_self" on public.comment_likes;
create policy "clikes_delete_self" on public.comment_likes
  for delete using (auth.uid() = user_id);

-- ---------- events (analytics) ----------------------------------------------
-- Append-only analytics log. Users can insert their own; nobody (except
-- service_role from a backend job) can read.
create table if not exists public.events (
  id         bigserial primary key,
  user_id    uuid references public.profiles(id) on delete set null,
  type       text not null,
  game_id    int,
  meta       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists events_created_idx on public.events (created_at desc);

alter table public.events enable row level security;

drop policy if exists "events_insert_self" on public.events;
create policy "events_insert_self" on public.events
  for insert with check (auth.uid() = user_id or user_id is null);

-- The recommender builds each user's interest profile ON THE CLIENT, reading
-- their behavioral history (play / view / skip / complete) back from `events`,
-- so users may SELECT their OWN events only. No cross-user visibility.
drop policy if exists "events_select_self" on public.events;
create policy "events_select_self" on public.events
  for select using (auth.uid() = user_id);

-- ---------- profile creation trigger ----------------------------------------
-- Profile rows are created by the client via OnboardingScreen (it picks the
-- handle, name, color). We do NOT auto-insert a profile on signup, because
-- the handle is required and unique — let the client choose it before we
-- write anything.

-- Helpful view for popular games (counts likes/comments). Public-readable.
create or replace view public.game_stats as
select
  game_id,
  (select count(*) from public.likes l where l.game_id = g.game_id) as like_count,
  (select count(*) from public.comments c where c.game_id = g.game_id) as comment_count
from (select distinct game_id from public.likes
      union select distinct game_id from public.comments) g;

grant select on public.game_stats to anon, authenticated;

-- ---------- comment_like_counts RPC ----------------------------------------
-- Bulk-counts likes for an array of comment ids in one round-trip.
-- Used by CommentsSheet to avoid N queries.
create or replace function public.comment_like_counts(ids uuid[])
returns table(comment_id uuid, n bigint)
language sql stable as $$
  select comment_id, count(*)::bigint as n
  from public.comment_likes
  where comment_id = any(ids)
  group by comment_id;
$$;

grant execute on function public.comment_like_counts(uuid[]) to anon, authenticated;

-- ---------- find_profile_by_handle RPC -------------------------------------
-- Case-insensitive lookup so tapping @handle in comments / share links can
-- open a profile even if casing differs.
create or replace function public.find_profile_by_handle(p_handle text)
returns setof public.profiles
language sql stable as $$
  select * from public.profiles where lower(handle) = lower(p_handle) limit 1;
$$;

grant execute on function public.find_profile_by_handle(text) to anon, authenticated;

-- ============================================================================
-- Recommender system (X-algorithm-inspired, small-scale heuristic version)
-- ============================================================================

-- ---------- feed_impressions -----------------------------------------------
-- Every time the recommender shows a game card to a user we log one row.
-- Position is the index in the feed at the time of impression.
-- engaged becomes true if any like/save/comment/play happens during the
-- session (updated by the client via mark_impression_engaged RPC).
create table if not exists public.feed_impressions (
  id           bigserial primary key,
  user_id      uuid references public.profiles(id) on delete cascade,
  game_id      int  not null,
  position     int  not null default 0,
  shown_at     timestamptz not null default now(),
  dwell_ms     int,
  engaged      boolean not null default false
);

create index if not exists feed_impressions_user_recent_idx
  on public.feed_impressions (user_id, shown_at desc);
create index if not exists feed_impressions_game_recent_idx
  on public.feed_impressions (game_id, shown_at desc);

alter table public.feed_impressions enable row level security;

drop policy if exists "impressions_insert_self" on public.feed_impressions;
create policy "impressions_insert_self" on public.feed_impressions
  for insert with check (auth.uid() = user_id);

drop policy if exists "impressions_read_self" on public.feed_impressions;
create policy "impressions_read_self" on public.feed_impressions
  for select using (auth.uid() = user_id);

drop policy if exists "impressions_update_self" on public.feed_impressions;
create policy "impressions_update_self" on public.feed_impressions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- recommend_signals RPC ------------------------------------------
-- Single round-trip that returns everything the client recommender needs.
-- Returns one row per game with the engagement signals + recency.
-- Trending = likes_24h * 3 + comments_24h * 5 + saves_24h * 4
create or replace function public.recommend_signals()
returns table(
  game_id int,
  total_likes bigint,
  total_saves bigint,
  total_comments bigint,
  likes_24h bigint,
  comments_24h bigint,
  saves_24h bigint
)
language sql stable as $$
  with games as (
    select distinct game_id from public.likes
    union select distinct game_id from public.comments
    union select distinct game_id from public.saves
  )
  select
    g.game_id,
    coalesce((select count(*) from public.likes where game_id = g.game_id), 0) as total_likes,
    coalesce((select count(*) from public.saves where game_id = g.game_id), 0) as total_saves,
    coalesce((select count(*) from public.comments where game_id = g.game_id), 0) as total_comments,
    coalesce((select count(*) from public.likes where game_id = g.game_id and created_at > now() - interval '24 hours'), 0) as likes_24h,
    coalesce((select count(*) from public.comments where game_id = g.game_id and created_at > now() - interval '24 hours'), 0) as comments_24h,
    coalesce((select count(*) from public.saves where game_id = g.game_id and created_at > now() - interval '24 hours'), 0) as saves_24h
  from games g;
$$;

grant execute on function public.recommend_signals() to anon, authenticated;

-- ---------- co_engagement RPC ----------------------------------------------
-- For each game the current user has liked, find OTHER users who liked it,
-- then collect THEIR other liked games. The output `score` is the count of
-- co-occurrences. This is collaborative filtering — "people who liked X also
-- liked Y" — implemented as one CTE-only SQL pass; works fine while the
-- catalog is small. Maps to X's TwHIN co-engagement signal in spirit.
create or replace function public.co_engagement_for_user(uid uuid, top_n int default 30)
returns table(game_id int, score bigint)
language sql stable as $$
  with my_likes as (
    select game_id from public.likes where user_id = uid
  ),
  others as (
    select user_id from public.likes
    where game_id in (select game_id from my_likes)
      and user_id <> uid
  ),
  candidates as (
    select l.game_id, count(*) as score
    from public.likes l
    where l.user_id in (select user_id from others)
      and l.game_id not in (select game_id from my_likes)
    group by l.game_id
  )
  select * from candidates order by score desc limit top_n;
$$;

grant execute on function public.co_engagement_for_user(uuid, int) to anon, authenticated;

-- ---------- recent_impressions RPC -----------------------------------------
-- Returns game_ids the user has been shown in the last N hours, with how many
-- times. Used to apply a recency penalty so we don't repeat the feed.
create or replace function public.recent_impressions_for_user(uid uuid, hours int default 24)
returns table(game_id int, n bigint)
language sql stable as $$
  select game_id, count(*) as n
  from public.feed_impressions
  where user_id = uid
    and shown_at > now() - (hours || ' hours')::interval
  group by game_id;
$$;

grant execute on function public.recent_impressions_for_user(uuid, int) to anon, authenticated;

-- ============================================================================
-- Game progress + achievements
-- ============================================================================

-- ---------- game_progress --------------------------------------------------
-- One row per (user, game). Stores latest checkpoint so the user can
-- resume where they left off. Updated on every level start/end.
create table if not exists public.game_progress (
  user_id      uuid not null references public.profiles(id) on delete cascade,
  game_id      int  not null,
  level        int  not null default 1,
  best_level   int  not null default 1,
  best_score   int  not null default 0,
  total_plays  int  not null default 0,
  total_wins   int  not null default 0,
  total_losses int  not null default 0,
  retries      int  not null default 0,
  updated_at   timestamptz not null default now(),
  primary key (user_id, game_id)
);

alter table public.game_progress enable row level security;

drop policy if exists "progress_read_self" on public.game_progress;
create policy "progress_read_self" on public.game_progress
  for select using (auth.uid() = user_id);

drop policy if exists "progress_write_self" on public.game_progress;
create policy "progress_write_self" on public.game_progress
  for insert with check (auth.uid() = user_id);

drop policy if exists "progress_update_self" on public.game_progress;
create policy "progress_update_self" on public.game_progress
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "progress_delete_self" on public.game_progress;
create policy "progress_delete_self" on public.game_progress
  for delete using (auth.uid() = user_id);

-- ---------- user_achievements ----------------------------------------------
-- Achievement IDs are defined in client code (src/lib/achievements/catalog.ts);
-- this table just records which the user has unlocked + when.
create table if not exists public.user_achievements (
  user_id        uuid not null references public.profiles(id) on delete cascade,
  achievement_id text not null,
  unlocked_at    timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

alter table public.user_achievements enable row level security;

drop policy if exists "ach_read_all" on public.user_achievements;
create policy "ach_read_all" on public.user_achievements
  for select using (true);  -- public so other users can see your badges

drop policy if exists "ach_insert_self" on public.user_achievements;
create policy "ach_insert_self" on public.user_achievements
  for insert with check (auth.uid() = user_id);

drop policy if exists "ach_delete_self" on public.user_achievements;
create policy "ach_delete_self" on public.user_achievements
  for delete using (auth.uid() = user_id);

-- ============================================================================
-- v3 additions: creator_follows, daily_challenges, daily_scores, not_interested
-- ============================================================================

-- ---------- creator_follows -------------------------------------------------
-- Users follow creators by handle (creators are seeded in code, not always
-- profile rows). This is what the Following tab actually uses.
create table if not exists public.creator_follows (
  user_id        uuid not null references public.profiles(id) on delete cascade,
  creator_handle text not null,
  created_at     timestamptz not null default now(),
  primary key (user_id, creator_handle)
);

create index if not exists creator_follows_handle_idx
  on public.creator_follows (creator_handle);

alter table public.creator_follows enable row level security;

drop policy if exists "cfollows_read_all" on public.creator_follows;
create policy "cfollows_read_all" on public.creator_follows for select using (true);

drop policy if exists "cfollows_insert_self" on public.creator_follows;
create policy "cfollows_insert_self" on public.creator_follows
  for insert with check (auth.uid() = user_id);

drop policy if exists "cfollows_delete_self" on public.creator_follows;
create policy "cfollows_delete_self" on public.creator_follows
  for delete using (auth.uid() = user_id);

-- Followers count per creator (cheap aggregate) — public.
create or replace function public.creator_follower_count(handle text)
returns bigint
language sql stable as $$
  select count(*)::bigint from public.creator_follows where creator_handle = handle;
$$;

grant execute on function public.creator_follower_count(text) to anon, authenticated;

-- ---------- not_interested --------------------------------------------------
-- Long-press → "Не интересно". Strong negative signal for the ranker.
create table if not exists public.not_interested (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  game_id    int  not null,
  created_at timestamptz not null default now(),
  primary key (user_id, game_id)
);

alter table public.not_interested enable row level security;

drop policy if exists "ni_read_self" on public.not_interested;
create policy "ni_read_self" on public.not_interested
  for select using (auth.uid() = user_id);

drop policy if exists "ni_write_self" on public.not_interested;
create policy "ni_write_self" on public.not_interested
  for insert with check (auth.uid() = user_id);

drop policy if exists "ni_delete_self" on public.not_interested;
create policy "ni_delete_self" on public.not_interested
  for delete using (auth.uid() = user_id);

-- ---------- daily_scores ----------------------------------------------------
-- Per (user, day, game) best score. Powers the daily challenge leaderboard.
create table if not exists public.daily_scores (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  day        date not null default current_date,
  game_id    int  not null,
  score      int  not null,
  created_at timestamptz not null default now(),
  primary key (user_id, day, game_id)
);

create index if not exists daily_scores_day_game_idx
  on public.daily_scores (day, game_id, score desc);

alter table public.daily_scores enable row level security;

drop policy if exists "dscores_read_all" on public.daily_scores;
create policy "dscores_read_all" on public.daily_scores for select using (true);

drop policy if exists "dscores_write_self" on public.daily_scores;
create policy "dscores_write_self" on public.daily_scores
  for insert with check (auth.uid() = user_id);

drop policy if exists "dscores_update_self" on public.daily_scores;
create policy "dscores_update_self" on public.daily_scores
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Top-N leaderboard for today's challenge (public).
create or replace function public.daily_leaderboard(p_game_id int, p_day date default current_date, p_limit int default 50)
returns table(user_id uuid, handle text, display_name text, avatar_color text, score int, rank int)
language sql stable as $$
  select
    s.user_id,
    p.handle,
    p.display_name,
    p.avatar_color,
    s.score,
    (rank() over (order by s.score desc))::int as rank
  from public.daily_scores s
  join public.profiles p on p.id = s.user_id
  where s.game_id = p_game_id and s.day = p_day
  order by s.score desc
  limit p_limit;
$$;

grant execute on function public.daily_leaderboard(int, date, int) to anon, authenticated;
