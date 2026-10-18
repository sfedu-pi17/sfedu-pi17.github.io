import { useCallback, useEffect, useRef, useState } from 'react';
import { diffSchedule } from '@/pkg/domain.js';
import { parseScheduleCsv } from '@/pkg/serialization.js';
import { loadScheduleCache, saveScheduleCache } from '@/pkg/storage.js';
import { fetchScheduleCsv } from '@/pkg/api.js';
import { useScheduleStatus } from '@/hooks/useScheduleStatus.js';

// Источник расписания: кэш + фоновая догрузка CSV и diff. Владеет данными, индикаторами
// загрузки/ошибки и уведомлением об изменениях. Навигация по неделям/дням (weekOffset,
// selectedDay) и режим просмотра diff (isReviewing) остаются в компоненте — это про показ,
// а не про данные; commitChanges — их завершающий шаг («ОК» сохраняет новое расписание).
// Флаг isRefreshing шлём в контекст, чтобы шапка крутила лоадер при любом обновлении.
export function useScheduleSource() {
  const { setIsRefreshing } = useScheduleStatus();
  const [schedule, setSchedule] = useState(() => loadScheduleCache());
  // Ошибка загрузки — показываем уведомление.
  const [error, setError] = useState(false);
  // Тост об ошибке автоматически скрывается через 10 секунд.
  const [toastVisible, setToastVisible] = useState(false);

  // Изменившиеся пары (diff старый -> новый) и уведомление о них.
  const [changes, setChanges] = useState({});
  const [showNotif, setShowNotif] = useState(false);

  // Новое расписание, ещё не записанное в кэш: сохраняем только после «ОК» в режиме изменений.
  const pendingData = useRef(null);

  // Загрузка свежего CSV: показываем кэш, в фоне подтягиваем и диффим.
  // useCallback, чтобы вызывать и на монтировании, и при возврате к приложению
  // (focus/visibilitychange/online) без ручной перезагрузки.
  const refresh = useCallback(() => {
    setIsRefreshing(true);
    const oldData = loadScheduleCache();
    fetchScheduleCsv()
      .then((csvText) => {
        const data = parseScheduleCsv(csvText);
        const diffed = diffSchedule(oldData, data);
        // Если есть изменения — не сохраняем кэш, ждём подтверждения «ОК»;
        // иначе (нет старых данных или всё совпало) пишем сразу.
        const hasChanges = oldData.length && Object.keys(diffed).length;
        pendingData.current = data;
        if (!hasChanges) saveScheduleCache(data);
        setChanges(diffed);
        if (hasChanges) setShowNotif(true);
        setSchedule(data);
        setError(false);
        setToastVisible(false);
        setIsRefreshing(false);
      })
      .catch((err) => {
        console.error('Ошибка загрузки CSV:', err);
        setError(true);
        // Офлайн не пугаем тостом — в хедере уже крутится лоадер.
        if (navigator.onLine) setToastVisible(true);
        setIsRefreshing(false);
      });
  }, [setIsRefreshing]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Автоскрытие тоста об ошибке через 10 секунд.
  useEffect(() => {
    if (!toastVisible) return;
    const id = setTimeout(() => setToastVisible(false), 10_000);
    return () => clearTimeout(id);
  }, [toastVisible]);

  // «ОК» в режиме изменений: сохраняем новое расписание очищаем diff.
  const commitChanges = useCallback(() => {
    if (pendingData.current) saveScheduleCache(pendingData.current);
    setShowNotif(false);
    setChanges({});
  }, []);

  return {
    schedule,
    error,
    toastVisible,
    changes,
    showNotif,
    refresh,
    commitChanges,
  };
}