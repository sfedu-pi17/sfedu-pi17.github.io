// Нативный pull-to-refresh отключён (overscroll-behavior: none на html/body — иначе экран
// дёргается), поэтому обновление свайпом вниз делаем сами. Свайп — из любого места экрана,
// но срабатывает только когда контейнер наверху (scrollTop === 0), иначе это обычный скролл
// контента. Контент не сдвигается: показывается стрелочка-индикатор, крутящаяся по мере тяги.
// Перетянул порог и отпустил — перезагрузка (стрелку при перезагрузке крутит CSS-анимация,
// см. .ptrArrow.ptrSpinning в Timetable.css); иначе индикатор поднимается, а стрелка
// откручивается обратно (spin→0) и тает.
import { useRef, useState, useCallback, useEffect } from 'react';

// Порог, после которого отпускание запускает перезагрузку.
const THRESHOLD_PX = 70;
// Предел оттягивания (перетягивать дальше порога смысла нет).
const MAX_PULL_PX = 110;

export function usePullToRefresh(onRefresh) {
  const [pull, setPull] = useState(0);
  const [spin, setSpin] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  // Отпустили палец: включаем transition на возврат; снимаем его при новом касании.
  const [settling, setSettling] = useState(false);

  // pull/spin читаем в onTouchEnd через ref, чтобы обработчик не пересоздавался на каждом кадре.
  const pullRef = useRef(0);
  const setAndSyncPull = (v) => {
    pullRef.current = v;
    setPull(v);
  };
  const spinRef = useRef(0);
  const setAndSyncSpin = (v) => {
    spinRef.current = v;
    setSpin(v);
  };

  const start = useRef({ y: 0, x: 0, canPull: false });
  const dragging = useRef(false);
  const lastClientY = useRef(0);
  const refreshingRef = useRef(false);
  refreshingRef.current = refreshing;

  // onRefresh пересоздаётся родителем каждый рендер, поэтому держим в ref: иначе эффект
  // ниже перезапускался бы, отменял rAF и возврат (или reload) не срабатывал.
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  const onTouchStart = useCallback((e) => {
    if (refreshingRef.current) return;
    const t = e.touches[0];
    // Свайп из любого места, но только сверху прокрутки: если пользователь уже проскроллил
    // вниз, вертикальная тяга — это обычный скролл содержимого, а не обновление.
    const scrollTop = e.currentTarget.scrollTop;
    start.current = { y: t.clientY, x: t.clientX, canPull: scrollTop <= 0 };
    lastClientY.current = t.clientY;
    dragging.current = true;
    setSettling(false);
    // Стрелка при новом касании стартует с нуля (в начале тяги она ещё не видна, скачок не заметен).
    setAndSyncSpin(0);
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
    // Угол стрелки растёт по часовой вместе с тягой.
    setAndSyncSpin(pullRef.current * 2);
  }, []);

  const onTouchEnd = useCallback(() => {
    if (!dragging.current || refreshingRef.current) return;
    dragging.current = false;
    // Отпустили: включаем transition на возврат. Само обнуление/фиксацию делаем кадром позже
    // (useEffect) — иначе transition и transform сменились бы одновременно и анимация не стартовала.
    setSettling(true);
  }, []);

  const onTouchCancel = onTouchEnd;

  // Кадр спустя выставляем конечное состояние: к этому моменту transition уже применён к старому
  // значению, поэтому анимация реально запускается. Ниже порога — откат: подъём (pull→0) и
  // стрелка откручивается обратно (spin→0). Выше — фиксация и перезагрузка.
  useEffect(() => {
    if (!settling) return;
    const id = requestAnimationFrame(() => {
      if (pullRef.current >= THRESHOLD_PX) {
        setRefreshing(true);
        setAndSyncPull(THRESHOLD_PX);
        onRefreshRef.current();
      } else {
        setAndSyncPull(0);
        setAndSyncSpin(0);
      }
    });
    return () => cancelAnimationFrame(id);
  }, [settling]);

  return {
    pull,
    spin,
    refreshing,
    settling,
    threshold: THRESHOLD_PX,
    handlers: { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel },
  };
}