import { useMemo, useState } from 'react';
import { ScheduleStatusContext } from '@/hooks/useScheduleStatus.js';

// Лоадер в шапке должен крутиться при любом обновлении (офлайн или фоновая догрузка).
// Объединяем источник данных и шапку через контекст, чтобы они разделяли один флаг
// загрузки, а не дублировали состояние.
export function ScheduleStatusProvider({ children }) {
  // Сначала true (первое монтирование — идёт первая загрузка), сбрасывается источником.
  const [isRefreshing, setIsRefreshing] = useState(true);
  const value = useMemo(() => ({ isRefreshing, setIsRefreshing }), [isRefreshing]);
  return <ScheduleStatusContext.Provider value={value}>{children}</ScheduleStatusContext.Provider>;
}