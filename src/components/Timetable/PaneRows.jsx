import { Text, Menu } from '@mantine/core';
import { IconDotsVertical } from '@tabler/icons-react';
import { isSummerBreak, isCancelledOn, formatTeacher, isSelectableRecord } from '@/pkg/domain.js';
import TimeRange from './TimeRange.jsx';
import { ChangedDiscipline, ChangedAudience } from './DiffCells.jsx';
import { formatRemainingLabel, isNumericAudience } from './utils.js';

// Ряды одного дня (6 пар) для одной панели карусели. highlight — состояние текущей/
// следующей пары, передаётся только средней панели (там, где выбранный день); у соседних
// панелей его нет, поэтому без подсветки и подписи «до конца/начала».
// Изменения читаются по неделе конкретной панели (changes[pane.week]), а не по
// глобальной — соседние недели могут содержать свой diff.
// pane.times — актуальное время каждой пары дня с каскадным сдвигом переопределений;
// по нему же считаем подпись «до конца/начала», чтобы она шла по реальному времени.
export default function PaneRows({ pane, changes, now, highlight, pairSel, gymSel }) {
  const { day, week, weekDayMap, dayDates, times } = pane;
  const { toggle, isActive, isInactive } = pairSel || { toggle: () => {}, isActive: () => true, isInactive: () => false };
  const { addGym, removeGym, isGym } = gymSel || { addGym: () => {}, removeGym: () => {}, isGym: () => false };
  const weekChanges = changes[week] || {};
  const pairChange = (day, num) => weekChanges[day]?.[num] || null;
  const lectureRemaining = highlight ? formatRemainingLabel(highlight, now, times) : null;

  return Array.from({ length: 6 }, (_, i) => {
    const number = i + 1;
    // Летом (июль–август) пар нет — не показываем их даже если тип недели совпадает с учебной.
    const summerBreak = isSummerBreak(dayDates[day]);
    const entry = summerBreak ? null : weekDayMap[day][number];
    const change = summerBreak ? null : pairChange(day, number);
    const cancelled = isCancelledOn(entry?.cancelDate, dayDates[day]);
    // Селектабельная пара: точки меню и затемнение исключённых. По умолчанию на пару ходим;
    // пользователь сам исключает те, на которые не пойдёт. Каждая пара независима.
    const sel = isSelectableRecord(entry);
    // Слот для выбора/физ-ры: даже у пустого слота есть неделя/день/номер — по нему
    // ключ тот же, что у пары (pairKey = неделя|день|номер), поэтому «не ходить» и
    // физ-ра адресуются одинаково.
    const slotRecord = { week, day, lectureNumber: number };
    const empty = !entry?.discipline; // пустая пара (нет дисциплины)
    const activePair = isActive(slotRecord); // по умолчанию true, пока не исключили
    const inactivePair = isInactive(slotRecord); // исключили «не ходить»
    const gym = isGym(slotRecord); // на слот поставили физ-ру
    // Меню физ-ры — одно действие: «Поставить» на пустую/«не ходить» (если физ-ры ещё нет),
    // «Убрать», если стоит. Пункт показываем, когда слот пустой, исключён или с физ-рой.
    const showGymItem = gym || empty || inactivePair;
    const gymItemLabel = gym ? 'Убрать физ-ру' : 'Поставить физ-ру';
    // Одна кнопка-точки на пару: показываем, если в меню есть хоть одно действие —
    // выбрать пару (селектабельная), свободная, исключённая или с физ-рой.
    const rowMenu = sel || empty || inactivePair || gym;
    // «Поставить {дисциплину}» отменяет физ-ру: пара снова посещается, слой физ-ры убираем.
    const toggleAttendance = () => {
      toggle(slotRecord);
      if (!activePair) removeGym(slotRecord);
    };
    const classes = [
      'scheduleRow',
      number === highlight?.num ? 'currentLecture' : null,
      change ? 'changedPair' : null,
      cancelled ? 'cancelledPair' : null,
      rowMenu ? 'groupRow' : null,
      // Затемняем только когда пара исключена и на неё не поставлена физ-ра: иначе
      // затемнился бы и цветной блок физ-ры. Слой физ-ры независим от «не ходить».
      inactivePair && !gym ? 'groupDimmed' : null,
    ]
      .filter(Boolean)
      .join(' ');
    // Время пары из таблицы дня (учитывает каскадный сдвиг переопределений).
    const lectureTime = times[number] || '';
    return (
      <div key={number} role="row" className={classes}>
        <div role="cell" className="colNumTime">
          <span className="lectureNum">{number}</span>
          <TimeRange
            value={lectureTime}
            highlight={
              highlight?.num === number
                ? highlight.status === 'ongoing'
                  ? 'end'
                  : 'start'
                : null
            }
          />
          {highlight?.num === number && <span className="timeRemaining">
            {lectureRemaining.label}&#32;<nobr>{lectureRemaining.time}</nobr>
          </span>}
        </div>
        <div role="cell" className="subjectCell">
          {gym ? (
            <>
              {/* Физ-ра отображается как обычная дисциплина (.subjectName); ниже зачёркнутая
                  пометка, какую пару она перекрывает. Точек у физ-ры нет — меню одно у строки. */}
              <div className="subjectName">Физ-ра</div>
              {entry?.discipline && <div className="replacedBlock">{entry.discipline}</div>}
            </>
          ) : (
            <>
              {cancelled && <span className="cancelBadge">отменена</span>}
              {change ? (
                <ChangedDiscipline change={change} />
              ) : entry?.discipline ? (
                <>
                  <div className="subjectName">
                    {entry.discipline}
                    {entry.format && <span className="formatText"> ({entry.format})</span>}
                    {entry.subgroup && <span className="subgroupText">{entry.subgroup}</span>}
                  </div>
                  {entry.teacher && <div className="subjectTeacher">{formatTeacher(entry.teacher)}</div>}
                </>
              ) : (
                <Text size="sm" c="dimmed">
                  —
                </Text>
              )}
            </>
          )}
        </div>
        <div role="cell" className="colAud">
          {gym ? (
            // У физ-ры нет аудитории — оставляем ячейку пустой, время не трогаем.
            <span className="audText"></span>
          ) : change ? (
            <ChangedAudience change={change} />
          ) : (
            <span className={isNumericAudience(entry?.audience) ? 'audNum' : 'audText'}>
              {entry?.audience || ''}
            </span>
          )}
        </div>
        {rowMenu && (
          <div
            className="groupMenuWrap"
            // не даём клику по точкам начать свайп карусели (у неё pointer-обработчики выше)
            onPointerDown={(e) => e.stopPropagation()}
          >
            <Menu position="top-end" shadow="md" width={230} classNames={{ dropdown: 'pairMenu' }}>
              <Menu.Target>
                <button type="button" className="groupMenuBtn" aria-label="Действия пары">
                  <IconDotsVertical size={16} />
                </button>
              </Menu.Target>
              <Menu.Dropdown>
                {sel && (
                  <Menu.Item onClick={toggleAttendance}>
                    {activePair
                      ? `Убрать ${entry?.discipline || 'эту пару'}`
                      : `Поставить ${entry?.discipline || 'эту пару'}`}
                  </Menu.Item>
                )}
                {showGymItem && (
                  <Menu.Item onClick={() => (gym ? removeGym(slotRecord) : addGym(slotRecord))}>
                    {gymItemLabel}
                  </Menu.Item>
                )}
              </Menu.Dropdown>
            </Menu>
          </div>
        )}
      </div>
    );
  });
}