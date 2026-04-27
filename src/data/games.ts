// Game catalog. Russian-first; English fallback in `nameEn` for future i18n.
// Gradients & accents approximate the OKLCH palette from the Gamify v2 mockup.

export type PatternType = 'circles' | 'dots' | 'grid' | 'lines' | 'hex' | 'pixel';

export type Game = {
  id: number;
  slug: string;
  name: string;
  nameEn: string;
  tag: string; // emoji + label, shown as a chip
  category: 'chill' | 'reflex' | 'brain' | 'timing' | 'strategy' | 'spot';
  categoryLabel: string; // RU label for explore filters
  tagline: string;
  duration: string; // "~30 сек"
  plays: string; // "5.1M"
  likes: string; // "892K"
  gradient: [string, string];
  accent: string;
  patternType: PatternType;
  match: number; // AI-match % (0-100), placeholder until ranker is live
};

export const GAMES: Game[] = [
  {
    id: 1,
    slug: 'color-flood',
    name: 'Залей цветом',
    nameEn: 'Color Flood',
    tag: '🎨 Чилл',
    category: 'chill',
    categoryLabel: 'Чилл',
    tagline: 'Закрась всё поле одним цветом',
    duration: '~1 мин',
    plays: '2.4M',
    likes: '418K',
    gradient: ['#6B3FA5', '#5C2A6F'],
    accent: '#C99FE6',
    patternType: 'circles',
    match: 98,
  },
  {
    id: 2,
    slug: 'tap-rush',
    name: 'Тап-Раш',
    nameEn: 'Tap Rush',
    tag: '⚡ Рефлекс',
    category: 'reflex',
    categoryLabel: 'Рефлекс',
    tagline: 'Лопай шары пока не вышло время',
    duration: '~30 сек',
    plays: '5.1M',
    likes: '892K',
    gradient: ['#008866', '#00586B'],
    accent: '#5DD9B0',
    patternType: 'dots',
    match: 95,
  },
  {
    id: 3,
    slug: 'word-blast',
    name: 'Слово-Взрыв',
    nameEn: 'Word Blast',
    tag: '🧠 Мозг',
    category: 'brain',
    categoryLabel: 'Мозг',
    tagline: 'Собери слово из букв на скорость',
    duration: '~2 мин',
    plays: '3.8M',
    likes: '610K',
    gradient: ['#B9763B', '#8C2E1A'],
    accent: '#F0CE61',
    patternType: 'grid',
    match: 91,
  },
  {
    id: 4,
    slug: 'stack-it',
    name: 'Башня',
    nameEn: 'Stack It',
    tag: '🏗️ Тайминг',
    category: 'timing',
    categoryLabel: 'Тайминг',
    tagline: 'Точно роняй блок и строй башню',
    duration: '~90 сек',
    plays: '7.2M',
    likes: '1.1M',
    gradient: ['#2862A8', '#2B2978'],
    accent: '#79BCDD',
    patternType: 'lines',
    match: 89,
  },
  {
    id: 5,
    slug: 'merge-wave',
    name: 'Волна 2048',
    nameEn: 'Merge Wave',
    tag: '🌊 Стратегия',
    category: 'strategy',
    categoryLabel: 'Стратегия',
    tagline: 'Соединяй плитки, дойди до 256',
    duration: '~3 мин',
    plays: '4.6M',
    likes: '760K',
    gradient: ['#008C8C', '#1A5980'],
    accent: '#6BD9C0',
    patternType: 'hex',
    match: 94,
  },
];

export const CATEGORIES: { id: 'all' | Game['category']; label: string }[] = [
  { id: 'all', label: 'Все' },
  { id: 'chill', label: 'Чилл' },
  { id: 'reflex', label: 'Рефлекс' },
  { id: 'brain', label: 'Мозг' },
  { id: 'timing', label: 'Тайминг' },
  { id: 'strategy', label: 'Стратегия' },
];
