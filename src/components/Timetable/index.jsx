import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, Text, Container, Group } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import {
  getCurrentWeekType,
  getTodayDayCode,
  getLectureTimeState,
  buildDayTimes,
  shiftDay,
  groupByWeekDay,
  buildReviewSteps,
  getDayDates,
  isCancelledOn,
} from '@/pkg/domain.js';
import { useNow } from '@/hooks/useNow.js';
import { usePullToRefresh } from '@/hooks/usePullToRefresh.js';
import { usePairSelection } from '@/hooks/usePairSelection.js';
import { useGymPairs } from '@/hooks/useGymPairs.js';
import { useScheduleSource } from './useScheduleSource.js';
import { useDayCarousel } from './useDayCarousel.js';
import { weekForOffset } from './utils.js';
import WeekHeader from './WeekHeader.jsx';
import DayBar from './DayBar.jsx';
import ChangesBanner from './ChangesBanner.jsx';
import PaneRows from './PaneRows.jsx';
import ScheduleError from './ScheduleError.jsx';
import './Timetable.css';

export default function Timetable() {
  // Данные (кэш + фоновая догрузка CSV + diff) и индикаторы загрузки/ошибки — в хуке.
  const {
    schedule,
    error,
    toastVisible,
    changes,
    showNotif,
    refresh,
    commitChanges,
  } = useScheduleSource();
  // Текущее время: тикает каждую минуту и при возврате к приложению.
  const [now, refreshNow] = useNow();
  // Выбранные пары, на которые ходим (из стора); выбрать можно сколько угодно.
  const pairSel = usePairSelection();
  // Пользовательская физ-ра, вставленная в слоты; показывается поверх расписания.
  const gymSel = useGymPairs();

  // Обновление свайпом вниз: нативный pull-to-refresh отключён из-за overscroll-behavior: none,
  // поэтому делаем свой. Свайп из любого места (но только сверху прокрутки). Вместо сдвига
  // контента — закруглённая стрелочка: едет за пальцем и крутится пропорционально тяге. Перетянул
  // порог и отпустил — перезагрузка, иначе стрелочка возвращается. Задержка перед reload,
  // чтобы индикатор успел отрисоваться в момент отпускания.
  const pullToRefresh = usePullToRefresh(() => {
    setTimeout(() => window.location.reload(), 400);
  });

  // По умолчанию — текущая неделя и текущий день.
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState(() => getTodayDayCode());
  // Режим просмотра diff; навигация (weekOffset/selectedDay) и данные с commitChanges
  // живут раздельно: этот флаг — про показ, а не про хранение расписания.
  const [isReviewing, setIsReviewing] = useState(false);

  // Даты/неделя зависят от now: смена суток или недели отслеживается без перезагрузки.
  const todayDay = useMemo(() => getTodayDayCode(now), [now]);
  const currentWeek = useMemo(() => getCurrentWeekType(now), [now]);
  // Тип показанной недели для расписания: чётный сдвиг — та же, нечётный — противоположная.
  const week = weekOffset % 2 === 0 ? currentWeek : currentWeek === 'upper' ? 'lower' : 'upper';
  // Зелёная обводка дня недели актуальна только когда показана текущая неделя.
  const isCurrentWeek = weekOffset === 0;
  // Назад (в прошлые недели) можно листать только когда это не текущая неделя:
  // у сегодняшней даты прошлого больше нет.
  const isPrevDisabled = weekOffset <= 0;

  // Подсветка текущей/следующей пары осмысленна только для сегодняшнего дня в текущей неделе.
  const isTodayView = isCurrentWeek && selectedDay === todayDay;

  // Автообновление при возврате к приложению: почти то же, что ручная перезагрузка —
  // пересчитываем время/даты и дотягиваем свежий CSV.
  useEffect(() => {
    let timer;
    const trigger = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        refresh();
        refreshNow();
      }, 1500); // дебаунс: не спамить при частых переключениях вкладок
    };
    const onVisible = () => {
      if (!document.hidden) trigger();
    };
    window.addEventListener('focus', trigger);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', trigger);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('focus', trigger);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', trigger);
    };
  }, [refresh, refreshNow]);

  // --- Карусель дней: состояние жеста и соседние панели ---
  const onCommitDay = useCallback((day, off) => {
    setSelectedDay(day);
    setWeekOffset(off);
  }, []);
  const { viewportRef, drag, settling, onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onTransitionEnd } =
    useDayCarousel({ isReviewing, selectedDay, weekOffset, onCommit: onCommitDay });

  // Записи текущей недели, сгруппированные по дню и номеру пары.
  const weekDayMap = useMemo(() => groupByWeekDay(schedule, week), [schedule, week]);

  // Даты дней для отображаемой недели (под подписями пн..сб).
  const dayDates = useMemo(() => getDayDates(weekOffset), [weekOffset]);

  // Соседние дни для панелей: [предыдущий, текущий, следующий]. Каждая панель — свой
  // день/неделя со своими dayWeekMap/dayDates, даже если это соседняя неделя; times —
  // актуальное время каждой пары дня с учётом каскадного сдвига переопределений.
  const panes = useMemo(() => {
    const mk = (day, off) => {
      const w = weekForOffset(off, currentWeek);
      const dayMap = groupByWeekDay(schedule, w);
      return { day, weekOffset: off, week: w, weekDayMap: dayMap, dayDates: getDayDates(off), times: buildDayTimes(dayMap[day]) };
    };
    const prev = shiftDay(selectedDay, weekOffset, -1);
    const next = shiftDay(selectedDay, weekOffset, +1);
    return [mk(prev.day, prev.weekOffset), mk(selectedDay, weekOffset), mk(next.day, next.weekOffset)];
  }, [schedule, currentWeek, selectedDay, weekOffset]);

  // Пара доступна, если на этот день есть запись и она не отменена; пустые и
  // отменённые пропускаем при подсветке, показывая следующую актуальную.
  const isAvailableLecture = (day, num) => {
    const entry = weekDayMap[day][num];
    if (!entry?.discipline) return false;
    if (isCancelledOn(entry.cancelDate, dayDates[day])) return false;
    // Исключённые пары («не ходить») не показываем как текущую/следующую и не считаем
    // «до начала»: активными считаются только те, на которые ходим.
    if (pairSel.isInactive(entry)) return false;
    return true;
  };
  // Во время перемены это будет следующая пара со статусом 'upcoming'.
  // times панели выбранного дня — чтобы подсветка шла по реальному (возможно сдвинутому) времени.
  const lectureState = isTodayView
    ? getLectureTimeState(now, (num) => isAvailableLecture(selectedDay, num), panes[1].times)
    : null;
  // Изменённые дни/пары для текущей отображаемой недели.
  const weekChanges = changes[week] || {};
  const dayChanged = (day) => {
    const dd = weekChanges[day];
    return !!dd && Object.keys(dd).length > 0;
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

  // Завершение режима сравнения («ОК») — сохраняем новое расписание (в хуке), выходим из диффа.
  const dismissChanges = () => {
    commitChanges();
    setIsReviewing(false);
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
    return <ScheduleError />;
  }

  return (
    <Container size="md" px="0" className="timetableContainer">
      <div className="ptrWrap">
        <Card
          shadow="lg"
          withBorder
          radius="xl"
          py="sm"
          px="0"
          className="timetableCard"
          {...pullToRefresh.handlers}
        >
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
              className={`scheduleTrack${!settling && drag.x === 0 ? ' isResting' : ''}${settling ? ' isSettling' : ''}`}
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
                <PaneRows pane={panes[0]} changes={changes} now={now} pairSel={pairSel} gymSel={gymSel} />
              </div>
              <div role="rowgroup" className="schedulePane">
                <PaneRows pane={panes[1]} changes={changes} now={now} highlight={lectureState} pairSel={pairSel} gymSel={gymSel} />
              </div>
              <div role="rowgroup" className="schedulePane">
                <PaneRows pane={panes[2]} changes={changes} now={now} pairSel={pairSel} gymSel={gymSel} />
              </div>
            </div>
          </div>
        </div>
      </Card>

        {/* Закруглённая стрелочка: едет за пальцем (translateY = pull) и крутится по часовой
             по мере тяги (spin). При отпускании без порога — откатывается обратно (spin→0) и
             тает; с порогом — сама непрерывно крутится по часовой до перезагрузки. */}
        <div
          className="ptrSpinner"
          style={{
            transform: `translateY(${pullToRefresh.pull}px)`,
            opacity: Math.min(pullToRefresh.pull / pullToRefresh.threshold, 1),
            // Во время тяги — без transition (следуем за пальцем 1:1); при отпускании —
            // плавный подъём (возврат) и плавное затухание. Возврат запускается кадром позже
            // (см. хук), чтобы анимация реально стартовала.
            transition: pullToRefresh.settling
              ? 'transform 0.32s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.6s ease'
              : 'none',
          }}
        >
          <div
            className={pullToRefresh.refreshing ? 'ptrArrow ptrSpinning' : 'ptrArrow'}
            style={{
              transform: `rotate(${pullToRefresh.spin}deg)`,
              // Откат (spin→0) анимируем через transition. При перезагрузке transition выключен:
              // угол держится на стартовом, а непрерывное вращение ведёт CSS-анимация .ptrSpinning
              // (на compositor-треде, без JS-перерендеров тяжёлого расписания). --ptr-spin-from —
              // стартовый угол, чтобы анимация стартовала с текущего положения стрелки, без прыжка.
              transition:
                pullToRefresh.settling && !pullToRefresh.refreshing
                  ? 'transform 0.32s cubic-bezier(0.22, 1, 0.36, 1)'
                  : 'none',
              '--ptr-spin-from': `${pullToRefresh.spin}deg`,
            }}
          >
            <svg viewBox="0 0 612 612" width="22" height="22" aria-hidden="true">
              <path
                d="M583.312,19.125C567.476,19.125,554.625,31.977,554.625,47.813v79.847C497.671,48.004,406.062,0,306,0C137.279,0,0,137.279,0,306s137.279,306,306,306c124.37,0,235.429-74.301,282.936-189.261c3.021-7.325,2.792-15.166-0.02-21.918c-2.812-6.789-8.224-12.507-15.567-15.548c-7.306-3.022-15.147-2.793-21.917,0.019c-6.771,2.812-12.489,8.243-15.53,15.549C497.308,494.267,407.057,554.625,306,554.625C168.912,554.625,57.375,443.088,57.375,306S168.912,57.375,306,57.375c85.795,0,163.901,43.471,209.399,114.75h-85.087c-15.836,0-28.688,12.852-28.688,28.688s12.852,28.688,28.688,28.688h153c15.836,0,28.688-12.852,28.688-28.688v-153C612,31.977,599.148,19.125,583.312,19.125z"
                fill="currentColor"
              />
            </svg>
          </div>
        </div>
      </div>

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