import { getMinutesRemaining } from '@/pkg/domain.js';

export const DAY_LABELS = {
  пн: 'Пн',
  вт: 'Вт',
  ср: 'Ср',
  чт: 'Чт',
  пт: 'Пт',
  сб: 'Сб',
};

// Дата в формате дд.мм для подписи под днём недели.
export const formatDayDate = (d) =>
  `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;

// Подпись под временем актуальной пары: «до конца Xч Yм» для идущей пары,
// «до начала …» для следующей. Нулевые часы/минуты не выводим, секунды (0 минут)
// не показываем вовсе.
export const formatRemainingLabel = (state, date) => {
  const mins = getMinutesRemaining(state, date);
  if (!mins) return null;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const parts = [];
  if (h) parts.push(`${h}ч`);
  if (m) parts.push(`${m}м`);
  const label = state.status === 'ongoing' ? 'до конца' : 'до начала';
  return `${label} ${parts.join(' ')}`;
};

// Аудитория считается числовой, если состоит только из цифр и разделителей (пробел, дефис).
export const isNumericAudience = (s) =>
  /^[\d\s-]+$/.test(String(s ?? '').trim()) && String(s ?? '').trim() !== '';

// Тип недели (верхняя/нижняя) для произвольного сдвига: чётный сдвиг — та же неделя,
// нечётный — противоположная. Нужен панелям карусели, которые живут в соседних неделях.
export const weekForOffset = (off, currentWeek) =>
  off % 2 === 0 ? currentWeek : currentWeek === 'upper' ? 'lower' : 'upper';