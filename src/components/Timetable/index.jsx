import { useState, useEffect, useMemo, useRef } from 'react';
import { Card, Text, Loader, Container, Group } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import {
  getCurrentWeekType,
  getTodayDayCode,
  getLectureTimeState,
  shiftDay,
  diffSchedule,
  groupByWeekDay,
  buildReviewSteps,
  getDayDates,
  isCancelledOn,
} from '@/pkg/domain.js';
import { parseScheduleCsv } from '@/pkg/serialization.js';
import { loadScheduleCache, saveScheduleCache } from '@/pkg/storage.js';
import { fetchScheduleCsv } from '@/pkg/api.js';
import { weekForOffset } from './utils.js';
import WeekHeader from './WeekHeader.jsx';
import DayBar from './DayBar.jsx';
import ChangesBanner from './ChangesBanner.jsx';
import PaneRows from './PaneRows.jsx';
import './Timetable.css';

export default function Timetable() {
  const [schedule, setSchedule] = useState(() => loadScheduleCache());
  // Догрузка свежих данных: показывает компактный индикатор (тост), не блокируя интерфейс.
  // Сначала true (первая загрузка), сбрасывается после ответа.
  const [refreshing, setRefreshing] = useState(true);
  // Ошибка загрузки — показываем уведомление.
  const [error, setError] = useState(false);
  // Тост об ошибке автоматически скрывается через 10 секунд.
  const [toastVisible, setToastVisible] = useState(false);

  // Изменившиеся пары (diff старый -> новый) и уведомление о них.
  const [changes, setChanges] = useState({});
  const [showNotif, setShowNotif] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);

  // По умолчанию — текущая неделя и текущий день.
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState(() => getTodayDayCode());
  const todayDay = useMemo(() => getTodayDayCode(), []);
  const currentWeek = useMemo(() => getCurrentWeekType(), []);
  // Тип показанной недели для расписания: чётный сдвиг — та же, нечётный — противоположная.
  const week = weekOffset % 2 === 0 ? currentWeek : currentWeek === 'upper' ? 'lower' : 'upper';
  // Зелёная обводка дня недели актуальна только когда показана текущая неделя.
  const isCurrentWeek = weekOffset === 0;
  // Назад (в прошлые недели) можно листать только когда это не текущая неделя:
  // у сегодняшней даты прошлого больше нет.
  const isPrevDisabled = weekOffset <= 0;

  // Новое расписание, ещё не записанное в кэш: сохраняем только после «ОК» в режиме изменений.
  const pendingData = useRef(null);

  // Текущее время: обновляем, чтобы метка текущей пары не устаревала.
  const [now, setNow] = useState(() => new Date());
  // Счётчик «до начала/до конца» должен обновляться ровно в начале каждой минуты, а не
  // каждые 30с. Первый тик — setTimeout до круглой минуты, дальше — setInterval в 60с:
  // в момент перехода на новую минуту мы уже точно в её начале.
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

  // Автоскрытие тоста об ошибке через 10 секунд.
  useEffect(() => {
    if (!toastVisible) return;
    const id = setTimeout(() => setToastVisible(false), 10_000);
    return () => clearTimeout(id);
  }, [toastVisible]);

  // Подсветка текущей/следующей пары осмысленна только для сегодняшнего дня в текущей неделе.
  const isTodayView = isCurrentWeek && selectedDay === todayDay;

  useEffect(() => {
    // Старые данные на момент загрузки — для сравнения изменений.
    const oldData = loadScheduleCache();
    let cancelled = false;
    fetchScheduleCsv()
      .then((csvText) => {
        console.log(csvText)
        if (cancelled) return;
        const data = parseScheduleCsv(csvText);
        const diffed = diffSchedule(oldData, data);
        // Если есть изменения — не сохраняем кэш, ждём подтверждения «ОК»;
        // иначе (нет старых данных или всё совпало) пишем сразу.
        const hasChanges = oldData.length && Object.keys(diffed).length;
        pendingData.current = data;
        if (!hasChanges) saveScheduleCache(data);
        setChanges(diffed);
        if (hasChanges) {
          setShowNotif(true);
        }
        setSchedule(data);
        setRefreshing(false);
        setError(false);
        setToastVisible(false);
      })
      .catch((err) => {
        console.error('Ошибка загрузки CSV:', err);
        if (!cancelled) {
          setRefreshing(false);
          setError(true);
          setToastVisible(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Записи текущей недели, сгруппированные по дню и номеру пары.
  const weekDayMap = useMemo(() => groupByWeekDay(schedule, week), [schedule, week]);

  // Даты дней для отображаемой недели (под подписями пн..сб).
  const dayDates = useMemo(() => getDayDates(weekOffset), [weekOffset]);

  // Пара доступна, если на этот день есть запись и она не отменена; пустые и
  // отменённые пропускаем при подсветке, показывая следующую актуальную.
  const isAvailableLecture = (day, num) => {
    const entry = weekDayMap[day][num];
    return !!entry?.discipline && !isCancelledOn(entry.cancelDate, dayDates[day]);
  };
  // Во время перемены это будет следующая пара со статусом 'upcoming'.
  const lectureState = isTodayView
    ? getLectureTimeState(now, (num) => isAvailableLecture(selectedDay, num))
    : null;
  // Изменённые дни/пары для текущей отображаемой недели.
  const weekChanges = changes[week] || {};
  const dayChanged = (day) => {
    const dd = weekChanges[day];
    return !!dd && Object.keys(dd).length > 0;
  };

  // --- Карусель дней: состояние жеста и соседние панели ---
  const viewportRef = useRef(null);
  const gestureRef = useRef(null); // { startX, startY, axis, dir, pointerId, lastDx }
  const pendingCommitRef = useRef(null);
  const [drag, setDrag] = useState({ x: 0 });
  const [settling, setSettling] = useState(false);

  // Соседние дни для панелей: [предыдущий, текущий, следующий]. Каждая панель — свой
  // день/неделя со своими dayWeekMap/dayDates, даже если это соседняя неделя.
  const panes = useMemo(() => {
    const mk = (day, off) => {
      const w = weekForOffset(off, currentWeek);
      return { day, weekOffset: off, week: w, weekDayMap: groupByWeekDay(schedule, w), dayDates: getDayDates(off) };
    };
    const prev = shiftDay(selectedDay, weekOffset, -1);
    const next = shiftDay(selectedDay, weekOffset, +1);
    return [mk(prev.day, prev.weekOffset), mk(selectedDay, weekOffset), mk(next.day, next.weekOffset)];
  }, [schedule, currentWeek, selectedDay, weekOffset]);

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
    if (commit) {
      setSelectedDay(commit.day);
      setWeekOffset(commit.weekOffset);
    }
    setSettling(false);
    setDrag({ x: 0 });
  };

  // Листание недель вперёд — бесконечно, назад — только до текущей.
  const prevWeek = () => setWeekOffset((o) => Math.max(o - 1, 0));
  const nextWeek = () => setWeekOffset((o) => o + 1);
  const isUpper = week === 'upper';

  // Быстрый переход к текущей неделе и текущему дню.
  const goToday = () => {
    setWeekOffset(0);
    setSelectedDay(getTodayDayCode());
  };

  // Порядок просмотра изменений: сначала текущая неделя (пн..сб), потом следующая (пн..сб),
  // только изменённые дни. Так «Далее» при исчерпании недели переходит на следующую.
  const reviewSteps = useMemo(() => buildReviewSteps(changes, currentWeek), [changes, currentWeek]);

  // Запуск просмотра изменений: переходим на текущую неделю, к первому изменённому дню.
  const startReview = () => {
    setIsReviewing(true);
    if (reviewSteps[0]) {
      setWeekOffset(reviewSteps[0].week === currentWeek ? 0 : 1);
      setSelectedDay(reviewSteps[0].day);
    } else {
      setWeekOffset(0);
      setSelectedDay('пн');
    }
  };

  // Завершение режима сравнения («ОК») — сохраняем новое расписание, убираем уведомление и подсветку.
  const dismissChanges = () => {
    if (pendingData.current) saveScheduleCache(pendingData.current);
    setIsReviewing(false);
    setShowNotif(false);
    setChanges({});
  };

  // Индекс текущего шага в общем порядке просмотра обеих недель.
  const currentStepIndex = reviewSteps.findIndex((s) => s.week === week && s.day === selectedDay);

  // «Далее» — переходим к следующему изменённому дню (при смене недели — переключаем и её).
  const nextDay = () => {
    if (currentStepIndex !== -1 && currentStepIndex < reviewSteps.length - 1) {
      const { week: w, day: d } = reviewSteps[currentStepIndex + 1];
      setWeekOffset(w === currentWeek ? 0 : 1);
      setSelectedDay(d);
    }
  };

  // Есть ли ещё изменённые дни после текущего (для блокировки «Далее»).
  const hasNextChangedDay = currentStepIndex !== -1 && currentStepIndex < reviewSteps.length - 1;

  // Нет ни кэша, ни свежих данных и произошла ошибка — показываем сообщение о сбое.
  if (!schedule.length && error) {
    return (
      <Container size="md" mt="md" px="0">
        <Card shadow="lg" withBorder radius="md" p="xl">
          <Group justify="center" gap="sm">
            <IconAlertCircle size={28} color="var(--mantine-color-red-6)" />
            <Text c="red" fw={600}>
              Не удалось загрузить расписание
            </Text>
          </Group>
          <Text size="sm" c="dimmed" ta="center" mt="xs">
            Попробуйте обновить страницу позже.
          </Text>
        </Card>
      </Container>
    );
  }

  return (
    <Container size="md" px="0" className="timetableContainer">
      <Card shadow="lg" withBorder radius="xl" py="sm" px="0" className="timetableCard">
        {/* Уведомление об изменениях в расписании */}
        {showNotif && (
          <ChangesBanner
            isReviewing={isReviewing}
            hasNextChangedDay={hasNextChangedDay}
            onShow={startReview}
            onNext={nextDay}
            onDismiss={dismissChanges}
          />
        )}

        {/* Шапка: неделя по центру, «Сегодня» в правом углу */}
        <WeekHeader
          isUpper={isUpper}
          isPrevDisabled={isPrevDisabled}
          onPrevWeek={prevWeek}
          onNextWeek={nextWeek}
          isTodayView={isTodayView}
          onGoToday={goToday}
        />

        {/* Выбор дня недели; сегодняшний день подсвечен отдельно, изменённые — жёлтым */}
        <DayBar
          todayDay={todayDay}
          selectedDay={selectedDay}
          isCurrentWeek={isCurrentWeek}
          dayDates={dayDates}
          dayChanged={dayChanged}
          onSelectDay={setSelectedDay}
        />

        {/* Расписание на выбранный день: grid-разметка (вместо table) */}
        <div className="scheduleTable" role="table">
          <div className="scheduleHead" role="row">
            <div role="columnheader" className="colNumTime">
              <span className="headNum">№</span>
              <span className="headTime">Время</span>
            </div>
            <div role="columnheader" className="subjectCell">Дисциплина</div>
            <div role="columnheader" className="colAud">
              <span className="audFull">Аудитория</span>
              <span className="audShort">Ауд.</span>
            </div>
          </div>
          {/* Вьюпорт строк: свайпается на соседний день, шапка над ним остаётся на месте */}
          <div
            className="scheduleRows"
            role="rowgroup"
            ref={viewportRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerCancel}
          >
            <div
              className="scheduleTrack"
              role="rowgroup"
              onTransitionEnd={onTransitionEnd}
              style={{
                // Покой показывает среднюю панель (текущий день): базовый сдвиг -100%
                // (на ширину одной панели), палец поверх добавляет drag.x в пикселях.
                transform: `translateX(calc(-100% + ${drag.x}px))`,
                transitionDuration: settling ? undefined : '0ms',
              }}
            >
              <div role="rowgroup" className="schedulePane">
                <PaneRows pane={panes[0]} changes={changes} now={now} />
              </div>
              <div role="rowgroup" className="schedulePane">
                <PaneRows pane={panes[1]} changes={changes} now={now} highlight={lectureState} />
              </div>
              <div role="rowgroup" className="schedulePane">
                <PaneRows pane={panes[2]} changes={changes} now={now} />
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Всплывающий индикатор обновления — поверх экрана, справа снизу, не блокирует и не двигает разметку */}
      {refreshing && (
        <Group className="refreshToast" gap={6} align="center">
          <Loader size="xs" />
          <Text size="sm" c="dimmed">Обновление…</Text>
        </Group>
      )}

      {/* Всплывающее уведомление об ошибке обновления — скрывается через 10 секунд */}
      {toastVisible && (
        <Group className="errorToast" gap={6} align="center">
          <IconAlertCircle size={18} />
          <Text size="sm">Не удалось обновить данные.</Text>
        </Group>
      )}
    </Container>
  );
}