import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import { MantineProvider } from '@mantine/core'
import { theme } from '../pkg/theme.js'
import { ScheduleStatusProvider } from '@/components/ScheduleStatusProvider.jsx'
import App from './App.jsx'

registerSW({ immediate: true })

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="auto">
      <ScheduleStatusProvider>
        <App />
      </ScheduleStatusProvider>
    </MantineProvider>
  </StrictMode>,
)
