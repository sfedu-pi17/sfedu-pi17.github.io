import { formatTeacher } from '@/pkg/domain.js';

// Однострочный diff поля: старое (красное, зачёркнутое) -> новое (зелёное).
// Пустую сторону не выводим: если старого нет — не показываем красное,
// если нового нет — не показываем зелёное.
export function DiffPair({ oldVal, newVal, fmt }) {
  const showOld = !!oldVal;
  const showNew = !!newVal;
  if (!showOld && !showNew) return null;
  const o = showOld && fmt ? fmt(oldVal) : oldVal;
  const n = showNew && fmt ? fmt(newVal) : newVal;
  return (
    <span>
      {showOld && <span className="diffOld">{o}</span>}
      {showNew && <span className="diffNew">{n}</span>}
    </span>
  );
}

// Содержимое ячейки «Дисциплина» для изменившейся пары.
export function ChangedDiscipline({ change }) {
  const { old: o, new: n } = change;

  const field = (key, cls, fmt) => {
    const ov = o?.[key] ?? '';
    const nv = n?.[key] ?? '';
    if (ov === nv) {
      return nv ? <div key={key} className={cls}>{fmt ? fmt(nv) : nv}</div> : null;
    }
    return (
      <div key={key} className={cls}>
        <DiffPair oldVal={ov} newVal={nv} fmt={fmt} />
      </div>
    );
  };

  return (
    <>
      {field('discipline', 'subjectName')}
      {field('format', 'formatText', (v) => `(${v})`)}
      {field('subgroup', 'subgroupText')}
      {field('teacher', 'subjectTeacher', formatTeacher)}
    </>
  );
}

// Содержимое ячейки «Аудитория» для изменившейся пары.
export function ChangedAudience({ change }) {
  const { old: o, new: n } = change;
  const ov = o?.audience ?? '';
  const nv = n?.audience ?? '';
  if (ov === nv) return nv ? <span>{nv}</span> : '';
  return <DiffPair oldVal={ov} newVal={nv} />;
}