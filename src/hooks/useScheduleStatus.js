import { createContext, useContext } from 'react';

// Общий контекст лоадера в шапке: источник данных пишет isRefreshing, шапка его читает.
// Вынесен в отдельный файл без компонента, чтобы не смешивать экспорт хука и Provider
// (react-refresh запрещает файлу экспортировать и компонент, и функцию в одном файле).
export const ScheduleStatusContext = createContext(null);

export function useScheduleStatus() {
  const ctx = useContext(ScheduleStatusContext);
  if (!ctx) throw new Error('useScheduleStatus должен использоваться внутри ScheduleStatusProvider');
  return ctx;
}