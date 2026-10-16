import { createContext, useContext, useMemo, useState } from 'react';

// Лоадер в шапке должен крутиться при любом обновлении (офлайн или фоновая догрузка),
// а эти два сигнала живут в разных местах: isOnline — в App, isRefreshing — в источнике
// данных (useScheduleSource). Объединяем их через контекст, чтобы шапка и источник
// разделяли один флаг загрузки и не дублировали состояние.
const ScheduleStatusContext = createContext(null);

export function ScheduleStatusProvider({ children }) {
  // Сначала true (первое монтирование — идёт первая загрузка), сбрасывается источником.
  const [isRefreshing, setIsRefreshing] = useState(true);
  const value = useMemo(() => ({ isRefreshing, setIsRefreshing }), [isRefreshing]);
  return <ScheduleStatusContext.Provider value={value}>{children}</ScheduleStatusContext.Provider>;
}

export function useScheduleStatus() {
  const ctx = useContext(ScheduleStatusContext);
  if (!ctx) throw new Error('useScheduleStatus должен использоваться внутри ScheduleStatusProvider');
  return ctx;
}