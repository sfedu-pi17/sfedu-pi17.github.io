import { Card, Text, Container, Group } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';

// Экран «Не удалось загрузить расписание» — когда нет ни кэша, ни свежих данных,
// и загрузка завершилась ошибкой.
export default function ScheduleError() {
  return (
    <Container size="md" mt="md" px="0">
      <Card shadow="lg" withBorder radius="md" p="xl">
        <Group justify="center" gap="sm">
          <IconAlertCircle size={28} color="var(--mantine-color-red-6)" />
          <Text c="red" fw={600}>
            Не удалось загрузить расписание
          </Text>
        </Group>
        <Text size="sm" c="dimmed" ta="center" mt="xs">
          Попробуйте обновить страницу позже.
        </Text>
      </Card>
    </Container>
  );
}