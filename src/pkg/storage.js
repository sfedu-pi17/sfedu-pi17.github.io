// Работа со стором: кэш расписания в localStorage.
// При открытии страницы сначала показываем сохранённые данные, а свежие
// подтягиваем асинхронно в фоне. Храним версию схемы (envelope): если версия
// в localStorage не совпадает с текущей схемой — кэш несовместим, очищаем
// и работаем как будто его нет. Версия схемы не меняется от деплоя,
// поэтому обновление фронта не стирает расписание у офлайн-пользователя.

const STORAGE_KEY = 'sfedu.schedule';
// Версия ФОРМАТА кэша (схема данных), а не сборки. Растёт только при изменении структуры
// записей; деплой больше не стирает расписание у офлайн-пользователя.
const SCHEMA_VERSION = 1;

export function loadScheduleCache() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === 'object' &&
      !Array.isArray(parsed) &&
      parsed.version === SCHEMA_VERSION &&
      Array.isArray(parsed.data)
    ) {
      return parsed.data;
    }
    // Несовместимый или старый формат (голый массив) — очистить и работать без кэша.
    localStorage.removeItem(STORAGE_KEY);
    return [];
  } catch {
    return [];
  }
}

export function saveScheduleCache(schedule) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: SCHEMA_VERSION, data: schedule }));
  } catch {
    // приватный режим / переполнение хранилища — игнорируем
  }
}

// Пары, на которые НЕ ходим (исключённые) — список ключей «неделя|день|номер». По умолчанию
// пара считается посещаемой, поэтому храним только «не ходить». Это пользовательское
// предпочтение отдельно от кэша расписания, поэтому свой ключ и без envelope-версии.
// Пустой список не храним.
const DESELECTED_PAIRS_KEY = 'sfedu.deselectedPairs';

export function loadDeselectedPairs() {
  try {
    const raw = localStorage.getItem(DESELECTED_PAIRS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveDeselectedPairs(keys) {
  try {
    if (keys.length) localStorage.setItem(DESELECTED_PAIRS_KEY, JSON.stringify(keys));
    else localStorage.removeItem(DESELECTED_PAIRS_KEY);
  } catch {
    // приватный режим / переполнение хранилища — игнорируем
  }
}