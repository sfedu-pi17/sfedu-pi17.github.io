import { ActionIcon, Menu, useMantineColorScheme } from '@mantine/core';
import { IconSun, IconMoon, IconDeviceLaptop, IconCheck } from '@tabler/icons-react';
import { useColorScheme } from '@mantine/hooks';

export default function ThemeMenu() {
  // Mantine — единственный источник правды. defaultColorScheme="auto" в MantineProvider
  // заставляет приложение следовать системной теме, выбор в меню переключает явно.
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  // При colorScheme === 'auto' хук возвращает 'auto' (сырую схему), а не резолвнутую,
  // поэтому для отображения берём системную тему отдельно.
  const osColorScheme = useColorScheme('light', { getInitialValueInEffect: false });
  const isDark = colorScheme === 'auto' ? osColorScheme === 'dark' : colorScheme === 'dark';

  return (
    <Menu shadow="md" width={200}>
      <Menu.Target>
        <ActionIcon
          size="xl"
          color={isDark ? 'yellow' : 'blue'}
          variant="filled"
          aria-label="Выбор темы"
        >
          {isDark ? <IconSun size={20} /> : <IconMoon size={20} />}
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>Тема оформления</Menu.Label>
        <Menu.Item
          leftSection={<IconDeviceLaptop size={14} />}
          rightSection={colorScheme === 'auto' ? <IconCheck size={14} /> : null}
          color={colorScheme === 'auto' ? 'blue' : undefined}
          onClick={() => setColorScheme('auto')}
        >
          Системная
        </Menu.Item>
        <Menu.Item
          leftSection={<IconSun size={14} />}
          rightSection={colorScheme === 'light' ? <IconCheck size={14} /> : null}
          color={colorScheme === 'light' ? 'blue' : undefined}
          onClick={() => setColorScheme('light')}
        >
          Светлая
        </Menu.Item>
        <Menu.Item
          leftSection={<IconMoon size={14} />}
          rightSection={colorScheme === 'dark' ? <IconCheck size={14} /> : null}
          color={colorScheme === 'dark' ? 'blue' : undefined}
          onClick={() => setColorScheme('dark')}
        >
          Темная
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}