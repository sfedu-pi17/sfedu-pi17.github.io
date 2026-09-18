// Бизнес-логика расписания: константы и чистые функции.
// Никаких побочных эффектов — без React, без localStorage, без fetch.
// Здесь только правила предметной области:
// порядок дней, время пар, чередование недель, сравнение и группировка записей.

export const DAY_ORDER = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб'];

// Актуальное расписание звонков (часы берём из списка, а не из старой схемы).
export const LECTURE_TIMES = {
  1: '8:00 - 9:35',
  2: '9:50 - 11:25',
  3: '11:55 - 13:30',
  4: '13:45 - 15:20',
  5: '15:50 - 17:25',
  6: '17:40 - 19:15',
};

// Выделить название дисциплины и тип занятия из строки вида
// «Технологии и фронтиры в области комп. наук и ИИ (лекция)».
export function parseDiscipline(raw) {
  const value = (raw || '').trim();
  const match = value.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  if (match) {
    return { name: match[1].trim(), type: match[2].trim() };
  }
  return { name: value, type: null };
}

// Первый день недели (понедельник) с обнулённым временем.
function startOfWeek(date) {
  const d = new Date(date);
  const diff = (d.getDay() + 6) % 7; // сколько дней прошло с понедельника
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Какая неделя сейчас: 1 сентября — верхняя, далее чередуется.
// Отсчитываем полные недели от недели, содержащей 1 сентября.
export function getCurrentWeekType(date = new Date()) {
  const refDate = new Date(date.getFullYear(), 8, 1); // сентябрь = месяц 8
  const refMonday = startOfWeek(refDate);
  const currentMonday = startOfWeek(date);
  const diffWeeks = Math.round((currentMonday - refMonday) / (7 * 24 * 60 * 60 * 1000));
  const normalized = ((diffWeeks % 2) + 2) % 2; // всегда 0 или 1, без минусов
  return normalized === 0 ? 'upper' : 'lower';
}

// Код дня недели (пн..сб) для сегодняшней даты; если воскресенье — в расписании его нет,
// возвращаем понедельник как разумное значение по умолчанию.
export function getTodayDayCode(date = new Date()) {
  const map = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
  const code = map[date.getDay()];
  return DAY_ORDER.includes(code) ? code : 'пн';
}

// Даты всех дней (пн..сб) для недели со сдвигом offset от текущей:
// 0 — текущая неделя, +1 — следующая, -1 — предыдущая и т.д. (листается в обе стороны).
export function getDayDates(offset, date = new Date()) {
  const monday = new Date(startOfWeek(date).getTime() + offset * 7 * 24 * 60 * 60 * 1000);
  return Object.fromEntries(
    DAY_ORDER.map((day, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return [day, d];
    })
  );
}

// Летние каникулы: пар нет с июля по 1 сентября включительно (месяцы 6, 7 и 8-го числа 1).
export function isSummerBreak(date) {
  const m = date.getMonth();
  if (m === 6 || m === 7) return true;
  return m === 8 && date.getDate() === 1;
}

// Пара отменена, если cancelDate совпадает с датой показа. Поддерживаем форматы
// ISO (yyyy-mm-dd), dd.mm.yyyy, dd.mm.yy (двузначный год) и dd.mm (без года).
export function isCancelledOn(cancelDate, date) {
  if (!cancelDate) return false;
  const s = String(cancelDate).trim();
  let d, m, y;
  let match = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (match) {
    [y, m, d] = [+match[1], +match[2], +match[3]];
  } else if ((match = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/))) {
    [d, m, y] = [+match[1], +match[2], +match[3]];
  } else if ((match = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2})$/))) {
    [d, m, y] = [+match[1], +match[2], +match[3]];
    y = y <= 69 ? 2000 + y : 1900 + y;
  } else if ((match = s.match(/^(\d{1,2})\.(\d{1,2})$/))) {
    [d, m] = [+match[1], +match[2]];
    y = null;
  } else {
    return false;
  }
  if (y !== null && y !== date.getFullYear()) return false;
  return m === date.getMonth() + 1 && d === date.getDate();
}

// Номер пары, которая идёт прямо сейчас (если текущее время попадает в её диапазон),
// иначе null.
export function getCurrentLectureNumber(date = new Date()) {
  const mins = date.getHours() * 60 + date.getMinutes();
  const ranges = Object.entries(LECTURE_TIMES).map(([num, span]) => {
    const [start, end] = span.split('-').map((part) => {
      const [h, m] = part.trim().split(':').map(Number);
      return h * 60 + m;
    });
    return { num: Number(num), start, end };
  });
  const found = ranges.find((r) => mins >= r.start && mins < r.end);
  return found ? found.num : null;
}

// Сравнивает две записи пары по всем содержательным полям.
function entriesEqual(a, b) {
  if (!a || !b) return a === b;
  return (
    a.discipline === b.discipline &&
    a.format === b.format &&
    a.teacher === b.teacher &&
    a.audience === b.audience &&
    a.subgroup === b.subgroup &&
    a.week === b.week &&
    a.day === b.day &&
    a.lectureNumber === b.lectureNumber
  );
}

// Возвращает diff между старым и новым расписанием в виде
// { [week]: { [day]: { [lectureNumber]: { old, new } } } } — только изменившиеся пары.
// old / new могут быть null (пара добавлена или удалена).
export function diffSchedule(oldList, newList) {
  if (!oldList.length) return {}; // старых данных нет — нечего сравнивать

  const newMap = new Map(newList.map((e) => [`${e.week}|${e.day}|${e.lectureNumber}`, e]));
  const oldMap = new Map(oldList.map((e) => [`${e.week}|${e.day}|${e.lectureNumber}`, e]));
  const keys = new Set([...oldMap.keys(), ...newMap.keys()]);

  const result = {};
  for (const key of keys) {
    const oldEntry = oldMap.get(key);
    const newEntry = newMap.get(key);
    if (entriesEqual(oldEntry, newEntry)) continue;

    const [week, day, num] = key.split('|');
    result[week] ||= {};
    result[week][day] ||= {};
    result[week][day][Number(num)] = { old: oldEntry || null, new: newEntry || null };
  }
  return result;
}

// Записи одной недели, сгруппированные по дню и номеру пары:
// { [day]: { [lectureNumber]: record } }.
export function groupByWeekDay(schedule, week) {
  const map = Object.fromEntries(DAY_ORDER.map((d) => [d, {}]));
  schedule.forEach((item) => {
    if (item.week !== week) return;
    if (!map[item.day]) return;
    map[item.day][item.lectureNumber] = item;
  });
  return map;
}

// Порядок просмотра изменений: сначала текущая неделя (пн..сб), потом следующая (пн..сб),
// только изменённые дни. Так «Далее» при исчерпании недели переходит на следующую.
export function buildReviewSteps(changes, currentWeek) {
  const otherWeek = currentWeek === 'upper' ? 'lower' : 'upper';
  const daysOf = (w) =>
    changes[w]
      ? DAY_ORDER.filter((d) => changes[w][d] && Object.keys(changes[w][d]).length).map((d) => ({
          week: w,
          day: d,
        }))
      : [];
  return [...daysOf(currentWeek), ...daysOf(otherWeek)];
}