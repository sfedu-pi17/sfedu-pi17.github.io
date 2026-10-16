import { AppShell, Group, Title, Loader } from '@mantine/core';
import ThemeMenu from '@/components/ThemeMenu.jsx';
import Timetable from '@/components/Timetable/index.jsx';
import { useIsOnline } from '@/hooks/useIsOnline.js';
import '@mantine/core/styles.css';
import './App.css';

export default function App() {
  const isOnline = useIsOnline();
  return (
    <AppShell header={{ height: 48 }} padding="sm" withBorder={false}>
      <AppShell.Header className="appHeader">
        <Group justify="space-between" h="100%" px="md">
          <Group gap="xs">
            <Title order={3}>Расписание</Title>
            {!isOnline && <Loader size="xs" />}
          </Group>
          <ThemeMenu />
        </Group>
      </AppShell.Header>
      <AppShell.Main className="appMain">
        <Timetable />
      </AppShell.Main>
    </AppShell>
  );
}