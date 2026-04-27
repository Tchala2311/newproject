# Lofi tracks

Drop royalty-free MP3s into this folder, then uncomment the matching `require()`
lines in `src/audio/LofiContext.tsx`.

## Where to source

- **Pixabay Music** — `https://pixabay.com/music/search/lofi/` (CC0, free for commercial use including Russia)
- **Uppbeat free tier** — credit required but covers RU release
- **Free Music Archive** — search "lofi", filter to CC-BY or CC0

5 tracks ≈ 30–50 MB total. Aim for ~3 minute loops.

## Filenames expected

- `midnight.mp3` — Полночный лофи
- `subway.mp3` — Поезд в метро
- `rain.mp3` — Дождь и вайб
- `flow.mp3` — Спокойный поток
- `coffee.mp3` — Утренний кофе

The MP3s are gitignored by default — keep them out of git, ship them via EAS
asset config instead when you build for distribution.
