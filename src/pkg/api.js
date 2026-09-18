// Работа с API: загрузка расписания из Google Sheets.
// Здесь только сетевые запросы — без парсинга, без обработки результата.

const PUB_ID = '2PACX-1vRSIJwnvklsU8oP6GROruCJvfCSy_duAmcGwJ0uwHj5e7X69EAJTU49QUW-ndqeLA2gkhhL2i0Xfcph';
const GID = 1227335714;

export const SCHEDULE_URL = `https://docs.google.com/spreadsheets/d/e/${PUB_ID}/pub?gid=${GID}&output=csv`;

// Возвращает сырой CSV-текст расписания.
export async function fetchScheduleCsv() {
  const res = await fetch(SCHEDULE_URL);
  return res.text();
}