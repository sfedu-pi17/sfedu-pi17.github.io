import { ActionIcon, Menu, useMantineColorScheme } from '@mantine/core';
import { IconSun, IconMoon, IconDeviceLaptop, IconCheck, IconSettings } from '@tabler/icons-react';

export default function ThemeMenu() {
  // Mantine — единственный источник правды. defaultColorScheme="auto" в MantineProvider
  // заставляет приложение следовать системной теме, выбор в меню переключает явно.
  const { colorScheme, setColorScheme } = useMantineColorScheme();

  return (
    <Menu shadow="md" width={200}>
      <Menu.Target>
        <ActionIcon
          size="xl"
          color="blue"
          variant="filled"
          aria-label="Выбор темы"
        >
          <IconSettings size={20} />
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