import { useState, useEffect, useMemo, useRef } from 'react';
import { Card, Text, Loader, Container, ActionIcon, Group, Button } from '@mantine/core';
import { IconChevronLeft, IconChevronRight, IconAlertCircle } from '@tabler/icons-react';
import {
  DAY_ORDER,
  LECTURE_TIMES,
  getCurrentWeekType,
  getTodayDayCode,
  getLectureTimeState,
  getMinutesRemaining,
  diffSchedule,
  groupByWeekDay,
  buildReviewSteps,
  getDayDates,
  isSummerBreak,
  isCancelledOn,
  formatTeacher,
} from '../../pkg/domain.js';
import { parseScheduleCsv } from '../../pkg/serialization.js';
import { loadScheduleCache, saveScheduleCache } from '../../pkg/storage.js';
import { fetchScheduleCsv } from '../../pkg/api.js';
import './Timetable.css';

const DAY_LABELS = {
  пн: 'Пн',
  вт: 'Вт',
  ср: 'Ср',
  чт: 'Чт',
  пт: 'Пт',
  сб: 'Сб',
};

// Время пары «8:00 - 9:35» разбито на начало и конец, чтобы на узких экранах
// медиазапрос мог свернуть их в столбик и спрятать дефис.
// highlight: 'start' | 'end' — жирным время начала (пара ещё не началась) или
// конца (пара уже идёт). Время обёрнуто в .timeRange, чтобы ячейка раскладывала
// его в своей колонке, а подпись про остаток времени рендерилась отдельно.
function TimeRange({ value, highlight }) {
  const [start, end] = String(value ?? '').split(' - ');
  const highlightStart = highlight === 'start';
  const highlightEnd = highlight === 'end';
  return (
    <span className="timeRange">
      <span className={highlightStart ? 'timeStart timeActive' : 'timeStart'}>{start}</span>
      {end && <span className="timeSep">–</span>}
      {end && <span className={highlightEnd ? 'timeEnd timeActive' : 'timeEnd'}>{end}</span>}
    </span>
  );
}

// Однострочный diff поля: старое (красное, зачёркнутое) -> новое (зелёное).
// Пустую сторону не выводим: если старого нет — не показываем красное,
// если нового нет — не показываем зелёное.
function DiffPair({ oldVal, newVal, fmt }) {
  const showOld = !!oldVal;
  const showNew = !!newVal;
  if (!showOld && !showNew) return null;
  const o = showOld && fmt ? fmt(oldVal) : oldVal;
  const n = showNew && fmt ? fmt(newVal) : newVal;
  return (
    <span>
      {showOld && <span className="diffOld">{o}</span>}
      {showNew && <span className="diffNew">{n}</span>}
    </span>
  );
}

// Содержимое ячейки «Дисциплина» для изменившейся пары.
function ChangedDiscipline({ change }) {
  const { old: o, new: n } = change;

  const field = (key, cls, fmt) => {
    const ov = o?.[key] ?? '';
    const nv = n?.[key] ?? '';
    if (ov === nv) {
      return nv ? <div key={key} className={cls}>{fmt ? fmt(nv) : nv}</div> : null;
    }
    return (
      <div key={key} className={cls}>
        <DiffPair oldVal={ov} newVal={nv} fmt={fmt} />
      </div>
    );
  };

  return (
    <>
      {field('discipline', 'subjectName')}
      {field('format', 'formatText', (v) => `(${v})`)}
      {field('subgroup', 'subgroupText')}
      {field('teacher', 'subjectTeacher', formatTeacher)}
    </>
  );
}

// Содержимое ячейки «Аудитория» для изменившейся пары.
function ChangedAudience({ change }) {
  const { old: o, new: n } = change;
  const ov = o?.audience ?? '';
  const nv = n?.audience ?? '';
  if (ov === nv) return nv ? <span>{nv}</span> : '';
  return <DiffPair oldVal={ov} newVal={nv} />;
}

// Дата в формате дд.мм для подписи под днём недели.
const formatDayDate = (d) =>
  `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;

// Подпись под временем актуальной пары: «до конца Xч Yм» для идущей пары,
// «до начала …» для следующей. Нулевые часы/минуты не выводим, секунды (0 минут)
// не показываем вовсе.
const formatRemainingLabel = (state, date) => {
  const mins = getMinutesRemaining(state, date);
  if (!mins) return null;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const parts = [];
  if (h) parts.push(`${h}ч`);
  if (m) parts.push(`${m}м`);
  const label = state.status === 'ongoing' ? 'до конца' : 'до начала';
  return `${label} ${parts.join(' ')}`;
};

// Аудитория считается числовой, если состоит только из цифр и разделителей (пробел, дефис).
const isNumericAudience = (s) => /^[\d\s-]+$/.test(String(s ?? '').trim()) && String(s ?? '').trim() !== '';

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
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
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
  // Подпись под временем актуальной пары («начнётся/закончится через …»).
  const lectureRemaining = lectureState ? formatRemainingLabel(lectureState, now) : null;

  // Изменённые дни/пары для текущей отображаемой недели.
  const weekChanges = changes[week] || {};
  const dayChanged = (day) => {
    const dd = weekChanges[day];
    return !!dd && Object.keys(dd).length > 0;
  };
  const pairChange = (day, num) => weekChanges[day]?.[num] || null;

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
      <Card shadow="lg" withBorder radius="md" py="sm" px="0" className="timetableCard">
        {/* Уведомление об изменениях в расписании */}
        {showNotif && (
          <Group className="changesBanner" justify="space-between" align="center" gap="xs">
            <Group gap="xs">
              <IconAlertCircle size={18} />
              <Text size="sm" fw={600}>В расписании есть изменения</Text>
            </Group>
            <Group gap="xs">
              {/* «Далее» скрываем, когда изменений больше нет */}
              {(!isReviewing || hasNextChangedDay) && (
                <Button
                  size="xs"
                  variant="filled"
                  color="blue"
                  onClick={isReviewing ? nextDay : startReview}
                >
                  {isReviewing ? 'Далее' : 'Показать'}
                </Button>
              )}
              <Button size="xs" variant="default" onClick={dismissChanges} className="mutedBtn">
                ОК
              </Button>
            </Group>
          </Group>
        )}

        {/* Шапка: неделя по центру, «Сегодня» в правом углу */}
        <Group className="weekHeader" wrap="nowrap" align="center" gap="xs">
          <Group justify="flex-start" gap={6} className="weekToggle">
            <ActionIcon
              variant="default"
              aria-label="Предыдущая неделя"
              onClick={prevWeek}
              disabled={isPrevDisabled}
              className="mutedBtn"
            >
              <IconChevronLeft size={20} />
            </ActionIcon>
            <Text fw={700} size="md" className="weekName">
              {isUpper ? 'Верхняя' : 'Нижняя'}
            </Text>
            <ActionIcon variant="default" aria-label="Следующая неделя" onClick={nextWeek} className="mutedBtn">
              <IconChevronRight size={20} />
            </ActionIcon>
          </Group>
          <Button
            size="xs"
            variant="default"
            className={isTodayView ? 'todayBtn mutedBtn todayHidden' : 'todayBtn mutedBtn'}
            onClick={goToday}
          >
            Сегодня
          </Button>
        </Group>

        {/* Выбор дня недели; сегодняшний день подсвечен отдельно, изменённые — жёлтым */}
        <Group gap={6} className="dayBar">
          {DAY_ORDER.map((day) => {
            const isToday = day === todayDay;
            const isSelected = day === selectedDay;
            const isChanged = dayChanged(day);
            return (
              <button
                key={day}
                type="button"
                className={[
                  'dayChip',
                  isCurrentWeek && isToday ? 'dayToday' : '',
                  isSelected ? 'daySelected' : '',
                  isChanged ? 'dayChanged' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => setSelectedDay(day)}
                aria-pressed={isSelected}
              >
                <span className="dayLabel">{DAY_LABELS[day]}</span>
                <span className="dayDate">{formatDayDate(dayDates[day])}</span>
              </button>
            );
          })}
        </Group>

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
          {Array.from({ length: 6 }, (_, i) => {
            const number = i + 1;
            // Летом (июль–август) пар нет — не показываем их даже если тип
            // недели совпадает с учебной.
            const summerBreak = isSummerBreak(dayDates[selectedDay]);
            const entry = summerBreak ? null : weekDayMap[selectedDay][number];
            const change = summerBreak ? null : pairChange(selectedDay, number);
            const cancelled = isCancelledOn(entry?.cancelDate, dayDates[selectedDay]);
            const classes = [
              'scheduleRow',
              number === lectureState?.num ? 'currentLecture' : null,
              change ? 'changedPair' : null,
              cancelled ? 'cancelledPair' : null,
            ]
              .filter(Boolean)
              .join(' ');
            return (
              <div key={number} role="row" className={classes}>
                <div role="cell" className="colNumTime">
                  <span className="lectureNum">{number}</span>
                  <TimeRange
                    value={LECTURE_TIMES[number]}
                    highlight={
                      lectureState?.num === number
                        ? lectureState.status === 'ongoing'
                          ? 'end'
                          : 'start'
                        : null
                    }
                  />
                  {lectureState?.num === number && (
                    <span className="timeRemaining">{lectureRemaining}</span>
                  )}
                </div>
                <div role="cell" className="subjectCell">
                  {cancelled && <span className="cancelBadge">отменена</span>}
                  {change ? (
                    <ChangedDiscipline change={change} />
                  ) : entry?.discipline ? (
                    <>
                      <div className="subjectName">
                        {entry.discipline}
                        {entry.format && <span className="formatText"> ({entry.format})</span>}
                        {entry.subgroup && <span className="subgroupText">{entry.subgroup}</span>}
                      </div>
                      {entry.teacher && <div className="subjectTeacher">{formatTeacher(entry.teacher)}</div>}
                    </>
                  ) : (
                    <Text size="sm" c="dimmed">
                      —
                    </Text>
                  )}
                </div>
                <div role="cell" className="colAud">
                  {change ? (
                    <ChangedAudience change={change} />
                  ) : (
                    <span className={isNumericAudience(entry?.audience) ? 'audNum' : 'audText'}>
                      {entry?.audience || ''}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
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