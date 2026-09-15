import { useState, useEffect, useMemo } from 'react';
import { Card, Text, Loader, Container, ActionIcon, Group, Button } from '@mantine/core';
import { IconChevronLeft, IconChevronRight, IconCalendar } from '@tabler/icons-react';
import {
  DAY_ORDER,
  LECTURE_TIMES,
  parseScheduleCsv,
  getCurrentWeekType,
  getTodayDayCode,
} from '../lib/scheduleSerializer.js';
import './Timetable.css';

const PUB_ID = '2PACX-1vRSIJwnvklsU8oP6GROruCJvfCSy_duAmcGwJ0uwHj5e7X69EAJTU49QUW-ndqeLA2gkhhL2i0Xfcph';
const LIST = {
  discipline: 0,
  test: 1545959544,
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
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);

  // По умолчанию — текущая неделя и текущий день.
  const [week, setWeek] = useState(() => getCurrentWeekType());
  const [selectedDay, setSelectedDay] = useState(() => getTodayDayCode());
  const todayDay = useMemo(() => getTodayDayCode(), []);

  useEffect(() => {
      console.log(123)
    let cancelled = false;
    fetch(URL)
      .then((res) => res.text())
      .then((csvText) => {
        console.log(csvText)
        if (cancelled) return;
        setSchedule(parseScheduleCsv(csvText));
        setLoading(false);
      })
      .catch((err) => {
        console.error('Ошибка загрузки CSV:', err);
        if (!cancelled) setLoading(false);
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
                  borderColor: isToday ? 'var(--mantine-color-teal-filled)' : 'transparent',
                  boxShadow: isToday ? 'inset 0 0 0 1px var(--mantine-color-teal-filled)' : 'none',
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
                <tr key={number}>
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
    </Container>
  );
}