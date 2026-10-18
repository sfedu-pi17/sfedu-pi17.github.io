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

// Минуты к «ЧЧ:ММ» (переход через час/сутки учитывается, но для расписания это лишь
// прибавка к началу пары, так что часы редко выходят за 0..23).
function addMinutes(hhmm, mins) {
  const [h, m] = hhmm.split(':').map(Number);
  const total = h * 60 + m + mins;
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

// Переопределение времени пары из данных: одно значение («17:00») — только начало,
// конец = +95 мин; два значения («17:00-19:00» или «17:00 – 19:00») — начало и конец.
// Возвращает span-строку в том же виде, что LECTURE_TIMES («17:00 - 18:35»), либо null.
export function normalizeOverrideTime(raw) {
  const value = String(raw ?? '').trim();
  if (!value) return null;
  const times = value.split(/\s*[-–—]\s*/).map((part) => part.trim()).filter(Boolean);
  const start = times[0];
  if (!start) return null;
  const end = times.length > 1 ? times[1] : addMinutes(start, 95);
  return `${start} - ${end}`;
}

// Минтуы {start, end} из span-строки «17:00 - 19:15»; null при некорректном значении.
function parseSpanMinutes(span) {
  if (!span) return null;
  const [start, end] = span.split('-').map((part) => {
    const [h, m] = part.trim().split(':').map(Number);
    return h * 60 + m;
  });
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  return { start, end };
}

// Диапазоны звонков из карты «номер пары -> время» для функций состояния времени.
function buildRanges(times) {
  return Object.entries(times)
    .map(([num, span]) => {
      const parsed = parseSpanMinutes(span);
      return parsed ? { num: Number(num), ...parsed } : null;
    })
    .filter(Boolean);
}

// Минуты от полуночи -> «ЧЧ:ММ» для span-строки.
function formatSpan(start, end) {
  const fmt = (mins) =>
    `${String(Math.floor(mins / 60) % 24).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
  return `${fmt(start)} - ${fmt(end)}`;
}

// Актуальное время каждой пары дня с учётом каскадного сдвига. Первое переопределение
// задаёт точку, дальше пары «тащатся» за ним: до него идут по базовому расписанию звонков,
// после — из конца предыдущей + 10 минут перерыва (пара = 95 мин), пока следующая пара
// снова не задаст своё время. dayMap — «номер пары -> record».
export function buildDayTimes(dayMap) {
  const times = {};
  let prevEnd = null;
  let cascading = false;
  for (let num = 1; num <= 6; num++) {
    const override = normalizeOverrideTime(dayMap[num]?.overrideTime);
    if (override) {
      times[num] = override;
      prevEnd = parseSpanMinutes(override)?.end ?? null;
      cascading = true;
    } else if (!cascading) {
      // До первого переопределения (и когда его нет) — базовое расписание звонков.
      times[num] = LECTURE_TIMES[num];
      prevEnd = parseSpanMinutes(LECTURE_TIMES[num]).end;
    } else {
      const start = prevEnd + 10;
      const end = start + 95;
      times[num] = formatSpan(start, end);
      prevEnd = end;
    }
  }
  return times;
}

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

// Привести ФИО преподавателя к виду «Фамилия И. О.»:
// «Каплицкий Иван Олегович» -> «Каплицкий И. О.», «Каплицкий И.О.» -> «Каплицкий И. О.».
// Если имени нет (или в поле не человек, например «индивидуально») — возвращаем как есть.
export function formatTeacher(raw) {
  const name = String(raw ?? '').replace(/\s+/g, ' ').trim();
  if (!name) return '';
  const parts = name.split(' ');
  const surname = parts[0];
  const rest = parts.slice(1);
  if (!rest.length) return surname;

  const initials = rest
    .map((part) => {
      const letters = part.replace(/[^A-Za-zА-Яа-яЁё]/g, '');
      if (!letters) return '';
      // «И. О.» / «И.О.» — несколько инициалов подряд, берём все;
      // «Иван» — полное имя, берём первую букву.
      return part.includes('.') || letters.length === 1 ? letters : letters[0];
    })
    .filter(Boolean)
    .map((seg) => `${seg.toUpperCase().split('').join('. ')}.`)
    .join(' ');
  return initials ? `${surname} ${initials}` : surname;
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

// Соседний день расписания: delta +1 — следующий, −1 — предыдущий.
// На краях недели (сб ↔ пн) сдвигает и weekOffset: сб -> пн следующей недели,
// пн -> сб предыдущей. Неизвестный день возвращаем как есть.
export function shiftDay(day, weekOffset, delta) {
  const idx = DAY_ORDER.indexOf(day);
  if (idx === -1) return { day, weekOffset };
  const next = idx + delta;
  if (next < 0) return { day: DAY_ORDER[DAY_ORDER.length - 1], weekOffset: weekOffset - 1 };
  if (next >= DAY_ORDER.length) return { day: DAY_ORDER[0], weekOffset: weekOffset + 1 };
  return { day: DAY_ORDER[next], weekOffset };
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
// иначе null. times — карта «номер пары -> время» (по умолчанию базовое расписание),
// чтобы учитывать переопределение времени отдельной пары.
export function getCurrentLectureNumber(date = new Date(), times = LECTURE_TIMES) {
  const mins = date.getHours() * 60 + date.getMinutes();
  const found = buildRanges(times).find((r) => mins >= r.start && mins < r.end);
  return found ? found.num : null;
}

// Состояние времени относительно звонков: какая пара идёт сейчас ('ongoing') или
// какая начнётся следующей во время перемены ('upcoming'); null — когда подходящих
// пар больше нет. isAvailable(num) говорит, есть ли у пары запись и не отменена ли
// она; times — карта «номер пары -> время» для учёта переопределения. Пустые и
// отменённые пары пропускаем: если сейчас время отменённой пары или перемена,
// показываем следующую актуальную (upcoming) и подсвечиваем её начало.
export function getLectureTimeState(date = new Date(), isAvailable = () => true, times = LECTURE_TIMES) {
  const mins = date.getHours() * 60 + date.getMinutes();
  const found = buildRanges(times).find((r) => isAvailable(r.num) && mins < r.end);
  if (!found) return null;
  return { num: found.num, status: mins < found.start ? 'upcoming' : 'ongoing' };
}

// Сколько минут осталось до конца идущей пары ('ongoing') или до начала следующей
// ('upcoming'); null, если время уже вышло. Используется для подписи под временем.
export function getMinutesRemaining(state, date = new Date(), times = LECTURE_TIMES) {
  if (!state) return null;
  const span = parseSpanMinutes(times[state.num]);
  if (!span) return null;
  const target = state.status === 'ongoing' ? span.end : span.start;
  const delta = target - (date.getHours() * 60 + date.getMinutes());
  return delta > 0 ? delta : null;
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
    a.cancelDate === b.cancelDate &&
    a.overrideTime === b.overrideTime &&
    a.englishLang === b.englishLang &&
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

// «Иностранный язык» встречается несколько раз (разные группы/дни), а посещать нужно
// только одну пару. Иностранная пара — та, чья дисциплина «Иностранный язык».
export function isForeignLanguage(record) {
  return record?.discipline === 'Иностранный язык';
}

// Ключ иностранной пары для выбора — englishLang (группа/язык): различает, какую именно
// из иностранных пар посещаем, и у той же группы в другой неделе он одинаковый, поэтому
// выбранная пара не «гаснет» при смене недели. Если колонки нет (englishLang пуст),
// падаем на составной ключ пары, чтобы выбор всё равно работал.
export function foreignKey(record) {
  return record.englishLang || `${record.week}|${record.day}|${record.lectureNumber}`;
}