import { Group, Title } from '@mantine/core';
import ThemeMenu from '../components/ThemeMenu.jsx';
import Timetable from '../components/Timetable/index.jsx';
import '@mantine/core/styles.css';

export default function App() {
  return (
    <div className="appRoot">
      <Group justify="space-between" p="md">
        <Group gap="xs">
          <Title order={3}>
            Расписание
          </Title>
        </Group>
        <ThemeMenu />
      </Group>
      <div className="appBody">
        <Timetable />
      </div>
    </div>
  );
}