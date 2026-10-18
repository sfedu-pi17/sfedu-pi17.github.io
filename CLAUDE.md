# Основные правила

- отвечай на русском. думай на английском.
- mobile design first
- используй ts
- пиши разные компоненты в разных файлах
- если у одного компонента несколько файлов объединяй их в одну папку
- для импортов используй глобальные пути @/*
- не пиши комменатарии, которые описывают, что делает код. Пиши только почему это сделано так, если это не логично по коду
- документацию к коду можно писать чуть подробнее чем комментарии и можно описывать что делает функция

## Архитектура приложения

Стек: React 19 + Vite 8 + Mantine (`@mantine/core`, `@mantine/hooks`), иконки `@tabler/icons-react`, .jsx. Деплой — GitHub Pages (`.github/workflows/deploy.yml`), `base: '/'`, HTTPS.

Источник данных — **один публичный Google Sheets, отдаётся как CSV** и тянется в рантайме. URL собирается в `src/pkg/api.js` (`https://docs.google.com/spreadsheets/d/e/{PUB_ID}/pub?gid=...&output=csv`). Для `localhost` подставляется локальный gid (константа `LOCAL_GID`), для прода — `DEFAULT_GID`.

### Поток данных (`src/components/Timetable/index.jsx`, useEffect на монтировании)

1. `loadScheduleCache()` — показать кэш (localStorage `sfedu.schedule`).
2. `fetchScheduleCsv()` → `parseScheduleCsv()` (свой CSV-парсер в `src/pkg/serialization.js`) → записи `{week, day, lectureNumber, discipline, format, teacher, audience, subgroup, cancelDate}`.
3. `diffSchedule(old, new)` → если есть изменения и были старые данные — **НЕ** пишем кэш, показываем баннер «Изменения» с режимом просмотра; иначе `saveScheduleCache(data)` сразу.
4. Ошибка fetch при наличии кэша → тост «Не удалось обновить данные», кэш показывается.

### Ключевые модули

- `src/pkg/domain.js` — чистая бизнес-логика без побочных эффектов: время пар (`LECTURE_TIMES`), чередование недель (`getCurrentWeekType`), сегодняшний день, каникулы, отмены, diff и группировка по дню/неделе.
- `src/pkg/serialization.js` — CSV → нормализованные записи.
- `src/pkg/storage.js` — кэш расписания в localStorage, envelope `{version: SCHEMA_VERSION, data: []}`.
- `src/pkg/api.js` — URL и `fetchScheduleCsv()`.
- `src/pkg/theme.js` — тема Mantine.
- `src/pkg/whatsnew.js` — список релизов `WHATS_NEW` (версия-дата + изменения) для модалки «Что нового» на старте.
- `src/components/Timetable/` — всё расписание: карусель дней (свайп), панели, баннер изменений.

### Определения окружения (vite.config.js)

- alias `@` → `src` (импорты только через `@/*`).

### PWA / офлайн

- Приложение — PWA через `vite-plugin-pwa` (`generateSW`, `registerType: 'autoUpdate'`). SW-прекэш оболочки даёт офлайн; SW регистрируется в `src/app/main.jsx` (`virtual:pwa-register`).
- Манифест `manifest.webmanifest` генерируется плагином (не руками; `site.webmanifest` не используется) и инжектится в `<head>`.
- Google Sheets CSV кэшируется runtime-правилом `NetworkFirst` (`cacheName: schedule-csv-v1`) — офлайн отдаёт последний удачный, онлайн свежее.

### Нюансы

- Версия кэша данных — `SCHEMA_VERSION = 1` в `src/pkg/storage.js` (версия **схемы**, а не сборки): деплой **не** стирает расписание у офлайн-пользователя.
- Модалка «Что нового» показывается, пока есть непросмотренные релизы: подтверждённая пользователем версия (`sfedu.whatsNewVersion` в localStorage) ниже `version` последнего релиза в `WHATS_NEW` (`src/pkg/whatsnew.js`). Для нового релиза просто дописываем объект `{ version, changes }` в конец массива.
- iOS Safari выселяет SW+кэш при ~7 днях неоткрытия — офлайн ломается, только если не открывали дольше недели.
- Разметка расписания — grid-колонки `120px 1fr 88px` (на узик `120px 1fr 44px`), вместо таблицы.