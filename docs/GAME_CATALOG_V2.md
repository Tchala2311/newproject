# Game Catalog V2 — Additional Mini-Game Candidates

Curated open-source repos suitable for porting to React Native + Expo as new entries in the vertical mini-game feed. All are MIT-licensed, actively maintained (commit within last ~24 months), and pure-JS/TS — no Phaser/Pixi/Canvas-heavy engines. Each brings a mechanic distinct from our shipped 15.

## Summary Table

| # | Repo | License | Last Commit | Core Mechanic | Effort | Distinct Feature |
|---|------|---------|-------------|---------------|--------|------------------|
| 1 | [mmazzarolo/ordinary-puzzles-app](https://github.com/mmazzarolo/ordinary-puzzles-app) | MIT | 2026-04 | Grid logic deduction (Linjat-style line/dot puzzles) | S | Hand-crafted level progression with constraint satisfaction — purely deductive, no timing |
| 2 | [martymfly/react-native-wordle](https://github.com/martymfly/react-native-wordle) | MIT | 2026-04 | Letter-guess feedback (green/yellow/grey) | XS | Information-theoretic word deduction (already RN/Expo) |
| 3 | [brandly/react-tetris](https://github.com/brandly/react-tetris) | MIT | 2026-02 | Falling-block stacking + line clear | S | Rotational shape fitting under gravity (no rotation primitive in our 15) |
| 4 | [mateuszsokola/2048-in-react](https://github.com/mateuszsokola/2048-in-react) | MIT | 2026-04 | Swipe-merge grid | — | Skip — overlaps with MergeWave |
| 5 | [imshubhamsingh/15-puzzle](https://github.com/imshubhamsingh/15-puzzle) | MIT | 2026-04 | Sliding tile reordering | XS | Spatial sequencing under single-empty-cell constraint |
| 6 | [raravi/sudoku](https://github.com/raravi/sudoku) | MIT | 2026-04 | Number-grid constraint solving | S | Pure logic deduction across rows/cols/boxes |
| 7 | [JaredReisinger/react-crossword](https://github.com/JaredReisinger/react-crossword) | MIT | 2026-05 | Clue-driven word filling | S | Bidirectional letter constraints from intersecting clues |
| 8 | [jokude/react-nonogram](https://github.com/jokude/react-nonogram) | MIT | 2025-12 | Pixel-painting from row/col counts | S | Picture reveal via numeric clue deduction |
| 9 | [Clariity/react-chessboard](https://github.com/Clariity/react-chessboard) | MIT | 2026-05 | Drag-drop on 8x8 board | S | Mate-in-1/2 puzzles — pattern recognition over piece geometry |
| 10 | [cawfree/react-native-picture-puzzle](https://github.com/cawfree/react-native-picture-puzzle) | MIT | 2025-12 | Image-tile reordering | XS | Image-based slide puzzle (visual goal vs numeric) — already RN |
| 11 | [gcedo/react-solitaire](https://github.com/gcedo/react-solitaire) | MIT | 2025-05 | Drag stacks under suit/rank rules | M | Multi-pile drag-drop with cascading rule validation |
| 12 | [mimshwright/mimstris](https://github.com/mimshwright/mimstris) | MIT | 2026-05 | Falling-block (Tetris variant w/ Redux) | S | Cleaner Redux state — alternative to brandly/react-tetris if preferred |
| 13 | [igravitystudios/matchimals.fun](https://github.com/igravitystudios/matchimals.fun) | MIT | 2026-05 | Edge-matching card placement | M | Domino-like edge-attribute matching (animal halves connect) — already RN |

## Recommended 10

Drop #4 (overlaps MergeWave) and pick one of #3 / #12 (not both — same mechanic). Final shortlist:

1. **Ordinary Puzzles** — Linjat-style deduction. Polished, already RN/Expo, MobX. Effort: S.
2. **Wordle (RN)** — already React Native + Expo. Effort: XS. (Could repurpose with Russian dictionary to pair with WordBlast.)
3. **Tetris (brandly)** — TS, well-tested. Effort: S. New mechanic: rotation-under-gravity.
4. **15-puzzle** — Pure React, easy to swipe-port. Effort: XS.
5. **Sudoku (raravi)** — TS, responsive. Effort: S. Trim to 4x4 / 6x6 for vertical phone.
6. **react-crossword** — Use as a 3x3 mini-crossword (NYT mini style). Effort: S.
7. **react-nonogram** — Compact 5x5 picross. Effort: S. Visually punchy (pixel-art reveal).
8. **react-chessboard** — Power "Mate-in-1" daily puzzle. Effort: S.
9. **react-native-picture-puzzle** — Drop-in component. Effort: XS.
10. **matchimals.fun** — Edge-matching domino-style. Effort: M; already RN.

## Notes & Caveats

- **Ordinary Puzzles** is the standout: production-grade RN code, MobX store, design-polished — basically a reference implementation for our feed style.
- **react-chessboard** is a component, not a full game; you supply FEN positions. Pair with a tiny "mate-in-1" set (~50 puzzles) shipped as JSON.
- **react-crossword** is also a component library — wrap with a clue-set for a 3x3 mini grid; otherwise the mechanic is too long-form for a swipe feed. Aim for <60s solves.
- **EvanBacon/react-flappy-bird** uses Pixi — REJECTED per Phaser/Canvas exclusion. **flatris** also uses canvas-style rendering and is older — passed over in favor of brandly/react-tetris (TS, recent, DOM-based).
- **whack-a-mole** repos found were too low-quality (≤3 stars, stale); recommend implementing from scratch rather than porting.
- For variety we deliberately span: deduction (Sudoku, Nonogram, Ordinary Puzzles, Wordle), spatial (15-puzzle, picture-puzzle, Tetris), pattern-recognition (chess), word (crossword), edge-matching (matchimals). None duplicate ColorFlood, TapRush, WordBlast (RU anagrams ≠ EN word-guess), StackIt, MergeWave, PerfectCircle, Reflex333, ColorSnipe, SwipeSnake, WaterSort, BeatTap, EmojiMatch, NervePulse, FallingLetters, or Connect.
- Effort key: **XS** = drop-in component / already RN; **S** = 1-2 days port (web-React → RN, swap DOM for `View`/`Pressable`, replace CSS with StyleSheet); **M** = 3-5 days (DnD libs, multi-pile state, layout work).

## Rejected Candidates

- **ovidiuch/flatris** — canvas-heavy, multiplayer scope creep.
- **devrsi0n/React-2048-game**, **claudiopro/2048-react** — duplicate MergeWave.
- **EvanBacon/react-flappy-bird** — Pixi.js renderer.
- **mordv/mnswpr** — terminal-only (Ink). Mechanic worth re-implementing from scratch though.
- **nosovsh/fifteen** — superseded by imshubhamsingh/15-puzzle (more recent, hooks).
