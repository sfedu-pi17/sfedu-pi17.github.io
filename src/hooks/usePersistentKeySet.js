import { useState } from 'react';
import { pairKey } from '@/pkg/domain.js';

// Набор ключей пар (неделя|день|номер), хранимый в localStorage. Общий каркас для «не ходить»
// и «физ-ра»: отличие только в функции загрузки/сохранения и в том, какие операции нужны.
// Ключи адресуются через pairKey(record), поэтому слот можно передать и как реальную запись,
// и как { week, day, lectureNumber } для пустого слота.
export function usePersistentKeySet(load, save) {
  const [keys, setKeys] = useState(() => new Set(load()));

  const commit = (next) => {
    setKeys(next);
    save([...next]);
  };

  const has = (record) => keys.has(pairKey(record));
  const add = (record) => {
    const key = pairKey(record);
    if (!keys.has(key)) commit(new Set([...keys, key]));
  };
  const remove = (record) => {
    const key = pairKey(record);
    const next = new Set(keys);
    if (next.delete(key)) commit(next);
  };
  const toggle = (record) => {
    const key = pairKey(record);
    const next = new Set(keys);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    commit(next);
  };

  return { keys, has, add, remove, toggle };
}