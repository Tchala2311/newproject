# Луп → real product roadmap

This doc maps the path from "demo on Expo Go" to "real business with paying users."
It's tuned for the constraint you specified: **database self-hosted on your VPS**
(not Supabase Cloud) for security/sovereignty. Russia-compliant deployment is
also addressed.

## Where we are now

- 19 mini-games, all with infinite procedural difficulty
- 18 ironic ачивки with toast unlocks
- TikTok-style feed with a real two-stage recommender
- Full social loop: profiles, comments, likes, saves, follows, creator pages
- Two ad creatives (HipHub, ПРОТОКОЛ) styled like Yandex Direct
- Onboarding + email-OTP auth
- All data persisted in **Supabase Cloud** (hosted Postgres + auth + RLS)

The architecture is clean enough that swapping the **data layer** doesn't touch
gameplay code. Self-hosting is a backend migration, not a product rewrite.

## Self-hosted database (your security requirement)

Three tractable options. **Option A** is the recommended path.

### Option A — Self-hosted Supabase on your VPS  ★ recommended

Supabase is open-source. You can run the entire stack on your own hardware:

```
your-vps.example.com
├── postgres (port 5432, only on localhost)
├── postgrest (REST API over Postgres)
├── gotrue (auth — email OTP)
├── realtime (WebSocket subscriptions)
├── storage (S3-compatible blob)
├── kong (api gateway)
└── studio (admin UI on a different port behind auth)
```

**Stack:** Docker Compose, ~6 GB RAM, ~50 GB SSD initially. The
[supabase/docker](https://github.com/supabase/supabase/tree/master/docker) repo is
the canonical reference — clone, edit `.env`, `docker-compose up`.

**Why this:**
- Same APIs we already use (`@supabase/supabase-js` client doesn't change)
- Same SQL schema (`supabase/schema.sql` runs unchanged)
- Same RLS policies
- Same auth tokens
- Switching between cloud and self-hosted is **two env-var changes** in `.env`

**Migration steps (1-2 days):**

1. **Provision VPS.**
   - 4-core / 8 GB RAM / 80 GB SSD as a starting baseline
   - Russia-compliant: Selectel, VK Cloud, Cloud.ru, Yandex.Cloud are the
     accepted picks for 152-FZ (personal data law) compliance with Russian
     users
   - SSH-only access; disable password auth; ufw for firewall
2. **Install Docker + Docker Compose.**
3. **Clone supabase/docker** and configure `.env` — set strong JWT secret,
   service-role-key, anon-key, postgres password
4. **`docker-compose up -d`** brings the whole stack online
5. **Apply our schema** — run `supabase/schema.sql` against the new instance
6. **Migrate cloud → self-hosted**:
   ```bash
   pg_dump $CLOUD_URL | psql $VPS_URL
   ```
7. **Update `.env` on the client**:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://api.your-domain.ru
   EXPO_PUBLIC_SUPABASE_ANON_KEY=<new anon key from VPS>
   ```
8. **Reverse proxy + TLS** — Caddy with auto-HTTPS, serves only the API on
   `:443`. Postgres stays bound to `localhost`.

**Ongoing operations:**
- Daily `pg_dump` to encrypted off-site backup (object storage in another region)
- Prometheus + Grafana for metrics (postgres_exporter, node_exporter)
- Restic for filesystem backups
- Fail2ban + key-only SSH

**Russia legal angle (152-FZ):**
- Personal data of Russian citizens must be primary-stored on Russian soil
- A VPS in MSK/SPB satisfies this
- Register your data processing with Roskomnadzor (15 min web form, free)
- Privacy policy must list what's collected, retention, and DPO contact
- For TestFlight: Apple ID under any country works; legal storage location is
  what matters

### Option B — DIY Postgres + custom backend (worst option)

Run vanilla Postgres + write a Node/Go API. **Don't.** You re-implement every
feature Supabase already has — auth, RLS at API layer, realtime, storage. Adds
3-4 weeks for nothing.

### Option C — Hetzner-hosted Supabase via Coolify or PocketBase

[Coolify](https://coolify.io) is a self-hosted platform-as-a-service that has
a one-click Supabase template. Faster than raw Docker but less control. Good
fit for a solo founder who doesn't want to manage compose files.

---

## Real-product roadmap (8-12 weeks)

### Phase 1 — Self-host + launch private beta (week 1-2)
- [ ] VPS provisioned, Supabase self-hosted, schema migrated
- [ ] DNS + TLS via Caddy
- [ ] EAS Update preview channel (`eas update --branch beta`) — share
      preview URL to TestFlight tester pool
- [ ] iOS dev-client build via `eas build --profile development` for true
      Apple Developer dashboard testing
- [ ] Privacy policy + ToS published on a static page
- [ ] Roskomnadzor registration

### Phase 2 — Production polish (week 3-4)
- [ ] **Real Yandex Mobile Ads SDK integration** (replace mock AdSlot/AdHipHub
      / AdProtokol with actual Yandex ad units). Only major ad network
      operating in RU. Earnings: ₽20-150 per 1000 impressions
- [ ] **Subscription paywall** via YooKassa (RU) or Apple in-app for
      international. ₽199/month removes ads + unlocks "your music" feature
- [ ] Error tracking — Sentry, self-hosted (`getsentry/self-hosted` Docker)
- [ ] Analytics — PostHog self-hosted on the same VPS (or Plausible)
- [ ] Rate limiting on auth endpoints (gotrue config)

### Phase 3 — Audience growth (week 5-8)
- [ ] App Store + RuStore submission
- [ ] Influencer seeding — Russian gaming/lifestyle TikTokkers, ₽5-30k each
      for an authentic playthrough
- [ ] **Push notifications** — `expo-notifications` + a daily "New games for
      you" digest based on the recommender; the killer retention lever
- [ ] Referral program — invite a friend, both get 1 month Premium
- [ ] Game catalog expansion — research below

### Phase 4 — Recommender v2 (week 9-12)
- [ ] Replace linear ranker with a learned model. Once you have ~10k
      `feed_impressions` rows with `engaged` labels, train a logistic
      regression or gradient-boosted tree (Python sidecar service or even
      Postgres `madlib`). Expected lift: 15-30% in CTR
- [ ] TwHIN-style co-engagement embeddings (truncated SVD over user×game
      like matrix). Tractable at 100 games, 10k users
- [ ] A/B testing framework — bandit-arm assignment in `useUser`
- [ ] Realtime feed updates via Supabase Realtime subscriptions

### Phase 5 — Scale signals
- [ ] Move Postgres to managed when the VPS hits 70% CPU or 80 GB DB size
- [ ] Add a Redis layer for the recommender's session-level signals
- [ ] CDN (Cloudflare) for static assets and game previews

## Game catalog expansion — sources

You asked for more games. Three paths, in order of effort:

### 1. Open-source ports (cheapest, 1-3 days each)
We already documented 10 candidates in `docs/GAME_CATALOG_V2.md`. The
**unimplemented but ready-to-port** ones from that list:

- **Minesweeper** — classic, 3-5 difficulty levels, no asset cost
- **Sudoku** (raravi/sudoku is MIT) — Russian numerals optional
- **Crossword** (JaredReisinger/react-crossword + a small RU clue dataset)
- **Mate-in-1 chess puzzles** — open licensed PGN datasets exist
- **Solitaire** (Klondike / Spider) — well-explored mechanics
- **Mahjong solitaire** — tile-matching, very popular casual genre

### 2. Curated original mini-games (1-3 days each, full creative control)

Genres we don't yet have but easy to build:
- **Дартс / Darts** — swipe-aim, throw with timing
- **Лестница / Doodle Jump** — one-touch vertical platformer
- **Балансир / Balance** — already in `GAME_CATALOG.md`, queued
- **Поезд / Train** — drag tracks to route a train, like Mini Metro
- **Пингвин / Penguin slide** — gesture-based ice slider
- **Бильярд / 9-ball** — angle-and-power swipe shots
- **Мультяшный батл / Tap battle** — vs-AI tap-faster
- **Городки / Russian gorodki** — physics-based knock-down

### 3. License from indie studios (₽50-200k per game)
- itch.io has thousands of indies willing to license HTML5/JS source
- React Native ports cost an additional 1-2 weeks each
- Russian indie scene has talent — check VK groups "Indie разработчики"

### Sourcing strategy
- **Game jams** — sponsor a "Луп Mini Game Jam" with a ₽100k prize pool.
  Top 5 entries get integrated for free + revenue share. Cheapest way to
  get 50+ games in 2 months
- **University partnerships** — НИУ ВШЭ Game Dev department, ИТМО — students
  build games for course credit + portfolio
- **Crowdsourcing** — anyone can submit via a "Submit your game" form;
  approved games get ad-revenue split

## What this all costs

Approximate monthly running costs at ~10k MAU:

| Item | Cost |
|---|---:|
| Yandex Cloud VPS (4cpu/8GB) | ₽4,500 |
| Backup storage (50GB) | ₽600 |
| Domain + email | ₽500 |
| Resend (or Yandex SMTP for OTP) | ₽0 |
| Yandex Cloud DDoS protection | ₽1,500 |
| Apple Developer account (annualized) | ₽12,000 / 12 |
| RuStore | ₽0 |
| **Total** | **~₽8,100/mo** |

Revenue at 10k MAU with 30% ad-engagement and 2% subscriber conversion:
- Ad revenue: 10k × 30% × 50 imp/day × ₽40 / 1000 × 30 days = ~₽180,000/mo
- Subscriptions: 200 × ₽199 = ₽39,800/mo
- **Gross: ~₽220,000/mo**, gross margin ~96% before content + marketing

## Critical risks

1. **Russian users on iOS** — App Store sometimes restricts RU developer
   accounts. Workaround: TestFlight + RuStore primary, App Store later
2. **Ad network single-point** — Yandex Direct is your only revenue lever
   in RU. Diversify with subscription ASAP
3. **Self-host outage** — your VPS goes down = whole app dead. Solution:
   plan a hot-spare or use managed Yandex.Cloud Postgres (still RU-soil)
4. **152-FZ audit** — Roskomnadzor inspections are real. Have your DPO
   contact + data flow diagram ready in a folder

## Decision points

You'll need to decide:

1. **Self-hosting vendor** — Yandex.Cloud (most compliant), Selectel
   (cheapest), or Cloud.ru (best support)?
2. **Premium price** — ₽199, ₽149, or ₽99/month? Test-of-3 in onboarding
3. **Influencer-led launch vs. organic** — first ₽100k of marketing budget
4. **Open the platform to third-party game submissions in v1, or wait?**

Tell me which of these to dig deeper on.
