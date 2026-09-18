// Работа с API: загрузка расписания из Google Sheets.

const PUB_ID = '2PACX-1vRSIJwnvklsU8oP6GROruCJvfCSy_duAmcGwJ0uwHj5e7X69EAJTU49QUW-ndqeLA2gkhhL2i0Xfcph';
const DEFAULT_GID = 1227335714;
const LOCAL_GID = 800775781;

const isLocal =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

export const SCHEDULE_URL = `https://docs.google.com/spreadsheets/d/e/${PUB_ID}/pub?gid=${isLocal ? LOCAL_GID : DEFAULT_GID}&output=csv`;

// Возвращает сырой CSV-текст расписания.
export async function fetchScheduleCsv() {
  const res = await fetch(SCHEDULE_URL);
  return res.text();
}