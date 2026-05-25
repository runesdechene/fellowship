import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '@/lib/auth'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Bgfx } from '@/components/layout/Bgfx'
import { useTheme } from '@/hooks/use-theme'
import './index.css'
import App from './App.tsx'

// eslint-disable-next-line react-refresh/only-export-components
function Root() {
  useTheme() // applique + persiste le thème globalement (nuit par défaut)
  return (
    <>
      <Bgfx />
      <App />
    </>
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
