import { describe, it, expect } from 'vitest';
import { parseScheduleCsv } from './serialization.js';

const SAMPLE_CSV = `week,day,lecture_number,discipline,format,teacher,auaudience,subgroup
верхняя,пн,1,Иностранный язык,,индивидуально,MS Teams,
верхняя,вт,2,Высшая математика,практ,Каплицкий,502,
нижняя,сб,4,Программирование,лаб,Ефимов,608,группа I
`;
const EMPTY_CSV = `week,day,lecture_number,discipline,format,teacher,auaudience,subgroup
`;

describe('parseScheduleCsv', () => {
  it('парсит CSV в нормализованные записи', () => {
    const rows = parseScheduleCsv(SAMPLE_CSV);
    expect(rows).toHaveLength(3);

    expect(rows[0]).toEqual({
      week: 'upper',
      day: 'пн',
      lectureNumber: 1,
      discipline: 'Иностранный язык',
      format: '',
      teacher: 'индивидуально',
      audience: 'MS Teams',
      subgroup: '',
      cancelDate: '',
      overrideTime: null,
      englishLang: '',
    });

    expect(rows[1].format).toBe('практ');
    expect(rows[1].audience).toBe('502');
    expect(rows[1].teacher).toBe('Каплицкий');

    expect(rows[2].week).toBe('lower');
    expect(rows[2].format).toBe('лаб');
    expect(rows[2].subgroup).toBe('группа I');
  });

  it('нормализует опечатку auaudience -> audience', () => {
    const rows = parseScheduleCsv(SAMPLE_CSV);
    expect(rows[0].audience).toBe('MS Teams');
  });

  it('лекция это число', () => {
    const rows = parseScheduleCsv(SAMPLE_CSV);
    expect(rows[0].lectureNumber).toBe(1);
    expect(typeof rows[0].lectureNumber).toBe('number');
  });

  it('строку без дня/номера отфильтровывает, а пустую пару сохраняет', () => {
    const csv = `week,day,lecture_number,discipline,format,teacher,auaudience,subgroup
верхняя,,,,,
верхняя,пн,5,,,,
`;
    const rows = parseScheduleCsv(csv);
    // строка с пустым днём отброшена, пара с днём и номером, но без содержания — сохранена
    expect(rows).toHaveLength(1);
    expect(rows[0].day).toBe('пн');
    expect(rows[0].lectureNumber).toBe(5);
    expect(rows[0].discipline).toBe('');
  });

  it('пустой текст -> []', () => {
    expect(parseScheduleCsv('')).toEqual([]);
    expect(parseScheduleCsv(EMPTY_CSV)).toEqual([]);
  });

  it('корректно разбирает поле в кавычках с запятой', () => {
    const csv = `week,day,lecture_number,discipline,format,teacher,auaudience,subgroup
верхняя,вт,3,"Письмо, мышление",практ,Юхнова,510,
`;
    const rows = parseScheduleCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].discipline).toBe('Письмо, мышление');
  });

  it('парсит переопределённое время пары (одно и два значения)', () => {
    const csv = `week,day,lecture_number,discipline,format,teacher,auaudience,subgroup,override_time
верхняя,пн,2,Физика,лек,Иванов,101,,17:00
верхняя,вт,3,Матанализ,практ,Петров,102,,17:00-19:00
`;
    const rows = parseScheduleCsv(csv);
    // одно значение — начало, конец = +95 мин
    expect(rows[0].overrideTime).toBe('17:00 - 18:35');
    // два значения — начало и конец как есть
    expect(rows[1].overrideTime).toBe('17:00 - 19:00');
  });

  it('пустое переопределение времени -> null', () => {
    const rows = parseScheduleCsv(SAMPLE_CSV);
    expect(rows[0].overrideTime).toBeNull();
  });

  it('отмечает иностранную пару полем english_lang', () => {
    const csv = `week,day,lecture_number,discipline,format,teacher,auaudience,subgroup,english_lang
верхняя,пн,1,Иностранный язык,,индивидуально,MS Teams,,англ.
верхняя,пн,2,Физика,лек,Иванов,101,,
`;
    const rows = parseScheduleCsv(csv);
    expect(rows[0].englishLang).toBe('англ.');
    expect(rows[1].englishLang).toBe('');
  });
});