import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import {
  loadScheduleCache,
  saveScheduleCache,
  loadDeselectedPairs,
  saveDeselectedPairs,
  loadGymPairs,
  saveGymPairs,
} from './storage.js';

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

describe('исключённые пары (не ходить)', () => {
  it('по умолчанию список пуст', () => {
    expect(loadDeselectedPairs()).toEqual([]);
  });

  it('сохраняет и загружает список ключей', () => {
    saveDeselectedPairs(['upper|пн|1', 'lower|ср|2']);
    expect(loadDeselectedPairs()).toEqual(['upper|пн|1', 'lower|ср|2']);
  });

  it('пустой список -> сбрасывает выбор', () => {
    saveDeselectedPairs(['upper|пн|1']);
    saveDeselectedPairs([]);
    expect(loadDeselectedPairs()).toEqual([]);
    expect(localStorage.getItem('sfedu.deselectedPairs')).toBeNull();
  });
});

describe('физ-ра в слотах', () => {
  it('по умолчанию список пуст', () => {
    expect(loadGymPairs()).toEqual([]);
  });

  it('сохраняет и загружает список ключей', () => {
    saveGymPairs(['upper|пн|1', 'lower|ср|2']);
    expect(loadGymPairs()).toEqual(['upper|пн|1', 'lower|ср|2']);
  });

  it('пустой список -> сбрасывает выбор', () => {
    saveGymPairs(['upper|пн|1']);
    saveGymPairs([]);
    expect(loadGymPairs()).toEqual([]);
    expect(localStorage.getItem('sfedu.gymPairs')).toBeNull();
  });
});