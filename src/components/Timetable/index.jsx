import { useState, useEffect, useMemo } from 'react';
import { Card, Text, Loader, Container, ActionIcon, Group, Button } from '@mantine/core';
import { IconChevronLeft, IconChevronRight, IconCalendar, IconAlertCircle } from '@tabler/icons-react';
import {
  DAY_ORDER,
  LECTURE_TIMES,
  parseScheduleCsv,
  getCurrentWeekType,
  getTodayDayCode,
  getCurrentLectureNumber,
  loadScheduleCache,
  saveScheduleCache,
} from '../../lib/scheduleSerializer.js';
import './Timetable.css';

const PUB_ID = '2PACX-1vRSIJwnvklsU8oP6GROruCJvfCSy_duAmcGwJ0uwHj5e7X69EAJTU49QUW-ndqeLA2gkhhL2i0Xfcph';
const LIST = {
  schedule: 1227335714,
};

const URL = `https://docs.google.com/spreadsheets/d/e/${PUB_ID}/pub?gid=${LIST.schedule}&output=csv`;

const DAY_LABELS = {
  пн: 'Пн',
  вт: 'Вт',
  ср: 'Ср',
  чт: 'Чт',
  пт: 'Пт',
  сб: 'Сб',
};

export default function Timetable() {
  const [schedule, setSchedule] = useState(() => loadScheduleCache());
  // Лоадер виден только когда нет сохранённого кэша; иначе сразу показываем кэш,
  // а свежие данные догружаем в фоне без индикатора загрузки.
  const [loading, setLoading] = useState(schedule.length === 0);
  // Фоновая догрузка свежих данных: показывает компактный индикатор в хэдере, не блокируя интерфейс.
  const [refreshing, setRefreshing] = useState(true);
  // Ошибка загрузки — показываем уведомление.
  const [error, setError] = useState(false);
  // Тост об ошибке автоматически скрывается через 10 секунд.
  const [toastVisible, setToastVisible] = useState(false);

  // По умолчанию — текущая неделя и текущий день.
  const [week, setWeek] = useState(() => getCurrentWeekType());
  const [selectedDay, setSelectedDay] = useState(() => getTodayDayCode());
  const todayDay = useMemo(() => getTodayDayCode(), []);
  const currentWeek = useMemo(() => getCurrentWeekType(), []);
  // Зелёная обводка дня недели актуальна только когда показана текущая неделя.
  const isCurrentWeek = week === currentWeek;

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
    let cancelled = false;
    fetch(URL)
      .then((res) => res.text())
      .then((csvText) => {
        if (cancelled) return;
        const data = parseScheduleCsv(csvText);
        saveScheduleCache(data);
        setSchedule(data);
        setLoading(false);
        setRefreshing(false);
        setError(false);
        setToastVisible(false);
      })
      .catch((err) => {
        console.error('Ошибка загрузки CSV:', err);
        if (!cancelled) {
          setLoading(false);
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
  const weekDayMap = useMemo(() => {
    const map = Object.fromEntries(DAY_ORDER.map((d) => [d, {}]));
    schedule.forEach((item) => {
      if (item.week !== week) return;
      if (!map[item.day]) return;
      map[item.day][item.lectureNumber] = item;
    });
    return map;
  }, [schedule, week]);

  const toggleWeek = () => setWeek((w) => (w === 'upper' ? 'lower' : 'upper'));
  const isUpper = week === 'upper';

  // Быстрый переход к текущей неделе и текущему дню.
  const goToday = () => {
    setWeek(getCurrentWeekType());
    setSelectedDay(getTodayDayCode());
  };

  if (loading) {
    return (
      <Container size="md" pt="xl">
        <Loader color="blue" size="xl" />
      </Container>
    );
  }

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
        {/* Шапка: неделя по центру, «Сегодня» в правом углу */}
        <Group className="weekHeader" wrap="nowrap" align="center" gap="xs">
          <Group justify="center" gap={6} className="weekToggle">
            <ActionIcon variant="light" aria-label="Предыдущая неделя" onClick={toggleWeek}>
              <IconChevronLeft size={20} />
            </ActionIcon>
            <Text fw={700} size="md" className="weekName">
              {isUpper ? 'Верхняя неделя' : 'Нижняя неделя'}
            </Text>
            <ActionIcon variant="light" aria-label="Следующая неделя" onClick={toggleWeek}>
              <IconChevronRight size={20} />
            </ActionIcon>
          </Group>
          <Button
            size="xs"
            variant="light"
            className="todayBtn"
            leftSection={<IconCalendar size={14} />}
            onClick={goToday}
          >
            Сегодня
          </Button>
        </Group>

        {/* Выбор дня недели; сегодняшний день подсвечен отдельно */}
        <Group gap={6} mb="sm" className="dayBar">
          {DAY_ORDER.map((day) => {
            const isToday = day === todayDay;
            const isSelected = day === selectedDay;
            return (
              <button
                key={day}
                type="button"
                className="dayChip"
                style={{
                  backgroundColor: isSelected
                    ? 'var(--mantine-color-blue-filled)'
                    : 'var(--mantine-color-default-hover)',
                  color: isSelected ? 'var(--mantine-color-white)' : 'var(--mantine-color-text)',
                  borderColor: isCurrentWeek && isToday && !isSelected ? 'var(--mantine-color-teal-filled)' : 'transparent',
                  boxShadow: isCurrentWeek && isToday && !isSelected ? 'inset 0 0 0 1px var(--mantine-color-teal-filled)' : 'none',
                }}
                onClick={() => setSelectedDay(day)}
                aria-pressed={isSelected}
              >
                {DAY_LABELS[day]}
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
              const entry = weekDayMap[selectedDay][number];
              return (
                <tr
                  key={number}
                  className={number === currentLecture ? 'currentLecture' : undefined}
                >
                  <td className="colNum">{number}</td>
                  <td className="colTime">{LECTURE_TIMES[number]}</td>
                  <td>
                    {entry?.discipline ? (
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
                  <td className="colAud">{entry?.audience ? entry.audience : ''}</td>
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