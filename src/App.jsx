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
  useMantineColorScheme,
} from '@mantine/core';
import { IconSun, IconMoon } from '@tabler/icons-react';
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
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
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
          <Badge variant="filled" color="blue">
            {isDark ? 'Темная' : 'Светлая'} тема
          </Badge>
        </Group>
        <ActionIcon
          size="xl"
          color={isDark ? 'yellow' : 'blue'}
          variant="filled"
          onClick={toggleColorScheme}
          title={isDark ? 'Переключить на светлую тему' : 'Переключить на темную тему'}
        >
          {isDark ? <IconSun size={20} /> : <IconMoon size={20} />}
        </ActionIcon>
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