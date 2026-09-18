// Сериализация расписания: CSV из Google Sheets -> структура для UI.
// Здесь только перенос сырого текста CSV в нормализованные записи.
// В первой строке CSV идут названия колонок — они используются как имена полей.
// Известная опечатка в заголовке «auaudience» нормализуется в «audience».

import { parseDiscipline } from './domain.js';

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
    // Дата отмены пары (заполнена — пара отменена в этот день). Колонка может называться
    // cancel_date или cancelDate.
    cancelDate: (rec.cancel_date ?? rec.cancelDate ?? '').trim(),
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