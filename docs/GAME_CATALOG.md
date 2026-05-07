# Mini-Game Catalog — TikTok-Style Vertical Feed

Curated candidates to extend the existing 5 games (ColorFlood, TapRush, WordBlast, StackIt, MergeWave). All entries respect: <5s learn time, 30–90s sessions, portrait orientation, pure RN/Animated/SVG, no copyrighted assets.

Effort key: **S** = 1–2 days, **M** = 3–5 days, **L** = 1–2 weeks.

---

## 1. Candidate Games (18)

### 1. Линия / LineRider
- **Pitch:** Drag a finger to draw a one-stroke path that connects all glowing dots without lifting.
- **Mechanic:** Single-touch path tracing on a grid graph.
- **Effort:** M
- **Hook:** Neon trail that pulses; satisfying "click" as each dot is consumed.

### 2. Ритм-Тап / BeatTap
- **Pitch:** Tap circles in time with the beat as they shrink toward a target ring.
- **Mechanic:** Timing windows (perfect/good/miss) on a music loop.
- **Effort:** M
- **Hook:** Screen-shake combo pops, color washes synced to BPM.

### 3. Слайс-Фрукт / SwipeSlice
- **Pitch:** Swipe through flying shapes; avoid the bombs.
- **Mechanic:** Gesture detection across SVG projectile paths.
- **Effort:** M
- **Hook:** Particle splatters in saturated juice colors per slice.

### 4. Стек-Куб / CubeStack
- **Pitch:** Tap to drop a sliding bar; perfect alignment grows the tower, misalignment shaves it.
- **Mechanic:** 1D timing + width reduction. (Distinct from StackIt by 3D-iso illusion.)
- **Effort:** S
- **Hook:** Iso-stacked neon blocks with chiptune ascending pitch each level.

### 5. Зеркало / Mirror
- **Pitch:** Two characters move symmetrically — guide both through obstacles with one swipe.
- **Mechanic:** Mirrored-input dodging.
- **Effort:** M
- **Hook:** Split-screen aesthetic, palette inversion on each level.

### 6. Сортировка Воды / WaterSort
- **Pitch:** Pour colored liquid between tubes until each tube is one color.
- **Mechanic:** Stack-based pour puzzle.
- **Effort:** S
- **Hook:** Glossy liquid Animated fills, gurgle SFX.

### 7. Удержи Нерв / NervePulse
- **Pitch:** Hold the dot inside the wobbling ring as it pulses for 30 seconds.
- **Mechanic:** Continuous touch + sine-wave difficulty curve.
- **Effort:** S
- **Hook:** Heartbeat haptics, screen reddens as ring shrinks.

### 8. Парные Эмодзи / EmojiMatch
- **Pitch:** Memory pair-flip with expressive emoji-style SVG faces, 60-second timer.
- **Mechanic:** Memory grid (4×4).
- **Effort:** S
- **Hook:** Faces wink/blink when matched; combo confetti.

### 9. Лабиринт-Тилт / TiltMaze
- **Pitch:** Tilt the phone to roll a ball through a tiny maze to the goal.
- **Mechanic:** Accelerometer + simple AABB collision.
- **Effort:** M
- **Hook:** Soft shadow under ball, glassy maze walls.

### 10. Реакция / Reflex333
- **Pitch:** When the screen flashes green, tap. False starts cost a life. Beat your fastest ms.
- **Mechanic:** Reaction-timer with anti-cheese delay.
- **Effort:** S
- **Hook:** Big numeric ms readout, leaderboard-friendly.

### 11. Падающие Буквы / FallingLetters
- **Pitch:** Russian letters drop; type them on the on-screen keyboard before they hit bottom.
- **Mechanic:** Typing speed + Cyrillic input. Complements WordBlast.
- **Effort:** M
- **Hook:** Letters explode pixel-shatter on hit.

### 12. Связь / Connect
- **Pitch:** Drag from numbered dot to numbered dot in order — don't cross lines.
- **Mechanic:** Hamiltonian-path tracing on small grids.
- **Effort:** M
- **Hook:** Glowing line traces, satisfying snap on completion.

### 13. Идеальный Круг / PerfectCircle
- **Pitch:** Draw a circle in one stroke; score = roundness %.
- **Mechanic:** Stroke point sampling, variance vs. centroid.
- **Effort:** S
- **Hook:** Score animates 0→99.7% with confetti at >95.
- **Repo reference:** trivial port of the viral neal.fun mechanic.

### 14. Прыжок-Платформа / Hopper
- **Pitch:** Tap to hop a character across moving platforms; timing-only, no swipes.
- **Mechanic:** One-button vertical platformer with auto-horizontal motion.
- **Effort:** M
- **Hook:** Squash-and-stretch Animated bounces, parallax neon city.

### 15. Цветовой Снайпер / ColorSnipe
- **Pitch:** A color name flashes; tap the matching swatch among 4 — but the WORD's color may lie (Stroop).
- **Mechanic:** Stroop-effect under timer.
- **Effort:** S
- **Hook:** Brain-burn aesthetic; speed multiplier flame icon.

### 16. Змейка-Свайп / SwipeSnake
- **Pitch:** 30-second snake on a small grid; swipe to turn, eat to grow, walls kill.
- **Mechanic:** Classic snake on a 12×16 grid.
- **Effort:** S
- **Hook:** Gradient-tail snake, screen flash on eat.

### 17. Поймай Звук / CatchSound
- **Pitch:** A note plays — tap the matching colored orb (color-to-pitch mapping).
- **Mechanic:** Audio-cue matching, no visual hint.
- **Effort:** M
- **Hook:** Synesthetic pulse rings; combo unlocks chord stacks.

### 18. Балансир / Balance
- **Pitch:** Tilt finger left/right to balance a stack of falling shapes; survive 60s.
- **Mechanic:** Inverted-pendulum approximation with simple physics.
- **Effort:** M
- **Hook:** Wobbly Animated jelly stack, crash-shatter finale.

---

## 2. Open-Source Repos to Mine / Port

### 1. mmazzarolo/ordinary-puzzles-app
- **URL:** https://github.com/mmazzarolo/ordinary-puzzles-app
- **License:** MIT  •  **Last commit:** 2026-04 (active)
- **What:** Polished React Native + TypeScript minimalist puzzle game, MobX state, vector-styled board.
- **Port effort:** **S** — already RN. Lift the board renderer + animation patterns directly into our feed shell; replace MobX with our existing store. Best single port candidate.

### 2. martymfly/react-native-wordle
- **URL:** https://github.com/martymfly/react-native-wordle
- **License:** MIT  •  **Last commit:** 2026-04
- **What:** Expo/RN Wordle clone with keyboard, tile flip animations, win/lose flow.
- **Port effort:** **S** — Expo already. Swap dictionary for Russian 5-letter list; reuse keyboard component for FallingLetters (#11) and a Russian-Wordle variant (excellent #19 candidate).

### 3. cawfree/react-native-picture-puzzle
- **URL:** https://github.com/cawfree/react-native-picture-puzzle
- **License:** MIT  •  **Last commit:** 2025-12
- **What:** Drop-in 15-puzzle / sliding-tile component for RN.
- **Port effort:** **XS** — published as a component. Wrap with timer + scoring; ship as "Пятнашки" mini-game in <1 day.

### 4. igravitystudios/matchimals.fun
- **URL:** https://github.com/igravitystudios/matchimals.fun
- **License:** MIT  •  **Last commit:** 2026-03
- **What:** Animal matching card game on RN + boardgame.io; clean tile/animation code.
- **Port effort:** **M** — assets are custom-licensed (avoid), but mechanics + RN animation patterns are reusable for EmojiMatch (#8). Treat as reference, not direct fork.

### 5. Kirilllive/Fifteen_puzzle_maker
- **URL:** https://github.com/Kirilllive/Fifteen_puzzle_maker
- **License:** MIT  •  **Last commit:** 2026-04
- **What:** Vanilla-JS 15-puzzle with auto image slicing — pure DOM, very small codebase.
- **Port effort:** **M** — algorithm is trivially portable to RN Animated; useful only as a logic reference since the renderer is HTML.

### Repos considered & rejected
- `mumuy/pacman`, `dmcinnes/HTML5-Asteroids`, `digitsensitive/phaser3-typescript`, `kenrick95/c4`: all canvas/Phaser-heavy — violates the "no WebView/Canvas-heavy" constraint. Useful only as mechanic inspiration.
- `nosovsh/fifteen`, `boweihan/propagate`, `benletchford/unmovable`: stale (2017, no updates in 3+ years), dependencies broken under modern Expo.

---

## 3. Recommended Next Sprint

Top 5 highest ROI for a vertical feed (juice-per-effort):
1. **PerfectCircle** (S) — guaranteed virality, trivial code.
2. **Reflex333** (S) — leaderboard hook, 1-day build.
3. **WaterSort** (S) — already a TikTok-meta genre.
4. **SwipeSnake** (S) — universal recognition, instant onboarding.
5. **BeatTap** (M) — anchors the audio-juice identity of the app.

Pair these with the `ordinary-puzzles-app` and `react-native-picture-puzzle` ports to ship 7 new games in ~2 weeks.
