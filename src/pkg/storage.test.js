import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { loadScheduleCache, saveScheduleCache } from './storage.js';

describe('кэш в localStorage', () => {
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

  it('сохраняет и загружает расписание', () => {
    const data = [{ week: 'upper', day: 'пн', lectureNumber: 1 }];
    saveScheduleCache(data);
    expect(loadScheduleCache()).toEqual(data);
  });

  it('пустой кэш -> []', () => {
    expect(loadScheduleCache()).toEqual([]);
  });

  it('битый JSON -> []', () => {
    localStorage.setItem('sfedu.schedule', '{not json');
    expect(loadScheduleCache()).toEqual([]);
  });

  it('кэш с несовпадающей версией очищается и считается пустым', () => {
    localStorage.setItem(
      'sfedu.schedule',
      JSON.stringify({ version: 'other-build', data: [{ week: 'upper', day: 'пн', lectureNumber: 1 }] }),
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