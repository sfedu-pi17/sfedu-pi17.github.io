import { Text } from '@mantine/core';
import { isSummerBreak, isCancelledOn, formatTeacher } from '@/pkg/domain.js';
import TimeRange from './TimeRange.jsx';
import { ChangedDiscipline, ChangedAudience } from './DiffCells.jsx';
import { formatRemainingLabel, isNumericAudience } from './utils.js';

// Ряды одного дня (6 пар) для одной панели карусели. highlight — состояние текущей/
// следующей пары, передаётся только средней панели (там, где выбранный день); у соседних
// панелей его нет, поэтому без подсветки и подписи «до конца/начала».
// Изменения читаются по неделе конкретной панели (changes[pane.week]), а не по
// глобальной — соседние недели могут содержать свой diff.
// pane.times — актуальное время каждой пары дня с каскадным сдвигом переопределений;
// по нему же считаем подпись «до конца/начала», чтобы она шла по реальному времени.
export default function PaneRows({ pane, changes, now, highlight }) {
  const { day, week, weekDayMap, dayDates, times } = pane;
  const weekChanges = changes[week] || {};
  const pairChange = (day, num) => weekChanges[day]?.[num] || null;
  const lectureRemaining = highlight ? formatRemainingLabel(highlight, now, times) : null;

  return Array.from({ length: 6 }, (_, i) => {
    const number = i + 1;
    // Летом (июль–август) пар нет — не показываем их даже если тип недели совпадает с учебной.
    const summerBreak = isSummerBreak(dayDates[day]);
    const entry = summerBreak ? null : weekDayMap[day][number];
    const change = summerBreak ? null : pairChange(day, number);
    const cancelled = isCancelledOn(entry?.cancelDate, dayDates[day]);
    const classes = [
      'scheduleRow',
      number === highlight?.num ? 'currentLecture' : null,
      change ? 'changedPair' : null,
      cancelled ? 'cancelledPair' : null,
    ]
      .filter(Boolean)
      .join(' ');
    // Время пары из таблицы дня (учитывает каскадный сдвиг переопределений).
    const lectureTime = times[number] || '';
    return (
      <div key={number} role="row" className={classes}>
        <div role="cell" className="colNumTime">
          <span className="lectureNum">{number}</span>
          <TimeRange
            value={lectureTime}
            highlight={
              highlight?.num === number
                ? highlight.status === 'ongoing'
                  ? 'end'
                  : 'start'
                : null
            }
          />
          {highlight?.num === number && <span className="timeRemaining">
            {lectureRemaining.label}&#32;<nobr>{lectureRemaining.time}</nobr>
          </span>}
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
  });
}