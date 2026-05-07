# Луп / Loop — quick games feed

A TikTok-style vertical feed of bite-sized mini-games, built for Russian-speaking
Gen Z commuters. Swipe through games, like/save the ones you enjoy, listen to
lofi while you play. Built on React Native + Expo SDK 54.

This is the **alpha** — feed UX, 5 native mini-games, lofi player shell, ad-slot
stub, AsyncStorage-backed likes/saves, **a heuristic local recommender that
learns from your taps**, **real streaks + personal bests**, and **native score
sharing** so friends can challenge each other.

---

## Run on your iPhone in 5 minutes (Expo Go)

You'll test via **Expo Go**. No Apple Developer account or Xcode build needed.

### 1. Install Node + dependencies

```bash
brew install node     # or: nvm install 20
node --version        # should be 20.x or newer
npm install
```

### 2. Install Expo Go on your iPhone

App Store → **Expo Go** → install. (If the app isn't in the RU App Store, sign
in with a non-RU Apple ID temporarily, or jump to the EAS build flow below for
TestFlight.)

### 3. Start the dev server

```bash
npm start          # local Wi-Fi
# or
npm run tunnel     # ngrok-style relay — works from any network
```

A QR code appears. **Tunnel mode is what you want for testing across phones in
different cities** — both devices don't need to share Wi-Fi. The tunnel URL is
public, so anyone you share it with can scan and play instantly.

### 4. Scan & play

iPhone Camera → point at QR → tap the Expo Go banner. First bundle takes ~30 s.

---

## Sharing the build with testers anywhere (any phone, any network)

Three options, listed cheapest → polished.

### Option A — Tunnel link (instant, free)

```bash
npm run tunnel
```

Copy the `exp://u.expo.dev/...` URL or screenshot the QR code. Send it via
Telegram / WhatsApp. Anyone with Expo Go installed can open it from anywhere
in the world. **Caveat:** the tunnel only lives while your laptop is running.

### Option B — EAS Build + EAS Update (recommended for sustained testing)

This compiles a real iOS / Android binary that lives on your testers' devices.
Code updates push over-the-air, no rebuild needed.

```bash
# One-time setup
npm install -g eas-cli
eas login
npm run eas:init        # creates a project on Expo's servers + writes projectId

# Build a development client (Internal Distribution)
npm run eas:build:dev

# Each time you ship JS-only changes, push an OTA update:
npm run eas:update
```

Send the build link to testers. They install once; future code changes arrive
automatically next time they open the app.

`eas.json` is already configured with three profiles:

| Profile | Distribution | Use for |
|---|---|---|
| `development` | Internal | Day-to-day debugging on real devices |
| `preview` | Internal (APK / IPA) | Closed beta, no app stores |
| `production` | Store-ready | TestFlight / RuStore submission |

### Option C — TestFlight + RuStore (public-ish beta)

For iOS: `eas submit -p ios --profile production` after a production build →
runs through App Store Connect → invite testers via TestFlight.
For Android (RU): build with `preview` profile → upload the `.apk` to RuStore's
internal testing track.

---

## What works in the alpha

- ✅ Vertical swipe feed with snap pagination + haptics on swipe
- ✅ 5 playable mini-games (Залей цветом, Тап-Раш, Слово-Взрыв, Башня, Волна 2048)
- ✅ Glass-morphism game cards matching the Gamify v2 design
- ✅ Like / Save / Share actions, persisted via AsyncStorage
- ✅ **Heuristic local recommender** — feed order + "match %" computed from
  your view / play / like / save / skip / share history
- ✅ **Personal bests** per game with "🏆 Новый рекорд!" badge on the result
  screen
- ✅ **Real streak counter** (consecutive days played, today is a free pass)
- ✅ **Real profile stats** — level scales with completed games, role tag
  picks your top category
- ✅ **Native score sharing** — победил? "Я набрал X очков в «...» 🎮"
- ✅ Bottom nav: Для тебя · Поиск · Профиль
- ✅ Explore grid that **also re-ranks** by your taste
- ✅ Music badge with spinning vinyl + marquee track name
- ✅ Ad-slot stub every 4 games (subscription upsell card, CTA wired)
- ✅ Local event log (powering the recommender + future Supabase sync)
- ✅ **Error boundary** so a single crashing game can't kill the app
- ✅ Russian-first UI

## How the recommender works

`src/store/recommender.ts` aggregates the local event log into per-game stats
and a per-game score:

```
score =
  +8 × liked
  +5 × saved
  +4 × wins
  +3 × completes
  +3 × shares
  +2 × plays
  -3 × skips        ← swiping past a card in <2.5s without engaging
  +0.05 × views
  +4 × recency      (decays over 7 days)
```

Each game also inherits ~40% of its category's average score, so liking one
brain-game lifts every brain-game's match %. Cold-start (zero events) keeps
the static `match` values from `games.ts` so day-1 users see the curated order.
Final scores are normalized into the **65 %–99 %** range that GameCard / Explore
display.

The same data ranks the feed. Re-ranking happens whenever you leave + return
to the Feed tab (so the order doesn't shuffle mid-scroll).

## What's stubbed for now

- 🟡 **Lofi audio** — UI is wired but no tracks bundled. See
  `assets/lofi/README.md` to drop in royalty-free MP3s, then uncomment the
  `require()` lines in `src/audio/LofiContext.tsx`.
- 🟡 **Ad SDK** — slot is a branded subscription upsell card. Swap for Yandex
  Mobile Ads SDK before public release.
- 🟡 **Backend sync** — events / likes / saves / personal bests are local
  only. Supabase wiring lands in v2 alongside cloud-side ranking and a real
  social graph.
- 🟡 **Auth + sync** — guest play only.

## Project layout

```
App.tsx                       # Entry — fonts, providers, screen routing
index.ts                      # registerRootComponent
app.json                      # Expo config (RU locale, dark, audio bg, OTA)
eas.json                      # EAS build profiles (dev / preview / prod)
src/
├── theme/index.ts            # Colors, typography, spacing, SAFE_TOP
├── data/games.ts             # Game catalog (Russian names + categories)
├── audio/LofiContext.tsx     # Persistent lofi player across screens
├── store/
│   ├── usePrefs.tsx          # likes + saves with AsyncStorage
│   ├── events.ts             # Local event log (recommender input)
│   ├── recommender.ts        # ★ Heuristic ranker + stats + streak
│   ├── personalBests.ts      # ★ Per-game high score persistence
│   └── useStats.tsx          # ★ Provider exposing ranked games + totals
├── components/
│   ├── ErrorBoundary.tsx     # ★ Catches crashes, offers retry
│   ├── Glass.tsx
│   ├── BgPattern.tsx
│   ├── GameCard.tsx
│   ├── GamePreview.tsx
│   ├── ActionButton.tsx
│   ├── MusicBadge.tsx
│   ├── BottomNav.tsx
│   ├── AmbientBackground.tsx
│   ├── AdSlot.tsx
│   └── Toast.tsx
├── screens/
│   ├── FeedScreen.tsx        # Uses ranked feed + skip detection
│   ├── ExploreScreen.tsx     # Category chips + 2-col grid (ranked)
│   └── ProfileScreen.tsx     # Real stats: level, streak, recents, personal bests
└── games/
    ├── GameShell.tsx
    ├── GameResult.tsx        # ★ Share + new-record badge
    ├── ColorFlood.tsx
    ├── TapRush.tsx
    ├── WordBlast.tsx
    ├── StackIt.tsx
    ├── MergeWave.tsx
    └── index.tsx
```

(★ = added or significantly upgraded in this iteration)

## Hot-reload tips

- Save any file → Expo Go re-bundles in ~1–3 s
- Shake the phone for the dev menu (or Cmd+D in simulator)
- `r` in the terminal = full reload
- `j` = open Hermes debugger

## Common iPhone gotchas

| Symptom | Fix |
|---|---|
| QR scan doesn't open | Use the Expo Go app's "Scan QR code" button instead of Camera |
| Network error / can't connect | `npm run tunnel` |
| Fonts don't load | Wait for the loading screen; Space Grotesk Cyrillic fetches from CDN on first launch |
| Audio button does nothing | Expected — no MP3s bundled. See `assets/lofi/README.md` |
| Glass effect missing on Android | Expected — BlurView is iOS-only here |

## Roadmap to v2 (next 2–3 weeks)

1. Drop in 5 royalty-free lofi tracks
2. Wire Yandex Mobile Ads SDK
3. Supabase project + sync events / likes / personal bests to Postgres
4. Edge-function ranker that consumes the same event schema as
   `recommender.ts` so the offline ranker stays a fallback, not a duplicate
5. **Friend graph + invite deep links** — `loop://challenge/<game>?score=<n>`
   so the share button can challenge a specific player
6. Subscription paywall (YooKassa or SberPay)
7. iOS dev-client build for TestFlight closed beta
8. RuStore + signed APK for Android internal track

## License

Private. © Loop Games.
