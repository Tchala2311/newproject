// Game catalog. Russian-first; English fallback in `nameEn` for future i18n.
// Gradients & accents approximate the OKLCH palette from the Gamify v2 mockup.

export type PatternType = 'circles' | 'dots' | 'grid' | 'lines' | 'hex' | 'pixel';

export type Creator = {
  handle: string; // without @
  displayName: string;
  verified?: boolean;
};

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
  comments: string; // "12.4K"
  creator: Creator;
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
    comments: '8.2K',
    creator: { handle: 'nika.flood', displayName: 'Ника', verified: true },
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
    comments: '24.1K',
    creator: { handle: 'rush.maks', displayName: 'Макс', verified: true },
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
    comments: '15.7K',
    creator: { handle: 'lera.words', displayName: 'Лера' },
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
    comments: '31.2K',
    creator: { handle: 'tower.dima', displayName: 'Дима', verified: true },
    gradient: ['#2862A8', '#2B2978'],
    accent: '#79BCDD',
    patternType: 'lines',
    match: 89,
  },
  {
    id: 6,
    slug: 'perfect-circle',
    name: 'Идеальный круг',
    nameEn: 'Perfect Circle',
    tag: '🎯 Точность',
    category: 'reflex',
    categoryLabel: 'Рефлекс',
    tagline: 'Нарисуй круг — получи % точности',
    duration: '~20 сек',
    plays: '8.9M',
    likes: '2.3M',
    comments: '47.1K',
    creator: { handle: 'circle.viral', displayName: 'Соня', verified: true },
    gradient: ['#3D2A8C', '#1B1455'],
    accent: '#F5A04A',
    patternType: 'circles',
    match: 97,
  },
  {
    id: 7,
    slug: 'reflex-333',
    name: 'Реакция 333',
    nameEn: 'Reflex 333',
    tag: '⚡ Реакция',
    category: 'reflex',
    categoryLabel: 'Рефлекс',
    tagline: 'Зелёное — тапай. Кто быстрее всех?',
    duration: '~20 сек',
    plays: '6.4M',
    likes: '1.4M',
    comments: '22.0K',
    creator: { handle: 'react.fast', displayName: 'Стас' },
    gradient: ['#16A34A', '#0E5C29'],
    accent: '#86EFAC',
    patternType: 'dots',
    match: 92,
  },
  {
    id: 8,
    slug: 'color-snipe',
    name: 'Цветовой снайпер',
    nameEn: 'Color Snipe',
    tag: '🧠 Мозг',
    category: 'brain',
    categoryLabel: 'Мозг',
    tagline: 'Тапни цвет — слово может врать',
    duration: '~30 сек',
    plays: '3.1M',
    likes: '512K',
    comments: '9.8K',
    creator: { handle: 'stroop.lab', displayName: 'Ира', verified: true },
    gradient: ['#7C3AED', '#3F1D9E'],
    accent: '#FFB454',
    patternType: 'pixel',
    match: 88,
  },
  {
    id: 9,
    slug: 'swipe-snake',
    name: 'Змейка-Свайп',
    nameEn: 'Swipe Snake',
    tag: '🐍 Классика',
    category: 'reflex',
    categoryLabel: 'Рефлекс',
    tagline: 'Старая добрая. Дойди до длины 30',
    duration: '~1 мин',
    plays: '11.2M',
    likes: '3.7M',
    comments: '88.4K',
    creator: { handle: 'snake.og', displayName: 'Артём' },
    gradient: ['#0F766E', '#0A4B45'],
    accent: '#5EEAD4',
    patternType: 'grid',
    match: 99,
  },
  {
    id: 10,
    slug: 'water-sort',
    name: 'Сортировка воды',
    nameEn: 'Water Sort',
    tag: '💧 Чилл',
    category: 'chill',
    categoryLabel: 'Чилл',
    tagline: 'Перелей жидкость — один цвет в колбе',
    duration: '~2 мин',
    plays: '14.8M',
    likes: '4.2M',
    comments: '120.3K',
    creator: { handle: 'sort.daria', displayName: 'Дарья', verified: true },
    gradient: ['#0369A1', '#0C4A6E'],
    accent: '#7DD3FC',
    patternType: 'lines',
    match: 96,
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
    comments: '18.9K',
    creator: { handle: 'yana.wave', displayName: 'Яна' },
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
