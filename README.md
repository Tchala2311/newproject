# Луп / Loop — quick games feed

A TikTok-style vertical feed of bite-sized mini-games, built for Russian-speaking
Gen Z commuters. Swipe through games, like/save the ones you enjoy, listen to
lofi while you play. Built on React Native + Expo.

This is the **alpha** — feed UX, 5 native mini-games, lofi player shell, ad-slot
stub, AsyncStorage-backed likes/saves, and a local event log to feed a
recommender later.

## Backend setup (Supabase) — required before first run

The app talks to Supabase for auth, profiles, comments, follows, etc.
Without Supabase env vars configured, the app will throw on launch.

### 1. Create a Supabase project
- Go to https://supabase.com/dashboard → **New project**
- Region: closest to you (Frankfurt for RU users gives lowest latency)
- Save the **database password** somewhere safe — you won't see it again

### 2. Run the schema
- In your project, open **SQL Editor → New query**
- Paste the entire contents of `supabase/schema.sql`
- Click **Run**. It creates tables (profiles, follows, likes, saves, comments,
  events) with Row Level Security policies that protect every row.

### 3. Configure email auth
- **Authentication → Providers → Email**: enable, leave "Confirm email" ON
- **Authentication → Email Templates → Magic Link**: not needed; we use OTP
- **Authentication → URL Configuration**: add `loop://` (placeholder) — not
  used in OTP flow but Supabase requires something here

### 4. Wire env vars locally
```bash
cp .env.example .env
```
Then open `.env` and paste from your Supabase dashboard
(**Settings → API**):
- `EXPO_PUBLIC_SUPABASE_URL` ← *Project URL*
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` ← *anon public* key

The anon key is **safe to ship in the client**. The Row Level Security
policies in `schema.sql` are what actually protect data. The
`service_role` key — which is *not* safe — is only ever used from a
backend job; never put it anywhere in this app.

`.env` is git-ignored. Only `.env.example` (with placeholder values) is
committed.

---

## Run on your iPhone in 5 minutes

You'll test via **Expo Go**, no Apple Developer account or Xcode build needed for
the alpha.

### 1. Install Node + Expo CLI

```bash
# If you don't have Node yet, install via Homebrew (Mac):
brew install node

# Or via nvm:
# nvm install 20

# Verify
node --version  # 20.x or newer
```

### 2. Install dependencies

```bash
cd /path/to/this/repo
npm install
```

### 3. Install Expo Go on your iPhone

- App Store → search "Expo Go" → install
  (still available on the Russian App Store; if not, sign in with a non-RU
  Apple ID temporarily, or use TestFlight once we ship a dev client.)

### 4. Start the dev server

```bash
npm start
```

A QR code appears in your terminal. **Both your Mac and your iPhone must be on
the same Wi-Fi network.** If your home/office Wi-Fi blocks peer connections,
start in tunnel mode instead:

```bash
npm run tunnel
```

### 5. Open the app

- iPhone → Camera → point at the QR code → tap the Expo Go banner
- The app bundles (~30 sec first time) and opens

## What works in the alpha

- ✅ Vertical swipe feed with snap pagination + haptics on swipe
- ✅ 5 playable mini-games (Залей цветом, Тап-Раш, Слово-Взрыв, Башня, Волна 2048)
- ✅ Glass-morphism game cards matching the Gamify v2 design
- ✅ Like / Save / Share actions, persisted via AsyncStorage
- ✅ Bottom nav: Для тебя · Поиск · Профиль
- ✅ Explore grid with category filters
- ✅ Profile with stats, tab switcher (Recent/Saved/Liked)
- ✅ Music badge with spinning vinyl + marquee track name
- ✅ Ad-slot stub every 4 games (subscription upsell card)
- ✅ Local event log that captures view/play/like/save/share/complete events
- ✅ Russian-first UI

## What's stubbed for now

- 🟡 **Lofi audio** — UI is wired but no tracks bundled. See `assets/lofi/README.md`
  to drop in royalty-free MP3s, then uncomment the `require()` lines in
  `src/audio/LofiContext.tsx`. The badge animates with or without audio.
- 🟡 **Ad SDK** — slot is a branded subscription upsell card. Swap for Yandex
  Mobile Ads SDK before public release (AdMob pulled out of RU in 2022).
- 🟡 **Recommender** — feed order is hard-coded to `GAMES`. Local event log is
  collecting the data we'll need; v2 will run a heuristic ranker over it.
- 🟡 **Auth + sync** — guest play only. Supabase wiring lands in v2 alongside
  cloud-side ranking.

## Project layout

```
App.tsx                       # Entry — fonts, providers, screen routing
index.ts                      # registerRootComponent
app.json                      # Expo config (RU locale, dark mode, audio bg)
src/
├── theme/index.ts            # Colors, typography, spacing, SAFE_TOP
├── data/games.ts             # Game catalog (Russian names + categories)
├── audio/LofiContext.tsx     # Persistent lofi player across screens
├── store/
│   ├── usePrefs.tsx          # likes + saves with AsyncStorage
│   └── events.ts             # Local event log (recommender input)
├── components/
│   ├── Glass.tsx             # iOS BlurView + Android translucent fallback
│   ├── BgPattern.tsx         # 6 SVG decoration variants per game
│   ├── GameCard.tsx          # The big swipeable card
│   ├── GamePreview.tsx       # Tiny per-game thumbnails for Explore grid
│   ├── ActionButton.tsx      # Like/Save/Share circular buttons
│   ├── MusicBadge.tsx        # Vinyl + marquee track name
│   ├── BottomNav.tsx         # Tab bar
│   ├── AmbientBackground.tsx # Violet/magenta haze
│   ├── AdSlot.tsx            # Subscription upsell (placeholder for ads)
│   └── Toast.tsx             # Auto-dismissing message
├── screens/
│   ├── FeedScreen.tsx        # Vertical FlatList of GameCard + AdSlot
│   ├── ExploreScreen.tsx     # Category chips + 2-col grid
│   └── ProfileScreen.tsx     # Avatar, stats, recent/saved/liked
└── games/
    ├── GameShell.tsx         # Common header, timer, score chip
    ├── GameResult.tsx        # Won/lost overlay
    ├── ColorFlood.tsx        # Flood-fill puzzle
    ├── TapRush.tsx           # 30-sec bubble pop
    ├── WordBlast.tsx         # Anagram (RU words)
    ├── StackIt.tsx           # Tap-timing tower stacker
    ├── MergeWave.tsx         # 2048 to 256
    └── index.tsx             # Game router
```

## Hot-reload tips

- Save any file → Expo Go re-bundles in ~1–3 sec
- Shake the phone for the dev menu (or Cmd+D in simulator)
- "r" in the terminal = full reload
- "j" = open Hermes debugger

## Common iPhone gotchas

| Symptom | Fix |
|---|---|
| QR scan doesn't open | Use the Expo Go app's "Scan QR code" button instead of Camera |
| Network error / can't connect | `npm run tunnel` — uses ngrok-like relay |
| Fonts don't load | Wait for the loading screen; Space Grotesk Cyrillic fetches from CDN on first launch |
| Audio button does nothing | Expected — no MP3s bundled. See `assets/lofi/README.md` |
| Glass effect missing on Android | Expected — BlurView is iOS-only here. Android falls back to translucent tint |

## Roadmap to v2 (next 2–3 weeks)

1. Drop in 5 royalty-free lofi tracks
2. Wire Yandex Mobile Ads SDK (replace AdSlot stub) — interstitial every Nth game, rewarded for "skip ad" actions
3. Supabase project + sync events from `src/store/events.ts` to a Postgres `events` table
4. Edge-function recommender: simple weighted score → returns ranked game IDs
5. Subscription paywall (YooKassa or SberPay for RU) — removes ads + unlocks own-music tier
6. iOS dev-client build for TestFlight closed beta (you mentioned an Apple Dev account; we'll need its team ID)
7. RuStore + signed APK for Android internal track

## Branch / commit conventions

- Branch: `claude/quick-games-app-75pbk` (set per task)
- Commits: short, imperative, lowercase (`feat: vertical swipe feed`, `fix: glass blur on android`)

## License

Private. © Loop Games.
