import { Group, ActionIcon, Text, Button } from '@mantine/core';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';

// Шапка: переключение недели (верхняя/нижняя) по центру и кнопка «Сегодня» справа.
export default function WeekHeader({ isUpper, isPrevDisabled, onPrevWeek, onNextWeek, isTodayView, onGoToday }) {
  return (
    <Group className="weekHeader" wrap="nowrap" align="center" gap="xs">
      <Group justify="flex-start" gap={6} className="weekToggle">
        <ActionIcon
          variant="default"
          aria-label="Предыдущая неделя"
          onClick={onPrevWeek}
          disabled={isPrevDisabled}
          className="mutedBtn"
        >
          <IconChevronLeft size={20} />
        </ActionIcon>
        <Text fw={700} size="md" className="weekName">
          {isUpper ? 'Верхняя' : 'Нижняя'}
        </Text>
        <ActionIcon variant="default" aria-label="Следующая неделя" onClick={onNextWeek} className="mutedBtn">
          <IconChevronRight size={20} />
        </ActionIcon>
      </Group>
      <Button
        size="xs"
        variant="default"
        className={isTodayView ? 'todayBtn mutedBtn todayHidden' : 'todayBtn mutedBtn'}
        onClick={onGoToday}
      >
        Сегодня
      </Button>
    </Group>
  );
}