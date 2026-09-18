import { AppShell, Group, Title } from '@mantine/core';
import ThemeMenu from '@/components/ThemeMenu.jsx';
import Timetable from '@/components/Timetable/index.jsx';
import '@mantine/core/styles.css';
import './App.css';

export default function App() {
  return (
    <AppShell header={{ height: 48 }} padding="sm" withBorder={false}>
      <AppShell.Header className="appHeader">
        <Group justify="space-between" h="100%" px="md">
          <Title order={3}>Расписание</Title>
          <ThemeMenu />
        </Group>
      </AppShell.Header>
      <AppShell.Main className="appMain">
        <Timetable />
      </AppShell.Main>
    </AppShell>
  );
}