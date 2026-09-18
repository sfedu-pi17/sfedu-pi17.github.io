import { describe, it, expect } from 'vitest';
import {
  parseDiscipline,
  formatTeacher,
  getCurrentWeekType,
  getTodayDayCode,
  getCurrentLectureNumber,
  diffSchedule,
} from './domain.js';

describe('parseDiscipline', () => {
  it('выделяет тип занятия из скобок', () => {
    expect(parseDiscipline('Высшая математика (практ)')).toEqual({
      name: 'Высшая математика',
      type: 'практ',
    });
  });

  it('возвращает название без типа, если скобок нет', () => {
    expect(parseDiscipline('Иностранный язык')).toEqual({
      name: 'Иностранный язык',
      type: null,
    });
  });
});

describe('formatTeacher', () => {
  it('полное имя -> Фамилия И. О.', () => {
    expect(formatTeacher('Каплицкий Иван Олегович')).toBe('Каплицкий И. О.');
  });

  it('уже сокращённое имя не меняет порядок инициалов', () => {
    expect(formatTeacher('Каплицкий И. О.')).toBe('Каплицкий И. О.');
    expect(formatTeacher('Каплицкий И.О.')).toBe('Каплицкий И. О.');
  });

  it('без отчества -> Фамилия И.', () => {
    expect(formatTeacher('Каплицкий Иван')).toBe('Каплицкий И.');
  });

  it('одно слово и не-человек возвращаются как есть', () => {
    expect(formatTeacher('Каплицкий')).toBe('Каплицкий');
    expect(formatTeacher('индивидуально')).toBe('индивидуально');
  });

  it('пустая строка -> пусто', () => {
    expect(formatTeacher('')).toBe('');
    expect(formatTeacher(null)).toBe('');
  });
});

describe('getCurrentWeekType', () => {
  // 1 сентября — верхняя неделя, далее чередуется.
  it('1 сентября — верхняя', () => {
    expect(getCurrentWeekType(new Date('2026-09-01'))).toBe('upper');
  });

  it('чередуется каждую неделю', () => {
    expect(getCurrentWeekType(new Date('2026-09-07'))).toBe('lower');
    expect(getCurrentWeekType(new Date('2026-09-16'))).toBe('upper');
    expect(getCurrentWeekType(new Date('2026-09-21'))).toBe('lower');
    expect(getCurrentWeekType(new Date('2026-09-30'))).toBe('upper');
  });
});

describe('getTodayDayCode', () => {
  it('возвращает код дня недели', () => {
    expect(getTodayDayCode(new Date('2026-09-16'))).toBe('ср');
    expect(getTodayDayCode(new Date('2026-09-14'))).toBe('пн');
    expect(getTodayDayCode(new Date('2026-09-19'))).toBe('сб');
  });

  it('воскресенье -> понедельник (в расписании нет вс)', () => {
    expect(getTodayDayCode(new Date('2026-09-13'))).toBe('пн');
  });
});

describe('getCurrentLectureNumber', () => {
  const at = (hhmm) => {
    const [h, m] = hhmm.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
  };

  it('возвращает номер пары в её диапазоне', () => {
    expect(getCurrentLectureNumber(at('08:30'))).toBe(1);
    expect(getCurrentLectureNumber(at('09:00'))).toBe(1);
    expect(getCurrentLectureNumber(at('09:50'))).toBe(2);
    expect(getCurrentLectureNumber(at('11:55'))).toBe(3);
    expect(getCurrentLectureNumber(at('13:45'))).toBe(4);
    expect(getCurrentLectureNumber(at('15:50'))).toBe(5);
    expect(getCurrentLectureNumber(at('17:40'))).toBe(6);
  });

  it('границы: начало включается, конец исключается', () => {
    expect(getCurrentLectureNumber(at('08:00'))).toBe(1);
    expect(getCurrentLectureNumber(at('09:35'))).toBeNull(); // конец 1-й пары
  });

  it('в перерыве и до/после пар -> null', () => {
    expect(getCurrentLectureNumber(at('09:36'))).toBeNull();
    expect(getCurrentLectureNumber(at('11:25'))).toBeNull();
    expect(getCurrentLectureNumber(at('19:16'))).toBeNull();
    expect(getCurrentLectureNumber(at('07:00'))).toBeNull();
  });
});

describe('diffSchedule', () => {
  const base = (over = {}) => ({
    week: 'upper',
    day: 'вт',
    lectureNumber: 2,
    discipline: 'Высшая математика',
    format: 'практ',
    teacher: 'Каплицкий',
    audience: '502',
    subgroup: '',
    ...over,
  });

  it('пустые старые данные -> пустой diff', () => {
    const list = [base()];
    expect(diffSchedule([], list)).toEqual({});
  });

  it('нет изменений -> пустой diff', () => {
    const a = [base()];
    const b = [base()];
    expect(diffSchedule(a, b)).toEqual({});
  });

  it('изменённое поле -> old/new', () => {
    const a = [base({ audience: '502' })];
    const b = [base({ audience: '503' })];
    const diff = diffSchedule(a, b);
    expect(diff.upper.вт[2].old.audience).toBe('502');
    expect(diff.upper.вт[2].new.audience).toBe('503');
  });

  it('добавленная пара -> old: null', () => {
    const a = [base()];
    const b = [base(), base({ day: 'пт', lectureNumber: 5, discipline: 'История России' })];
    const diff = diffSchedule(a, b);
    expect(diff.upper.пт[5].old).toBeNull();
    expect(diff.upper.пт[5].new.discipline).toBe('История России');
  });

  it('удалённая пара -> new: null', () => {
    const a = [base(), base({ day: 'пт', lectureNumber: 5 })];
    const b = [base()];
    const diff = diffSchedule(a, b);
    expect(diff.upper.пт[5].old).toBeTruthy();
    expect(diff.upper.пт[5].new).toBeNull();
  });

  it('изменения в обеих неделях', () => {
    const a = [base({ week: 'upper' }), base({ week: 'lower', day: 'сб', lectureNumber: 4 })];
    const b = [
      base({ week: 'upper' }),
      base({ week: 'lower', day: 'сб', lectureNumber: 4, subgroup: 'группа I' }),
    ];
    const diff = diffSchedule(a, b);
    expect(diff.lower.сб[4].new.subgroup).toBe('группа I');
  });
});