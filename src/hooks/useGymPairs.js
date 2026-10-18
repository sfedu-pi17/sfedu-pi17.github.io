import { loadGymPairs, saveGymPairs } from '@/pkg/storage.js';
import { usePersistentKeySet } from './usePersistentKeySet.js';

// Пользовательская физ-ра, вставленная вместо пустой пары или поверх «не ходить».
// Это отдельный слой над расписанием, независимый от «не ходить»: пару можно и
// исключить, и поставить на неё физ-ру — эти решения друг друга не перекрывают.
export function useGymPairs() {
  const { keys, add, remove, has } = usePersistentKeySet(loadGymPairs, saveGymPairs);

  return { gymPairs: keys, addGym: add, removeGym: remove, isGym: has };
}