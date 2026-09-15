import { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Text,
  Loader,
  Group,
  Badge,
  Container,
  Title,
  ActionIcon,
  Menu,
  useMantineColorScheme,
} from '@mantine/core';
import { IconSun, IconMoon, IconDeviceLaptop, IconCheck } from '@tabler/icons-react';
import { useColorScheme } from '@mantine/hooks';
import '@mantine/core/styles.css';

const PUB_ID = '2PACX-1vRSIJwnvklsU8oP6GROruCJvfCSy_duAmcGwJ0uwHj5e7X69EAJTU49QUW-ndqeLA2gkhhL2i0Xfcph'
const LIST = {
    discipline: 0,
    test: 1545959544,
    schedule: 1227335714,
}

const URL = `https://docs.google.com/spreadsheets/d/e/${PUB_ID}/pub?gid=${LIST.schedule}&output=csv`;

export default function App() {
  // Mantine — единственный источник правды. defaultColorScheme="auto" в MantineProvider
  // заставляет приложение следовать системной теме, toggle переключает явно.
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  // При colorScheme === 'auto' хук возвращает 'auto' (сырую схему), а не резолвнутую,
  // поэтому для отображения берём системную тему отдельно.
  const osColorScheme = useColorScheme('light', { getInitialValueInEffect: false });
  const isDark = colorScheme === 'auto' ? osColorScheme === 'dark' : colorScheme === 'dark';

  return (
    <div>
      <Group justify="space-between" p="md">
        <Group gap="xs">
          <Title order={2}>
            Расписание занятий
          </Title>
        </Group>
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
      </Group>
      <Timetable />
    </div>
  );
}

function Timetable() {
    const [schedule, setSchedule] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(URL)
            .then(res => res.text()) // Получаем CSV как обычный текст
            .then(csvText => {
                console.log(csvText)

                // Разбиваем текст на строки
                const lines = csvText.split('\n');


                // Первая строчка — заголовки (id, title...), пропускаем её через slice(1)
                const formattedData = lines.slice(1).map(line => {
                    // Разбиваем каждую строку по запятой
                    const columns = line.split(',');

                    return {
                        id: columns[0]?.trim(),      // Столбец A
                        title: columns[1]?.trim(),   // Столбец B
                        teacher: columns[2]?.trim(), // Столбец C
                        type: columns[3]?.trim()     // Столбец D
                    };
                }).filter(item => item.id); // Убираем пустые строки, если они есть в конце

                setSchedule(formattedData);
                setLoading(false);
            })
            .catch(err => {
                console.error("Ошибка загрузки CSV:", err);
                setLoading(false);
            });
    }, []);

    if (loading) return <Container size="md" pt="xl"><Loader color="blue" size="xl" /></Container>;

    // Преобразуем тип занятий в бейджи с разными цветами
    const getTypeBadge = (type) => {
        switch (type?.toLowerCase()) {
            case 'лекция':
                return <Badge color="blue">Лекция</Badge>;
            case 'практика':
                return <Badge color="green">Практика</Badge>;
            case 'лабораторная':
                return <Badge color="orange">Лабораторная</Badge>;
            case 'экзамен':
                return <Badge color="red">Экзамен</Badge>;
            default:
                return <Badge variant="outline">{type}</Badge>;
        }
    };

    return (
        <Container size="md" mt="md">
            <Card shadow="lg" withBorder radius="md" p="md">
                <Table striped highlightOnHover withColumnBorders>
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th>ID</Table.Th>
                            <Table.Th>Предмет</Table.Th>
                            <Table.Th>Преподаватель</Table.Th>
                            <Table.Th style={{ textAlign: 'center' }}>Тип занятия</Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {schedule.map((item, index) => (
                            <Table.Tr key={item.id || index}>
                                <Table.Td>
                                    <Text size="sm" fw={500}>{item.id}</Text>
                                </Table.Td>
                                <Table.Td>
                                    <Text fw={600}>{item.title}</Text>
                                </Table.Td>
                                <Table.Td>
                                    <Text>{item.teacher}</Text>
                                </Table.Td>
                                <Table.Td style={{ textAlign: 'center' }}>
                                    {item.type ? getTypeBadge(item.type) : '--'}
                                </Table.Td>
                            </Table.Tr>
                        ))}
                    </Table.Tbody>
                </Table>
            </Card>
        </Container>
    );
}