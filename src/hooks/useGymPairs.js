import { useState } from 'react';
import { loadGymPairs, saveGymPairs } from '@/pkg/storage.js';
import { pairKey } from '@/pkg/domain.js';

// Пользовательская физ-ра, вставленная вместо пустой пары или поверх «не ходить».
// Это отдельный слой над расписанием, независимый от «не ходить»: пару можно и
// исключить, и поставить на неё физ-ру — эти решения друг друга не перекрывают.
// Хранится набор ключей «неделя|день|номер» в сторе.
export function useGymPairs() {
  const [gymPairs, setGymPairs] = useState(() => new Set(loadGymPairs()));

  const commit = (next) => {
    setGymPairs(next);
    saveGymPairs([...next]);
  };

  // Поставить физ-ру: слот уже занят или свободен — действие идемпотентное.
  const addGym = (record) => {
    const key = pairKey(record);
    if (!gymPairs.has(key)) commit(new Set([...gymPairs, key]));
  };

  // Убрать физ-ру, вернуть слот (пустой или к исходной паре).
  const removeGym = (record) => {
    const key = pairKey(record);
    const next = new Set(gymPairs);
    if (next.delete(key)) commit(next);
  };

  const isGym = (record) => gymPairs.has(pairKey(record));

  return { gymPairs, addGym, removeGym, isGym };
}