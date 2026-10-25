// Нативный pull-to-refresh отключён (overscroll-behavior: none на html/body — иначе экран
// дёргается), поэтому обновление свайпом вниз делаем сами. Свайп — из любого места экрана,
// но срабатывает только когда контейнер наверху (scrollTop === 0), иначе это обычный скролл
// контента. Контент не сдвигается: показывается стрелочка-индикатор, крутящаяся по мере тяги.
// Перетянул порог и отпустил — перезагрузка; иначе индикатор плавно возвращается.
import { useRef, useState, useCallback } from 'react';

// Порог, после которого отпускание запускает перезагрузку.
const THRESHOLD_PX = 70;
// Предел оттягивания (перетягивать дальше порога смысла нет).
const MAX_PULL_PX = 110;

export function usePullToRefresh(onRefresh) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  // pull читаем в onTouchEnd через ref, чтобы обработчик не пересоздавался на каждом кадре.
  const pullRef = useRef(0);
  const setAndSyncPull = (v) => {
    pullRef.current = v;
    setPull(v);
  };

  const start = useRef({ y: 0, x: 0, canPull: false });
  const dragging = useRef(false);
  const lastClientY = useRef(0);
  const refreshingRef = useRef(false);
  refreshingRef.current = refreshing;

  const onTouchStart = useCallback((e) => {
    if (refreshingRef.current) return;
    const t = e.touches[0];
    // Свайп из любого места, но только сверху прокрутки: если пользователь уже проскроллил
    // вниз, вертикальная тяга — это обычный скролл содержимого, а не обновление.
    const scrollTop = e.currentTarget.scrollTop;
    start.current = { y: t.clientY, x: t.clientX, canPull: scrollTop <= 0 };
    lastClientY.current = t.clientY;
    dragging.current = true;
  }, []);

  const onTouchMove = useCallback((e) => {
    if (!dragging.current || refreshingRef.current) return;
    const { y, x, canPull } = start.current;
    if (!canPull) return;
    const t = e.touches[0];
    // Вертикальность определяем по суммарному смещению от старта — так карусель (горизонталь)
    // остаётся в покое, а лёгкий боковой снос по пути не дёргает стрелку.
    const totalDy = t.clientY - y;
    const totalDx = t.clientX - x;
    if (Math.abs(totalDx) > Math.abs(totalDy)) return;
    // pull считаем приращением от последней точки, а не от старта: тогда при смене вектора
    // (начинаешь вести вверх) стрелка сразу едет вверх, а не ждёт, пока суммарное смещение,
    // упёртое в MAX, не упадёт ниже MAX. Вниз — с сопротивлением, вверх — 1:1.
    const delta = t.clientY - lastClientY.current;
    lastClientY.current = t.clientY;
    const resistance = delta > 0 ? 0.55 : 1;
    setAndSyncPull(Math.max(0, Math.min(pullRef.current + delta * resistance, MAX_PULL_PX)));
  }, []);

  const onTouchEnd = useCallback(() => {
    if (!dragging.current || refreshingRef.current) return;
    dragging.current = false;
    if (pullRef.current >= THRESHOLD_PX) {
      setRefreshing(true);
      setAndSyncPull(THRESHOLD_PX);
      onRefresh();
    } else {
      setAndSyncPull(0);
    }
  }, [onRefresh]);

  const onTouchCancel = onTouchEnd;

  return {
    pull,
    refreshing,
    threshold: THRESHOLD_PX,
    handlers: { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel },
  };
}