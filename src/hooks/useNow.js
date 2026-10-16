import { useCallback, useEffect, useState } from 'react';

// Текущее время для расчёта дня/недели и метки пары. Тикает ровно в начале каждой минуты,
// а не каждые 30с, чтобы счётчик «до начала/до конца» не отставал: первый тик —
// setTimeout до круглой минуты, дальше — setInterval в 60с, в момент перехода на новую
// минуту мы уже точно в её начале.
// refreshNow — принудительный пересчёт при возврате к приложению (focus/visibility/online).
export function useNow() {
  const [now, setNow] = useState(() => new Date());
  const refreshNow = useCallback(() => setNow(new Date()), []);

  useEffect(() => {
    let intervalId;
    const syncMinute = () => {
      setNow(new Date());
      intervalId = setInterval(() => setNow(new Date()), 60_000);
    };
    const msToNextMinute = 60_000 - (Date.now() % 60_000);
    const timeoutId = setTimeout(syncMinute, msToNextMinute);
    return () => {
      clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  return [now, refreshNow];
}