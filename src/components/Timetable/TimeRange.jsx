import { IconCoffee } from '@tabler/icons-react';

// Время пары «8:00 - 9:35» разбито на начало и конец, чтобы на узких экранах
// медиазапрос мог свернуть их в столбик и спрятать дефис.
// highlight: 'start' | 'end' — жирным время начала (пара ещё не началась) или
// конца (пара уже идёт). Время обёрнуто в .timeRange, чтобы ячейка раскладывала
// его в своей колонке, а подпись про остаток времени рендерилась отдельно.
// breakTime — время внутреннего перерыва: ставится между началом и концом пары.
export default function TimeRange({ value, highlight, breakTime }) {
  const [start, end] = String(value ?? '').split(' - ');
  const highlightStart = highlight === 'start';
  const highlightEnd = highlight === 'end';
  return (
    <span className="timeRange">
      <span className={highlightStart ? 'timeStart timeActive' : 'timeStart'}>{start}</span>
      {end && <span className="timeSep">–</span>}
      {end && <span className={highlightEnd ? 'timeEnd timeActive' : 'timeEnd'}>{end}</span>}
      {breakTime && (
        <span className="timeBreakInline">
          <IconCoffee size={10} stroke={1.8} />
          {breakTime}
        </span>
      )}
    </span>
  );
}