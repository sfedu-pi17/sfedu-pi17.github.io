import { useState } from 'react';
import { loadSelectedEnglish, saveSelectedEnglish } from '@/pkg/storage.js';

// Выбор иностранной пары, на которую ходим. Состояние живёт в сторе, чтобы выбор
// переживал перезагрузку. selectedKey — ключ выбранной группы (englishLang) или null,
// когда ходим на всё. select/clear меняют состояние и сохраняют его.
export function useForeignSelection() {
  const [selectedKey, setSelectedKey] = useState(() => loadSelectedEnglish());

  const select = (key) => {
    setSelectedKey(key);
    saveSelectedEnglish(key);
  };
  const clear = () => {
    setSelectedKey(null);
    saveSelectedEnglish(null);
  };

  // Пара «активна» (не затемнена), когда либо ничего не выбрано, либо это выбранная группа.
  const isActive = (key) => !selectedKey || key === selectedKey;

  return { selectedKey, select, clear, isActive };
}