import { Group } from '@mantine/core';
import { DAY_ORDER } from '@/pkg/domain.js';
import { DAY_LABELS, formatDayDate } from './utils.js';

// Ряд кнопок-чипов с выбором дня недели; сегодняшний день подсвечен отдельно,
// изменённые дни — жёлтым, выбранный — обводкой.
export default function DayBar({ todayDay, selectedDay, isCurrentWeek, dayDates, dayChanged, onSelectDay }) {
  return (
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
              isCurrentWeek && isToday && !isSelected ? 'dayToday' : '',
              isSelected ? 'daySelected' : '',
              isChanged ? 'dayChanged' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => onSelectDay(day)}
            aria-pressed={isSelected}
          >
            <span className="dayLabel">{DAY_LABELS[day]}</span>
            <span className="dayDate">{formatDayDate(dayDates[day])}</span>
          </button>
        );
      })}
    </Group>
  );
}