import { AppShell, Group, Title, Loader } from '@mantine/core';
import ThemeMenu from '@/components/ThemeMenu.jsx';
import Timetable from '@/components/Timetable/index.jsx';
import { useIsOnline } from '@/hooks/useIsOnline.js';
import { useScheduleStatus } from '@/hooks/useScheduleStatus.jsx';
import '@mantine/core/styles.css';
import './App.css';

export default function App() {
  const isOnline = useIsOnline();
  const { isRefreshing } = useScheduleStatus();
  // Индикатор в хедере крутится при любом обновлении: либо нет сети, либо идёт
  // фоновая догрузка расписания (isRefreshing из источника данных).
  const showLoader = isRefreshing || !isOnline;
  return (
    <AppShell header={{ height: 48 }} padding="sm" withBorder={false}>
      <AppShell.Header className="appHeader">
        <Group justify="space-between" h="100%" px="md">
          <Group gap="xs">
            <Title order={3}>Расписание</Title>
            {showLoader && <Loader size="xs" />}
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