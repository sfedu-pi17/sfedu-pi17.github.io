import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { loadScheduleCache, saveScheduleCache, loadSelectedEnglish, saveSelectedEnglish } from './storage.js';

// Мок localStorage поднимаем на уровень модуля, чтобы оба describe (кэш и выбор
// иностранной пары) делили один и тот же изолированный стор.
function createStorageMock() {
  let store = {};
  return {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => {
      store[k] = String(v);
    },
    removeItem: (k) => {
      delete store[k];
    },
  };
}

beforeEach(() => {
  globalThis.localStorage = createStorageMock();
});

afterAll(() => {
  delete globalThis.localStorage;
});

describe('кэш в localStorage', () => {
  it('сохраняет и загружает расписание', () => {
    const data = [{ week: 'upper', day: 'пн', lectureNumber: 1 }];
    saveScheduleCache(data);
    expect(loadScheduleCache()).toEqual(data);
  });

  it('пустой кэш -> []', () => {
    expect(loadScheduleCache()).toEqual([]);
  });

  it('кэш с совпадающей версией схемы загружается', () => {
    const data = [{ week: 'upper', day: 'пн', lectureNumber: 1 }];
    localStorage.setItem('sfedu.schedule', JSON.stringify({ version: 1, data }));
    expect(loadScheduleCache()).toEqual(data);
  });

  it('битый JSON -> []', () => {
    localStorage.setItem('sfedu.schedule', '{not json');
    expect(loadScheduleCache()).toEqual([]);
  });

  it('кэш с несовпадающей версией очищается и считается пустым', () => {
    localStorage.setItem(
      'sfedu.schedule',
      JSON.stringify({ version: 2, data: [{ week: 'upper', day: 'пн', lectureNumber: 1 }] }),
    );
    expect(loadScheduleCache()).toEqual([]);
    expect(localStorage.getItem('sfedu.schedule')).toBeNull();
  });

  it('кэш старого формата (голый массив) распознаётся как несовместимый и очищается', () => {
    localStorage.setItem('sfedu.schedule', JSON.stringify([{ week: 'upper', day: 'пн', lectureNumber: 1 }]));
    expect(loadScheduleCache()).toEqual([]);
    expect(localStorage.getItem('sfedu.schedule')).toBeNull();
  });
});

describe('выбор иностранной пары', () => {
  it('без выбора -> null', () => {
    expect(loadSelectedEnglish()).toBeNull();
  });

  it('сохраняет и загружает ключ', () => {
    saveSelectedEnglish('англ.');
    expect(loadSelectedEnglish()).toBe('англ.');
  });

  it('пустой ключ -> сбрасывает выбор', () => {
    saveSelectedEnglish('англ.');
    saveSelectedEnglish(null);
    expect(loadSelectedEnglish()).toBeNull();
    expect(localStorage.getItem('sfedu.selectedEnglish')).toBeNull();
  });
});