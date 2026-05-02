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

-- No SELECT policy on events — clients can't read their own analytics.
-- Use the service_role key from a server cron to aggregate.

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
