import { describe, expect, it } from 'vitest';
import { WHATS_NEW, latestVersion, unseenChanges } from './whatsnew.js';

describe('unseenChanges', () => {
  it('при пустой подтверждённой версии показывает всё', () => {
    const all = WHATS_NEW.flatMap((e) => e.changes);
    expect(unseenChanges(WHATS_NEW, null)).toEqual(all);
  });

  it('показывает только релизы новее подтверждённого', () => {
    const list = [
      { version: '2025-10-01', changes: ['a'] },
      { version: '2025-11-01', changes: ['b', 'c'] },
      { version: '2025-12-01', changes: ['d'] },
    ];
    expect(unseenChanges(list, '2025-11-01')).toEqual(['d']);
    expect(unseenChanges(list, '2025-12-01')).toEqual([]);
  });
});

describe('latestVersion', () => {
  it('берёт версию последнего релиза', () => {
    expect(latestVersion()).toBe(WHATS_NEW[WHATS_NEW.length - 1].version);
  });
});