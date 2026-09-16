// Сериализатор расписания: CSV из Google Sheets -> структура для UI.
// В первой строке CSV идут названия колонок — они используются как имена полей.
// Известная опечатка в заголовке «auaudience» нормализуется в «audience».

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

// Распарсить полный CSV-текст в массив строк (учитывает кавычки и переводы строк).
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (ch !== '\r') {
      field += ch;
    }
  }

  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }

  return rows;
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

// Привести запись к единому виду и нормализовать типы.
function normalizeRecord(rec) {
  // Формат занятия теперь отдельная колонка; парсинг скобок из дисциплины
  // оставлен как запасной вариант для старых данных, где тип был внутри названия.
  const { name, type: parenType } = parseDiscipline(rec.discipline);
  return {
    week: rec.week?.trim() === 'нижняя' ? 'lower' : 'upper',
    day: rec.day?.trim(),
    lectureNumber: Number(rec.lecture_number) || 0,
    discipline: name,
    format: rec.format?.trim() || parenType || '',
    teacher: rec.teacher?.trim() || '',
    audience: rec.audience?.trim() || '',
    subgroup: rec.subgroup?.trim() || '',
  };
}

export function parseScheduleCsv(csvText) {
  if (!csvText) return [];
  const rows = parseCsv(csvText);
  if (!rows.length) return [];

  // Первая строка — названия колонок.
  const header = rows[0];
  const fields = header.map((raw, index) => {
    const name = raw.trim().toLowerCase().includes('audien') ? 'audience' : raw.trim();
    return { name, index };
  });

  return rows
    .slice(1)
    .map((cells) => {
      const rec = {};
      fields.forEach(({ name, index }) => {
        rec[name] = (cells[index] ?? '').trim();
      });
      return normalizeRecord(rec);
    })
    .filter((item) => item.day && item.lectureNumber > 0);
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

// Кэш расписания в localStorage: при открытии страницы сначала показываем сохранённые
// данные, а свежие подтягиваем асинхронно в фоне. Храним версию сборки (envelope):
// если версия в localStorage не совпадает с текущим билдом — кэш несовместим,
// очищаем и работаем как будто его нет.
const STORAGE_KEY = 'sfedu.schedule';
const CACHE_VERSION = __BUILD_HASH__;

export function loadScheduleCache() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === 'object' &&
      !Array.isArray(parsed) &&
      parsed.version === CACHE_VERSION &&
      Array.isArray(parsed.data)
    ) {
      return parsed.data;
    }
    // Несовместимый или старый формат (голый массив) — очистить и работать без кэша.
    localStorage.removeItem(STORAGE_KEY);
    return [];
  } catch {
    return [];
  }
}

export function saveScheduleCache(schedule) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: CACHE_VERSION, data: schedule }));
  } catch {
    // приватный режим / переполнение хранилища — игнорируем
  }
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