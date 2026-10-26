import { AppShell, Group, Title } from '@mantine/core';
import ThemeMenu from '@/components/ThemeMenu.jsx';
import Timetable from '@/components/Timetable/index.jsx';
import WhatsNewModal from '@/components/WhatsNewModal.jsx';
import ConnectingText from '@/components/ConnectingText/index.jsx';
import { useIsOnline } from '@/hooks/useIsOnline.js';
import { useScheduleStatus } from '@/hooks/useScheduleStatus.js';
import '@mantine/core/styles.css';
import './App.css';

export default function App() {
  const isOnline = useIsOnline();
  const { isRefreshing } = useScheduleStatus();
  // Вместо голубой крутилки в хедере показываем «Соединение…» при любом обновлении:
  // либо нет сети, либо идёт фоновая догрузка расписания (isRefreshing из источника данных).
  // По завершении возвращаем исходный заголовок «Расписание».
  const isConnecting = isRefreshing || !isOnline;
  return (
    <>
      <AppShell header={{ height: 48 }} padding="sm" withBorder={false}>
        <AppShell.Header className="appHeader">
          <Group justify="space-between" h="100%" px="md">
            <Group gap="xs">
              {isConnecting ? <ConnectingText /> : <Title order={3}>Расписание</Title>}
            </Group>
            <ThemeMenu />
          </Group>
        </AppShell.Header>
        <AppShell.Main className="appMain">
          <Timetable />
        </AppShell.Main>
      </AppShell>
      <WhatsNewModal />
    </>
  );
}