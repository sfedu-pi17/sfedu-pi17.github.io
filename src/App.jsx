import React, { useState, useEffect } from 'react';

const PUB_ID = '2PACX-1vRSIJwnvklsU8oP6GROruCJvfCSy_duAmcGwJ0uwHj5e7X69EAJTU49QUW-ndqeLA2gkhhL2i0Xfcph'
const SPREADSHEETS_TABS = [
    { name: "Расписание занятий", gid: "0" },
    { name: "Список преподавателей", gid: "142345678" },
    { name: "Аудитории", gid: "987654321" }
];
const LIST = {
    discipline: 0,
    test: 1545959544,
    schedule: 1227335714,
}

const URL = `https://docs.google.com/spreadsheets/d/e/${PUB_ID}/pub?gid=${LIST.schedule}&output=csv`;

export default function Timetable() {
    const [schedule, setSchedule] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(URL)
            .then(res => res.text()) // Получаем CSV как обычный текст
            .then(csvText => {
                console.log(csvText)

                // Разбиваем текст на строки
                const lines = csvText.split('\n');


                // Первая строчка — заголовки (id, title...), пропускаем её через slice(1)
                const formattedData = lines.slice(1).map(line => {
                    // Разбиваем каждую строку по запятой
                    const columns = line.split(',');

                    return {
                        id: columns[0]?.trim(),      // Столбец A
                        title: columns[1]?.trim(),   // Столбец B
                        teacher: columns[2]?.trim(), // Столбец C
                        type: columns[3]?.trim()     // Столбец D
                    };
                }).filter(item => item.id); // Убираем пустые строки, если они есть в конце

                setSchedule(formattedData);
                setLoading(false);
            })
            .catch(err => {
                console.error("Ошибка загрузки CSV:", err);
                setLoading(false);
            });
    }, []);

    if (loading) return <div>Загрузка расписания из CSV...</div>;

    return (
        <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
            <h2>Расписание занятий</h2>
            <table border="1" cellPadding="10" style={{ borderCollapse: 'collapse', width: '100%' }}>
                <thead>
                <tr style={{ backgroundColor: '#f2f2f2' }}>
                    <th>ID</th>
                    <th>Предмет</th>
                    <th>Преподаватель</th>
                    <th>Тип занятия</th>
                </tr>
                </thead>
                <tbody>
                {schedule.map((item, index) => (
                    <tr key={item.id || index}>
                        <td>{item.id}</td>
                        <td><strong>{item.title}</strong></td>
                        <td>{item.teacher}</td>
                        <td>{item.type}</td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
}
