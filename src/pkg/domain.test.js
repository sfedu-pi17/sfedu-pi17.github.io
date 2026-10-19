import { describe, it, expect } from 'vitest';
import {
  parseDiscipline,
  formatTeacher,
  getCurrentWeekType,
  getTodayDayCode,
  getCurrentLectureNumber,
  getLectureTimeState,
  getMinutesRemaining,
  getPairBreakInfo,
  normalizeOverrideTime,
  buildDayTimes,
  shiftDay,
  diffSchedule,
  isSelectableRecord,
  pairKey,
  getSlotState,
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

describe('getLectureTimeState', () => {
  const at = (hhmm) => {
    const [h, m] = hhmm.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
  };

  it('идущая пара -> ongoing', () => {
    expect(getLectureTimeState(at('08:30'))).toEqual({ num: 1, status: 'ongoing' });
    expect(getLectureTimeState(at('12:00'))).toEqual({ num: 3, status: 'ongoing' });
    expect(getLectureTimeState(at('17:40'))).toEqual({ num: 6, status: 'ongoing' });
  });

  it('во время перемены -> следующая пара upcoming', () => {
    expect(getLectureTimeState(at('09:36'))).toEqual({ num: 2, status: 'upcoming' });
    expect(getLectureTimeState(at('11:26'))).toEqual({ num: 3, status: 'upcoming' });
    expect(getLectureTimeState(at('15:21'))).toEqual({ num: 5, status: 'upcoming' });
  });

  it('до начала пар -> первая пара upcoming', () => {
    expect(getLectureTimeState(at('07:00'))).toEqual({ num: 1, status: 'upcoming' });
  });

  it('после последней пары -> null', () => {
    expect(getLectureTimeState(at('19:16'))).toBeNull();
  });

  it('пропускает недоступные пары (нет записи или отменены)', () => {
    // время 1-й пары, но она отменена -> следующая доступная 2-я ещё не началась
    expect(getLectureTimeState(at('08:30'), (n) => n !== 1)).toEqual({ num: 2, status: 'upcoming' });
    // время 2-й пары, но она отменена -> показываем 3-ю как upcoming
    expect(getLectureTimeState(at('10:00'), (n) => n !== 2)).toEqual({ num: 3, status: 'upcoming' });
    // перерыв после 1-й, пара 2 отменена -> 3-я upcoming
    expect(getLectureTimeState(at('09:36'), (n) => n !== 2)).toEqual({ num: 3, status: 'upcoming' });
  });

  it('когда после недоступной пары нет других доступных -> null', () => {
    expect(getLectureTimeState(at('10:00'), (n) => n === 1)).toBeNull();
  });
});

describe('getMinutesRemaining', () => {
  const at = (hhmm) => {
    const [h, m] = hhmm.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
  };

  it('идущая пара -> до её конца', () => {
    expect(getMinutesRemaining({ num: 1, status: 'ongoing' }, at('09:00'))).toBe(35);
    expect(getMinutesRemaining({ num: 3, status: 'ongoing' }, at('12:30'))).toBe(60);
  });

  it('следующая пара -> до её начала', () => {
    expect(getMinutesRemaining({ num: 2, status: 'upcoming' }, at('09:36'))).toBe(14);
    expect(getMinutesRemaining({ num: 3, status: 'upcoming' }, at('11:26'))).toBe(29);
  });

  it('время вышло или нет состояния -> null', () => {
    expect(getMinutesRemaining(null, at('09:00'))).toBeNull();
    expect(getMinutesRemaining({ num: 1, status: 'ongoing' }, at('09:36'))).toBeNull();
  });
});

describe('getPairBreakInfo', () => {
  const at = (hhmm) => {
    const [h, m] = hhmm.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
  };

  it('перерыв идущей пары — через 45 мин от начала', () => {
    // 1-я пара 8:00-9:35, перерыв в 8:45; в 8:20 до него 25 минут.
    expect(getPairBreakInfo({ num: 1, status: 'ongoing' }, at('08:20'))).toEqual({ time: '08:45', remaining: 25 });
    // 4-я пара 13:45-15:20, перерыв в 14:30.
    expect(getPairBreakInfo({ num: 4, status: 'ongoing' }, at('14:00'))).toEqual({ time: '14:30', remaining: 30 });
  });

  it('после перерыва remaining <= 0', () => {
    expect(getPairBreakInfo({ num: 1, status: 'ongoing' }, at('09:00'))).toEqual({ time: '08:45', remaining: -15 });
  });

  it('не идущая пара -> null', () => {
    expect(getPairBreakInfo({ num: 2, status: 'upcoming' }, at('09:36'))).toBeNull();
    expect(getPairBreakInfo(null, at('09:00'))).toBeNull();
  });
});

describe('normalizeOverrideTime', () => {
  it('одно время -> начало, конец +95 мин', () => {
    expect(normalizeOverrideTime('17:00')).toBe('17:00 - 18:35');
    expect(normalizeOverrideTime('9:50')).toBe('9:50 - 11:25');
  });

  it('два времени -> начало и конец как есть', () => {
    expect(normalizeOverrideTime('17:00-19:00')).toBe('17:00 - 19:00');
    expect(normalizeOverrideTime('17:00 – 19:00')).toBe('17:00 - 19:00');
  });

  it('пустое значение -> null', () => {
    expect(normalizeOverrideTime('')).toBeNull();
    expect(normalizeOverrideTime(null)).toBeNull();
    expect(normalizeOverrideTime('  ')).toBeNull();
  });
});

describe('getLectureTimeState с переопределением', () => {
  const at = (hhmm) => {
    const [h, m] = hhmm.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
  };
  // Пара 2 переопределена на 17:00 - 18:35 (вместо 9:50 - 11:25).
  const times = { 1: '8:00 - 9:35', 2: '17:00 - 18:35', 3: '11:55 - 13:30' };

  it('время переопределённой пары -> ongoing', () => {
    expect(getLectureTimeState(at('17:30'), (n) => n === 2, times)).toEqual({ num: 2, status: 'ongoing' });
  });

  it('до переопределённой пары — первая доступная как upcoming', () => {
    // 16:00 — первая пара ещё идёт, 2-я переопределена на 17:00, обе доступны
    expect(getLectureTimeState(at('16:00'), (n) => [1, 2].includes(n), times)).toEqual({ num: 2, status: 'upcoming' });
  });

  it('getMinutesRemaining берёт время переопределённой пары', () => {
    expect(getMinutesRemaining({ num: 2, status: 'ongoing' }, at('17:00'), times)).toBe(95);
  });
});

describe('buildDayTimes', () => {
  it('без переопределений -> базовое расписание', () => {
    const times = buildDayTimes({ 3: { overrideTime: null } });
    expect(times[1]).toBe('8:00 - 9:35');
    expect(times[2]).toBe('9:50 - 11:25');
    expect(times[3]).toBe('11:55 - 13:30');
    expect(times[6]).toBe('17:40 - 19:15');
  });

  it('переопределение сдвигает следующие пары на +10 мин (95 мин пара)', () => {
    const times = buildDayTimes({ 3: { overrideTime: '17:00' } });
    expect(times[3]).toBe('17:00 - 18:35');
    expect(times[4]).toBe('18:45 - 20:20');
    expect(times[5]).toBe('20:30 - 22:05');
    expect(times[6]).toBe('22:15 - 23:50');
  });

  it('пары до переопределения не трогаем', () => {
    const times = buildDayTimes({ 3: { overrideTime: '17:00' } });
    expect(times[1]).toBe('8:00 - 9:35');
    expect(times[2]).toBe('9:50 - 11:25');
  });

  it('повторное переопределение встаёт на своё время и ведёт следующие за собой', () => {
    const times = buildDayTimes({ 2: { overrideTime: '17:00' }, 4: { overrideTime: '20:00' } });
    expect(times[2]).toBe('17:00 - 18:35');
    expect(times[3]).toBe('18:45 - 20:20');
    expect(times[4]).toBe('20:00 - 21:35');
    expect(times[5]).toBe('21:45 - 23:20');
    expect(times[6]).toBe('23:30 - 01:05');
  });

  it('два значения времени задают и длительность пары, от которой считаем сдвиг', () => {
    const times = buildDayTimes({ 2: { overrideTime: '17:00-19:00' } });
    expect(times[2]).toBe('17:00 - 19:00');
    expect(times[3]).toBe('19:10 - 20:45');
  });
});

describe('diffSchedule учитывает overrideTime', () => {
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

  it('изменённое время пары -> old/new', () => {
    const a = [base({ overrideTime: null })];
    const b = [base({ overrideTime: '17:00 - 18:35' })];
    const diff = diffSchedule(a, b);
    expect(diff.upper.вт[2].old.overrideTime).toBeNull();
    expect(diff.upper.вт[2].new.overrideTime).toBe('17:00 - 18:35');
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

describe('shiftDay', () => {
  it('обычное смещение внутри недели', () => {
    expect(shiftDay('вт', 0, 1)).toEqual({ day: 'ср', weekOffset: 0 });
    expect(shiftDay('вт', 0, -1)).toEqual({ day: 'пн', weekOffset: 0 });
    expect(shiftDay('чт', -1, 1)).toEqual({ day: 'пт', weekOffset: -1 });
  });

  it('сб -> пн переходит на следующую неделю', () => {
    expect(shiftDay('сб', 0, 1)).toEqual({ day: 'пн', weekOffset: 1 });
    expect(shiftDay('сб', 2, 1)).toEqual({ day: 'пн', weekOffset: 3 });
  });

  it('пн -> сб переходит на предыдущую неделю', () => {
    expect(shiftDay('пн', 0, -1)).toEqual({ day: 'сб', weekOffset: -1 });
    expect(shiftDay('пн', 3, -1)).toEqual({ day: 'сб', weekOffset: 2 });
  });

  it('неизвестный день возвращается как есть', () => {
    expect(shiftDay('вс', 0, 1)).toEqual({ day: 'вс', weekOffset: 0 });
  });
});

describe('выбор пары', () => {
  const eng = { week: 'upper', day: 'пн', lectureNumber: 1, discipline: 'Иностранный язык', isSelectable: true };
  const prog = { week: 'upper', day: 'ср', lectureNumber: 2, discipline: 'Программирование', isSelectable: true };
  const math = { week: 'upper', day: 'вт', lectureNumber: 3, discipline: 'Матанализ', isSelectable: false };

  it('isSelectable отмечает пары, которые можно выбрать', () => {
    expect(isSelectableRecord(eng)).toBe(true);
    expect(isSelectableRecord(prog)).toBe(true);
    expect(isSelectableRecord(math)).toBe(false);
  });

  it('ключ пары — неделя + день + номер: верхняя и нижняя недели раздельные', () => {
    expect(pairKey(eng)).toBe('upper|пн|1');
    expect(pairKey({ ...eng, week: 'lower', day: 'пн', lectureNumber: 1 })).toBe('lower|пн|1');
    expect(pairKey(prog)).toBe('upper|ср|2');
  });

  it('изменение флага isSelectable учитывается в diff', () => {
    const a = [eng];
    const b = [{ ...eng, isSelectable: false }];
    expect(diffSchedule(a, b).upper.пн[1].new.isSelectable).toBe(false);
  });
});

describe('состояние слота', () => {
  const eng = { week: 'upper', day: 'пн', lectureNumber: 1, discipline: 'Иностранный язык', isSelectable: true };
  const math = { week: 'upper', day: 'вт', lectureNumber: 2, discipline: 'Матанализ', isSelectable: false };
  const empty = { week: 'upper', day: 'ср', lectureNumber: 3 };
  // Предикаты-заглушки: getSlotState прокидывает слот, но для логики важны только флаги.
  const preds = ({ inactive = false, gym = false } = {}) => ({
    isActive: () => !inactive,
    isInactive: () => inactive,
    isGym: () => gym,
  });

  it('посещаемая селектабельная пара: только счёт, без физ-ры и затемнения', () => {
    const s = getSlotState(eng, { week: 'upper', day: 'пн', lectureNumber: 1, ...preds() });
    expect(s.slot).toEqual({ week: 'upper', day: 'пн', lectureNumber: 1 });
    expect(s.sel).toBe(true);
    expect(s.active).toBe(true);
    expect(s.gym).toBe(false);
    expect(s.showGymItem).toBe(false);
    expect(s.rowMenu).toBe(true);
    expect(s.dimmed).toBe(false);
  });

  it('«не ходить»: затемнение + возможность поставить физ-ру', () => {
    const s = getSlotState(eng, { week: 'upper', day: 'пн', lectureNumber: 1, ...preds({ inactive: true }) });
    expect(s.active).toBe(false);
    expect(s.dimmed).toBe(true);
    expect(s.showGymItem).toBe(true);
    expect(s.gymItemLabel).toBe('Поставить физ-ру');
  });

  it('пустая пара: меню одно, доступно только поставить физ-ру', () => {
    const s = getSlotState(empty, { week: 'upper', day: 'ср', lectureNumber: 3, ...preds() });
    expect(s.sel).toBe(false);
    expect(s.rowMenu).toBe(true);
    expect(s.showGymItem).toBe(true);
    expect(s.gymItemLabel).toBe('Поставить физ-ру');
  });

  it('физ-ра поверх «не ходить»: не затемняется, пункт «Убрать физ-ру»', () => {
    const s = getSlotState(eng, { week: 'upper', day: 'пн', lectureNumber: 1, ...preds({ inactive: true, gym: true }) });
    expect(s.gym).toBe(true);
    expect(s.dimmed).toBe(false);
    expect(s.showGymItem).toBe(true);
    expect(s.gymItemLabel).toBe('Убрать физ-ру');
  });

  it('обычная неселектабельная пара: меню нет', () => {
    const s = getSlotState(math, { week: 'upper', day: 'вт', lectureNumber: 2, ...preds() });
    expect(s.sel).toBe(false);
    expect(s.rowMenu).toBe(false);
    expect(s.showGymItem).toBe(false);
  });

  it('пустая пара с физ-рой: меню остаётся, действие — убрать', () => {
    const s = getSlotState(empty, { week: 'upper', day: 'ср', lectureNumber: 3, ...preds({ gym: true }) });
    expect(s.gym).toBe(true);
    expect(s.rowMenu).toBe(true);
    expect(s.showGymItem).toBe(true);
    expect(s.gymItemLabel).toBe('Убрать физ-ру');
  });
});