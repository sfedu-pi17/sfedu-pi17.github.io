import { useEffect } from 'react'
import { useComputedColorScheme } from '@mantine/core'

// <meta name="theme-color"> красит панель браузера. В манифесте vite тег статичный
// (собирается на билде), а схема Mantine выбирается в рантайме — поэтому красим
// рантайм-тегом, чтобы панель следовала включённой теме.
const COLOR_BY_SCHEME = { light: '#e9ecef', dark: '#161616' }

export function ThemeColorMeta() {
  const scheme = useComputedColorScheme()

  useEffect(() => {
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', COLOR_BY_SCHEME[scheme] ?? COLOR_BY_SCHEME.light)
  }, [scheme])

  return null
}