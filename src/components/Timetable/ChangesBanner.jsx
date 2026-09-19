import { Group, Text, Button } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';

// Уведомление «в расписании есть изменения»: переключает режим просмотра diff.
// «Показать» — начать просмотр (onShow), «Далее» — к следующему изменённому дню (onNext),
// «ОК» — сохранить новое расписание и закрыть (onDismiss).
export default function ChangesBanner({ isReviewing, hasNextChangedDay, onShow, onNext, onDismiss }) {
  return (
    <Group className="changesBanner" justify="space-between" align="center" gap="xs">
      <Group gap="xs">
        <IconAlertCircle size={18} />
        <Text size="sm" fw={600}>В расписании есть изменения</Text>
      </Group>
      <Group gap="xs">
        {/* «Далее» скрываем, когда изменений больше нет */}
        {(!isReviewing || hasNextChangedDay) && (
          <Button size="xs" variant="filled" color="blue" onClick={isReviewing ? onNext : onShow}>
            {isReviewing ? 'Далее' : 'Показать'}
          </Button>
        )}
        <Button size="xs" variant="default" onClick={onDismiss} className="mutedBtn">
          ОК
        </Button>
      </Group>
    </Group>
  );
}