# Луп → real product launch playbook

A literal, copy-paste-from-the-top step-by-step. Estimated total time: **3-4 weeks of part-time work** to get from "demo on Expo Go" to "App Store + RuStore live with paying users."

Each step is sized for ~30 min – 4 hours of focused work. Don't skip the prereq checks at the start of each section.

---

## 0. Decisions to make BEFORE writing code (30 min)

Open a notes file, write down your answer to each:

1. **Brand name registration?**
   - "Луп" — register as a trademark in RU? (₽30k via [rospatent.gov.ru](https://rospatent.gov.ru), takes 12 months. Optional but recommended before scaling.)
2. **Legal entity?**
   - Самозанятый (~6% tax, simplest, cap ₽2.4M/year) ← good start
   - ИП на УСН 6% (∞ revenue, requires accountant ~₽3-5k/mo)
   - ООО (only if you're taking investment)
3. **VPS provider?** Pick one:
   - **Yandex.Cloud** — best 152-FZ compliance, ₽4-6k/mo for our spec
   - **Selectel** — cheapest, ₽3-4k/mo, good support
   - **Cloud.ru** (Сбер) — most enterprise-grade, ₽5-7k/mo
   - I'll write commands for **Yandex.Cloud**; they translate ~directly.
4. **Domain name?** Pick + buy now (step 2.1):
   - `loop.games`, `lup.games`, `loopgames.ru`, `playloop.ru` — one of these
5. **Premium subscription price?** ₽199/mo (default) | ₽149 | ₽99
6. **Email for support + DPO contact?** Use a fresh one: `support@yourdomain.ru`

Done? Move on.

---

## 1. Accounts to create (1 day total — much of it waiting on email confirmations)

### 1.1. Apple Developer Program — START NOW (takes 24-48h)
- https://developer.apple.com/programs/enroll
- Cost: **$99/year** (~₽9,000)
- Use Individual or Organization (if you have legal entity)
- This blocks everything else; do it first
- 2FA-protected Apple ID required

### 1.2. Google Play Console (optional, for Android later)
- https://play.google.com/console/signup — $25 one-time
- Skip if iOS-only at first

### 1.3. RuStore developer account (Russian Android store)
- https://www.rustore.ru/developers
- Free, requires legal entity или самозанятый ИНН
- ~24h verification

### 1.4. YooKassa (subscription payments — RU)
- https://yookassa.ru → **Регистрация мерчанта**
- Requires ИНН + bank account
- Settlement period: T+1 to T+3 (you get money 1-3 business days later)
- Commission: 3.5% of each transaction

### 1.5. Yandex Advertising Network (Yandex Mobile Ads SDK)
- https://yandex.ru/adv/products/yan
- Requires bank/card details for payouts; ИНН required
- Approval: 1-3 business days
- Get an Ad Block ID per ad placement (banner, interstitial, rewarded)

### 1.6. Sentry (free tier, error tracking)
- https://sentry.io/signup/ — free up to 5k errors/month
- Or self-host later (`getsentry/self-hosted`)

### 1.7. Resend (transactional email — already have)
- Verify a domain. Stop using `onboarding@resend.dev`.
- DNS step is in section 2.

### 1.8. Roskomnadzor (data processor registration)
- https://pd.rkn.gov.ru/operators-registry/notification/form/
- Required because you process personal data of RU citizens
- Free, ~15 min web form
- Approval: 30 days

---

## 2. Domain + DNS (2 hours)

### 2.1. Buy the domain
- https://www.reg.ru или https://nic.ru
- Add `.ru` AND `.games` if available — `.ru` for legal/email, `.games` for marketing
- ₽200-2000/year depending on tld

### 2.2. DNS records you'll need (set them up at your registrar's DNS panel):

```
A      @                    <will fill in after VPS step>
A      api                  <VPS IP>
A      app                  <VPS IP>
CNAME  www                  yourdomain.ru
TXT    _dmarc               "v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.ru"
MX     @                    yandex.ru. (приоритет 10)   ← Yandex 360 free email
TXT    @                    "v=spf1 include:_spf.yandex.net ~all"
```

### 2.3. Email
- Set up Yandex 360 for Business with your domain (free for 1 user)
- Create `support@yourdomain.ru` and `noreply@yourdomain.ru`
- DKIM + SPF records added per Yandex 360 instructions

### 2.4. Verify Resend can use your domain
- Resend → Domains → Add Domain → enter `yourdomain.ru`
- Add the DKIM TXT records they show you
- Wait for "Verified" green checkmark

---

## 3. VPS provisioning (Yandex.Cloud) (3 hours)

### 3.1. Create a Compute instance

```
Specs:
- 4 vCPU (Intel Cascade Lake or newer)
- 8 GB RAM
- 80 GB SSD network-storage
- Ubuntu 24.04 LTS
- Public IP: yes (note this IP — goes in DNS step 2.2)
- Region: ru-central1-b (Moscow zone)
- SSH key: paste your ~/.ssh/id_ed25519.pub
```

Yandex.Cloud Console → Compute Cloud → Создать ВМ. Cost: ~₽4500/mo.

### 3.2. First-boot hardening (SSH into your new server)

```bash
# From your Mac
ssh ubuntu@<VPS_IP>

# On the server:
sudo apt update && sudo apt upgrade -y
sudo apt install -y ufw fail2ban htop curl git unattended-upgrades

# Firewall — only allow SSH + HTTPS + HTTP
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# Disable password SSH
sudo sed -i 's/^#*PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo sed -i 's/^#*PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
sudo systemctl restart ssh

# Auto security updates
sudo dpkg-reconfigure --priority=low unattended-upgrades

# Create a non-default sudo user (don't keep using ubuntu)
sudo adduser deploy
sudo usermod -aG sudo deploy
sudo mkdir /home/deploy/.ssh
sudo cp ~/.ssh/authorized_keys /home/deploy/.ssh/
sudo chown -R deploy:deploy /home/deploy/.ssh
```

Log out, log back in as `deploy`, repeat your SSH from Mac:
```bash
ssh deploy@<VPS_IP>
```

### 3.3. Install Docker + Compose
```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
# Log out and back in for the docker group to take effect
```

---

## 4. Self-hosted Supabase (4 hours)

### 4.1. Clone + configure
```bash
cd /opt
sudo mkdir supabase && sudo chown $USER supabase
cd supabase
git clone --depth 1 https://github.com/supabase/supabase
cd supabase/docker
cp .env.example .env
```

### 4.2. Edit `.env` — generate strong secrets (DO NOT use the defaults)

```bash
# Generate secrets locally:
openssl rand -hex 32   # use for POSTGRES_PASSWORD
openssl rand -hex 32   # use for JWT_SECRET — must be 32+ char
```

For ANON_KEY and SERVICE_ROLE_KEY, generate JWT tokens that match your JWT_SECRET. Easiest: use https://supabase.com/docs/guides/self-hosting/docker#generate-api-keys (their JWT generator) — paste your JWT_SECRET, it spits out the two keys.

Open `.env` and set:
```
POSTGRES_PASSWORD=<generated above>
JWT_SECRET=<generated above>
ANON_KEY=<JWT generated from JWT_SECRET with role=anon>
SERVICE_ROLE_KEY=<JWT generated from JWT_SECRET with role=service_role>
DASHBOARD_USERNAME=admin
DASHBOARD_PASSWORD=<strong random password — for /studio admin UI>
SITE_URL=https://app.yourdomain.ru
API_EXTERNAL_URL=https://api.yourdomain.ru
SMTP_ADMIN_EMAIL=support@yourdomain.ru
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_USER=resend
SMTP_PASS=<your Resend API key>
SMTP_SENDER_NAME=Луп
ENABLE_EMAIL_SIGNUP=true
ENABLE_EMAIL_AUTOCONFIRM=false
```

### 4.3. Bring it up
```bash
docker compose pull
docker compose up -d

# Confirm everything is healthy
docker compose ps
# All services should show "healthy" or "running"
```

### 4.4. Open the studio admin UI
- For now it's at `http://<VPS_IP>:8000` — **not for production**, just to verify
- Login with DASHBOARD_USERNAME / PASSWORD from `.env`
- Open SQL Editor → New query → paste **the entire** `supabase/schema.sql` from our repo → Run
- Verify in Table Editor: you should see `profiles`, `comments`, `feed_impressions`, `game_progress`, `user_achievements`, etc.

### 4.5. Email templates
- Authentication → Email Templates → "Confirm signup"
- Same template body we used during dev (with `{{ .Token }}`)
- Save. Repeat for "Magic Link" and "Reset Password".

### 4.6. Reverse proxy with Caddy (auto-HTTPS)

```bash
sudo apt install -y caddy
sudo nano /etc/caddy/Caddyfile
```

Paste:
```
api.yourdomain.ru {
    reverse_proxy localhost:8000
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        X-Frame-Options "DENY"
        X-Content-Type-Options "nosniff"
        Referrer-Policy "strict-origin-when-cross-origin"
    }
}

studio.yourdomain.ru {
    @auth basicauth {
        admin <bcrypt-hash-of-your-password>
    }
    reverse_proxy localhost:8000
    handle @auth {
        respond "Authorized"
    }
}
```

Generate the bcrypt hash:
```bash
caddy hash-password
# (paste your studio password, get hash, paste back into Caddyfile)
```

```bash
sudo systemctl restart caddy
sudo systemctl enable caddy
```

Wait 1-2 min for Caddy to provision Let's Encrypt certs. Then test:
```bash
curl https://api.yourdomain.ru/rest/v1/  # should return Supabase API root
```

### 4.7. Lock down Postgres
Edit `/opt/supabase/supabase/docker/docker-compose.yml`. Find the `db:` service. Change:
```yaml
ports:
  - "5432:5432"     # remove or change to:
  - "127.0.0.1:5432:5432"   # bind to localhost only
```
```bash
docker compose up -d
```

### 4.8. Migrate data from Supabase Cloud → VPS

```bash
# On your Mac:
PGPASSWORD=<your cloud DB password> pg_dump \
  -h db.<your-cloud-ref>.supabase.co \
  -U postgres -d postgres \
  --no-owner --no-acl \
  > loop_export.sql

# Strip auth schema (cloud-specific)
sed -i '' '/auth\./d' loop_export.sql   # macOS sed

# Copy to VPS:
scp loop_export.sql deploy@<VPS_IP>:/tmp/

# On VPS:
docker exec -i supabase-db psql -U postgres -d postgres < /tmp/loop_export.sql
```

### 4.9. Backup cron
```bash
sudo nano /etc/cron.d/supabase-backup
```
Paste:
```
0 3 * * * deploy /usr/bin/docker exec supabase-db pg_dump -U postgres postgres | gzip > /var/backups/loop-$(date +\%Y\%m\%d).sql.gz && find /var/backups -name "loop-*.sql.gz" -mtime +14 -delete
```

For off-site: install `restic`, push `/var/backups` daily to Yandex Object Storage (encrypted).

---

## 5. Repo: switch app to use self-hosted backend (1 hour)

### 5.1. On your Mac, in `~/newproject`:

```bash
# Update .env
cat > .env <<EOF
EXPO_PUBLIC_SUPABASE_URL=https://api.yourdomain.ru
EXPO_PUBLIC_SUPABASE_ANON_KEY=<the ANON_KEY from VPS .env>
EOF

# Sanity check
git status   # .env must NOT appear (gitignored already)

# Restart Metro
npx expo start -c
```

Smoke-test on iPhone — sign in flow should work, comments load, etc.

### 5.2. Decommission Supabase Cloud
After 1 week of self-hosted production with no issues:
- Cloud dashboard → Settings → Pause project → Delete project

---

## 6. Apple Developer + EAS build pipeline (1 day, plus 1-2 days waiting)

### 6.1. Install Expo CLI tooling locally
```bash
npm install -g eas-cli
eas login   # use your Expo account
eas init    # links the repo to an EAS project — accept defaults
```

### 6.2. Create `eas.json`
```bash
nano eas.json
```
```json
{
  "cli": { "version": ">= 16.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": { "resourceClass": "m-medium" }
    },
    "preview": {
      "distribution": "internal",
      "channel": "preview",
      "ios": { "resourceClass": "m-medium" }
    },
    "production": {
      "channel": "production",
      "ios": { "resourceClass": "m-medium" },
      "android": { "buildType": "app-bundle" }
    }
  },
  "submit": {
    "production": {
      "ios": { "appleId": "you@yourdomain.ru", "ascAppId": "<from App Store Connect after step 6.4>" }
    }
  }
}
```

### 6.3. First production iOS build
```bash
eas build --platform ios --profile production
# It will ask: do you want EAS to manage your iOS credentials? Yes.
# Sign in with Apple ID. EAS handles cert + provisioning profile.
# Wait ~15-20 min for the build.
```

### 6.4. Create the App Store Connect listing
- https://appstoreconnect.apple.com → My Apps → +
- Bundle ID: `ru.yourdomain.loop` (must match `app.json`)
- Name: `Луп` (consider also a Latin name like `Loop` for non-RU)
- SKU: `loop-ios-001`
- Go through screens: privacy policy URL, support URL, category=Games, age rating, screenshots (need at least 6.7" iPhone screenshots — record on your iPhone)

### 6.5. Submit + TestFlight
```bash
eas submit --platform ios --latest
# Approve App Review for TestFlight (24-48h)
```

When approved, invite testers via TestFlight → Internal Testing → +. Up to 10k external testers via public link.

---

## 7. Privacy policy + ToS + Roskomnadzor (1 day)

### 7.1. Generate privacy policy
- Use https://www.iubenda.com or https://www.privacypolicies.com
- Disclose: email collection, profile, game-engagement events, ad tracking via Yandex
- Specify data residency: "Серверы расположены в Российской Федерации"
- Add DPO contact: `dpo@yourdomain.ru`
- Host as a static page: copy HTML, put on `https://yourdomain.ru/privacy`. Caddy can serve a static folder:
  ```
  yourdomain.ru {
      root * /var/www/site
      file_server
  }
  ```

### 7.2. Roskomnadzor (РКН) registration
- https://pd.rkn.gov.ru/operators-registry/notification/form/
- Fill form: legal name, ИНН, address, DPO, list of personal data categories you process (email, IP, device ID, profile info)
- Submit. Confirmation in 30 days.
- Until confirmed: not legally publishable to RU public, but TestFlight is fine.

### 7.3. Update App Store Connect with the privacy URL
- App Information → Privacy Policy URL → `https://yourdomain.ru/privacy`

---

## 8. Yandex Mobile Ads integration (1 day)

### 8.1. Get Ad Block IDs from Yandex Advertising Network
- Console → Ad Blocks → Create
- One per placement: `interstitial-between-levels`, `rewarded-skip-ad`
- Note the IDs.

### 8.2. Install the SDK in the project (on your Mac)
```bash
cd ~/newproject
npx expo install react-native-yandex-mobile-ads
# (or use `yandex-mobile-ads-react-native` if officially blessed at the time)
```

### 8.3. Wire it
In `src/games/LevelComplete.tsx`, replace the mock `<AdHipHub>` / `<AdProtokol>` with a Yandex interstitial:

```tsx
import { showInterstitial } from 'react-native-yandex-mobile-ads';

useEffect(() => {
  if (showAd && passed) {
    showInterstitial({ blockId: 'R-M-XXXXXX-1' /* your block ID */ });
  }
}, [showAd, passed]);
```

(Mock creatives stay as fallback until real SDK is loaded — keep the existing `AdHipHub` / `AdProtokol` for the non-Yandex path or for visual demo.)

### 8.4. Test mode first
- Yandex SDK has test ad blocks (`adfox-ru-XXXX-test`) — wire those before going live
- Make a successful play, hit level 2, see the test ad render

### 8.5. Re-build + publish to TestFlight
```bash
eas build --platform ios --profile production
eas submit --platform ios --latest
```

---

## 9. YooKassa subscription paywall (2-3 days)

### 9.1. Get YooKassa API keys
- Кассы → Настройки → API → создать ключ
- Note `shopId` + `secretKey`

### 9.2. Create subscription product
In YooKassa dashboard → Подписки → Создать → ₽199/mo, recurring monthly.

### 9.3. Backend webhook handler
You need a server endpoint that YooKassa calls when payments succeed. Two options:

**Option A**: Supabase Edge Function (we self-hosted, so this works on the VPS):
```
/opt/supabase/supabase/docker/volumes/functions/yookassa-webhook/index.ts
```

**Option B** (simpler for v1): a tiny Node service. SSH to VPS:
```bash
mkdir -p /opt/loop-api && cd /opt/loop-api
npm init -y
npm i express body-parser pg crypto
nano server.js
```

Paste:
```js
const express = require('express');
const { Pool } = require('pg');
const crypto = require('crypto');
const app = express();
const pool = new Pool({ connectionString: process.env.PG_URL });

app.post('/yookassa/webhook', express.json(), async (req, res) => {
  const { event, object } = req.body;
  if (event === 'payment.succeeded') {
    const userId = object.metadata.user_id;
    const until = new Date(Date.now() + 30 * 86400000);
    await pool.query(
      'INSERT INTO premium_until(user_id, until) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET until = GREATEST(premium_until.until, EXCLUDED.until)',
      [userId, until]
    );
  }
  res.json({ ok: true });
});

app.listen(3000);
```
Add to your Caddyfile:
```
api.yourdomain.ru {
    reverse_proxy /yookassa/* localhost:3000
    reverse_proxy localhost:8000
}
```
Add a new Postgres table: `create table premium_until (user_id uuid primary key, until timestamptz);`. RLS so users can read their own.

### 9.4. Client-side paywall
Add `src/screens/PaywallScreen.tsx` that opens a `WebView` to the YooKassa hosted-checkout URL with metadata `{ user_id }`. After payment success, YooKassa returns the user; the webhook above writes `premium_until`. Refresh user state on Profile open.

### 9.5. Hide ads for premium users
In `src/games/LevelComplete.tsx`:
```tsx
const { isPremium } = useUser();
const shouldActuallyShow = showAd && passed && !isPremium;
```

---

## 10. RuStore submission (3-5 days)

### 10.1. Build Android APK/AAB
```bash
eas build --platform android --profile production
```

### 10.2. RuStore developer console
- https://www.rustore.ru/console
- New app → upload AAB, screenshots, icon, descriptions
- Privacy policy URL: same as above
- Age rating: pick honestly
- Submit for review (1-3 business days)

---

## 11. TestFlight beta — first 50 real users (1 week)

### 11.1. Recruit testers
- Post in 2-3 Russian gaming Telegram channels: "Бета-тест мини-игр в стиле TikTok, ищу 50 человек, плачу 200₽ Steam-картой за полный отзыв"
- DM personal network on VK
- Goal: 30+ active users for ≥3 days each

### 11.2. Watch for issues
- Sentry dashboard for crashes
- Supabase studio → Logs for backend errors
- Set up Telegram bot for new-user-signup alerts (optional)

### 11.3. Iterate based on top-3 complaints
Realistic feedback you'll get:
- "X game is broken" → fix, ship via `eas update --branch production` (no app review needed for JS-only fixes)
- "Auth email never arrived" → check Resend deliverability
- "App lags on level 7 of Tetris" → optimize that game

---

## 12. Public launch (week 4)

### 12.1. App Store final review
- Submit for App Store review (not TestFlight) — 24-72h
- Have screenshots, app preview video (record on iPhone), keywords ready
- Localized RU + EN listings

### 12.2. Soft launch press
- Pitch 5-10 RU tech / lifestyle outlets:
  - vc.ru — submit a "Создал TikTok для мини-игр" article
  - ITWeek
  - Telegram channels: @appsoid, @startupoftheday
- LinkedIn + VK personal posts

### 12.3. Influencer seeding
- Find 3-5 Russian-speaking lifestyle TikTok creators (50-200k followers)
- Pay ₽5-30k each for an authentic playthrough
- Track installs via App Store referral tags

---

## 13. Day-2 operations (ongoing)

Daily (5 min):
- Check Sentry for new error spikes
- Glance at Supabase studio Logs

Weekly (30 min):
- Review top 5 most-engaged + most-skipped games
- Check Yandex Ads earnings
- Review Roskomnadzor + tax obligations

Monthly:
- Verify backups restored cleanly (test restore on a scratch DB)
- Rotate Resend, JWT, and DB passwords if they touched the support pipeline
- Pay yourself + accountant

Quarterly:
- New game catalog drop (5 games)
- Reprice subscription based on conversion data
- A/B test recommender tweaks (now that you have logged impressions)

---

## What I can build for you next session

If you say "do step X" I can produce the actual files / scripts:

- **`docker-compose.override.yml` for the VPS** — locked-down Postgres, healthchecks, restart policies
- **`Caddyfile` template** with all the security headers
- **`scripts/migrate-from-cloud.sh`** — one-shot migrate
- **`scripts/backup-restore.sh`** — restic-based backup pipeline
- **`server/yookassa-webhook.js`** — production-ready webhook with HMAC verification
- **`src/screens/PaywallScreen.tsx`** — actual UI with WebView checkout + post-payment refresh
- **`src/lib/premium.ts`** — `isPremium()` hook, ads-disabled guard
- **PR with Yandex Mobile Ads SDK wired** — replacing mock interstitials

Pick the next concrete step and I'll execute. My recommendation: start with **section 3 (VPS provisioning)** because it unblocks everything else, and it's mostly waiting for Apple Developer approval to come through for the iOS path anyway.
