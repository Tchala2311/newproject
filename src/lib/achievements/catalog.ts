// Catalog of all in-app achievements. Tone is deliberately ironic / a bit
// snarky in Russian — the kind of badges that feel screenshotable and
// shareable. ID is the stable key written to public.user_achievements.

import { GAMES } from '../../data/games';

export type Achievement = {
  id: string;
  emoji: string;
  title: string;
  description: string;
  // Rarity affects badge color in UI
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
};

export const ACHIEVEMENTS: Achievement[] = [
  // ── First steps ──────────────────────────────────────────────────────────
  { id: 'first-blood', emoji: '🩸', title: 'Первая кровь', description: 'Сыграл свою первую игру. Поздравляем — теперь ты в воронке.', rarity: 'common' },
  { id: 'newbie', emoji: '🐣', title: 'Свеженький', description: 'Зарегистрировался. Папа гордится тобой.', rarity: 'common' },

  // ── Volume / persistence ─────────────────────────────────────────────────
  { id: 'classical-lover', emoji: '🎩', title: 'Классический любитель', description: 'Дошёл до 5-го уровня в классической игре. Бабушка одобряет.', rarity: 'rare' },
  { id: 'persistant', emoji: '🥲', title: 'Неудержимый', description: 'Перезапустил один и тот же уровень 10 раз. Уважение.', rarity: 'rare' },
  { id: 'speedrunner', emoji: '⚡', title: 'Ускоритель', description: 'Прошёл 5 уровней меньше чем за минуту. Ты вообще дышишь?', rarity: 'epic' },
  { id: 'gym-bro', emoji: '🏋️', title: 'Тренажёр для пальцев', description: 'Сыграл 50 раз. Палец просит отдохнуть.', rarity: 'rare' },

  // ── Skill ────────────────────────────────────────────────────────────────
  { id: 'precision-95', emoji: '🎯', title: 'Снайпер', description: 'Нарисовал круг с точностью ≥95%. Циркуль в шоке.', rarity: 'epic' },
  { id: 'reflex-sub-300', emoji: '🦊', title: 'Лиса', description: 'Реакция меньше 300мс. Подозрительно быстро.', rarity: 'rare' },
  { id: 'tetris-100', emoji: '🧱', title: 'Аркадный нерд', description: 'Очистил 100 линий в Тетрисе. Респект, дед.', rarity: 'epic' },
  { id: 'wordle-3', emoji: '📖', title: 'Лингвист', description: 'Угадал слово с 3-й попытки. Лев Толстой плачет от гордости.', rarity: 'rare' },

  // ── Social ──────────────────────────────────────────────────────────────
  { id: 'commenter', emoji: '🗣️', title: 'Душнила', description: 'Оставил первый комментарий. Спокойнее, бро.', rarity: 'common' },
  { id: 'serial-liker', emoji: '❤️‍🔥', title: 'Сердечный приступ', description: 'Лайкнул 10 игр. Полюби и других.', rarity: 'common' },
  { id: 'follower', emoji: '🐑', title: 'Стайный', description: 'Подписался на 5 авторов. Стая принимает тебя.', rarity: 'common' },

  // ── Habit / time ────────────────────────────────────────────────────────
  { id: 'night-owl', emoji: '🦉', title: 'Сова', description: 'Играл после полуночи. Завтра пожалеешь.', rarity: 'rare' },
  { id: 'morning-bird', emoji: '🌅', title: 'Жаворонок', description: 'Играл до 7 утра. У тебя точно всё в порядке?', rarity: 'rare' },

  // ── Spend / monetization (foreshadowing) ────────────────────────────────
  { id: 'ad-survivor', emoji: '📺', title: 'Рекламный мученик', description: 'Просмотрел 10 рекламных пауз. Премиум подмигивает.', rarity: 'common' },

  // ── Meta ────────────────────────────────────────────────────────────────
  { id: 'collector', emoji: '🏆', title: 'Коллекционер', description: 'Собрал 10 ачивок. Ну ты и душонка.', rarity: 'legendary' },
  { id: 'completionist', emoji: '👑', title: 'Завершитель', description: 'Прошёл 5-й уровень в каждой игре. Тебе нечем заняться.', rarity: 'legendary' },
];

export const ACHIEVEMENTS_BY_ID: Record<string, Achievement> =
  Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));

export const RARITY_COLOR: Record<Achievement['rarity'], string> = {
  common: '#A3A3A3',
  rare: '#5DD9B0',
  epic: '#C99FE6',
  legendary: '#FACC15',
};

// Slug sets used by the checker — keep in sync with src/data/games.ts
export const CLASSIC_GAME_SLUGS = new Set(['merge-wave', 'tetris-mini', 'slide-15', 'wordle-5', 'swipe-snake']);
export const REFLEX_GAME_SLUGS = new Set(GAMES.filter((g) => g.category === 'reflex').map((g) => g.slug));
