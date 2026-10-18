import { pairKey } from '@/pkg/domain.js';
import { loadDeselectedPairs, saveDeselectedPairs } from '@/pkg/storage.js';
import { usePersistentKeySet } from './usePersistentKeySet.js';

// Пары, на которые НЕ ходим. По умолчанию пара посещаемая (активная), пока пользователь сам
// не исключит её: набор «deselected» хранит только исключённые. Каждая пара включается и
// выключается независимо — исключение одной не отменяет остальные. Хранится в сторе.
export function usePairSelection() {
  const { keys, toggle } = usePersistentKeySet(loadDeselectedPairs, saveDeselectedPairs);

  return {
    deselected: keys,
    toggle,
    isActive: (record) => !keys.has(pairKey(record)),
    isInactive: (record) => keys.has(pairKey(record)),
  };
}