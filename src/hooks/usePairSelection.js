import { useState } from 'react';
import { loadDeselectedPairs, saveDeselectedPairs } from '@/pkg/storage.js';
import { pairKey } from '@/pkg/domain.js';

// Пары, на которые НЕ ходим. По умолчанию пара посещаемая (активная), пока пользователь сам
// не исключит её: набор «deselected» хранит только исключённые. Каждая пара включается и
// выключается независимо — исключение одной не отменяет остальные. Хранится в сторе.
export function usePairSelection() {
  const [deselected, setDeselected] = useState(() => new Set(loadDeselectedPairs()));

  const commit = (next) => {
    setDeselected(next);
    saveDeselectedPairs([...next]);
  };

  const toggle = (record) => {
    const key = pairKey(record);
    const next = new Set(deselected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    commit(next);
  };

  // На пару ходим (по умолчанию), пока она не в наборе исключённых.
  const isActive = (record) => !deselected.has(pairKey(record));
  // Пару исключили — не ходим на неё, приглушаем.
  const isInactive = (record) => deselected.has(pairKey(record));

  return { deselected, toggle, isActive, isInactive };
}