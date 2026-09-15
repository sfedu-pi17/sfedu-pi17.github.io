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