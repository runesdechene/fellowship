/**
 * QUOI     — le point d'entrée : monte l'app dans #root, avec le routeur et la session.
 * POURQUOI — le routeur a pour base /v2 : la V2 vit sous flw.sh/v2/, la V1 à la racine.
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from './App'
import { AuthProvider } from './lib/auth'
import './styles/index.css'

const root = document.getElementById('root')
if (!root) throw new Error('index.html doit contenir #root')

createRoot(root).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
