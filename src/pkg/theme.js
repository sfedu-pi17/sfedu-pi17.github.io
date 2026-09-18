import { createTheme } from '@mantine/core';

export const theme = createTheme({
  /** Параметры цветовой схемы - используем 'auto' для автоматического определения */
  colorScheme: 'auto', // автоматическое определение ('light' | 'dark' | 'auto')
  
  /** Настраиваем цвета для light/dark тем */
  colors: {
    primary: [
      '#eff6ff', '#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a'
    ],
    secondary: [
      '#ffffff', '#f3f4f6', '#e5e7eb', '#d1d5db', '#9ca3af', '#6b7280', '#4b5563', '#374151', '#1f2937', '#111827'
    ]
  },

  /** Настройки шрифтов */
  fontFamily: 'Inter, system-ui, sans-serif',
  fontFamilyMonospace: 'IBM Plex Mono, ui-monospace, monospace',
  headings: {
    fontFamily: 'Inter, system-ui, sans-serif',
  },

  /** Размеры и отступы */
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    '2xl': '24px',
    '3xl': '32px',
  },

  /** Скругления углов */
  radius: {
    xs: '2px',
    sm: '4px',
    md: '6px',
    lg: '8px',
    xl: '12px',
    '2xl': '16px',
    '3xl': '24px',
  },

  /** Тени */
  shadows: {
    xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  },

  /** Подсветка активного состояния */
  primaryColor: 'blue',

  /** Глобальные стили компонентов */
  components: {
    Title: {
      styles: {
        root: {
          // var(--mantine-color-text) резолвится по схеме: #000 в светлой, светлый в тёмной
          color: 'var(--mantine-color-text)',
        },
      },
    },
  },
});