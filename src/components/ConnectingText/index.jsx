import { useEffect, useState } from 'react';
import { Title } from '@mantine/core';
import './ConnectingText.css';

// Заголовок «Соединение» с наращивающимися точками (0..3 по кругу) вместо голубой крутилки:
// так понятнее, что идёт запрос к сети, чем безликая точка. Точки меняем интервалом, а не на
// каждом кадре — заголовок лёгкий, перерендер не нужен; сам цикл живёт, пока компонент смонтирован.
export default function ConnectingText() {
  const [dots, setDots] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setDots((d) => (d + 1) % 4), 250);
    return () => clearInterval(id);
  }, []);

  return (
    <Title order={3} className="connectingText">
      Соединение<span className="connectingDots">{'.'.repeat(dots)}</span>
    </Title>
  );
}