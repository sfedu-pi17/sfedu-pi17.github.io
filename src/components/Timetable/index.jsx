import { useState, useEffect, useMemo } from 'react';
import { Card, Text, Loader, Container, ActionIcon, Group, Button } from '@mantine/core';
import { IconChevronLeft, IconChevronRight, IconCalendar, IconAlertCircle } from '@tabler/icons-react';
import {
  DAY_ORDER,
  LECTURE_TIMES,
  getCurrentWeekType,
  getTodayDayCode,
  getCurrentLectureNumber,
  diffSchedule,
  groupByWeekDay,
  buildReviewSteps,
  getDayDates,
  isSummerBreak,
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

// Однострочный diff поля: старое (красное, зачёркнутое) -> новое (зелёное).
// Пустую сторону не выводим: если старого нет — не показываем красное,
// если нового нет — не показываем зелёное.
function DiffPair({ oldVal, newVal }) {
  const showOld = !!oldVal;
  const showNew = !!newVal;
  if (!showOld && !showNew) return null;
  return (
    <span>
      {showOld && <span className="diffOld">{oldVal}</span>}
      {showNew && <span className="diffNew">{newVal}</span>}
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
        <DiffPair oldVal={ov} newVal={nv} />
      </div>
    );
  };

  return (
    <>
      {field('discipline', 'subjectName')}
      {field('format', 'formatText', (v) => `(${v})`)}
      {field('subgroup', 'subgroupText')}
      {field('teacher', 'subjectTeacher')}
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

  // Текущая пара имеет смысл только для сегодняшнего дня в текущей неделе.
  const isTodayView = isCurrentWeek && selectedDay === todayDay;
  const currentLecture = isTodayView ? getCurrentLectureNumber(now) : null;

  useEffect(() => {
    // Старые данные на момент загрузки — для сравнения изменений.
    const oldData = loadScheduleCache();
    let cancelled = false;
    fetchScheduleCsv()
      .then((csvText) => {
        if (cancelled) return;
        const data = parseScheduleCsv(csvText);
        saveScheduleCache(data);
        const diffed = diffSchedule(oldData, data);
        setChanges(diffed);
        // Уведомление показываем только если старые данные были и есть изменения.
        if (oldData.length && Object.keys(diffed).length) {
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

  // Изменённые дни/пары для текущей отображаемой недели.
  const weekChanges = changes[week] || {};
  const dayChanged = (day) => {
    const dd = weekChanges[day];
    return !!dd && Object.keys(dd).length > 0;
  };
  const pairChange = (day, num) => weekChanges[day]?.[num] || null;

  // Листание недель: в обе стороны бесконечно.
  const prevWeek = () => setWeekOffset((o) => o - 1);
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

  // Завершение режима сравнения («ОК») — убираем уведомление и подсветку.
  const dismissChanges = () => {
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
      <Container size="md" mt="md" px="xs">
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
    <Container size="md" mt="md" px="xs">
      <Card shadow="lg" withBorder radius="md" p="sm">
        {/* Уведомление об изменениях в расписании */}
        {showNotif && (
          <Group className="changesBanner" justify="space-between" align="center" gap="xs">
            <Group gap="xs">
              <IconAlertCircle size={18} />
              <Text size="sm" fw={600}>В расписании есть изменения</Text>
            </Group>
            <Group gap="xs">
              <Button size="xs" variant="subtle" color="gray" onClick={dismissChanges}>
                ОК
              </Button>
              <Button
                size="xs"
                variant="light"
                color={isReviewing ? 'blue' : 'yellow'}
                disabled={isReviewing && !hasNextChangedDay}
                onClick={isReviewing ? nextDay : startReview}
              >
                {isReviewing ? 'Далее' : 'Показать'}
              </Button>
            </Group>
          </Group>
        )}

        {/* Шапка: неделя по центру, «Сегодня» в правом углу */}
        <Group className="weekHeader" wrap="nowrap" align="center" gap="xs">
          <Group justify="flex-start" gap={6} className="weekToggle">
            <ActionIcon variant="light" aria-label="Предыдущая неделя" onClick={prevWeek}>
              <IconChevronLeft size={20} />
            </ActionIcon>
            <Text fw={700} size="md" className="weekName">
              {isUpper ? 'Верхняя неделя' : 'Нижняя неделя'}
            </Text>
            <ActionIcon variant="light" aria-label="Следующая неделя" onClick={nextWeek}>
              <IconChevronRight size={20} />
            </ActionIcon>
          </Group>
          <Button
            size="xs"
            variant="light"
            className="todayBtn"
            leftSection={<IconCalendar size={14} />}
            onClick={goToday}
            // Всегда держим кнопку в разметке, но прячем её, когда мы уже на «сегодня»,
            // чтобы высота шапки не менялась и макет не «прыгал».
            style={{ visibility: isTodayView ? 'hidden' : 'visible' }}
          >
            Сегодня
          </Button>
        </Group>

        {/* Выбор дня недели; сегодняшний день подсвечен отдельно, изменённые — жёлтым */}
        <Group gap={6} mb="sm" className="dayBar">
          {DAY_ORDER.map((day) => {
            const isToday = day === todayDay;
            const isSelected = day === selectedDay;
            const isChanged = dayChanged(day);
            return (
              <button
                key={day}
                type="button"
                className="dayChip"
                style={{
                  backgroundColor: isChanged
                    ? 'var(--mantine-color-yellow-light)'
                    : isSelected
                      ? 'var(--mantine-color-blue-filled)'
                      : isCurrentWeek && isToday
                        ? 'var(--mantine-color-blue-light)'
                        : 'var(--mantine-color-default-hover)',
                  color: isChanged
                    ? 'var(--mantine-color-yellow-light-color)'
                    : isSelected
                      ? 'var(--mantine-color-white)'
                      : isCurrentWeek && isToday
                        ? 'var(--mantine-color-blue-light-color)'
                        : 'var(--mantine-color-text)',
                  boxShadow: isSelected ? 'inset 0 -3px 0 0 var(--mantine-color-blue-filled)' : 'none',
                }}
                onClick={() => setSelectedDay(day)}
                aria-pressed={isSelected}
              >
                <span className="dayLabel">{DAY_LABELS[day]}</span>
                <span className="dayDate">{formatDayDate(dayDates[day])}</span>
              </button>
            );
          })}
        </Group>

        {/* Таблица расписания на выбранный день */}
        <table className="scheduleTable">
          <thead>
            <tr>
              <th className="colNum">№</th>
              <th className="colTime">Время</th>
              <th>Дисциплина</th>
              <th className="colAud">Аудитория</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 6 }, (_, i) => {
              const number = i + 1;
              // Летом (июль–август) пар нет — не показываем их даже если тип
              // недели совпадает с учебной.
              const summerBreak = isSummerBreak(dayDates[selectedDay]);
              const entry = summerBreak ? null : weekDayMap[selectedDay][number];
              const change = summerBreak ? null : pairChange(selectedDay, number);
              const classes = [
                number === currentLecture ? 'currentLecture' : null,
                change ? 'changedPair' : null,
              ]
                .filter(Boolean)
                .join(' ');
              return (
                <tr key={number} className={classes || undefined}>
                  <td className="colNum">{number}</td>
                  <td className="colTime">{LECTURE_TIMES[number]}</td>
                  <td>
                    {change ? (
                      <ChangedDiscipline change={change} />
                    ) : entry?.discipline ? (
                      <>
                        <div className="subjectName">
                          {entry.discipline}
                          {entry.format && <span className="formatText"> ({entry.format})</span>}
                        </div>
                        {entry.subgroup && <div className="subgroupText">{entry.subgroup}</div>}
                        {entry.teacher && <div className="subjectTeacher">{entry.teacher}</div>}
                      </>
                    ) : (
                      <Text size="sm" c="dimmed">
                        —
                      </Text>
                    )}
                  </td>
                  <td className="colAud">
                    {change ? <ChangedAudience change={change} /> : entry?.audience || ''}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
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