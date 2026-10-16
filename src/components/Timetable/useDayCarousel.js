import { useRef, useState } from 'react';
import { shiftDay } from '@/pkg/domain.js';

// Механика свайпа карусели дней: определение оси (горизонтальный свайп vs вертикальный
// скролл с мёртвой зоной ~8px), клэмп сдвига к ширине панели и решение о коммите
// (переход на соседний день) по порогу. Возвращает обработчики и ref вьюпорта, чтобы
// компонент не знал про pointer capture, drag-состояние и transition-фазу.
// onCommit(day, weekOffset) вызывается после завершения transition к целевому сдвигу.
export function useDayCarousel({ isReviewing, selectedDay, weekOffset, onCommit }) {
  const viewportRef = useRef(null);
  const gestureRef = useRef(null); // { startX, startY, axis, dir, pointerId, lastDx }
  const pendingCommitRef = useRef(null);
  const [drag, setDrag] = useState({ x: 0 });
  const [settling, setSettling] = useState(false);

  const onPointerDown = (e) => {
    if (isReviewing || settling) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const width = viewportRef.current?.getBoundingClientRect().width || 0;
    gestureRef.current = { startX: e.clientX, startY: e.clientY, axis: null, dir: null, pointerId: e.pointerId, lastDx: 0, width };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e) => {
    const g = gestureRef.current;
    if (!g || settling) return;
    const dx = e.clientX - g.startX;
    const dy = e.clientY - g.startY;
    // Пока ось не зафиксирована — ждём, когда движение превысит мёртвую зону (~8px),
    // и решаем: горизонтальный свайп или вертикальная прокрутка.
    if (g.axis === null) {
      if (Math.abs(dx) <= 8 && Math.abs(dy) <= 8) return;
      g.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      if (g.axis === 'y') {
        gestureRef.current = null;
        e.currentTarget.releasePointerCapture(g.pointerId);
        return; // вертикальный скролл карточки идёт нативно
      }
    }
    if (g.axis === 'x') {
      g.dir = dx < 0 ? 'next' : 'prev';
      g.lastDx = dx;
      // Клэмпим к ширине панели, чтобы при сильном уводе пальца не было пустого поля.
      const clamped = Math.max(-g.width, Math.min(g.width, dx));
      setDrag({ x: clamped }); // содержание следует за пальцем 1:1 (transition выключен)
    }
  };

  const onPointerUp = () => {
    const g = gestureRef.current;
    gestureRef.current = null;
    if (!g || settling || g.axis !== 'x') return;
    const width = g.width || 0;
    const threshold = Math.max(50, 0.25 * width);
    let commit = null;
    if (Math.abs(g.lastDx) > threshold) {
      commit = shiftDay(selectedDay, weekOffset, g.dir === 'next' ? 1 : -1);
      // Уважаем кламп недель: назад из самой нижней недели не уходим, а возвращаемся.
      if (commit.weekOffset < 0) commit = null;
    }
    pendingCommitRef.current = commit;
    setDrag({ x: commit ? (g.dir === 'next' ? -width : width) : 0 });
    setSettling(true); // включает плавный transition к целевому сдвигу
  };

  const onPointerCancel = () => {
    gestureRef.current = null;
    pendingCommitRef.current = null;
    setDrag({ x: 0 });
    setSettling(false);
  };

  const onTransitionEnd = (e) => {
    if (e.propertyName !== 'transform' || !settling) return;
    const commit = pendingCommitRef.current;
    pendingCommitRef.current = null;
    if (commit) onCommit(commit.day, commit.weekOffset);
    setSettling(false);
    setDrag({ x: 0 });
  };

  return {
    viewportRef,
    drag,
    settling,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onTransitionEnd,
  };
}