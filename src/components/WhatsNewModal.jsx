import { useState } from 'react';
import { Button, Group, List, Modal, Stack } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconSparkles } from '@tabler/icons-react';
import { WHATS_NEW, latestVersion, unseenChanges } from '@/pkg/whatsnew.js';
import { loadSeenVersion, saveSeenVersion } from '@/pkg/storage.js';

// Модалка «Что нового»: на старте считаем релизы, которые пользователь ещё не видел
// (версия новее подтверждённой в localStorage), показываем их списком. Закрыть можно
// только кнопкой «ОК» — закрытие фиксирует самую свежую версию, чтобы эти изменения
// больше не показывались.
export default function WhatsNewModal() {
  // Считаем один раз при монтировании: подтверждённая версия за сессию не меняется.
  const [changes] = useState(() => unseenChanges(WHATS_NEW, loadSeenVersion()));
  const [opened, { close }] = useDisclosure(changes.length > 0);

  const handleDone = () => {
    saveSeenVersion(latestVersion(WHATS_NEW));
    close();
  };

  return (
    <Modal
      opened={opened}
      onClose={handleDone}
      title="Что нового"
      centered
      withCloseButton={false}
      closeOnClickOutside={false}
      closeOnEscape={false}
    >
      <Stack gap="md">
        <List
          spacing="sm"
          icon={<IconSparkles size={16} />}
          styles={{ icon: { color: 'var(--mantine-color-blue-6)' } }}
        >
          {changes.map((text) => (
            <List.Item key={text}>{text}</List.Item>
          ))}
        </List>
        <Group justify="flex-end">
          <Button onClick={handleDone}>ОК</Button>
        </Group>
      </Stack>
    </Modal>
  );
}