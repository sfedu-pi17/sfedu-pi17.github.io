import { Group, Title } from '@mantine/core';
import ThemeMenu from './components/ThemeMenu.jsx';
import Timetable from './components/Timetable.jsx';
import '@mantine/core/styles.css';

export default function App() {
  return (
    <div>
      <Group justify="space-between" p="md">
        <Group gap="xs">
          <Title order={2}>
            Расписание занятий
          </Title>
        </Group>
        <ThemeMenu />
      </Group>
      <Timetable />
    </div>
  );
}