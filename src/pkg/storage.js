// Работа со стором: кэш расписания в localStorage.
// При открытии страницы сначала показываем сохранённые данные, а свежие
// подтягиваем асинхронно в фоне. Храним версию сборки (envelope): если версия
// в localStorage не совпадает с текущим билдом — кэш несовместим, очищаем
// и работаем как будто его нет.

const STORAGE_KEY = 'sfedu.schedule';
const CACHE_VERSION = __BUILD_HASH__;

export function loadScheduleCache() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === 'object' &&
      !Array.isArray(parsed) &&
      parsed.version === CACHE_VERSION &&
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: CACHE_VERSION, data: schedule }));
  } catch {
    // приватный режим / переполнение хранилища — игнорируем
  }
}