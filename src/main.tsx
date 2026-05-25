import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '@/lib/auth'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Bgfx } from '@/components/layout/Bgfx'
import { ThemeProvider } from '@/hooks/use-theme'
import './index.css'
import App from './App.tsx'

// eslint-disable-next-line react-refresh/only-export-components
function Root() {
  return (
    <ThemeProvider>
      <Bgfx />
      <App />
    </ThemeProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <Root />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)
